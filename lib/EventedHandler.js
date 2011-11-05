var emptyFunction = function(){};
var stripData = function(callback){
	if(typeof callback !== "function") return emptyFunction;
	return function(data){
		callback(data.data);
	};
};
var openTagCB = function(openTag, attribute){
	function attr(name, attributes){ for(var i in attributes) attribute({name:i, value:attributes[i]}); }
	if(openTag){
		var open;
		if(openTag.length === 1){ //to be compatible with sax.js
			open = function(name, attributes){ openTag({name:name, attributes:attributes}); };
		}
		else open = openTag;
		if(attribute) return function(name, attributes){open(name,attributes); attr(null, attributes);};
		else return open;
	}
	else if(attribute) return attr;
		else return emptyFunction;
};

var EventedHandler = function(cbs, options){
	//map the handlers to their callbacks
	this.writeComment = stripData(cbs.oncomment);
	this.writeDirective = stripData(cbs.onprocessinginstruction);
	this.writeText = stripData(cbs.ontext);
	this.done = cbs.onend || emptyFunction;
	
	if(options) this._options = options;
	
	//if someone wants to listen to that
	this.reset = cbs.onreset || emptyFunction;
	this.error = cbs.onerror; //if nothing was set, the error is thrown
	
	//functions to be called within writeTag
	this.onopentag = openTagCB(cbs.onopentag, cbs.onattribute);
	this.onclosetag = cbs.onclosetag || emptyFunction;
	
	//privates
	this._stack = [];
};

EventedHandler.prototype._options = {
	enforceEmptyTags: true //auto-close empty tags
};

//HTML Tags that shouldn't contain child nodes
var emptyTags={area:true,base:true,basefont:true,br:true,col:true,frame:true,hr:true,img:true,input:true,isindex:true,link:true,meta:true,param:true,embed:true};

EventedHandler.prototype.isEmptyTag = function(name){
	return this._options.enforceEmptyTags && emptyTags[name];
};

EventedHandler.prototype.openTag = function(name, attrs /*, type*/){
	if(arguments.length === 1){ //TODO
		attrs = name.attribs || {}; name = name.name;
	}
	this.onopentag(name, attrs);
	if(this.isEmptyTag(name)) this.onclosetag(name);
	else this._stack.push(name);
};

EventedHandler.prototype.closeTag = function(name){
	if(!this.isEmptyTag(name) && this._stack){
		var i = this._stack.length-1;
		while(i !== -1 && this._stack[i--] !== name){}
		if( ++i !== 0 || this._stack[0] === name)
			while(i < this._stack.length)
				this.onclosetag(this._stack.pop());
	}
	//many browsers (eg. Safari) convert </br> to <br>
	else if(this._options.enforceEmptyTags && name === "br"){
		this.onopentag(name, {});
		this.onclosetag(name);
	}
};

module.exports = EventedHandler;