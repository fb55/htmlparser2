var DefaultHandler = require("./DefaultHandler.js"),
	DomUtils = require("./DomUtils.js");

//TODO: make this a trully streamable handler
function RssHandler (callback) {
	RssHandler.super_.call(this, callback, { ignoreWhitespace: true, verbose: false, enforceEmptyTags: false });
}

function inherits (ctor, superCtor) {
	var tempCtor = function(){};
	tempCtor.prototype = superCtor.prototype;
	ctor.super_ = superCtor;
	ctor.prototype = new tempCtor();
	ctor.prototype.constructor = ctor;
}

inherits(RssHandler, DefaultHandler);

RssHandler.prototype.done = function() {
	var feed = { };
	var feedRoot;

	var found = DomUtils.getElementsByTagName(function (value) { return(value === "rss" || value === "feed"); }, this.dom, false);
	if (found.length) {
		feedRoot = found[0];
	}
	if (feedRoot) {
		if (feedRoot.name === "rss") {
			feed.type = "rss";
			feedRoot = feedRoot.children[0]; //<channel/>
			feed.id = "";
			try {
				feed.title = DomUtils.getElementsByTagName("title", feedRoot.children, false)[0].children[0].data;
			} catch (ex) { }
			try {
				feed.link = DomUtils.getElementsByTagName("link", feedRoot.children, false)[0].children[0].data;
			} catch (ex) { }
			try {
				feed.description = DomUtils.getElementsByTagName("description", feedRoot.children, false)[0].children[0].data;
			} catch (ex) { }
			try {
				feed.updated = new Date(DomUtils.getElementsByTagName("lastBuildDate", feedRoot.children, false)[0].children[0].data);
			} catch (ex) { }
			try {
				feed.author = DomUtils.getElementsByTagName("managingEditor", feedRoot.children, false)[0].children[0].data;
			} catch (ex) { }
			feed.items = [];
			DomUtils.getElementsByTagName("item", feedRoot.children).forEach(function (item, index, list) {
				var entry = {};
				try {
					entry.id = DomUtils.getElementsByTagName("guid", item.children, false)[0].children[0].data;
				} catch (ex) { }
				try {
					entry.title = DomUtils.getElementsByTagName("title", item.children, false)[0].children[0].data;
				} catch (ex) { }
				try {
					entry.link = DomUtils.getElementsByTagName("link", item.children, false)[0].children[0].data;
				} catch (ex) { }
				try {
					entry.description = DomUtils.getElementsByTagName("description", item.children, false)[0].children[0].data;
				} catch (ex) { }
				try {
					entry.pubDate = new Date(DomUtils.getElementsByTagName("pubDate", item.children, false)[0].children[0].data);
				} catch (ex) { }
				feed.items.push(entry);
			});
		} else {
			feed.type = "atom";
			try {
				feed.id = DomUtils.getElementsByTagName("id", feedRoot.children, false)[0].children[0].data;
			} catch (ex) { }
			try {
				feed.title = DomUtils.getElementsByTagName("title", feedRoot.children, false)[0].children[0].data;
			} catch (ex) { }
			try {
				feed.link = DomUtils.getElementsByTagName("link", feedRoot.children, false)[0].attribs.href;
			} catch (ex) { }
			try {
				feed.description = DomUtils.getElementsByTagName("subtitle", feedRoot.children, false)[0].children[0].data;
			} catch (ex) { }
			try {
				feed.updated = new Date(DomUtils.getElementsByTagName("updated", feedRoot.children, false)[0].children[0].data);
			} catch (ex) { }
			try {
				feed.author = DomUtils.getElementsByTagName("email", feedRoot.children, true)[0].children[0].data;
			} catch (ex) { }
			feed.items = [];
			DomUtils.getElementsByTagName("entry", feedRoot.children).forEach(function (item, index, list) {
				var entry = {};
				try {
					entry.id = DomUtils.getElementsByTagName("id", item.children, false)[0].children[0].data;
				} catch (ex) { }
				try {
					entry.title = DomUtils.getElementsByTagName("title", item.children, false)[0].children[0].data;
				} catch (ex) { }
				try {
					entry.link = DomUtils.getElementsByTagName("link", item.children, false)[0].attribs.href;
				} catch (ex) { }
				try {
					entry.description = DomUtils.getElementsByTagName("summary", item.children, false)[0].children[0].data;
				} catch (ex) { }
				try {
					entry.pubDate = new Date(DomUtils.getElementsByTagName("updated", item.children, false)[0].children[0].data);
				} catch (ex) { }
				feed.items.push(entry);
			});
		}

		this.dom = feed;
	}
	RssHandler.super_.prototype.done.call(this);
};

exports = RssHandler;