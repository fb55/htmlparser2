var Parser = require("./Parser.js");

var Stream = function(options){
	Parser.call(this, new cbs(this), options);
};

require("util").inherits(Stream, require("stream"));

//util.inherits would overwrite the prototype when called twice,
//so we need a different approach
Object.getOwnPropertyNames(Parser.prototype).forEach(function(name){
	Stream.prototype[name] = Parser.prototype[name];
});

Stream.prototype.writable = true;
Stream.prototype.readable = true;

var cbs = function(scope){
	this.scope = scope;
};

cbs.prototype = {
	oncdataend: function(){
		this.scope.emit("cdataend");
	},
	oncdatastart: function(){
		this.scope.emit("cdatastart");
	},
	onclosetag: function(name){
    	this.scope.emit("closetag", name);
    },
	oncomment: function(text){
    	this.scope.emit("comment", text);
    },
	oncommentend: function(){
		this.scope.emit("commentend");
	},
	onerror: function(err){
    	this.scope.emit("error", err);
    },
	onopentag: function(name, attribs, type){
    	this.scope.emit("opentag", name, attribs, type);
    },
	onprocessinginstruction: function(name, data){
		this.scope.emit("processinginstruction", name, data);
	},
	onreset: function(){
		this.scope.emit("reset");
	},
    ontext: function(text){
    	this.scope.emit("text", text);
    	//let the 'pipe' function do something useful
    	//this.scope.emit("data", text);
    }
};

module.exports = Stream;
Stream.cbs = cbs;