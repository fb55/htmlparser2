var ElementType = require("./ElementType.js");

function DefaultHandler(callback, options){
	this.dom = [];
	this._done = false;
	this._inSpecialTag = false;
	this._tagStack = [];
	if(options){ //otherwise, the prototype is used
		this._options = options;
		if (typeof this._options.enforceEmptyTags === "undefined")
			this._options.enforceEmptyTags = true;
	}
	if(callback) this._callback = callback;
}

//default options
DefaultHandler.prototype._options = {
	ignoreWhitespace: false,//Keep whitespace-only text nodes
    enforceEmptyTags: true,	//Don't allow children for HTML tags defined as empty in spec
	closeOtherTags: false	//Let tags close others (eg. <p> closes other <p>s) TODO
};

var closing = require("./ClosingTags.js");
var closingOthers = closing.others;
var emptyTags = closing.self;

//**Public**//
//Methods//
//Resets the handler back to starting state
DefaultHandler.prototype.reset = DefaultHandler;

//Signals the handler that parsing is done
DefaultHandler.prototype.done = function() {
	this._done = true;
	this.handleCallback(null);
};

//Methods//
DefaultHandler.prototype.error =
DefaultHandler.prototype.handleCallback = function(error){
		if(typeof this._callback === "function")
			this._callback(error, this.dom);
		else if(error) throw error;
};

DefaultHandler.prototype._isEmptyTag = function(name) {
	return this._options.enforceEmptyTags && emptyTags[name];
};

DefaultHandler.prototype.closeTag = function(name){
	//Ignore closing tags that obviously don't have an opening tag
	if(!this._tagStack || this._isEmptyTag(name)) return;
	
	var pos = this._tagStack.length;
	while(pos !== 0 && this._tagStack[--pos].name !== name){}
	if (pos !== 0 || this._tagStack[0].name === name)
	    this._tagStack.splice(pos);
};

DefaultHandler.prototype._addDomElement = function(element){
	var lastTag = this._tagStack[this._tagStack.length-1], lastChild;
	if(!lastTag) this.dom.push(element);
	else{ //There are parent elements
		if(!lastTag.children){
			lastTag.children = [element];
			return;
		}
		lastChild = lastTag.children[lastTag.children.length-1];
		if(this._inSpecialTag && element.type === ElementType.Text && lastChild.type === ElementType.Text){
			lastChild.data += element.data;
		}
		else lastTag.children.push(element);
	}
};

DefaultHandler.prototype.openTag = function(name, attribs, type){
	if(type === ElementType.Script || type === ElementType.Style) this._inSpecialTag = true;
	
	var element = {type:type, name:name, attribs:attribs};
	
	this._addDomElement(element);
	
	//Don't add tags to the tag stack that can't have children
	if(!this._isEmptyTag(name)) this._tagStack.push(element);
};

DefaultHandler.prototype.writeText = function(data){
	if(this._options.ignoreWhitespace && data.trim() === "") return;
	this._addDomElement({data:data, type:ElementType.Text});
};

DefaultHandler.prototype.writeComment = function(data){
	var lastTag = this._tagStack[this._tagStack.length-1], element,
		lastChild = lastTag && lastTag.children && lastTag.children[lastTag.children.length-1];
	if(!lastChild || lastChild.type !== ElementType.Comment){
		element = {data:data, type: ElementType.Comment};
		if(!lastTag) this.dom.push(element);
		else if(!lastChild) lastTag.children = [element];
		else if(lastChild.type !== ElementType.Comment) lastTag.children.push(element);
	}
	else lastChild.data += data;
}

DefaultHandler.prototype.writeDirective = function(name, data){
	this._addDomElement({name:name, data:data, type:ElementType.Directive});
};

module.exports = DefaultHandler;