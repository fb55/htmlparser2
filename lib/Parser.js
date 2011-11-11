var ElementType = require("./ElementType.js");

function Parser(handler, options){
	if(options) this._options = options;

	//Parser.validateHandler(handler);
	//most people will use the given handlers, so a check is not necessary
	//if you want to check your parser, just call Parser.validateHandler
	this._handler = handler;

	this._buffer = "";
	this._prevTagSep = "";
	this._contentFlags = 0;
	this._done = false;
	this._parseState = ElementType.Text;
}

//**"Static"**//
//Regular expressions used for cleaning up and parsing (stateless)
var _reWhitespace = /\s/; //Used to find any whitespace to split on
var _reTagName = /^\s*(\/?)\s*([^\s\/]+)/; //Used to find the tag name for an element

//Find attributes in a tag
var _reAttrib = /([^=<>\"\'\s]+)\s*=\s*"([^"]*)"|([^=<>\"\'\s]+)\s*=\s*'([^']*)'|([^=<>\"\'\s]+)\s*=\s*([^'"\s]+)|([^=<>\"\'\s\/]+)/g;//"

var tagTypes = {};
tagTypes[ ElementType.Script ] = true;
tagTypes[ ElementType.Style ] = true;
tagTypes[ ElementType.Tag ] = true;

Parser.prototype._options = {
	includeLocation: false, //Do not track element position in document by default
	xmlMode: false //Special behaviour for script/style tags by default
};

//**Public**//
//Methods//
//Parses a complete HTML and pushes it to the handler
Parser.prototype.parseComplete = function(data){
	this.reset();
	this.parseChunk(data);
	this.done();
};

//Parses a piece of an HTML document
Parser.prototype.parseChunk = function(data){
	if(this._done) this.handleError(Error("Attempted to parse chunk after parsing already done"));
	this._buffer += data; //FIXME: this can be a bottleneck
	this.parseTags();
};

//Tells the parser that the HTML being parsed is complete
Parser.prototype.done = function(){
	if(this._done) return;
	this._done = true;

	//Push any unparsed text into a final element in the element list
	if(this._buffer){
		var data = this._buffer;
		if(this._parseState === ElementType.Tag){
			data = data.trim();
			var name = parseTagName(data);
			if(name.charAt(0) === "/") this._handler.closeTag(name.substr(1));
			else this._handler.openTag(name, parseAttributes(data), ElementType.Tag);
		}
		else this._handler.writeText(data);
		
		this._buffer = "";
	}
	this._handler.done();
};

//Resets the parser to a blank state, ready to parse a new HTML document
Parser.prototype.reset = function(){
	Parser.call(this, this._handler);
	this._handler.reset();
};

//**Private**//
//Takes an element and adds an "attribs" property for any element attributes found
var parseAttributes = function(data){
	var pos = data.search(_reWhitespace);
	if(pos === -1) return;
	var attribRaw = data.substr(pos);

	_reAttrib.lastIndex = 0;
	var match, attrs = {};
	
	while(match = _reAttrib.exec(attribRaw)){
		if(match[1])		attrs[match[1]] = match[2];
		else if(match[3])	attrs[match[3]] = match[4];
		else if(match[5])	attrs[match[5]] = match[6];
		else if(match[7])	attrs[match[7]] = match[7];
	}
	
	return attrs;
};

//Extracts the base tag name from the data value of an element
var parseTagName = function(data){
	var match = data.match(_reTagName);
	if(match === null) return "";
	return match[1] + match[2];
};

//Special tags that are threated differently
var SpecialTags = {};
SpecialTags[ElementType.Tag] = 0;
SpecialTags[ElementType.Style]  = 1; //2^0
SpecialTags[ElementType.Script] = 2; //2^1
SpecialTags.w = 4; //2^2 - if set, append prev tag sep to data
SpecialTags[ElementType.Comment] = 8; //2^3

//Parses through HTML text and returns an array of found elements
Parser.prototype.parseTags = function(){
	var buffer = this._buffer, current = 0;

	var next, tagSep, rawData, elementName, prevElement, elementType, elementData, attributes;
	
	var opening = buffer.indexOf("<"), closing = buffer.indexOf(">");

	while(opening !== closing){ //just false if both are -1
		if(closing === -1 || (opening !== -1 && opening < closing)){
			next = opening;
			tagSep = "<";
			opening = buffer.indexOf(tagSep, next + 1);
		}
		else{
			next = closing;
			tagSep = ">";
			closing = buffer.indexOf(tagSep, next + 1);
		}
		rawData = buffer.substring(current, next); //The next chunk of data to parse
		elementType = this._parseState;
		
		//set elements for next run
		current = next + 1;
		this._parseState = (tagSep === "<") ? ElementType.Tag : ElementType.Text;
		
		if(elementType === ElementType.Tag){
			elementData = rawData.trim();
			elementName = parseTagName(elementData);
		}
		else{
			elementData = rawData;
			elementName = "";
		}

		//This section inspects the current tag stack and modifies the current
		//element if we're actually parsing a special area (script/comment/style tag)
		if(this._contentFlags === 0){ /*do nothing*/ }
		else if(this._contentFlags >= SpecialTags[ElementType.Comment]){
			//We're currently in a comment tag
			this._processComment(rawData, tagSep);
			continue;
		}
		//if it's a closing tag, remove the flag
		else if(this._contentFlags >= SpecialTags[ElementType.Script] && elementName === "/script"){
			//remove the script flag (also removes the written flag)
			this._contentFlags %= SpecialTags[ElementType.Script];
		}
		else if(this._contentFlags >= SpecialTags[ElementType.Style] && elementName === "/style"){
			//remove the style flag (also removes the written flag)
			this._contentFlags %= SpecialTags[ElementType.Style];
		}
		//special behaviour for script & style tags
		//Make sure we're not in a comment
		else if(!this._options.xmlMode && rawData.substring(0, 3) !== "!--"){
			//If the previous element is text, append the last tag sep to element
			if(this._contentFlags >= SpecialTags.w){
				this._handler.writeText(this._prevTagSep + rawData);
			}
			else{ //The previous element was not text
				this._contentFlags += SpecialTags.w;
				if(rawData !== "") this._handler.writeText(rawData);
			}
			this._prevTagSep = tagSep;
			continue;
		}

		//Processing of non-special tags
		if(elementType === ElementType.Tag){
			if(rawData.substring(0, 3) === "!--"){ //This tag is a comment
				this._contentFlags += SpecialTags[ElementType.Comment];
				this._processComment(rawData.substr(3), tagSep);
				continue;
			}
			
			if(rawData.charAt(0) === "!" || rawData.charAt(0) === "?"){
				//ElementType.Directive
				//TODO: what about CDATA?
				this._handler.writeDirective(elementName, elementData);
				continue;
			}
			
			this._processTag(elementName, elementData, tagSep, rawData);
		}
		else if(elementType === ElementType.Text && rawData !== ""){
			this._handler.writeText(elementData);
		}
	}

	this._buffer = buffer.substring(current);
};

Parser.prototype._processComment = function(rawData, tagSep){
	if(tagSep === ">" && rawData.substr(-2) === "--"){ //comment ends
		//remove the written flag (also removes the comment flag)
		this._contentFlags %= SpecialTags.w;
		rawData = rawData.slice(0, -2);
	}
	else rawData += tagSep;
	this._prevTagSep = tagSep;
	
	this._handler.writeComment(rawData);
};

Parser.prototype._processTag = function(name, data, tagSep, raw){
	if(name.charAt(0) === "/"){
		this._handler.closeTag(name.substring(1));
		return;
	}
	
	var type = ElementType.Tag;
	if(this._options.xmlMode){ /*do nothing*/ }
	else if(name === "script") type = ElementType.Script;
	else if(name === "style")  type = ElementType.Style;

	this._handler.openTag(name, parseAttributes(data), type);
	
	//If tag self-terminates, add an explicit, separate closing tag
	if(data.substr(-1) === "/"){
		this._handler.closeTag(name);
	} else {
		this._contentFlags += SpecialTags[type];
		this._prevTagSep = tagSep;
	}
};

//Checks the handler to ensure it is an object with the right interface
Parser.validateHandler = function(handler){
	if(typeof handler !== "object")
		throw Error("Handler is not an object");
	["reset", "done", "openTag", "closeTag", "writeText", "writeComment", "writeDirective"].forEach(function(name){
		if(typeof handler[name] !== "function")
			throw Error("Handler method '" + name + "' is invalid");
	});
};

Parser.prototype.handleError = function(error){
	if(typeof this._handler.error === "function")
		this._handler.error(error);
	else throw error;
};

module.exports = Parser;