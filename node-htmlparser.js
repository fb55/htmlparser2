/***********************************************
Copyright 2010, Chris Winberry <chris@winberry.net>. All rights reserved.
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to
deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
 
The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.
 
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE.
***********************************************/

(function () {

function RunningInNode () {
	return(
		(typeof require) == "function"
		&&
		(typeof exports) == "object"
		&&
		(typeof module) == "object"
		&&
		(typeof __filename) == "string"
		&&
		(typeof __dirname) == "string"
		);
}

if (!RunningInNode()) {
	if (!this.Tautologistics)
		this.Tautologistics = {};
	else if (this.Tautologistics.NodeHtmlParser)
		return; //NodeHtmlParser already defined!
	this.Tautologistics.NodeHtmlParser = {};
	exports = this.Tautologistics.NodeHtmlParser;
}

//Types of elements found in the DOM
var ElementType = {
	  Text: "text" //Plain text
	, Directive: "directive" //Special tag <!...>
	, Comment: "comment" //Special tag <!--...-->
	, Script: "script" //Special tag <script>...</script>
	, Style: "style" //Special tag <style>...</style>
	, Tag: "tag" //Any tag that isn't special
}

//HTML Tags that shouldn't contain child nodes
var EmptyTags = {
	  area: 1
	, base: 1
	, basefont: 1
	, br: 1
	, col: 1
	, frame: 1
	, hr: 1
	, img: 1
	, input: 1
	, isindex: 1
	, link: 1
	, meta: 1
	, param: 1
	, embed: 1
}

//Regular expressions used for cleaning up and parsing (stateless)
var reTrim = /(^\s+|\s+$)/g; //Trim leading/trailing whitespace
var reTrimTag = /\s*\/\s*$/g; //Remove extraneous whitespace from self-closing tag
var reTrimEndTag = /^\s*\/\s*/g; //Remove extraneous whitespace from closing tag name
var reTrimComment = /(^\!--|--$)/g; //Remove comment tag markup from comment contents
var reWhitespace = /\s/g; //Used to find any whitespace to split on
//Regular expressions used for parsing (stateful)
var reAttrib = //Find attributes in a tag
	/([^=<>\"\'\s]+)\s*=\s*"([^"]*)"|([^=<>\"\'\s]+)\s*=\s*'([^']*)'|([^=<>\"\'\s]+)\s*=\s*([^'"\s]+)|([^=<>\"\'\s\/]+)/g;
var reTags = /[\<\>]/g; //Find tag markers

//Takes an element and adds an "attribs" property for any element attributes found 
function ParseAttribs (element) {
	//Only parse attributes for tags
	if (element.type != ElementType.Script && element.type != ElementType.Style && element.type != ElementType.Tag)
		return;

	var tagName = element.data.split(reWhitespace, 1)[0];
	var attribRaw = element.data.substring(tagName.length);
	if (attribRaw.length < 1)
		return;

	var match;
	reAttrib.lastIndex = 0;
	while (match = reAttrib.exec(attribRaw)) {
		if (!element.attribs)
			element.attribs = {};

		if (typeof match[1] == "string")
			element.attribs[match[1]] = match[2];
		else if (typeof match[3] == "string")
			element.attribs[match[3]] = match[4];
		else if (typeof match[5] == "string")
			element.attribs[match[5]] = match[6];
		else if (typeof match[7] == "string")
			element.attribs[match[7]] = match[7];
	}
}

//Takes an array of elements and parses any found attributes
function ParseTagAttribs (elements) {
	var idxEnd = elements.length;
	var idx = 0;

	while (idx < idxEnd) {
		var element = elements[idx++];
		if (element.type == ElementType.Tag || element.type == ElementType.Script || element.type == ElementType.style)
			this.ParseAttribs(element);
	}

	return(elements);
}

//Extracts the base tag name from the data value of an element
function ParseTagName (data) {
	return(data.replace(reTrimEndTag, "/").replace(reTrimTag, "").split(reWhitespace).shift().toLowerCase());
}

//Parses through HTML text and returns an array of found elements
function ParseTags () {
	var bufferEnd = this._buffer.length - 1;
	while (reTags.test(this._buffer)) {
		this._next = reTags.lastIndex - 1;
		var tagSep = this._buffer[this._next]; //The currently found tag marker
		var rawData = this._buffer.substring(this._current, this._next); //The next chunk of data to parse

		//A new element to eventually be appended to the element list
		var element = {
			  raw: rawData
			, data: (this._parseState == ElementType.Text) ? rawData : rawData.replace(reTrim, "")
			, type: this._parseState
		};

		var elementName = this.ParseTagName(element.data);

		//This section inspects the current tag stack and modifies the current
		//element if we're actually parsing a special area (script/comment/style tag)
		if (this._tagStack.length) { //We're parsing inside a script/comment/style tag
			if (this._tagStack[this._tagStack.length - 1] == ElementType.Script) { //We're currently in a script tag
				if (elementName == "/script") //Actually, we're no longer in a script tag, so pop it off the stack
					this._tagStack.pop();
				else { //Not a closing script tag
					if (element.raw.indexOf("!--") != 0) { //Make sure we're not in a comment
						//All data from here to script close is now a text element
						element.type = ElementType.Text;
						//If the previous element is text, append the current text to it
						if (this._elements.length && this._elements[this._elements.length - 1].type == ElementType.Text) {
							var prevElement = this._elements[this._elements.length - 1];
							prevElement.raw = prevElement.data = prevElement.raw + this._prevTagSep + element.raw;
							element.raw = element.data = ""; //This causes the current element to not be added to the element list
						}
					}
				}
			}
			else if (this._tagStack[this._tagStack.length - 1] == ElementType.Style) { //We're currently in a style tag
				if (elementName == "/style") //Actually, we're no longer in a style tag, so pop it off the stack
					this._tagStack.pop();
				else {
					if (element.raw.indexOf("!--") != 0) { //Make sure we're not in a comment
						//All data from here to style close is now a text element
						element.type = ElementType.Text;
						//If the previous element is text, append the current text to it
						if (this._elements.length && this._elements[this._elements.length - 1].type == ElementType.Text) {
							if (element.raw != "") {
								var prevElement = this._elements[this._elements.length - 1];
								prevElement.raw = prevElement.data = prevElement.raw + this._prevTagSep + element.raw;
								element.raw = element.data = ""; //This causes the current element to not be added to the element list
							}
							else //Element is empty, so just append the last tag marker found
								prevElement.raw = prevElement.data = prevElement.raw + this._prevTagSep;
						}
						else //The previous element was not text
							if (element.raw != "")
								element.raw = element.data = element.raw;
					}
				}
			}
			else if (this._tagStack[this._tagStack.length - 1] == ElementType.Comment) { //We're currently in a comment tag
				var rawLen = element.raw.length;
				if (element.raw[rawLen - 1] == "-" && element.raw[rawLen - 1] == "-" && tagSep == ">") {
					//Actually, we're no longer in a style tag, so pop it off the stack
					this._tagStack.pop();
					//If the previous element is a comment, append the current text to it
					if (this._elements.length && this._elements[this._elements.length - 1].type == ElementType.Comment) {
						var prevElement = this._elements[this._elements.length - 1];
						prevElement.raw = prevElement.data = (prevElement.raw + element.raw).replace(reTrimComment, "");
						element.raw = element.data = ""; //This causes the current element to not be added to the element list
						element.type = ElementType.Text;
					}
					else //Previous element not a comment
						element.type = ElementType.Comment; //Change the current element's type to a comment
				}
				else { //Still in a comment tag
					element.type = ElementType.Comment;
					//If the previous element is a comment, append the current text to it
					if (this._elements.length && this._elements[this._elements.length - 1].type == ElementType.Comment) {
						var prevElement = this._elements[this._elements.length - 1];
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
		if (element.type == ElementType.Tag) {
			element.name = elementName;
			
			if (element.raw.indexOf("!--") == 0) { //This tag is really comment
				element.type = ElementType.Comment;
				delete element["name"];
				var rawLen = element.raw.length;
				//Check if the comment is terminated in the current element
				if (element.raw[rawLen - 1] == "-" && element.raw[rawLen - 2] == "-" && tagSep == ">")
					element.raw = element.data = element.raw.replace(reTrimComment, "");
				else { //It's not so push the comment onto the tag stack
					element.raw += tagSep;
					this._tagStack.push(ElementType.Comment);
				}
			}
			else if (element.raw.indexOf("!") == 0) {
				element.type = ElementType.Directive;
				//TODO: what about CDATA?
			}
			else if (element.name == "script") {
				element.type = ElementType.Script;
				//Special tag, push onto the tag stack if not terminated
				if (element.data[element.data.length - 1] != "/")
					this._tagStack.push(ElementType.Script);
			}
			else if (element.name == "/script")
				element.type = ElementType.Script;
			else if (element.name == "style") {
				element.type = ElementType.Style;
				//Special tag, push onto the tag stack if not terminated
				if (element.data[element.data.length - 1] != "/")
					this._tagStack.push(ElementType.Style);
			}
			else if (element.name == "/style")
				element.type = ElementType.Style;
			if (element.name && element.name[0] == "/")
				element.data = element.name;
		}

		//Add all tags and non-empty text elements to the element list
		if (element.raw != "" || element.type != ElementType.Text) {
			this.ParseAttribs(element);
			this._elements.push(element);
			//If tag self-terminates, add an explicit, separate closing tag
			if (
				element.type != ElementType.Text
				&&
				element.type != ElementType.Comment
				&&
				element.type != ElementType.Directive
				&&
				element.data[element.data.length - 1] == "/"
				)
				this._elements.push({
					  raw: "/" + element.name
					, data: "/" + element.name
					, name: "/" + element.name
					, type: element.type
				});
		}
		this._parseState = (tagSep == "<") ? ElementType.Tag : ElementType.Text;
		this._current = this._next + 1;
		this._prevTagSep = tagSep;
	}

	this._buffer = (this._current <= bufferEnd) ? this._buffer.substring(this._current) : "";
	this._current = 0;

	this.WriteHandler();
}

function WriteHandler (forceFlush) {
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
}

function ParseComplete (data) {
	this.Reset();
	this.ParseChunk(data);
	this.Done();
}

function ParseChunk (data) {
	if (this._done)
		this.HandleError(new Error("Attempted to parse chunk after parsing already done"));
	this._buffer += data;
	this.ParseTags();
}

function HandleError (error) {
	if ((typeof this._handler.error) == "function")
		this._handler.error(error);
	else
		throw error;
}

function Done () {
	if (this._done)
		return;
	this._done = true;

	//Push any unparsed text into a final element in the element list
	if (this._buffer.length) {
		var rawData = this._buffer;
		this._buffer = "";
		var element = {
			  raw: rawData
			, data: (this._parseState == ElementType.Text) ? rawData : rawData.replace(reTrim, "")
			, type: this._parseState
			};
		if (this._parseState == ElementType.Tag || this._parseState == ElementType.Script || this._parseState == ElementType.Style)
			element.name = this.ParseTagName(element.data);
		this.ParseAttribs(element);
		this._elements.push(element);
	}

	this.WriteHandler();
	this._handler.done();
}

function Reset () {
	this.dom = [];
	this._buffer = "";
	this._done = false;
	this._elements = [];
	this._elementsCurrent = 0;
	this._current = 0;
	this._next = 0;
	this._parseState = ElementType.Text;
	this._prevTagSep = '';
	this._tagStack = [];
	this._handler.reset();
}

function ValidateHandler (handler) {
	if ((typeof handler) != "object")
		throw new Error("Handler is not an object");
	if ((typeof handler.reset) != "function")
		throw new Error("Handler method 'reset' is invalid");
	if ((typeof handler.done) != "function")
		throw new Error("Handler method 'done' is invalid");
	if ((typeof handler.writeTag) != "function")
		throw new Error("Handler method 'writeTag' is invalid");
	if ((typeof handler.writeText) != "function")
		throw new Error("Handler method 'writeText' is invalid");
	if ((typeof handler.writeComment) != "function")
		throw new Error("Handler method 'writeComment' is invalid");
	if ((typeof handler.writeDirective) != "function")
		throw new Error("Handler method 'writeDirective' is invalid");
}

function Parser (handler) {
	this.ValidateHandler(handler);
	this._handler = handler;
	this.Reset();
}
	//**Public**//
	//Properties//
	Parser.prototype.dom = null; //Parsed and nested elements
	//Methods//
	Parser.prototype.ParseComplete = ParseComplete;
	Parser.prototype.ParseChunk = ParseChunk;
	Parser.prototype.Done = Done;
	Parser.prototype.Reset = Reset;
	
	//**Private**//
	//Properties//
	Parser.prototype._handler = null; //Handler for parsed elements
	Parser.prototype._buffer = null; //Buffer of unparsed data
	Parser.prototype._done = false; //Flag indicating whether parsing is done
	Parser.prototype._elements =  null; //Array of parsed elements
	Parser.prototype._elementsCurrent = 0; //Pointer to last element in _elements that has been processed
	Parser.prototype._current = 0; //Position in data that has already been parsed
	Parser.prototype._next = 0; //Position in data of the next tag marker (<>)
	Parser.prototype._parseState = ElementType.Text; //Current type of element being parsed
	Parser.prototype._prevTagSep = ''; //Previous tag marker found
	//Stack of element types previously encountered; keeps track of when
	//parsing occurs inside a script/comment/style tag
	Parser.prototype._tagStack = null;
	//Methods//
//	Parser.prototype.NestTags = NestTags;
	Parser.prototype.ParseTagAttribs = ParseTagAttribs;
	Parser.prototype.ParseAttribs = ParseAttribs;
	Parser.prototype.ParseTagName = ParseTagName;
	Parser.prototype.ParseTags = ParseTags;
	Parser.prototype.ValidateHandler = ValidateHandler;
	Parser.prototype.WriteHandler = WriteHandler;
	Parser.prototype.HandleError = HandleError;

function DefaultHandler (callback) {
	this.reset();
	if ((typeof callback) == "function")
		this._callback = callback;
}
	//**Public**//
	//Properties//
	DefaultHandler.prototype.dom = null; //The hierarchical object containing the parsed HTML
	//Methods//
	//Resets the handler back to starting state
	DefaultHandler.prototype.reset = function DefaultHandler$reset() {
		this.dom = [];
		this._done = false;
		this._tagStack = [];
		this._tagStack.last = function DefaultHandler$_tagStack$last () {
			return(this.length ? this[this.length - 1] : null);
		}
	}
	//Signals the handler that parsing is done
	DefaultHandler.prototype.done = function DefaultHandler$done () {
		this._done = true;
		this.handleCallback(null);
	}
	DefaultHandler.prototype.writeTag = function DefaultHandler$writeTag (element) {
		this.handleElement(element);
	} 
	DefaultHandler.prototype.writeText = function DefaultHandler$writeText (element) {
		this.handleElement(element);
	} 
	DefaultHandler.prototype.writeComment = function DefaultHandler$writeComment (element) {
		this.handleElement(element);
	} 
	DefaultHandler.prototype.writeDirective = function DefaultHandler$writeDirective (element) {
		this.handleElement(element);
	}
	DefaultHandler.prototype.error = function DefaultHandler$error (error) {
		this.handleCallback(error);
	}

	//**Private**//
	//Properties//
	DefaultHandler.prototype._callback = null; //Callback to respond to when parsing done
	DefaultHandler.prototype._done = false; //Flag indicating whether handler has been notified of parsing completed
	DefaultHandler.prototype._tagStack = null; //List of parents to the currently element being processed
	//Methods//
	DefaultHandler.prototype.handleCallback = function DefaultHandler$handleCallback (error) {
			if ((typeof this._callback) != "function")
				if (error)
					throw error;
				else
					return;
			this._callback(error, this.dom);
	}
	DefaultHandler.prototype.handleElement = function DefaultHandler$handleElement (element) {
		if (this._done)
			this.handleCallback(new Error("Writing to the handler after done() called is not allowed without a reset()"));
		if (!this._tagStack.last()) { //There are no parent elements
			//If the element can be a container, add it to the tag stack and the top level list
			if (element.type != ElementType.Text && element.type != ElementType.Comment && element.type != ElementType.Directive) {
				if (element.name[0] != "/") { //Ignore closing tags that obviously don't have an opening tag
					this.dom.push(element);
					if (!EmptyTags[element.name]) { //Don't add tags to the tag stack that can't have children
						this._tagStack.push(element);
					}
				}
			}
			else //Otherwise just add to the top level list
				this.dom.push(element);
		}
		else { //There are parent elements
			//If the element can be a container, add it as a child of the element
			//on top of the tag stack and then add it to the tag stack
			if (element.type != ElementType.Text && element.type != ElementType.Comment && element.type != ElementType.Directive) {
				if (element.name[0] == "/") {
					//This is a closing tag, scan the tagStack to find the matching opening tag
					//and pop the stack up to the opening tag's parent
					var baseName = element.name.substring(1);
					if (!EmptyTags[baseName]) {
						var pos = this._tagStack.length - 1;
						while (pos > -1 && this._tagStack[pos--].name != baseName) { }
						if (pos > -1 || this._tagStack[0].name == baseName)
							while (pos < this._tagStack.length - 1)
								this._tagStack.pop();
					}
				}
				else { //This is not a closing tag
					if (!this._tagStack.last().children)
						this._tagStack.last().children = [];
					this._tagStack.last().children.push(element);
					if (!EmptyTags[element.name]) //Don't add tags to the tag stack that can't have children
						this._tagStack.push(element);
				}
			}
			else { //This is not a container element
				if (!this._tagStack.last().children)
					this._tagStack.last().children = [];
				this._tagStack.last().children.push(element);
			}
		}
	}

exports.Parser = Parser;

exports.DefaultHandler = DefaultHandler;

exports.ElementType = ElementType;

})();
