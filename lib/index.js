module.exports = {
	get Parser(){
		Object.defineProperty(this, "Parser", {value:require("./Parser.js")});
		return this.Parser;
	},
	get DefaultHandler(){
		Object.defineProperty(this, "DefaultHandler", {value:require("./DefaultHandler.js")});
		return this.DefaultHandler;
	},
	get FeedHandler(){
		Object.defineProperty(this, "FeedHandler", {value:require("./FeedHandler.js")});
		return this.FeedHandler;
	},
	get ElementType(){
		Object.defineProperty(this, "ElementType", {value:require("./ElementType.js")});
		return this.ElementType;
	},
	get Stream(){
		Object.defineProperty(this, "Stream", {value:require("./Stream.js")});
		return this.Stream;
	},
	get DomUtils(){
		Object.defineProperty(this, "DomUtils", {value:require("./DomUtils.js")});
		return this.DomUtils;
	}
}