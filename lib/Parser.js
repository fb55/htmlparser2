var ElementType = require("./ElementType.js");

function Parser(handler, options){
	this._options = options || {
		includeLocation: false, //Do not track element position in document by default
		xmlMode: false //Special behaviour for script/style tags by default
	};

	validateHandler(handler);
	this._handler = handler;

	this._buffer = "";
	this._prevTagSep = "";
	this._contentFlags = 0;
	this._done = false;
	this._elements = [];
	this._current = 0;
	this._location = {
		row: 0,
		col: 0,
		charOffset: 0,
		inBuffer: 0
	};
	this._parseState = ElementType.Text;
}

//**"Static"**//
//Regular expressions used for cleaning up and parsing (stateless)
var _reWhitespace = /\s/; //Used to find any whitespace to split on
var _reTagName = /^\s*(\/?)\s*([^\s\/]+)/; //Used to find the tag name for an element
var _reRow = RegExp("\r","g");

//Find attributes in a tag
var _reAttrib = /([^=<>\"\'\s]+)\s*=\s*"([^"]*)"|([^=<>\"\'\s]+)\s*=\s*'([^']*)'|([^=<>\"\'\s]+)\s*=\s*([^'"\s]+)|([^=<>\"\'\s\/]+)/g;

var tagTypes = {};
tagTypes[ ElementType.Script ] = true;
tagTypes[ ElementType.Style ] = true;
tagTypes[ ElementType.Tag ] = true;

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
		var rawData = this._buffer;
		this._buffer = "";
		var element = {
			raw: rawData,
			data: this._parseState === ElementType.Text ? rawData : rawData.trim(),
			type: this._parseState
		};
		if(tagTypes[this._parseState]){
			element.name = parseTagName(element.data);
			var attrs = parseAttributes(element.data);
			if(attrs) element.attribs = attrs;
		}
		this._elements.push(element);
	}

	this.writeHandler();
	this._handler.done();
};

//Resets the parser to a blank state, ready to parse a new HTML document
Parser.prototype.reset = function(){
	this._buffer = "";
	this._prevTagSep = "";
	this._done = false;
	this._current = 0;
	this._contentFlags = 0;
	this._location = {
		 row: 0
		, col: 0
		, charOffset: 0
		, inBuffer: 0
	};
	this._parseState = ElementType.Text;
	this._elements = [];
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
SpecialTags[ElementType.Style]  = 1; //2^0
SpecialTags[ElementType.Script] = 2; //2^1
SpecialTags["w"] = 4; //2^2 - if set, append prev tag sep to data
SpecialTags[ElementType.Comment] = 8; //2^8

//Parses through HTML text and returns an array of found elements
Parser.prototype.parseTags = function(){
	var buffer = this._buffer;

	var next, tagSep, rawData, element, elementName, prevElement, elementType, elementData, attributes, includeName = false;
	
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
		rawData = buffer.substring(this._current, next); //The next chunk of data to parse
		elementType = this._parseState;
		
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
		else if(this._contentFlags >= SpecialTags[ElementType.Comment]){ //We're currently in a comment tag
			elementType = ElementType.Comment; //Change the current element's type to a comment

    		if(tagSep === ">" && rawData.substr(-2) === "--"){ //comment ends
    			this._contentFlags -= SpecialTags[ElementType.Comment];
    			elementData = rawData = rawData.slice(0, -2);
    		}
    		else elementData = rawData += tagSep;
    		this._prevTagSep = tagSep;
    	}
    	//if it's a closing tag, remove the flag
    	else if(this._contentFlags >= SpecialTags[ElementType.Script] && elementName === "/script"){
    		this._contentFlags %= SpecialTags["w"]; //remove the written flag
			this._contentFlags -= SpecialTags[ElementType.Script];
		}
		else if(this._contentFlags >= SpecialTags[ElementType.Style] && elementName === "/style"){
			this._contentFlags %= SpecialTags["w"]; //remove the written flag
			this._contentFlags -= SpecialTags[ElementType.Style];
		}
		//special behaviour for script & style tags
		//Make sure we're not in a comment
		else if(!this._options.xmlMode && rawData.substring(0, 3) !== "!--"){
			//All data from here to style close is now a text element
			elementType = ElementType.Text;
			//If the previous element is text, append the last tag sep to element
			if(this._contentFlags >= SpecialTags["w"]){
			    elementData = rawData = this._prevTagSep + rawData;
			}
			else{ //The previous element was not text
			    this._contentFlags += SpecialTags["w"];
			    elementData = rawData;
			}
			this._prevTagSep = tagSep;
		}



		//Processing of non-special tags
		if(elementType === ElementType.Tag){
			if(rawData.substring(0, 3) === "!--"){ //This tag is really comment
				elementType = ElementType.Comment;
				this._contentFlags %= SpecialTags["w"]; //remove the written flag
				//Check if the comment is terminated in the current element
				if(tagSep === ">" && rawData.substr(-2) === "--")
					elementData = rawData = rawData.slice(3, -2);
				else { //It's not so push the comment onto the tag stack
					elementData = rawData = rawData.substr(3) + tagSep;
					this._contentFlags += SpecialTags[ElementType.Comment];
					this._prevTagSep = tagSep;
				}
			}
			else {
				includeName = true;

				if(rawData.charAt(0) === "!" || rawData.charAt(0) === "?"){
					elementType = ElementType.Directive;
					//TODO: what about CDATA?
				}
				else if(elementName.charAt(0) === "/"){
					elementData = elementName;
					if(elementName === "/script") elementType = ElementType.Script;
					else if(elementName === "/style") elementType = ElementType.Style;
				}
				else if(elementName === "script"){
					elementType = ElementType.Script;
					//Special tag, push onto the tag stack if not terminated
					if(elementData.substr(-1) !== "/"){
						this._contentFlags += SpecialTags[ElementType.Script];
						this._prevTagSep = tagSep;
					}
				}
				else if(elementName === "style"){
					elementType = ElementType.Style;
					//Special tag, push onto the tag stack if not terminated
					if(elementData.substr(-1) !== "/"){
						this._contentFlags += SpecialTags[ElementType.Style];
						this._prevTagSep = tagSep;
					}
				}
			}
		}

		//Add all tags and non-empty text elements to the element list
		if(rawData !== "" || elementType !== ElementType.Text){
			element = {
				raw: rawData,
				data: elementData,
				type: elementType
			};
			
			if(includeName){
				element.name = elementName;
				includeName = false;
			}
			if(this._options.includeLocation) element.location = this.getLocation(elementType === ElementType.Tag);
			
			//Only parse attributes for tags
			if(tagTypes[element.type]){
				attributes = parseAttributes(elementData);
				if(attributes) element.attribs = attributes;
			}
			
			this._elements.push(element);
			
			/*
			switch(elementType){
				case ElementType.Text:
					this._handler.writeText(element);
					break;
				case ElementType.Comment:
					this._handler.writeComment(element);
					break;
				case ElementType.Directive:
					this._handler.writeDirective(element);
					break;
				//case ElementType.Tag:
				//case ElementType.Style:
				//case ElementType.Script:
				default:
					if(elementName[0] === "/") this._handler._closeTag(elementName.substr(1));
					else this._handler._openTag(elementName, parseAttributes(elementData));
			}
			*/

			//If tag self-terminates, add an explicit, separate closing tag
			if(tagTypes[elementType] && elementData.substr(-1) === "/"){
				//this._handler._closeTag(elementName);
				this._elements.push({
					raw: elementName = "/" + elementName,
					data: elementName, name: elementName,
					type: elementType
				});
			}
		}
		this._parseState = (tagSep === "<") ? ElementType.Tag : ElementType.Text;
		this._current = next + 1;
	}

	if(this._options.includeLocation){
		this.getLocation();
		this._location.row += this._location.inBuffer;
		this._location.inBuffer = 0;
		this._location.charOffset = 0;
	}
	this._buffer = buffer.substring(this._current);
	this._current = 0;

	this.writeHandler();
};

Parser.prototype.getLocation = function(startTag){
	var c, end, chunk,
		l = this._location;
	if(startTag){
		end = this._current-1,
		chunk = l.charOffset === 0 && end === -1;
	} else {
		end = this._current,
		chunk = false;
	}
	
	var rows = this._buffer.substring(l.charOffset, end).split("\n"),
		rowNum = rows.length - 1;
	
	l.charOffset = end;
	l.inBuffer += rowNum;
	
	var num = rows[rowNum].replace(_reRow,"").length;
	if(rowNum === 0) l.col += num;
	else l.col = num;
	
	if(arguments.length === 0) return;
	
	return {
		line: l.row + l.inBuffer + 1,
		col: l.col + (chunk ? 0: 1)
	};
};

//Checks the handler to make it is an object with the right "interface"
var validateHandler = function(handler){
	if(typeof handler !== "object")
		throw Error("Handler is not an object");
	["reset", "done", "writeTag", "writeText", "writeComment", "writeDirective"].forEach(function(name){
		if(typeof handler[name] !== "function")
			throw Error("Handler method '" + name + "' is invalid");
	});
};

//Writes parsed elements out to the handler
Parser.prototype.writeHandler = function(){
	while (this._elements.length){
		var element = this._elements.shift();
		switch (element.type){
			case ElementType.Comment: this._handler.writeComment(element);
				break;
			case ElementType.Directive: this._handler.writeDirective(element);
				break;
			case ElementType.Text: this._handler.writeText(element);
				break;
			default: this._handler.writeTag(element);
		}
	}
};

Parser.prototype.handleError = function(error){
	if(typeof this._handler.error === "function")
		this._handler.error(error);
	else throw error;
};

module.exports = Parser;