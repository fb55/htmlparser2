var WritableStream = require("./WritableStream.js");

var Stream = function(options){
	WritableStream.call(this, new cbs(this), options);
};

require("util").inherits(Stream, WritableStream);

Stream.prototype.readable = true;

var cbs = function(scope){
	this.scope = scope;
};

var EVENTS = require("../").EVENTS;

Object.keys(EVENTS).forEach(function(name){
	if(EVENTS[name] === 0){
		cbs.prototype["on" + name] = function(){
			this.scope.emit(name);
		};
	} else if(EVENTS[name] === 1){
		cbs.prototype["on" + name] = function(a){
			this.scope.emit(name, a);
		};
	} else if(EVENTS[name] === 2){
		cbs.prototype["on" + name] = function(a, b){
			this.scope.emit(name, a, b);
		};
	} else {
		throw Error("wrong number of arguments!");
	}
});

module.exports = Stream;