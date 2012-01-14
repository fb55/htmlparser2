var ElementType = require("./ElementType.js");

function DomHandler(callback, options){
	this.dom = [];
	this._done = false;
	this._tagStack = [];
	if(typeof callback === "object") this._options = callback;
	else {
		if(options) this._options = options; //otherwise, the prototype is used
		if(callback) this._callback = callback;	
	}
}

//default options
DomHandler.prototype._options = {
	ignoreWhitespace: false //Keep whitespace-only text nodes
};

//Resets the handler back to starting state
DomHandler.prototype.onreset = DomHandler;

//Signals the handler that parsing is done
DomHandler.prototype.onend = function(){
	if(this._done) return;
	this._done = true;
	this._handleCallback(null);
};

DomHandler.prototype._handleCallback = 
DomHandler.prototype.onerror = function(error){
	if(typeof this._callback === "function"){
		this._callback(error, this.dom);
	} else {
		if(error) throw error;
	}
};

DomHandler.prototype.onclosetag = function(name){
	if(this._tagStack.pop().name !== name) this._handleCallback(Error("tagname didn't match!"));
};

DomHandler.prototype._addDomElement = function(element){
	var lastChild,
		lastTag = this._tagStack[this._tagStack.length - 1];
	
	if(lastTag){ //There are parent elements
		if(!lastTag.children){
			lastTag.children = [element];
			return;
		}
		lastChild = lastTag.children[lastTag.children.length - 1];
		if(element.type === ElementType.Text && lastChild.type === ElementType.Text){
			lastChild.data += element.data;
		} else {
			lastTag.children.push(element);
		}
	}
	else {
		this.dom.push(element);
	}
};

DomHandler.prototype.onopentag = function(name, attribs, type){
	var element = {
		type: type,
		name: name
	};
	//for some reason, an if doesn't work
	for(var i in attribs){
		element.attribs = attribs;
		break;
	}
	this._addDomElement(element);
	this._tagStack.push(element);
};

DomHandler.prototype.ontext = function(data){
	if(this._options.ignoreWhitespace && data.trim() === "") return;
	this._addDomElement({
		data: data,
		type: ElementType.Text
	});
};

DomHandler.prototype.oncomment = function(data){
	var lastTag = this._tagStack[this._tagStack.length - 1];

	if(lastTag && lastTag.type === ElementType.Comment){
		lastTag.data += data;
		return;
	}

	var element = {
		data: data,
		 type: ElementType.Comment
	};

	if(!lastTag) this.dom.push(element);
	else if(!lastTag.children) lastTag.children = [element];
	else lastTag.children.push(element);

	this._tagStack.push(element);
};

DomHandler.prototype.oncommentend = function(){
	this._tagStack.pop();
};

DomHandler.prototype.onprocessinginstruction = function(name, data){
	this._addDomElement({
		name: name,
		data: data,
		type: ElementType.Directive
	});
};

module.exports = DomHandler;