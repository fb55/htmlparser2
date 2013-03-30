var Tokenizer = require("./Tokenizer.js"),
    WritableStream = require("stream").Writable;

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
	this._tokenizer = new Tokenizer(options);

	WritableStream.call(this, options);

	var that = this,
	    tagname = "",
	    attribname = "",
	    attribs = null,
	    stack = [];

	function closeTag(name){
		if(options.lowerCaseTags) name = name.toLowerCase();
		if(stack && (!(name in emptyTags) || options.xmlMode)){
			var pos = stack.lastIndexOf(name);
			if(pos !== -1)
				if(cbs.onclosetag){
					pos = stack.length - pos;
					while(pos--) cbs.onclosetag(stack.pop());
				}
				else stack.splice(pos);
		}
	}

	function attribValue(value){
		if(cbs.onattribute) cbs.onattribute(attribname, value);
		if(attribs) attribs[attribname] = value;
		attribname = "";
	}

	this._tokenizer
		.on("text", function(data){
			if(tagname !== ""){
				if(attribname !== "") attribValue("");
				if(attribs){
					if(cbs.onopentag) cbs.onopentag(tagname, attribs);
					attribs = null;
				}
				attribname = "";
			}
			if(cbs.ontext) cbs.ontext(data);
		})
		.on("opentagname", function(name){
			if(options.lowerCaseTags) name = name.toLowerCase();
			tagname = name;

			if (!options.xmlMode && name in openImpliesClose) {
				for(
					var el;
					(el = stack[stack.length-1]) in openImpliesClose[name];
					closeTag(el)
				);
			}
			if(cbs.onopentagname) cbs.onopentagname(name);
			if(cbs.onopentag) attribs = {};
		})
		.on("closetag", closeTag)
		.on("selfclosingtag", function(){
			closeTag(tagname);
		})
		.on("attribname", function(name){
			if(attribname !== "") attribValue("");
			if(options.lowerCaseAttributeNames) name = name.toLowerCase;
			attribname = name;
		})
		.on("attribvalue", attribValue)
		.on("declaration", function(value){
			if(cbs.onprocessinginstruction){
				cbs.onprocessinginstruction("!" + value.split(/\s|\//, 1)[0], "!" + value);
			}
		})
		.on("processinginstruction", function(value){
			if(cbs.onprocessinginstruction){
				cbs.onprocessinginstruction("?" + value.split(/\s|\//, 1)[0], "?" + value);
			}
		})
		.on("comment", function(value){
			if(cbs.oncomment) cbs.oncomment(value);
			if(cbs.oncommentend) cbs.oncommentend();
		})
		.on("cdata", function(value){
			if(cbs.oncdatastart) cbs.oncdatastart();
			if(cbs.ontext) cbs.ontext(value);
			if(cbs.oncdataend) cbs.oncdataend();
		})
		.on("error", function(err){
			if(cbs.onerror) cbs.onerror(err);
			else that.emit("error", err);
		})
		;
}

require("util").inherits(Parser, WritableStream);

//Resets the parser to a blank state, ready to parse a new HTML document
Parser.prototype.reset = function(){
	this._tokenizer.removeAllListeners();
	Parser.call(this, this._cbs, this._options);
	if(this._cbs.onreset) this._cbs.onreset();
};

//Parses a complete HTML and pushes it to the handler
Parser.prototype.parseComplete = function(data){
	this.reset();
	this.end(data);
};

Parser.prototype._write = function(chunk, encoding, cb){
	this._tokenizer.write(chunk, cb);
};

//alias for backwards compat
Parser.prototype.parseChunk = Parser.prototype.write;
Parser.prototype.done = Parser.prototype.end;

module.exports = Parser;
