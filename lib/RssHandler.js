var DefaultHandler = require("./DefaultHandler.js"),
	DomUtils = require("./DomUtils.js"),
	inherits = require("util").inherits;

//TODO: make this a trully streamable handler
function RssHandler (callback) {
	RssHandler.super_.call(this, callback, { ignoreWhitespace: true, verbose: false, enforceEmptyTags: false });
}

inherits(RssHandler, DefaultHandler);

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

RssHandler.prototype.done = function() {
	var feed = { };
	var feedRoot;
	var tmp;

	var found = getElements(function(value) { return value === "rss" || value === "feed"; }, this.dom);
	if (found.length) {
		feedRoot = found[0];
	}
	if (feedRoot) {
		if (feedRoot.name === "rss") {
			feed.type = "rss";
			feedRoot = feedRoot.children[0]; //<channel/>
			feed.id = "";
			if(tmp = fetch("title", feedRoot.children))
				feed.title = tmp;
			if(tmp = fetch("link", feedRoot.children))
				feed.link = tmp;
			if(tmp = fetch("description", feedRoot.children))
				feed.description = tmp;
			if(tmp = fetch("lastBuildDate", feedRoot.children))
				feed.updated = new Date(tmp);
			if(tmp = fetch("managingEditor", feedRoot.children))
				feed.author = tmp;
			feed.items = [];
			getElements("item", feedRoot.children).forEach(function (item, index, list) {
				var entry = {};
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
				feed.items.push(entry);
			});
		} else {
			feed.type = "atom";
			if(tmp = fetch("id", feedRoot.children))
				feed.id = tmp;
			if(tmp = fetch("title", feedRoot.children))
				feed.title = tmp;
			try{ feed.link = getElements("link", feedRoot.children, true).attribs.href;
			}catch (ex){}
			if(tmp = fetch("subtitle", feedRoot.children))
				feed.description = tmp;
			if(tmp = fetch("updated", feedRoot.children))
				feed.updated = new Date(tmp);
			if(tmp = fetch("email", feedRoot.children, true))
				feed.author = tmp;
			feed.items = [];
			getElements("entry", feedRoot.children).forEach(function (item, index, list) {
				var entry = {};
				if(tmp = fetch("id", item.children))
					entry.id = tmp;
				if(tmp = fetch("title", item.children))
					entry.title = tmp;
				try { entry.link = getElements("link", item.children, true).attribs.href;
				} catch(ex){}
				if(tmp = fetch("summary", item.children))
					entry.description = tmp;
				if(tmp = fetch("updated", item.children))
					entry.pubDate = new Date(tmp);
				feed.items.push(entry);
			});
		}

		this.dom = feed;
	}
	RssHandler.super_.prototype.done.call(this);
};

module.exports = RssHandler;