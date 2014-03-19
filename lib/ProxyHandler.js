module.exports = ProxyHandler;

function ProxyHandler(cbs){
	this._cbs = cbs || {};
}

var EVENTS = require("./").EVENTS;
Object.keys(EVENTS).forEach(function(prop){
	var name = "on" + prop;
	if(EVENTS[prop] === 0){
		ProxyHandler.prototype[name] = function(){
			if(this._cbs[name]) this._cbs[name]();
		};
	} else if(EVENTS[prop] === 1){
		ProxyHandler.prototype[name] = function(a){
			if(this._cbs[name]) this._cbs[name](a);
		};
	} else if(EVENTS[prop] === 2){
		ProxyHandler.prototype[name] = function(a, b){
			if(this._cbs[name]) this._cbs[name](a, b);
		};
	} else if(EVENTS[prop] === 4){
		ProxyHandler.prototype[name] = function(a, b, c, d){
			if(this._cbs[name]) this._cbs[name](a, b, c, d);
		};
	} else {
		throw Error("wrong number of arguments");
	}
});