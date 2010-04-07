var sys = require("sys");

//Types of elements found in the DOM
var ElementType = {
	  Text: "text"
	, Tag: "tag"
	, Directive: "directive"
	, Comment: "comment"
	, Script: "script"
	, Style: "style"
}

//HTML Tags that shouldn't contain child nodes
var emptyTags = {
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

//Regular expressions used for cleaning up and parsing (not stateful)
var reTrim = /(^\s+|\s+$)/g;
var reTrimTag = /\s*\/\s*$/g;
var reTrimEndTag = /^\s*\/\s*/g;
var reTrimComment = /(^\!--|--$)/g;
var reWhitespace = /\s/g;
//Regular expressions used for parsing (stateful)
var reAttrib = /([^=<>\"\'\s]+)\s*=\s*"([^"]*)"|([^=<>\"\'\s]+)\s*=\s*'([^']*)'|([^=<>\"\'\s]+)\s*=\s*([^'"\s]+)|([^=<>\"\'\s\/]+)/g;
var reTags = /[\<\>]/g;

//Takes in an array of elements and folds it into an nested DOM
function NestTags (elements) {
	//Top level list of elements in the hierarchy
	var nested = [];

	//List of parents to the currently element being processed
	var tagStack = [];
	tagStack.last = function last () {
		return(this.length ? this[this.length - 1] : null);
	}

	var idxEnd = elements.length;
	var idx = 0;
	//Loop through all the elements in the list
	while (idx < idxEnd) {
		var element = elements[idx++];

		if (!tagStack.last()) { //There are no parent elements
			//If the element can be a container, add it to the tag stack and the top level list
			if (element.type != ElementType.Text && element.type != ElementType.Comment && element.type != ElementType.Directive) {
				if (element.name[0] != "/") { //Ignore closing tags that obviously don't have an opening tag
					nested.push(element);
					if (!emptyTags[element.name]) { //Don't add tags to the tag stack that can't have children
						tagStack.push(element);
					}
				}
			}
			else //Otherwise just add to the top level list
				nested.push(element);
		}
		else { //There are parent elements
			//If the element can be a container, add it as a child of the element
			//on top of the tag stack and then add it to the tag stack
			if (element.type != ElementType.Text && element.type != ElementType.Comment && element.type != ElementType.Directive) {
				if (element.name[0] == "/") {
					//This is a closing tag, scan the tagStack to find the matching opening tag
					//and pop the stack up to the opening tag's parent
					var baseName = element.name.substring(1);
					if (!emptyTags[baseName]) {
						var pos = tagStack.length - 1;
						while (pos > -1 && tagStack[pos--].name != baseName) { }
						if (pos > -1 || tagStack[0].name == baseName)
							while (pos < tagStack.length - 1)
								tagStack.pop();
					}
				}
				else { //This is not a closing tag
					if (!tagStack.last().children)
						tagStack.last().children = [];
					tagStack.last().children.push(element);
					if (!emptyTags[element.name]) //Don't add tags to the tag stack that can't have children
						tagStack.push(element);
				}
			}
			else { //This is not a container element
				if (!tagStack.last().children)
					tagStack.last().children = [];
				tagStack.last().children.push(element);
			}
		}
	}

	return(nested);
}

//Takes an element and adds an "attribs" property for any element attributes found 
function ParseAttribs (element) {
	var tagName = element.data.split(reWhitespace, 1)[0];
	var attribRaw = element.data.substring(tagName.length);
	if (attribRaw.length < 1)
		return;

	var match;
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
			ParseAttribs(element);
	}

	return(elements);
}

//Extracts the base tag name from the data value of an element
function ParseTagName (data) {
	return(data.replace(reTrimEndTag, "/").replace(reTrimTag, "").split(reWhitespace).shift().toLowerCase());
}

//Parses through HTML text and returns an array of found elements
function ParseTags (data) {
	var elements = [];

	var current = 0; //Position in data that has already been parsed 
	var next = 0; //Position in data of the next tag marker (<>)
	var end = data.length - 1;
	var state = ElementType.Text; //Current type of element being parsed
	var prevTagSep = ''; //Previous tag marker found
	//Stack of element types previously encountered; keeps track of when
	//parsing occurs inside a script/comment/style tag
	var tagStack = [];

	while (reTags.test(data)) {
		next = reTags.lastIndex - 1;
		var tagSep = data[next]; //The currently found tag marker
		var rawData = data.substring(current, next); //The next chunk of data to parse

		//A new element to eventually be appended to the element list
		var element = {
			  raw: rawData
			, data: (state == ElementType.Text) ? rawData : rawData.replace(reTrim, "")
			, type: state
		};

		var elementName = ParseTagName(element.data);

		//This section inspects the current tag stack and modifies the current
		//element if we're actually parsing a special area (script/comment/style tag)
		if (tagStack.length) { //We're parsing inside a script/comment/style tag
			if (tagStack[tagStack.length - 1] == ElementType.Script) { //We're currently in a script tag
				if (elementName == "/script") //Actually, we're no longer in a script tag, so pop it off the stack
					tagStack.pop();
				else { //Not a closing script tag
					if (element.raw.indexOf("!--") != 0) { //Make sure we're not in a comment
						//All data from here to script close is now a text element
						element.type = ElementType.Text;
						//If the previous element is text, append the current text to it
						if (elements.length && elements[elements.length - 1].type == ElementType.Text) {
							if (element.raw != "") {
								var prevElement = elements[elements.length - 1];
								prevElement.raw = prevElement.data = prevElement.raw + prevTagSep + element.raw;
								element.raw = element.data = ""; //This causes the current element to not be added to the element list
							}
							else //Element is empty, so just append the last tag marker found
								prevElement.raw = prevElement.data = prevElement.raw + prevTagSep;
						}
						else //The previous element was not text
							if (element.raw != "")
								element.raw = element.data = element.raw;
					}
				}
			}
			else if (tagStack[tagStack.length - 1] == ElementType.Style) { //We're currently in a style tag
				if (elementName == "/style") //Actually, we're no longer in a style tag, so pop it off the stack
					tagStack.pop();
				else {
					if (element.raw.indexOf("!--") != 0) { //Make sure we're not in a comment
						//All data from here to style close is now a text element
						element.type = ElementType.Text;
						//If the previous element is text, append the current text to it
						if (elements.length && elements[elements.length - 1].type == ElementType.Text) {
							if (element.raw != "") {
								var prevElement = elements[elements.length - 1];
								prevElement.raw = prevElement.data = prevElement.raw + prevTagSep + element.raw;
								element.raw = element.data = ""; //This causes the current element to not be added to the element list
							}
							else //Element is empty, so just append the last tag marker found
								prevElement.raw = prevElement.data = prevElement.raw + prevTagSep;
						}
						else //The previous element was not text
							if (element.raw != "")
								element.raw = element.data = element.raw;
					}
				}
			}
			else if (tagStack[tagStack.length - 1] == ElementType.Comment) { //We're currently in a comment tag
				var rawLen = element.raw.length;
				if (element.raw[rawLen - 1] == "-" && element.raw[rawLen - 1] == "-" && tagSep == ">") {
					//Actually, we're no longer in a style tag, so pop it off the stack
					tagStack.pop();
					//If the previous element is a comment, append the current text to it
					if (elements.length && elements[elements.length - 1].type == ElementType.Comment) {
						var prevElement = elements[elements.length - 1];
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
					if (elements.length && elements[elements.length - 1].type == ElementType.Comment) {
						var prevElement = elements[elements.length - 1];
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
					tagStack.push(ElementType.Comment);
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
					tagStack.push(ElementType.Script);
			}
			else if (element.name == "/script")
				element.type = ElementType.Script;
			else if (element.name == "style") {
				element.type = ElementType.Style;
				//Special tag, push onto the tag stack if not terminated
				if (element.data[element.data.length - 1] != "/")
					tagStack.push(ElementType.Style);
			}
			else if (element.name == "/style")
				element.type = ElementType.Style;
			if (element.name && element.name[0] == "/")
				element.data = element.name;
		}

		//Add all tags and non-empty text elements to the element list
		if (element.raw != "" || element.type != ElementType.Text) {
			elements.push(element);
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
				elements.push({
					  raw: "/" + element.name
					, data: "/" + element.name
					, name: "/" + element.name
					, type: element.type
				});
		}
		state = (tagSep == "<") ? ElementType.Tag : ElementType.Text;
		current = next + 1;
		prevTagSep = tagSep;
	}

	//Push any unparsed text into a final element in the element list
	if (current < end) {
		var rawData = data.substring(current);
		var element = {
			  raw: rawData
			, data: (state == ElementType.Text) ? rawData : rawData.replace(reTrim, "")
			, type: state
			};
		if (state == ElementType.Tag || state == ElementType.Script || state == ElementType.Style)
			element.name = ParseTagName(element.data);
		elements.push(element);
	}

	return(elements);
}

exports.ParseHtml = function ParseHtml (data) {
	return(NestTags(ParseTagAttribs(ParseTags(data))));
}

exports.ElementType = ElementType;
