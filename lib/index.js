var defineProp = Object.defineProperty;

module.exports = {
	get Parser(){
		defineProp(this, "Parser", {value:require("./Parser.js")});
		return this.Parser;
	},
	get DomHandler(){
		defineProp(this, "DomHandler", {value:require("./DomHandler.js")});
		return this.DomHandler;
	},
	get FeedHandler(){
		defineProp(this, "FeedHandler", {value:require("./FeedHandler.js")});
		return this.FeedHandler;
	},
	get ElementType(){
		defineProp(this, "ElementType", {value:require("./ElementType.js")});
		return this.ElementType;
	},
	get Stream(){
		defineProp(this, "Stream", {value:require("./Stream.js")});
		return this.Stream;
	},
	get DomUtils(){
		defineProp(this, "DomUtils", {value:require("./DomUtils.js")});
		return this.DomUtils;
	},
	get DefaultHandler(){
		defineProp(this, "DefaultHandler", {value: this.DomHandler});
		return this.DefaultHandler;
	},
	get RssHandler(){
		defineProp(this, "RssHandler", {value: this.FeedHandler});
		return this.FeedHandler;
	}
}