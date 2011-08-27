var ElementType = require("./ElementType.js");

function Parser (handler, options) {
	this._options = options ? options : { };
	if (this._options.includeLocation === undefined) {
		this._options.includeLocation = false; //Do not track element position in document by default
	}

	this.validateHandler(handler);
	this._handler = handler;
	
	this._buffer = "";
	this._done = false;
	this._elements = [];
	this._elementsCurrent = 0;
	this._current = 0;
	this._next = 0;
	this._location = {
		 row: 0
		, col: 0
		, charOffset: 0
		, inBuffer: 0
	};
	this._parseState = ElementType.Text;
	this._prevTagSep = '';
	this._tagStack = [];
}

//**"Static"**//
//Regular expressions used for cleaning up and parsing (stateless)
Parser._reTrim = /(^\s+|\s+$)/g; //Trim leading/trailing whitespace
Parser._reTrimComment = /(^\!--|--$)/g; //Remove comment tag markup from comment contents
Parser._reWhitespace = /\s/g; //Used to find any whitespace to split on
Parser._reTagName = /^\s*(\/?)\s*([^\s\/]+)/; //Used to find the tag name for an element

//Regular expressions used for parsing (stateful)
Parser._reAttrib = //Find attributes in a tag
	/([^=<>\"\'\s]+)\s*=\s*"([^"]*)"|([^=<>\"\'\s]+)\s*=\s*'([^']*)'|([^=<>\"\'\s]+)\s*=\s*([^'"\s]+)|([^=<>\"\'\s\/]+)/g;
Parser._reTags = /[<\>]/g; //Find tag markers

//**Public**//
//Methods//
//Parses a complete HTML and pushes it to the handler
Parser.prototype.parseComplete = function(data) {
	this.reset();
	this.parseChunk(data);
	this.done();
};

//Parses a piece of an HTML document
Parser.prototype.parseChunk = function(data) {
	if (this._done)
		this.handleError(new Error("Attempted to parse chunk after parsing already done"));
	this._buffer += data; //FIXME: this can be a bottleneck
	this.parseTags();
};

//Tells the parser that the HTML being parsed is complete
Parser.prototype.done = function() {
	if (this._done)
		return;
	this._done = true;

	//Push any unparsed text into a final element in the element list
	if (this._buffer.length) {
		var rawData = this._buffer;
		this._buffer = "";
		var element = {
				raw: rawData
			, data: (this._parseState === ElementType.Text) ? rawData : rawData.replace(Parser._reTrim, "")
			, type: this._parseState
			};
		if (this._parseState === ElementType.Tag || this._parseState === ElementType.Script || this._parseState === ElementType.Style)
			element.name = this.parseTagName(element.data);
		this.parseAttribs(element);
		this._elements.push(element);
	}

	this.writeHandler();
	this._handler.done();
};

//Resets the parser to a blank state, ready to parse a new HTML document
Parser.prototype.reset = function() {
	this._buffer = "";
	this._done = false;
	this._elements = [];
	this._elementsCurrent = 0;
	this._current = 0;
	this._next = 0;
	this._location = {
		 row: 0
		, col: 0
		, charOffset: 0
		, inBuffer: 0
	};
	this._parseState = ElementType.Text;
	this._prevTagSep = '';
	this._tagStack = [];
	this._handler.reset();
};

//**Private**//
//Methods//
//Takes an array of elements and parses any found attributes
Parser.prototype.parseTagAttribs = function(elements) {
	var idxEnd = elements.length;
	var idx = 0;

	while (idx < idxEnd) {
		var element = elements[idx++];
		if (element.type === ElementType.Tag || element.type === ElementType.Script || element.type === ElementType.style)
			this.parseAttribs(element);
	}

	return(elements);
};

//Takes an element and adds an "attribs" property for any element attributes found 
Parser.prototype.parseAttribs = function(element) {
	//Only parse attributes for tags
	if (element.type !== ElementType.Script && element.type !== ElementType.Style && element.type !== ElementType.Tag)
		return;

	var tagName = element.data.split(Parser._reWhitespace, 1)[0];
	var attribRaw = element.data.substring(tagName.length);
	if (attribRaw.length < 1)
		return;

	var match;
	Parser._reAttrib.lastIndex = 0;
	while (match = Parser._reAttrib.exec(attribRaw)) {
		if (element.attribs === undefined)
			element.attribs = {};

		if (typeof match[1] === "string" && match[1].length) {
			element.attribs[match[1]] = match[2];
		} else if (typeof match[3] === "string" && match[3].length) {
			element.attribs[match[3].toString()] = match[4].toString();
		} else if (typeof match[5] === "string" && match[5].length) {
			element.attribs[match[5]] = match[6];
		} else if (typeof match[7] === "string" && match[7].length) {
			element.attribs[match[7]] = match[7];
		}
	}
};

//Extracts the base tag name from the data value of an element
Parser.prototype.parseTagName = function(data) {
	if (data === null || data === "")
		return("");
	var match = Parser._reTagName.exec(data);
	if (!match)
		return("");
	return((match[1] ? "/" : "") + match[2]);
};

//Parses through HTML text and returns an array of found elements
//I admit, this function is rather large but splitting up had an noticeable impact on speed
Parser.prototype.parseTags = function() {
	var bufferEnd = this._buffer.length - 1;
	while (Parser._reTags.test(this._buffer)) {
		this._next = Parser._reTags.lastIndex - 1;
		var tagSep = this._buffer.charAt(this._next); //The currently found tag marker
		var rawData = this._buffer.substring(this._current, this._next); //The next chunk of data to parse

		//A new element to eventually be appended to the element list
		var element = {
				raw: rawData
			, data: (this._parseState === ElementType.Text) ? rawData : rawData.replace(Parser._reTrim, "")
			, type: this._parseState
		};

		var elementName = this.parseTagName(element.data), prevElement, rawLen;

		//This section inspects the current tag stack and modifies the current
		//element if we're actually parsing a special area (script/comment/style tag)
		if (this._tagStack.length) { //We're parsing inside a script/comment/style tag
			if (this._tagStack[this._tagStack.length - 1] === ElementType.Script) { //We're currently in a script tag
				if (elementName === "/script") //Actually, we're no longer in a script tag, so pop it off the stack
					this._tagStack.pop();
				else { //Not a closing script tag
					if (element.raw.indexOf("!--") !== 0) { //Make sure we're not in a comment
						//All data from here to script close is now a text element
						element.type = ElementType.Text;
						//If the previous element is text, append the current text to it
						if (this._elements.length && this._elements[this._elements.length - 1].type === ElementType.Text) {
							prevElement = this._elements[this._elements.length - 1];
							prevElement.raw = prevElement.data = prevElement.raw + this._prevTagSep + element.raw;
							element.raw = element.data = ""; //This causes the current element to not be added to the element list
						}
					}
				}
			}
			else if (this._tagStack[this._tagStack.length - 1] === ElementType.Style) { //We're currently in a style tag
				if (elementName === "/style") //Actually, we're no longer in a style tag, so pop it off the stack
					this._tagStack.pop();
				else {
					if (element.raw.indexOf("!--") !== 0) { //Make sure we're not in a comment
						//All data from here to style close is now a text element
						element.type = ElementType.Text;
						//If the previous element is text, append the current text to it
						if (this._elements.length && this._elements[this._elements.length - 1].type === ElementType.Text) {
							prevElement = this._elements[this._elements.length - 1];
							if (element.raw !== "") {
								prevElement.raw = prevElement.data = prevElement.raw + this._prevTagSep + element.raw;
								element.raw = element.data = ""; //This causes the current element to not be added to the element list
							} else { //Element is empty, so just append the last tag marker found
								prevElement.raw = prevElement.data = prevElement.raw + this._prevTagSep;
							}
						} else { //The previous element was not text
							if (element.raw !== "") {
								element.raw = element.data = element.raw;
							}
						}
					}
				}
			}
			else if (this._tagStack[this._tagStack.length - 1] === ElementType.Comment) { //We're currently in a comment tag
				rawLen = element.raw.length;
				if (element.raw.charAt(rawLen - 2) === "-" && element.raw.charAt(rawLen - 1) === "-" && tagSep === ">") {
					//Actually, we're no longer in a style tag, so pop it off the stack
					this._tagStack.pop();
					//If the previous element is a comment, append the current text to it
					if (this._elements.length && this._elements[this._elements.length - 1].type === ElementType.Comment) {
						prevElement = this._elements[this._elements.length - 1];
						prevElement.raw = prevElement.data = (prevElement.raw + element.raw).replace(Parser._reTrimComment, "");
						element.raw = element.data = ""; //This causes the current element to not be added to the element list
						element.type = ElementType.Text;
					}
					else //Previous element not a comment
						element.type = ElementType.Comment; //Change the current element's type to a comment
				}
				else { //Still in a comment tag
					element.type = ElementType.Comment;
					//If the previous element is a comment, append the current text to it
					if (this._elements.length && this._elements[this._elements.length - 1].type === ElementType.Comment) {
						prevElement = this._elements[this._elements.length - 1];
						prevElement.raw = prevElement.data = prevElement.raw + element.raw + tagSep;
						element.raw = element.data = ""; //This causes the current element to not be added to the element list
						element.type = ElementType.Text;
					}
					else
						element.raw = element.data = element.raw + tagSep;
				}
			}
		}

		//Processing of non-special tags
		if (element.type === ElementType.Tag) {
			element.name = elementName;
			
			if (element.raw.indexOf("!--") === 0) { //This tag is really comment
				element.type = ElementType.Comment;
				delete element.name;
				rawLen = element.raw.length;
				//Check if the comment is terminated in the current element
				if (element.raw.charAt(rawLen - 1) === "-" && element.raw.charAt(rawLen - 2) === "-" && tagSep === ">")
					element.raw = element.data = element.raw.replace(Parser._reTrimComment, "");
				else { //It's not so push the comment onto the tag stack
					element.raw += tagSep;
					this._tagStack.push(ElementType.Comment);
				}
			}
			else if (element.raw.indexOf("!") === 0 || element.raw.indexOf("?") === 0) {
				element.type = ElementType.Directive;
				//TODO: what about CDATA?
			}
			else if (element.name === "script") {
				element.type = ElementType.Script;
				//Special tag, push onto the tag stack if not terminated
				if (element.data.charAt(element.data.length - 1) !== "/")
					this._tagStack.push(ElementType.Script);
			}
			else if (element.name === "/script")
				element.type = ElementType.Script;
			else if (element.name === "style") {
				element.type = ElementType.Style;
				//Special tag, push onto the tag stack if not terminated
				if (element.data.charAt(element.data.length - 1) !== "/")
					this._tagStack.push(ElementType.Style);
			}
			else if (element.name === "/style")
				element.type = ElementType.Style;
			if (element.name && element.name.charAt(0) === "/")
				element.data = element.name;
		}

		//Add all tags and non-empty text elements to the element list
		if (element.raw !== "" || element.type !== ElementType.Text) {
			if (this._options.includeLocation && !element.location) {
				element.location = this.getLocation(element.type === ElementType.Tag);
			}
			this.parseAttribs(element);
			this._elements.push(element);
			//If tag self-terminates, add an explicit, separate closing tag
			if (
				element.type !== ElementType.Text
				&&
				element.type !== ElementType.Comment
				&&
				element.type !== ElementType.Directive
				&&
				element.data.charAt(element.data.length - 1) === "/"
				)
				this._elements.push({
						raw: "/" + element.name
					, data: "/" + element.name
					, name: "/" + element.name
					, type: element.type
				});
		}
		this._parseState = (tagSep === "<") ? ElementType.Tag : ElementType.Text;
		this._current = this._next + 1;
		this._prevTagSep = tagSep;
	}

	if (this._options.includeLocation) {
		this.getLocation();
		this._location.row += this._location.inBuffer;
		this._location.inBuffer = 0;
		this._location.charOffset = 0;
	}
	this._buffer = (this._current <= bufferEnd) ? this._buffer.substring(this._current) : "";
	this._current = 0;

	this.writeHandler();
};

Parser.prototype.getLocation = function(startTag) {
	var c,
		l = this._location,
		end = this._current - (startTag ? 1 : 0),
		chunk = startTag && l.charOffset === 0 && this._current === 0;
	
	for (; l.charOffset < end; l.charOffset++) {
		c = this._buffer.charAt(l.charOffset);
		if (c === '\n') {
			l.inBuffer++;
			l.col = 0;
		} else if (c !== '\r') {
			l.col++;
		}
	}
	return {
		 line: l.row + l.inBuffer + 1
		, col: l.col + (chunk ? 0: 1)
	};
};

//Checks the handler to make it is an object with the right "interface"
Parser.prototype.validateHandler = function(handler) {
	if ((typeof handler) !== "object")
		throw new Error("Handler is not an object");
	if ((typeof handler.reset) !== "function")
		throw new Error("Handler method 'reset' is invalid");
	if ((typeof handler.done) !== "function")
		throw new Error("Handler method 'done' is invalid");
	if ((typeof handler.writeTag) !== "function")
		throw new Error("Handler method 'writeTag' is invalid");
	if ((typeof handler.writeText) !== "function")
		throw new Error("Handler method 'writeText' is invalid");
	if ((typeof handler.writeComment) !== "function")
		throw new Error("Handler method 'writeComment' is invalid");
	if ((typeof handler.writeDirective) !== "function")
		throw new Error("Handler method 'writeDirective' is invalid");
};

//Writes parsed elements out to the handler
Parser.prototype.writeHandler = function(forceFlush) {
	forceFlush = !!forceFlush;
	if (this._tagStack.length && !forceFlush)
		return;
	while (this._elements.length) {
		var element = this._elements.shift();
		switch (element.type) {
			case ElementType.Comment:
				this._handler.writeComment(element);
				break;
			case ElementType.Directive:
				this._handler.writeDirective(element);
				break;
			case ElementType.Text:
				this._handler.writeText(element);
				break;
			default:
				this._handler.writeTag(element);
				break;
		}
	}
};

Parser.prototype.handleError = function(error) {
	if ((typeof this._handler.error) === "function")
		this._handler.error(error);
	else throw error;
};

exports = Parser;