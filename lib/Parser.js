var ElementType = require("./ElementType.js");

function Parser (handler, options){
	this._options = options || {
		includeLocation: false, //Do not track element position in document by default
		xmlMode: false //Special behaviour for script/style tags by default
	};

	validateHandler(handler);
	this._handler = handler;

	this._buffer = "";
	this._prevTagSep = "";
	this._done = false;
	this._tagStack = [];
	this._elements = [];
	this._current = 0;
	this._location = {
		 row: 0
		, col: 0
		, charOffset: 0
		, inBuffer: 0
	};
	this._parseState = ElementType.Text;
}

//**"Static"**//
//Regular expressions used for cleaning up and parsing (stateless)
var _reWhitespace = /\s/; //Used to find any whitespace to split on
var _reTagName = /^\s*(\/?)\s*([^\s\/]+)/; //Used to find the tag name for an element

//Regular expressions used for parsing (stateful)
var _reAttrib = //Find attributes in a tag
	/([^=<>\"\'\s]+)\s*=\s*"([^"]*)"|([^=<>\"\'\s]+)\s*=\s*'([^']*)'|([^=<>\"\'\s]+)\s*=\s*([^'"\s]+)|([^=<>\"\'\s\/]+)/g;

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
	if(this._done)
		this.handleError(Error("Attempted to parse chunk after parsing already done"));
	this._buffer += data; //FIXME: this can be a bottleneck
	this.parseTags();
};

//Tells the parser that the HTML being parsed is complete
Parser.prototype.done = function(){
	if(this._done) return;
	this._done = true;

	//Push any unparsed text into a final element in the element list
	if(this._buffer.length){
		var rawData = this._buffer;
		this._buffer = "";
		var element = {
			  raw: rawData
			, data: this._parseState === ElementType.Text ? rawData : rawData.trim()
			, type: this._parseState
			};
		if(tagTypes[this._parseState]){
			element.name = parseTagName(element.data);
			parseAttribs(element);
		}
		this._elements.push(element);
	}

	this.writeHandler(true);
	this._handler.done();
};

//Resets the parser to a blank state, ready to parse a new HTML document
Parser.prototype.reset = function(){
	this._buffer = "";
	this._prevTagSep = "";
	this._done = false;
	this._current = 0;
	this._location = {
		 row: 0
		, col: 0
		, charOffset: 0
		, inBuffer: 0
	};
	this._parseState = ElementType.Text;
	this._tagStack = [];
	this._elements = [];
	this._handler.reset();
};

//**Private**//
//Takes an element and adds an "attribs" property for any element attributes found
var parseAttribs = function(element){
	//Only parse attributes for tags
	if(!tagTypes[element.type]) return;

	var pos = element.data.search(_reWhitespace);
	if(pos === -1) return;
	var attribRaw = element.data.substr(pos);
	if(attribRaw === "") return;

	_reAttrib.lastIndex = 0;
	var match = _reAttrib.exec(attribRaw);
	if(match){
		element.attribs = {};
		do{
			if(match[1])		element.attribs[match[1]] = match[2];
			else if(match[3])	element.attribs[match[3]] = match[4];
			else if(match[5])	element.attribs[match[5]] = match[6];
			else if(match[7])	element.attribs[match[7]] = match[7];
		}
		while(match = _reAttrib.exec(attribRaw));
	}
};

//Extracts the base tag name from the data value of an element
var parseTagName = function(data){
	if(!data) return "";
	var match = data.match(_reTagName);
	if(match === null) return "";
	return match[1] + match[2];
};

//Parses through HTML text and returns an array of found elements
//I admit, this function is rather large but splitting up had an noticeable impact on speed
Parser.prototype.parseTags = function(){
	var buffer = this._buffer, stack = this._tagStack, handler = this._handler;

	var next, type, tagSep, rawData, element, elementName, prevElement, elementType, elementData, includeName = false;
	
	var opening = buffer.indexOf("<"), closing = buffer.indexOf(">");

	while(opening !== -1 || closing !== -1){
		if(closing === -1 || (opening !== -1 && opening < closing)){
			next = opening;
			opening = buffer.indexOf(tagSep = "<", next + 1);
		}
		else{
			next = closing;
			closing = buffer.indexOf(tagSep = ">", next + 1);
		}
		rawData = buffer.substring(this._current, next); //The next chunk of data to parse
		elementType = this._parseState;
		
		if(elementType === ElementType.Text){
			elementData = rawData;
			elementName = "";
		}
		else{
			elementData = rawData.trim();
			elementName = parseTagName(elementData);
		}
		type = stack.slice(-1)[0];


		//This section inspects the current tag stack and modifies the current
		//element if we're actually parsing a special area (script/comment/style tag)
		if(!type){ /* nothing */ }
		else if(type === ElementType.Script && elementName === "/script") stack.pop();
		else if(type === ElementType.Style && elementName === "/style") stack.pop();
		else if(!this._options.xmlMode && (type === ElementType.Script || type === ElementType.Style)){
			//special behaviour for script & style tags
			if(rawData.substring(0, 3) !== "!--"){ //Make sure we're not in a comment
				//All data from here to style close is now a text element
			    elementType = ElementType.Text;
			    //If the previous element is text, append the current text to it
			    prevElement = this._elements && this._elements[this._elements.length - 1];
			    if(prevElement && prevElement.type === ElementType.Text){
			    	prevElement.data = prevElement.raw += this._prevTagSep + rawData;
			    	rawData = elementData = ""; //This causes the current element to not be added to the element list
			    } else elementData = rawData; //The previous element was not text
			}
		}
		else if(type === ElementType.Comment){ //We're currently in a comment tag

			prevElement = this._elements && this._elements[this._elements.length - 1];

    		if(rawData.substr(-2) === "--" && tagSep === ">"){
    			stack.pop();
    			rawData = rawData.slice(0, -2);
    			//If the previous element is a comment, append the current text to it
    			if(prevElement && prevElement.type === ElementType.Comment){ //Previous element was a comment
    				prevElement.data = prevElement.raw += rawData;
    				rawData = elementData = ""; //This causes the current element to not be added to the element list
    				elementType = ElementType.Text;
    			}
    			else elementType = ElementType.Comment; //Change the current element's type to a comment
    		}
    		else { //Still in a comment tag
    			elementType = ElementType.Comment;
    			//If the previous element is a comment, append the current text to it
    			if(prevElement && prevElement.type === ElementType.Comment){
    				prevElement.data = prevElement.raw += rawData + tagSep;
    				rawData = elementData = ""; //This causes the current element to not be added to the element list
    				elementType = ElementType.Text;
    			}
    			else elementData = rawData += tagSep;
    		}
    	}



		//Processing of non-special tags
		if(elementType === ElementType.Tag){
			if(rawData.substring(0, 3) === "!--"){ //This tag is really comment
				elementType = ElementType.Comment;
				rawData = rawData.substr(3);
				//Check if the comment is terminated in the current element
				if(tagSep === ">" && rawData.substr(-2) === "--")
					elementData = rawData = rawData.slice(0, -2);
				else { //It's not so push the comment onto the tag stack
					rawData += tagSep;
					stack.push(ElementType.Comment);
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
					if(elementData.substr(-1) !== "/") stack.push(ElementType.Script);
				}
				else if(elementName === "style"){
					elementType = ElementType.Style;
					//Special tag, push onto the tag stack if not terminated
					if(elementData.substr(-1) !== "/") stack.push(ElementType.Style);
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
			
			parseAttribs(element);
			this._elements.push(element);
			
			/*
			switch(elementType){
				case ElementType.Text:
					this._handler.ontext(element);
				case ElementType.Tag:
				case ElementType.Style:
				case ElementType.Script:
					if(elementName[0] === "/") this._handler.onclosetag(elementName.substr(1));
					else this._handler.onopentag(element);
					break;
				case ElementType.Comment:
					this._handler.oncomment(element);
					break;
				case ElementType.Directive:
					this._handler.onprocessinginstruction;
					break;
				default: throw Error("Unsupported type: " + elementType);
			}
			*/

			//If tag self-terminates, add an explicit, separate closing tag
			if( elementType !== ElementType.Text
				&& elementType !== ElementType.Comment
				&& elementType !== ElementType.Directive
				&& elementData.substr(-1) === "/"
			){
				//this._handler.onclosetag(elementName);
				this._elements.push({
					  raw: "/" + elementName
					, data: "/" + elementName
					, name: "/" + elementName
					, type: elementType
				});
			}
		}
		this._parseState = (tagSep === "<") ? ElementType.Tag : ElementType.Text;
		this._current = next + 1;
		this._prevTagSep = tagSep;
	}

	if(this._options.includeLocation){
		this.getLocation();
		this._location.row += this._location.inBuffer;
		this._location.inBuffer = 0;
		this._location.charOffset = 0;
	}
	this._buffer = this._buffer.substring(this._current);
	this._current = 0;

	this.writeHandler();
};

Parser.prototype.getLocation = function(startTag){
	var c,
		l = this._location,
		end = this._current,
		chunk = startTag && l.charOffset === 0 && end === 0;

	if(startTag) end--;

	for (; l.charOffset < end; l.charOffset++){
		c = this._buffer[l.charOffset];
		if(c === '\n'){
			l.inBuffer++;
			l.col = 0;
		} else if(c !== '\r')
			l.col++;
	}
	return {
		 line: l.row + l.inBuffer + 1
		, col: l.col + (chunk ? 0: 1)
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
Parser.prototype.writeHandler = function(forceFlush){
	if(this._tagStack.length && !forceFlush)
		return;
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