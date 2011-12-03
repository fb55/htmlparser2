// NOT FINISHED YET! DON'T USE IT!

//opening tags
var searchRoot = function(tagName){
	if(tagName === "rss" || tagName === "rdf:RDF" || tagName === "feed"){
		if(tagName === "rdf:RDF") this.feed.type = "rdf";
		else this.feed.type = tagName;
		this._map = RssFeedMap;
		this.onopentag = getChannelElement;
	}
	else if(tagName === "feed"){
		this.feed.type = "atom";
		this._map = AtomFeedMap;
		this.onclosetag = getFeedElements;
		this.ontext = writeText;
		this.onopentag = getOpenTag;
	}
}

var getChannelElement = function(tagName){
	if(tagName === "channel"){
		this.onopentag = getOpenTag;
		this.onclosetag = getFeedElements;
		this.ontext = writeText;
	}
}

var getOpenTag = function(tagName, attribs){
	this._level += 1;
	if(tagName === this._childName){
		if(this._feed.type === "atom"){
		}
		else{
		
		}
	} else if(tagName === "link" && this._level === 1 
		&& this._feed.type === "atom" && attribs.href){
			this.feed.link = attribs.href;
	}
};

//text
var writeText = function(text){
	if(this._stack[this._level]){
		this._stack[this._level] += text;
	} else this._stack[this._level] = text;
};

//closing tags
var getFeedElements = function(tagName){
	var text = this._stack.pop();
	if(this._level-- === 1){
		var elemName = this._map[tagName];
		if(elemName){
			if(elemName === "updated") text = Date(text);	
			this._feed[elemName] = text;
		}
	}
};

//mappings
var RssFeedMap = {
	title: "title",
	link: "link",
	description: "description",
	lastBuildDate: "updated",
	managingEditor: "author"/*,
	item: "item"*/
};

var RssItemMap = {

};

var AtomFeedMap = {
	id: "id",
	title: "title",
	subtitle: "description",
	updated: "updated",
	email: "author"/*,
	entry: "item"*/
};

var AtomItemMap = {

};

//TODO: make this a trully streamable handler
function FeedHandler(callback, onitem){
	this.onopentag = searchRoot;
	this.feed = {
		type: null,
		id: "",
		title: null,
		link: null,
		description: null,
		updated: null,
		author: null,
		items: []
	};
	this._level = 0;
	this._stack = [];
	this._map = null;
	this.onend = callback;
	this.onitem = onitem; //called when a new item was found
}

module.exports = FeedHandler;