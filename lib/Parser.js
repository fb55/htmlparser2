var ElementType = require("./ElementType.js");

function Parser(cbs, options){
	this._options = options || defaultOpts;
	this._cbs = cbs || defaultCbs;
	this._buffer = "";
	this._tagSep = "";
	this._stack = [];
	this._wroteSpecial = false;
	this._contentFlags = 0;
	this._done = false;
	this._running = true; //false if paused
}

//Regular expressions used for cleaning up and parsing (stateless)
var _reAttrib = /\s([^\s\/]+?)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))|(?=\s)|\/|$)/g,
    _reTail = /\s|\/|$/;

var defaultOpts = {
	xmlMode: false, //Special behavior for script/style tags by default
	lowerCaseAttributeNames: false, //call .toLowerCase for each attribute name
	lowerCaseTags: false //call .toLowerCase for each tag name
};

var defaultCbs = {
	/*
		This is just a plain object
		so that the parser doesn't
		throw if no arguments were
		provided.
	*/
	/*
		oncdataend,
		oncdatastart,
		onclosetag,
		oncomment,
		oncommentend,
		onerror,
		onopentag,
		onopentagend,
		onprocessinginstruction,
		onreset,
		ontext
	*/
};

//Parses a complete HTML and pushes it to the handler
Parser.prototype.parseComplete = function(data){
	this.reset();
	this.end(data);
};

//Parses a piece of an HTML document
Parser.prototype.parseChunk =
Parser.prototype.write = function(data){
	if(this._done) this._handleError("Attempted to parse chunk after parsing already done");
	this._buffer += data; //FIXME: this can be a bottleneck
	if(this._running) this._parseTags();
};

//Tells the parser that the HTML being parsed is complete
Parser.prototype.done =
Parser.prototype.end = function(chunk){
	if(this._done) return;

	if(chunk) this.write(chunk);
	this._done = true;
	
	if(this._running) this._finishParsing();
};

Parser.prototype._finishParsing = function(){
	//Parse the buffer to its end
	if(this._buffer) this._parseTags(true);
	
	if(this._cbs.onclosetag){
		while(this._stack.length) this._cbs.onclosetag(this._stack.pop());
	}
	
	if(this._cbs.onend) this._cbs.onend();
};

Parser.prototype.pause = function(){
	if(!this._done) this._running = false;
};

Parser.prototype.resume = function(){
	if(this._running) return;
	this._running = true;
	this._parseTags();
	if(this._done) this._finishParsing();
};

//Resets the parser to a blank state, ready to parse a new HTML document
Parser.prototype.reset = function(){
	Parser.call(this, this._cbs, this._options);
	if(this._cbs.onreset) this._cbs.onreset();
};

//Extracts the base tag name from the data value of an element
Parser.prototype._parseTagName = function(data){
	var match = data.substr(0, data.search(_reTail));
	if(!this._options.lowerCaseTags) return match;
	return match.toLowerCase();
};

//Special tags that are treated differently
var SpecialTags = {};
//SpecialTags[ElementType.Tag]   = 0x0;
SpecialTags[ElementType.Style]   = 0x1; //2^0
SpecialTags[ElementType.Script]  = 0x2; //2^1
SpecialTags[ElementType.Comment] = 0x4; //2^2
SpecialTags[ElementType.CDATA]   = 0x8; //2^3

var TagValues = {
	style: 1,
	script: 2
};

//Parses through HTML text and returns an array of found elements
Parser.prototype._parseTags = function(force){
	var current = 0,
	    opening = this._buffer.indexOf("<"),
	    closing = this._buffer.indexOf(">"),
	    next, rawData, elementData, lastTagSep;

	//if force is true, parse everything
	if(force) opening = Infinity;

	//opening !== closing is just false if both are -1
	while(opening !== closing && this._running){
		lastTagSep = this._tagSep;
		
		if((opening !== -1 && opening < closing) || closing === -1){
			next = opening;
			this._tagSep = "<";
			opening = this._buffer.indexOf("<", next + 1);
		}
		else{
			next = closing;
			this._tagSep = ">";
			closing = this._buffer.indexOf(">", next + 1);
		}
		rawData = this._buffer.substring(current, next); //The next chunk of data to parse
		
		//set elements for next run
		current = next + 1;
		
		if(this._contentFlags >= SpecialTags[ElementType.CDATA]){
			// We're inside a CDATA section
			this._writeCDATA(rawData);

		}
		else if(this._contentFlags >= SpecialTags[ElementType.Comment]){
			//We're in a comment tag
			this._writeComment(rawData);
		}
		else if(lastTagSep === "<"){
			elementData = rawData.trimLeft();
			if(elementData.charAt(0) === "/"){
				//elementData = elementData.substr(1).trim();
				elementData = this._parseTagName(elementData.substr(1));
				if(this._contentFlags !== 0){
					//if it's a closing tag, remove the flag
					if(this._contentFlags & TagValues[elementData]){
						//remove the flag
						this._contentFlags ^= TagValues[elementData];
					} else {
						this._writeSpecial(rawData, lastTagSep);
						continue;
					}
				}
				this._processCloseTag(elementData);
			}
			else if(elementData.charAt(0) === "!"){
				if(elementData.substr(1, 7) === "[CDATA["){
					this._contentFlags |= SpecialTags[ElementType.CDATA];
					if(this._cbs.oncdatastart) this._cbs.oncdatastart();
					this._writeCDATA(elementData.substr(8));
				}
				else if(this._contentFlags !== 0) this._writeSpecial(rawData, lastTagSep);
				else if(elementData.substr(1, 2) === "--"){
					//This tag is a comment
					this._contentFlags |= SpecialTags[ElementType.Comment];
					this._writeComment(rawData.substr(3));
				}
				//TODO: This isn't a processing instruction, needs a new name
				else if(this._cbs.onprocessinginstruction){
					this._cbs.onprocessinginstruction(
						"!" + this._parseTagName(elementData.substr(1)),
						elementData
					);
				}
			}
			else if(this._contentFlags !== 0) this._writeSpecial(rawData, lastTagSep);
			else if(elementData.charAt(0) === "?"){
				if(this._cbs.onprocessinginstruction){
					this._cbs.onprocessinginstruction(
						"?" + this._parseTagName(elementData.substr(1)),
						elementData
					);
				}
			}
			else this._processOpenTag(elementData);
		}
		else{
			if(this._contentFlags !== 0){
				this._writeSpecial(rawData, ">");
			}
			else if(rawData !== "" && this._cbs.ontext){
				if(this._tagSep === ">") rawData += ">"; //it's the second > in a row
				this._cbs.ontext(rawData);
			}
		}
	}

	this._buffer = this._buffer.substr(current);
};

Parser.prototype._writeCDATA = function(data){
	if(this._tagSep === ">" && data.substr(-2) === "]]"){
		// CDATA ends
		if(data.length !== 2 && this._cbs.ontext){
			this._cbs.ontext(data.slice(0,-2));
		}
		this._contentFlags ^= SpecialTags[ElementType.CDATA];
		if(this._cbs.oncdataend) this._cbs.oncdataend();
    }
    else if(this._cbs.ontext) this._cbs.ontext(data + this._tagSep);
};

Parser.prototype._writeComment = function(rawData){
	if(this._tagSep === ">" && rawData.substr(-2) === "--"){ //comment ends
		//remove the written flag (also removes the comment flag)
		this._contentFlags ^= SpecialTags[ElementType.Comment];
		this._wroteSpecial = false;
		if(this._cbs.oncomment) this._cbs.oncomment(rawData.slice(0, -2));
		if(this._cbs.oncommentend) this._cbs.oncommentend();
	}
	else if(this._cbs.oncomment) this._cbs.oncomment(rawData + this._tagSep);
};

Parser.prototype._writeSpecial = function(rawData, lastTagSep){
	//if the previous element is text, append the last tag sep to element
	if(this._wroteSpecial){
		if(this._cbs.ontext) this._cbs.ontext(lastTagSep + rawData);
	}
	else{ //The previous element was not text
		this._wroteSpecial = true;
		if(rawData !== "" && this._cbs.ontext) this._cbs.ontext(rawData);
	}
};

var emptyTags = {
	__proto__: null,
	area: true,
	base: true,
	basefont: true,
	br: true,
	col: true,
	frame: true,
	hr: true,
	img: true,
	input: true,
	isindex: true,
	link: true,
	meta: true,
	param: true,
	embed: true
};

Parser.prototype._processCloseTag = function(name){
	if(this._stack && (!(name in emptyTags) || this._options.xmlMode)){
		var pos = this._stack.lastIndexOf(name);
		if(pos !== -1)
			if(this._cbs.onclosetag){
				pos = this._stack.length - pos;
				while(pos--) this._cbs.onclosetag(this._stack.pop());
			}
			else this._stack.splice(pos);
	}
	//many browsers (eg. Safari, Chrome) convert </br> to <br>
	else if(name === "br" && !this._options.xmlMode){
		this._processOpenTag(name + "/");
	}
};

Parser.prototype._parseAttributes = function(data, lcNames){
	for(var match; match = _reAttrib.exec(data);){
		this._cbs.onattribute(lcNames ? match[1].toLowerCase() : match[1], match[2] || match[3] || match[4] || "");
	}
};

//parses the attribute string
var parseAttributes = function(data, lcNames){
	var attrs = {};
	for(var match; match = _reAttrib.exec(data);){
		attrs[lcNames ? match[1].toLowerCase() : match[1]] = match[2] || match[3] || match[4] || "";
	}
	return attrs;
};

Parser.prototype._processOpenTag = function(data){
	var name = this._parseTagName(data),
	    type = ElementType.Tag;
	
	if(this._options.xmlMode){ /*do nothing*/ }
	else if(name === "script") type = ElementType.Script;
	else if(name === "style")  type = ElementType.Style;

	if(this._cbs.onopentagname)	this._cbs.onopentagname(name);
	if(this._cbs.onopentag){
		this._cbs.onopentag(name, parseAttributes(
			data, this._options.lowerCaseAttributeNames
		));
	}
	if(this._cbs.onattribute){
		this._parseAttributes(data, this._options.lowerCaseAttributeNames);
	}
	if(this._cbs.onopentagend) this._cbs.onopentagend();
	
	//If tag self-terminates, add an explicit, separate closing tag
	if(data.substr(-1) === "/" || (name in emptyTags && !this._options.xmlMode)){
		if(this._cbs.onclosetag) this._cbs.onclosetag(name);
	} else {
		if(type !== ElementType.Tag){
			this._contentFlags |= SpecialTags[type];
			this._wroteSpecial = false;
		}
		this._stack.push(name);
	}
};

Parser.prototype._handleError = function(error){
	error = new Error(error);
	if(this._cbs.onerror) this._cbs.onerror(error);
	else throw error;
};

module.exports = Parser;