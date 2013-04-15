var Tokenizer = require("./Tokenizer.js");

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
		onprocessinginstruction,
		onreset,
		ontext
	*/
};

var formTags = {
	input: true,
	option: true,
	optgroup: true,
	select: true,
	button: true,
	datalist: true,
	textarea: true
};
var openImpliesClose = {
	tr      : { tr:true, th:true, td:true },
	th      : { th:true },
	td      : { thead:true, td:true },
	body    : { head:true, link:true, script:true },
	li      : { li:true },
	p       : { p:true },
	select  : formTags,
	input   : formTags,
	output  : formTags,
	button  : formTags,
	datalist: formTags,
	textarea: formTags,
	option  : { option:true },
	optgroup: { optgroup:true }
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

function Parser(cbs, options){
	if(!options) options = defaultOpts;
	if(!cbs) cbs = defaultCbs;
	this._options = options;
	this._cbs = cbs;

	this._tagname = "";
	this._attribname = "";
	this._attribs = null;
	this._stack = [];
	this._done = false;

	this._tokenizer = new Tokenizer(options, this);
}

require("util").inherits(Parser, require("events").EventEmitter);

//Tokenizer event handlers
Parser.prototype.ontext = function(data){
	if(this._cbs.ontext) this._cbs.ontext(data);
};

Parser.prototype.onopentagname = function(name){
	if(this._options.lowerCaseTags) name = name.toLowerCase();

	this._tagname = name;

	if (!this._options.xmlMode && name in openImpliesClose) {
		for(
			var el;
			(el = this._stack[this._stack.length-1]) in openImpliesClose[name];
			this.onclosetag(el)
		);
	}

	if(this._options.xmlMode || !(name in emptyTags)){
		this._stack.push(name);
	}

	if(this._cbs.onopentagname) this._cbs.onopentagname(name);
	if(this._cbs.onopentag) this._attribs = {};
};

Parser.prototype.onopentagend = function(){
	if(this._attribname !== "") this.onattribvalue("");
	if(this._attribs){
		if(this._cbs.onopentag) this._cbs.onopentag(this._tagname, this._attribs);
		this._attribs = null;
	}
	if(!this._options.xmlMode && this._cbs.onclosetag && this._tagname in emptyTags){
		this._cbs.onclosetag(this._tagname);
	}
	this._tagname = "";
};

Parser.prototype.onclosetag = function(name){
	if(this._options.lowerCaseTags) name = name.toLowerCase();
	if(this._stack.length && (!(name in emptyTags) || this._options.xmlMode)){
		var pos = this._stack.lastIndexOf(name);
		if(pos !== -1){
			if(this._cbs.onclosetag){
				pos = this._stack.length - pos;
				while(pos--) this._cbs.onclosetag(this._stack.pop());
			}
			else this._stack.splice(pos);
		}
	}
};

Parser.prototype.onselfclosingtag = function(){
	var name = this._tagname;

	this.onopentagend();

	//self-closing tags won't be on the top of the stack
	//cheaper check than before
	if(this._stack[this._stack.length-1] === name){
		if(this._cbs.onclosetag){
			this._cbs.onclosetag(this._stack.pop());
		} else {
			this._stack.pop();
		}
	}
};

Parser.prototype.onattribname = function(name){
	if(this._attribname !== "") this.onattribvalue("");
	if(this._options.lowerCaseAttributeNames) name = name.toLowerCase();
	this._attribname = name;
};

Parser.prototype.onattribvalue = function attribValue(value){
	if(this._cbs.onattribute) this._cbs.onattribute(this._attribname, value);
	if(this._attribs) this._attribs[this._attribname] = value;
	this._attribname = "";
};

Parser.prototype.ondeclaration = function(value){
	if(this._cbs.onprocessinginstruction){
		var name = value.split(/\s|\//, 1)[0];
		if(this._options.lowerCaseTags) name = name.toLowerCase();
		this._cbs.onprocessinginstruction("!" + name, "!" + value);
	}
};

Parser.prototype.onprocessinginstruction = function(value){
	if(this._cbs.onprocessinginstruction){
		var name = value.split(/\s|\//, 1)[0];
		if(this._options.lowerCaseTags) name = name.toLowerCase();
		this._cbs.onprocessinginstruction("?" + name, "?" + value);
	}
};

Parser.prototype.oncomment = function(value){
	if(this._cbs.oncomment) this._cbs.oncomment(value);
	if(this._cbs.oncommentend) this._cbs.oncommentend();
};

Parser.prototype.oncdata = function(value){
	if(this._cbs.oncdatastart) this._cbs.oncdatastart();
	if(this._cbs.ontext) this._cbs.ontext(value);
	if(this._cbs.oncdataend) this._cbs.oncdataend();
};

Parser.prototype.onerror = function(err){
	if(this._cbs.onerror) this._cbs.onerror(err);
};

Parser.prototype.onend = function(){
	if(this._cbs.onclosetag){
		for(
			var i = this._stack.length;
			i > 0;
			this._cbs.onclosetag(this._stack[--i])
		);
	}
	if(this._cbs.onend) this._cbs.onend();
};


//Resets the parser to a blank state, ready to parse a new HTML document
Parser.prototype.reset = function(){
	if(this._cbs.onreset) this._cbs.onreset();
	this._tokenizer.reset();

	this._tagname = "";
	this._attribname = "";
	this._attribs = null;
	this._stack = [];
	this._done = false;
};

//Parses a complete HTML document and pushes it to the handler
Parser.prototype.parseComplete = function(data){
	this.reset();
	this.end(data);
};

Parser.prototype.write = function(chunk){
	if(this._done) this.onerror(Error(".write() after done!"));
	this._tokenizer.write(chunk);
};

Parser.prototype.end = function(chunk){
	if(this._done) this.onerror(Error(".end() after done!"));
	this._tokenizer.end(chunk);
	this._done = true;
};

//alias for backwards compat
Parser.prototype.parseChunk = Parser.prototype.write;
Parser.prototype.done = Parser.prototype.end;

module.exports = Parser;
