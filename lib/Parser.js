var ElementType = require("./ElementType.js");

function Parser(cbs, options){
	if(options) this._options = options;
	if(cbs) this._cbs = cbs;

	this._buffer = "";
	this._prevTagSep = "";
	this._stack = [];
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

Parser.prototype._options = {
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
	if(this._done) this._handleError(Error("Attempted to parse chunk after parsing already done"));
	this._buffer += data; //FIXME: this can be a bottleneck
	this.parseTags();
};

//Tells the parser that the HTML being parsed is complete
Parser.prototype.done = function(){
	if(this._done) return;
	this._done = true;

	//Parse the buffer to its end
	if(this._buffer) this.parseTags(true);
	
	if(this._cbs.onclosetag){
		while(this._stack.length) this._cbs.onclosetag(this._stack.pop());
	}
	
	if(this._cbs.onend) this._cbs.onend();
};

//Resets the parser to a blank state, ready to parse a new HTML document
Parser.prototype.reset = function(){
	Parser.call(this);
	if(this._cbs.onreset) this._cbs.onreset();
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
Parser.prototype.parseTags = function(force){
	var buffer = this._buffer, current = 0;

	var next, tagSep, rawData, elementName, prevElement, elementType, elementData, attributes;
	
	var opening = buffer.indexOf("<"), closing = buffer.indexOf(">");

	//if force is true, parse everything
	if(force) opening = Infinity;

	while(opening !== closing){ //just false if both are -1
		if((opening !== -1 && opening < closing) || closing === -1){
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
				if(this._cbs.ontext) this._cbs.ontext(this._prevTagSep + rawData);
			}
			else{ //The previous element was not text
				this._contentFlags += SpecialTags.w;
				if(rawData !== "" && this._cbs.ontext) this._cbs.ontext(rawData);
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
				if(this._cbs.onprocessinginstruction){
					this._cbs.onprocessinginstruction(elementName, elementData);
				}
				continue;
			}
			if(elementName.charAt(0) === "/") this._processCloseTag(elementName.substr(1));
			else this._processOpenTag(elementName, elementData, tagSep);
		}
		else if(elementType === ElementType.Text && rawData !== "" && this._cbs.ontext){
			this._cbs.ontext(elementData);
		}
	}

	this._buffer = buffer.substring(current);
};

Parser.prototype._processComment = function(rawData, tagSep){
	this._prevTagSep = tagSep;
	
	if(tagSep === ">" && rawData.substr(-2) === "--"){ //comment ends
		//remove the written flag (also removes the comment flag)
		this._contentFlags %= SpecialTags.w;
		rawData = rawData.slice(0, -2);
	}
	else rawData += tagSep;
	
	if(this._cbs.oncomment) this._cbs.oncomment(rawData);
};

var emptyTags = require("./ClosingTags.js").self;

Parser.prototype._isEmptyTag = function(name){
	return !this._options.xmlMode && emptyTags[name];
};

Parser.prototype._processCloseTag = function(name){
	if(this._stack && !this._isEmptyTag(name)){
		var i = this._stack.length;
		while(i !== 0 && this._stack[--i] !== name){}
		if(i !== 0 || this._stack[0] === name)
			if(this._cbs.onclosetag){
				while(i < this._stack.length)
					this._cbs.onclosetag(this._stack.pop());
			}
			else this._stack.splice(i);
	}
	//many browsers (eg. Safari, Chrome) convert </br> to <br>
	else if(name === "br" && !this._options.xmlMode)
		this._processOpenTag(name, "/");
};

Parser.prototype._processOpenTag = function(name, data, tagSep){
	var type = ElementType.Tag;
	if(this._options.xmlMode){ /*do nothing*/ }
	else if(name === "script") type = ElementType.Script;
	else if(name === "style")  type = ElementType.Style;
	
	if(this._cbs.onopentag){
		this._cbs.onopentag(name, parseAttributes(data), type);
	}
	
	//If tag self-terminates, add an explicit, separate closing tag
	if(data.substr(-1) === "/" || this._isEmptyTag(name)){
		if(this._cbs.onclosetag) this._cbs.onclosetag(name);
	} else {
		this._contentFlags += SpecialTags[type];
		this._stack.push(name);
		this._prevTagSep = tagSep;
	}
};

Parser.prototype._handleError = function(error){
	if(this._cbs.onerror)
		this._cbs.onerror(error);
	else throw error;
};

module.exports = Parser;