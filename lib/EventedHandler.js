var EventedHandler = function(cbs){
	//map the handlers to their callbacks
	this.writeComment = stripData(cbs.oncomment);
	this.writeDirective = stripData(cbs.onprocessinginstruction);
	this.writeText = stripData(cbs.ontext);
	this.done = cbs.onend || emptyFunction;
	
	//if someone wants to listen to that
	this.reset = cbs.onreset || emptyFunction;
	this.error = cbs.onerror; //if nothing was set, the error is thrown
	
	//functions to be called within writeTag
	this.onopentag = openTagCB(cbs.onopentag, cbs.onattribute);
	this.onclosetag = cbs.onclosetag || emptyFunction;
	
	//privates
	this._stack = [];
};

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
			open = function open(name, attributes){ openTag({name:name, attributes:attributes}); }
		}
		else open = openTag
		if(attribute) return function(name, attributes){open(name,attributes); attr(null, attributes);};
		else return open;
	}
	else if(attribute) return attr;
		else return emptyFunction;
};

//HTML Tags that shouldn't contain child nodes
var emptyTags={area:true,base:true,basefont:true,br:true,col:true,frame:true,hr:true,img:true,input:true,isindex:true,link:true,meta:true,param:true,embed:true};

EventedHandler.prototype.openTag = function(name, attrs){
	this.onopentag(name, attrs);
	if(emptyTags[name]) this.onclosetag(name);
	else this._stack.push(name);
};

EventedHandler.prototype.closeTag = function(name){
	if(!emptyTags[name] && this._stack){
		var i = this._stack.length-1;
		while(i !== -1 && this._stack[i--] !== name){};
		if( ++i !== 0 || this._stack[0] === name)
			while(i < this._stack.length)
				this.onclosetag(this._stack.pop());
	}
	else if(name === "br"){//many browsers (eg. Safari) convert </br> to <br>
		this.onopentag(name, {});
		this.onclosetag(name);
	}
};

EventedHandler.prototype.writeTag = function(element){
	if(element.name.charAt(0) === "/")
		this.closeTag(element.name.substr(1));
	else
		this.openTag(element.name, element.attribs || {});
};

module.exports = EventedHandler;