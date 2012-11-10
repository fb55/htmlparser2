var defineProp = Object.defineProperty;

module.exports = {
	get Parser(){
		defineProp(this, "Parser", {value:require("./Parser.js")});
		return this.Parser;
	},
	get DomHandler(){
		defineProp(this, "DomHandler", {value:require("domhandler")});
		return this.DomHandler;
	},
	get FeedHandler(){
		defineProp(this, "FeedHandler", {value:require("./FeedHandler.js")});
		return this.FeedHandler;
	},
	get ElementType(){
		defineProp(this, "ElementType", {value:require("domelementtype")});
		return this.ElementType;
	},
	get Stream(){
		defineProp(this, "Stream", {value:require("./Stream.js")});
		return this.Stream;
	},
	get WritableStream(){
		defineProp(this, "WritableStream", {value:require("./WritableStream.js")});
		return this.WritableStream;
	},
	get ProxyHandler(){
		defineProp(this, "ProxyHandler", {value:require("./ProxyHandler.js")});
		return this.ProxyHandler;
	},
	get DomUtils(){
		defineProp(this, "DomUtils", {value:require("domutils")});
		return this.DomUtils;
	},
	// For legacy support
	get DefaultHandler(){
		defineProp(this, "DefaultHandler", {value: this.DomHandler});
		return this.DefaultHandler;
	},
	get RssHandler(){
		defineProp(this, "RssHandler", {value: this.FeedHandler});
		return this.FeedHandler;
	},
	// List of all events that the parser emits
	EVENTS: { /* Format: eventname: number of arguments */
		attribute: 2,
		cdatastart: 0,
		cdataend: 0,
		text: 1,
		processinginstruction: 2,
		comment: 1,
		commentend: 0,
		closetag: 1,
		opentag: 2,
		opentagname: 1,
		error: 1,
		end: 0
	}
}