var ElementType = require("./ElementType.js");

function DefaultHandler (callback, options) {
	this.dom = [];
	this._done = false;
	this._tagStack = [];
	this._options = options ? options : { };
	if (this._options.ignoreWhitespace === undefined)
		this._options.ignoreWhitespace = false; //Keep whitespace-only text nodes
	if (this._options.verbose === undefined)
		this._options.verbose = true; //Keep data property for tags and raw property for all
	if (this._options.enforceEmptyTags === undefined)
		this._options.enforceEmptyTags = true; //Don't allow children for HTML tags defined as empty in spec
	if ((typeof callback) === "function")
		this._callback = callback;
}

DefaultHandler.prototype._lastTag = function() {
	var stack = this._tagStack;
	return(stack.length ? stack[stack.length - 1] : null);
};

//HTML Tags that shouldn't contain child nodes
var _emptyTags = {
	area: true
	, base: true
	, basefont: true
	, br: true
	, col: true
	, frame: true
	, hr: true
	, img: true
	, input: true
	, isindex: true
	, link: true
	, meta: true
	, param: true
	, embed: true
};

//**Public**//
//Methods//
//Resets the handler back to starting state
DefaultHandler.prototype.reset = function() {
	this.dom = [];
	this._done = false;
	this._tagStack = [];
};
//Signals the handler that parsing is done
DefaultHandler.prototype.done = function() {
	this._done = true;
	this.handleCallback(null);
};
DefaultHandler.prototype.writeText = function(element) {
	if(this._options.ignoreWhitespace)
		if(element.data.trim() === "")
			return;
	this.handleElement(element);
};

//Methods//
DefaultHandler.prototype.error =
DefaultHandler.prototype.handleCallback = function(error) {
		if ((typeof this._callback) !== "function")
			if (error)
				throw error;
			else
				return;
		this._callback(error, this.dom);
};

DefaultHandler.prototype.isEmptyTag = function(element) {
	var name = element.name.toLowerCase();
	if (name.charAt(0) === '/') {
		name = name.substring(1);
	}
	return this._options.enforceEmptyTags && _emptyTags[name];
};

DefaultHandler.prototype.writeTag = DefaultHandler.prototype.writeDirective = DefaultHandler.prototype.writeComment =
DefaultHandler.prototype.handleElement = function(element) {
	if (this._done)
		this.handleCallback(new Error("Writing to the handler after done() called is not allowed without a reset()"));
	if (!this._options.verbose) {
		//element.raw = null; //FIXME: Not clean
		//FIXME: Serious performance problem using delete
		delete element.raw;
		if (element.type === "tag" || element.type === "script" || element.type === "style")
			delete element.data;
	}
	if (!this._lastTag()) { //There are no parent elements
		//If the element can be a container, add it to the tag stack and the top level list
		if (element.type !== ElementType.Text && element.type !== ElementType.Comment && element.type !== ElementType.Directive) {
			if (element.name.charAt(0) !== "/") { //Ignore closing tags that obviously don't have an opening tag
				this.dom.push(element);
				if (!this.isEmptyTag(element)) { //Don't add tags to the tag stack that can't have children
					this._tagStack.push(element);
				}
			}
		}
		else //Otherwise just add to the top level list
			this.dom.push(element);
	}
	else { //There are parent elements
		//If the element can be a container, add it as a child of the element
		//on top of the tag stack and then add it to the tag stack
		if (element.type !== ElementType.Text && element.type !== ElementType.Comment && element.type !== ElementType.Directive) {
			if (element.name.charAt(0) === "/") {
				//This is a closing tag, scan the tagStack to find the matching opening tag
				//and pop the stack up to the opening tag's parent
				var baseName = element.name.substring(1);
				if (!this.isEmptyTag(element)) {
					var pos = this._tagStack.length - 1;
					while (pos > -1 && this._tagStack[pos--].name !== baseName) { }
					if (pos > -1 || this._tagStack[0].name === baseName)
						while (pos < this._tagStack.length - 1)
							this._tagStack.pop();
				}
			}
			else { //This is not a closing tag
				if (!this._lastTag().children)
					this._lastTag().children = [];
				this._lastTag().children.push(element);
				if (!this.isEmptyTag(element)) //Don't add tags to the tag stack that can't have children
					this._tagStack.push(element);
			}
		}
		else { //This is not a container element
			if (!this._lastTag().children)
				this._lastTag().children = [];
			this._lastTag().children.push(element);
		}
	}
};

module.exports = DefaultHandler;