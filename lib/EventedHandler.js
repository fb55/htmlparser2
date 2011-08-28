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
	this.onOpenTag = openTagCB(cbs.onopentag, cbs.onattribute);
	this.onCloseTag = cbs.onclosetag || emptyFunction;
	
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
	function open(name, attributes){ openTag({name:name, attributes:attributes}); }
	function attr(name, attributes){ for(var i in attributes) attribute({name:i, value:attributes[i]}); }
	if(openTag){
		if(attribute) return function(name, attributes){open(name,attributes); attr(null, attributes);};
		else return open;
	}
	else if(attribute) return attr;
		else return emptyFunction;
};

//HTML Tags that shouldn't contain child nodes
var emptyTags={area:true,base:true,basefont:true,br:true,col:true,frame:true,hr:true,img:true,input:true,isindex:true,link:true,meta:true,param:true,embed:true};

EventedHandler.prototype.writeTag = function(element){
	var closing = element.name.charAt(0) === "/",
		name = closing ? element.name.substring(1) : element.name,
		attributes = element.attribs || {},
		empty = emptyTags[name];
	
	if(closing){
		if(!empty){
			var i = this._stack.length - 1;
			while(i !== -1 && this._stack[i--].name !== name){}
			if( (i+=1) !== 0)
				while(i < this._stack.length) this.onCloseTag(this._stack.pop().name);
		}
		else if(name === "br"){ //special case for <br>s
			this.onOpenTag(name, attributes);
			this.onCloseTag(name);
		}
	}
	else{
		this.onOpenTag(name, attributes);
		if(empty) this.onCloseTag(name);
		else this._stack.push(element);
	}
};

module.exports = EventedHandler;