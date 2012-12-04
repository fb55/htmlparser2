var index = require("./index.js"),
    DomHandler = index.DomHandler,
	DomUtils = index.DomUtils;

//TODO: make this a streamable handler
function FeedHandler(callback){
	this.init(callback, { ignoreWhitespace: true });
}

require("util").inherits(FeedHandler, DomHandler);

FeedHandler.prototype.init = DomHandler;

function getElements(what, where, one, recurse){
	if(one) return DomUtils.getElementsByTagName(what, where, recurse, 1)[0];
	return DomUtils.getElementsByTagName(what, where, recurse);
}
function fetch(what, where, recurse){
	var ret = DomUtils.getElementsByTagName(what, where, recurse, 1);
	return ret.length > 0 && ret[0].children.length > 0 && ret[0].children[0].data;
}

var isValidFeed = function(value) {
	return value === "rss" || value === "feed" || value === "rdf:RDF";
};

FeedHandler.prototype.onend = function() {
	var feed = {},
		feedRoot = getElements(isValidFeed, this.dom, true),
		tmp, childs;

	if (feedRoot) {
		if(feedRoot.name === "feed"){
			childs = feedRoot.children;

			feed.type = "atom";
			if(tmp = fetch("id", childs)) feed.id = tmp;
			if(tmp = fetch("title", childs)) feed.title = tmp;
			if((tmp = getElements("link", childs, true)) && (tmp = tmp.attribs) && (tmp = tmp.href)) feed.link = tmp;
			if(tmp = fetch("subtitle", childs)) feed.description = tmp;
			if(tmp = fetch("updated", childs)) feed.updated = new Date(tmp);
			if(tmp = fetch("email", childs, true)) feed.author = tmp;

			feed.items = getElements("entry", childs).map(function(item){
				var entry = {}, tmp;

				item = item.children;

				if(tmp = fetch("id", item)) entry.id = tmp;
				if(tmp = fetch("title", item)) entry.title = tmp;
				if((tmp = getElements("link", item, true)) && (tmp = tmp.attribs) && (tmp = tmp.href)) entry.link = tmp;
				if(tmp = fetch("summary", item)) entry.description = tmp;
				if(tmp = fetch("updated", item)) entry.pubDate = new Date(tmp);
				return entry;
			});
		} else{
			childs = getElements("channel", feedRoot.children, true).children;

			feed.type = feedRoot.name.substr(0, 3);
			feed.id = "";
			if(tmp = fetch("title", childs)) feed.title = tmp;
			if(tmp = fetch("link", childs)) feed.link = tmp;
			if(tmp = fetch("description", childs)) feed.description = tmp;
			if(tmp = fetch("lastBuildDate", childs)) feed.updated = new Date(tmp);
			if(tmp = fetch("managingEditor", childs)) feed.author = tmp;

			feed.items = getElements("item", feedRoot.children).map(function(item){
				var entry = {}, tmp;

				item = item.children;

				if(tmp = fetch("guid", item)) entry.id = tmp;
				if(tmp = fetch("title", item)) entry.title = tmp;
				if(tmp = fetch("link", item)) entry.link = tmp;
				if(tmp = fetch("description", item)) entry.description = tmp;
				if(tmp = fetch("pubDate", item)) entry.pubDate = new Date(tmp);
				return entry;
			});
		}
	}
	this.dom = feed;
	DomHandler.prototype._handleCallback.call(this);
};

module.exports = FeedHandler;