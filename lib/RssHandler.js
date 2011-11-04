var DefaultHandler = require("./DefaultHandler.js"),
	DomUtils = require("./DomUtils.js"),
	inherits = require("util").inherits;

//TODO: make this a trully streamable handler
function RssHandler (callback) {
	DefaultHandler.call(this, callback, { ignoreWhitespace: true, verbose: false, enforceEmptyTags: false });
}

inherits(RssHandler, DefaultHandler);

RssHandler.prototype.done = DefaultHandler.prototype.done;

function getElements(what, where, one, recurse){
	var ret = DomUtils.getElementsByTagName(what, where, !!recurse);
	if(one)
		if(ret && ret.length > 0) return ret[0];
		else return false;
	else return ret;
}
function fetch(what, where, recurse){
	var ret = getElements(what, where, true, !!recurse);
	if(ret && ret.children && ret.children.length > 0) return ret.children[0].data;
	else return false;
}

var isValidFeed = function(value) {
	return value === "rss" || value === "feed" || value === "rdf:RDF";
}

RssHandler.prototype.done = function() {
	var feed = {};
	var feedRoot;
	var tmp, items, childs;

	feedRoot = getElements(isValidFeed, this.dom, true);
	if (feedRoot) {
		if(feedRoot.name === "rdf:RDF"){
			items = getElements("item", feedRoot.children);
			childs = getElements("channel", feedRoot.children, true).children;
		}
		else if(feedRoot.name === "rss"){
			childs = feedRoot.children[0].children;
			items = getElements("item", childs);
		}
		else{
			childs = feedRoot.children;
			items = getElements("entry", childs);
		}
		
		if (feedRoot.name === "feed"){
			feed.type = "atom";
			if(tmp = fetch("id", childs))
				feed.id = tmp;
			if(tmp = fetch("title", childs))
				feed.title = tmp;
			if((tmp = getElements("link", childs, true)) && (tmp = tmp.attribs) && (tmp = tmp.href))
				feed.link = tmp;
			if(tmp = fetch("subtitle", childs))
				feed.description = tmp;
			if(tmp = fetch("updated", childs))
				feed.updated = new Date(tmp);
			if(tmp = fetch("email", childs, true))
				feed.author = tmp;
			feed.items = Array(items.length);
			items.forEach(function(item, i){
				var entry = {}, tmp;
				if(tmp = fetch("id", item.children))
					entry.id = tmp;
				if(tmp = fetch("title", item.children))
					entry.title = tmp;
				if((tmp = getElements("link", item.children, true)) && (tmp = tmp.attribs) && (tmp = tmp.href))
					entry.link = tmp;
				if(tmp = fetch("summary", item.children))
					entry.description = tmp;
				if(tmp = fetch("updated", item.children))
					entry.pubDate = new Date(tmp);
				feed.items[i] = entry;
			});
		} else {
			feed.type = feedRoot.name;
			feed.id = "";
			if(tmp = fetch("title", childs))
				feed.title = tmp;
			if(tmp = fetch("link", childs))
				feed.link = tmp;
			if(tmp = fetch("description", childs))
				feed.description = tmp;
			if(tmp = fetch("lastBuildDate", childs))
				feed.updated = new Date(tmp);
			if(tmp = fetch("managingEditor", childs))
				feed.author = tmp;
			feed.items = Array(items.length);
			items.forEach(function(item, i){
				var entry = {}, tmp;
				if(tmp = fetch("guid", item.children))
					entry.id = tmp;
				if(tmp = fetch("title", item.children))
					entry.title = tmp;
				if(tmp = fetch("link", item.children))
					entry.link = tmp;
				if(tmp = fetch("description", item.children))
					entry.description = tmp;
				if(tmp = fetch("pubDate", item.children))
					entry.pubDate = new Date(tmp);
				feed.items[i] = entry;
			});
		}
		this.dom = feed;
	}
	this.done;
};

module.exports = RssHandler;