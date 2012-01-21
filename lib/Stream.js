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
	switch(EVENTS[name]){
		case 0:{
			cbs.prototype["on" + name] = function(){
				this.scope.emit(name);
			};
			break;
		}
		case 1:{
			cbs.prototype["on" + name] = function(a){
				this.scope.emit(name, a);
			};
			break;
		}
		case 2:{
			cbs.prototype["on" + name] = function(a, b){
				this.scope.emit(name, a, b);
			};
			break;
		}
		default: throw Error("wrong number of arguments!");
	}
});

module.exports = Stream;