var EventedHandler = function(cbs, options){
	this._cbs = cbs || {};
	if(options) this._options = options;
	
	//privates
	this._stack = [];
};

EventedHandler.prototype._options = {
	enforceEmptyTags: true //auto-close empty tags
};

var emptyTags = require("./ClosingTags.js").self;

EventedHandler.prototype.isEmptyTag = function(name){
	return this._options.enforceEmptyTags && emptyTags[name];
};

EventedHandler.prototype.openTag = function(name, attrs /*, type*/){
	if(this._cbs.onopentag) this._cbs.onopentag(name, attrs);
	if(this.isEmptyTag(name)){
		if(this._cbs.onclosetag) this._cbs.onclosetag(name);
	}
	else this._stack.push(name);
};

EventedHandler.prototype.closeTag = function(name){
	if(this._stack && !this.isEmptyTag(name)){
		if(!this._cbs.onclosetag) return; //nothing to do
		var i = this._stack.length;
		while(i !== 0 && this._stack[--i] !== name){}
		if(i !== 0 || this._stack[0] === name)
			while(i < this._stack.length)
				this._cbs.onclosetag(this._stack.pop());
	}
	//many browsers (eg. Safari, Chrome) convert </br> to <br>
	else if(name === "br" && this._options.enforceEmptyTags)
		this.openTag(name, {});
};

EventedHandler.prototype.done = function(){
	//close all tags that are still opened
	this.closeTag(this._stack[0]); //TODO what about self-closing tags?
	if(this._cbs.onend) this._cbs.onend();
};

//wrappers for the callbacks
EventedHandler.prototype.writeComment = function(data){
	var cb = this._cbs.oncomment;
	if(cb) cb(data);
};

EventedHandler.prototype.writeText = function(text){
	var cb = this._cbs.ontext;
	if(cb) cb(text);
};

EventedHandler.prototype.writeDirective = function(name, data){
	var cb = this._cbs.onprocessinginstruction;
	if(cb) cb(name, data);
};

EventedHandler.prototype.reset = function(){
	if(this._cbs.onreset) this._cbs.onreset();
};

EventedHandler.prototype.error = function(error){
	if(this._cbs.onerror) this._cbs.onerror();
	else throw error;
};

//export the evented handler
module.exports = EventedHandler;