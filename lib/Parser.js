var ElementType = require("./ElementType.js");

function Parser(cbs, options){
	if(options) this._options = options;
	if(cbs) this._cbs = cbs;

	this._buffer = "";
	this._tagSep = "";
	this._stack = [];
	this._contentFlags = 0;
	this._done = false;
}

//**"Static"**//
//Regular expressions used for cleaning up and parsing (stateless)
var _reTagName = /[^\s\/]+/; //matches tagnames
var _reAttrib = /([^=<>\"\'\s]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^'"\s]+))|([^=<>\"\'\s\/]+)/g;

Parser.prototype._options = {
	xmlMode: false, //Special behaviour for script/style tags by default
	lowerCaseTags: false //call .toLowerCase for each tagname
};

Parser.prototype._cbs = {
	/*
	onopentag,
	onclosetag,
	ontext,
	onprocessinginstruction,
	oncomment
	*/
};

//**Public**//
//Methods//
//Parses a complete HTML and pushes it to the handler
Parser.prototype.parseComplete = function(data){
	this.reset();
	this.write(data);
	this.end();
};

//Parses a piece of an HTML document
Parser.prototype.write =
Parser.prototype.parseChunk = function(data){
	if(this._done) this._handleError(Error("Attempted to parse chunk after parsing already done"));
	this._buffer += data; //FIXME: this can be a bottleneck
	this._parseTags();
};

//Tells the parser that the HTML being parsed is complete
Parser.prototype.end = Parser.prototype.done = function(chunk){
	if(this._done) return;
	this._done = true;

	//Parse the buffer to its end
	if(chunk) this._buffer += chunk;
	if(this._buffer) this._parseTags(true);
	
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
	var pos = data.search(/\w\s/) + 1, attrs = {}; //Find any whitespace
	if(pos === 0) return attrs;
	var attribRaw = data.substr(pos);

	_reAttrib.lastIndex = 0;
	var match;
	
	while(match = _reAttrib.exec(attribRaw)){
		if(match[1]) attrs[match[1]] = match[2] || match[3] || match[4];
		else attrs[match[5]] = match[5];
	}
	
	return attrs;
};

//Extracts the base tag name from the data value of an element
Parser.prototype._parseTagName = function(data){
	var match = data.match(_reTagName);
	if(match === null) return "";
	if(this._options.lowerCaseTags){
		return match[0].toLowerCase();
	}
	else return match[0];
};

//Special tags that are threated differently
var SpecialTags = {};
SpecialTags[ElementType.Tag] = 0;
SpecialTags[ElementType.Style]  = 1; //2^0
SpecialTags[ElementType.Script] = 2; //2^1
SpecialTags.w = 4; //2^2 - if set, append prev tag sep to data
SpecialTags[ElementType.Comment] = 8; //2^3

//Parses through HTML text and returns an array of found elements
Parser.prototype._parseTags = function(force){
	var buffer = this._buffer, current = 0;

	var next, rawData, elementType, elementData, lastTagSep;
	
	var opening = buffer.indexOf("<"), closing = buffer.indexOf(">");

	//if force is true, parse everything
	if(force) opening = Infinity;

	while(opening !== closing){ //just false if both are -1
		lastTagSep = this._tagSep;
		
		if((opening !== -1 && opening < closing) || closing === -1){
			next = opening;
			this._tagSep = "<";
			opening = buffer.indexOf("<", next + 1);
		}
		else{
			next = closing;
			this._tagSep = ">";
			closing = buffer.indexOf(">", next + 1);
		}
		rawData = buffer.substring(current, next); //The next chunk of data to parse
		
		//set elements for next run
		current = next + 1;
		
		if(this._contentFlags >= SpecialTags[ElementType.Comment]){
			//We're currently in a comment tag
			this._processComment(rawData);
			continue;
		}
		
		if(lastTagSep === "<"){
			elementData = rawData.trimLeft();
			if(elementData.charAt(0) === "/"){
				//elementData = elementData.substr(1).trim();
				elementData = this._parseTagName(elementData.substr(1));
				if(this._contentFlags !== 0){
					//if it's a closing tag, remove the flag
					if(this._contentFlags >= SpecialTags[ElementType.Script] && elementData === "script"){
						//remove the script flag (also removes the written flag)
						this._contentFlags %= SpecialTags[ElementType.Script];
					}
					else if(this._contentFlags >= SpecialTags[ElementType.Style] && elementData === "style"){
						//remove the style flag (also removes the written flag)
						this._contentFlags %= SpecialTags[ElementType.Style];
					}
					else {
						this._writeSpecial(rawData, lastTagSep);
						continue;
					}
				}
				this._processCloseTag(elementData);
			}
			else if(elementData.charAt(0) === "!" || elementData.charAt(0) === "?"){
				if(elementData.substr(0, 3) === "!--"){
					//This tag is a comment
					this._contentFlags += SpecialTags[ElementType.Comment];
					this._processComment(rawData.substr(3));
				}
				else if(this._contentFlags !== 0){
					this._writeSpecial(rawData, lastTagSep);
				}
				//This tag is a directive
				//TODO: what about CDATA?
				else if(this._cbs.onprocessinginstruction){
					this._cbs.onprocessinginstruction(
						elementData.charAt(0) + this._parseTagName(elementData.substr(1)), 
						elementData
					);
				}
			}
			else if(this._contentFlags !== 0) this._writeSpecial(rawData, lastTagSep);
			else this._processOpenTag(this._parseTagName(elementData), elementData);
		}
		else{
			if(this._contentFlags !== 0){
				this._writeSpecial(rawData, lastTagSep);
			}
			else if(rawData !== "" && this._cbs.ontext){
				this._cbs.ontext(rawData);
			}
		}
	}

	this._buffer = buffer.substring(current);
};

Parser.prototype._processComment = function(rawData){
	if(this._tagSep === ">" && rawData.substr(-2) === "--"){ //comment ends
		//remove the written flag (also removes the comment flag)
		this._contentFlags %= SpecialTags.w;
		if(this._cbs.oncomment) this._cbs.oncomment(rawData.slice(0, -2));
		if(this._cbs.oncommentend) this._cbs.oncommentend();
	}
	else if(this._cbs.oncomment) this._cbs.oncomment(rawData + this._tagSep);
};

Parser.prototype._writeSpecial = function(rawData, lastTagSep){
	//if the previous element is text, append the last tag sep to element
	if(this._contentFlags >= SpecialTags.w){
	    if(this._cbs.ontext) this._cbs.ontext(lastTagSep + rawData);
	}
	else{ //The previous element was not text
	    this._contentFlags += SpecialTags.w;
	    if(rawData !== "" && this._cbs.ontext) this._cbs.ontext(rawData);
	}
};

var emptyTags = require("./ClosingTags.js").self;

Parser.prototype._processCloseTag = function(name){
	if(this._stack && (!emptyTags[name] || this._options.xmlMode)){
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

Parser.prototype._processOpenTag = function(name, data){
	var type = ElementType.Tag;
	if(this._options.xmlMode){ /*do nothing*/ }
	else if(name === "script") type = ElementType.Script;
	else if(name === "style")  type = ElementType.Style;
	
	if(this._cbs.onopentag){
		this._cbs.onopentag(name, parseAttributes(data), type);
	}
	
	//If tag self-terminates, add an explicit, separate closing tag
	if(data.substr(-1) === "/" || (emptyTags[name] && !this._options.xmlMode)){
		if(this._cbs.onclosetag) this._cbs.onclosetag(name);
	} else {
		this._contentFlags += SpecialTags[type];
		this._stack.push(name);
	}
};

Parser.prototype._handleError = function(error){
	if(this._cbs.onerror)
		this._cbs.onerror(error);
	else throw error;
};

module.exports = Parser;