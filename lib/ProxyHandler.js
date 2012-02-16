var ProxyHandler = function(cbs){
	if(cbs) this._cbs = cbs;
};

ProxyHandler.prototype._cbs = {};

Object.keys(require("./").EVENTS).forEach(function(name){
	ProxyHandler.prototype.__defineGetter__(name, function(){
		return this._cbs[name];
	});
	ProxyHandler.prototype.__defineSetter__(name, function(value){
		//allow functions to be overwritten
		Object.defineProperty(this, name, {value: value});
	});
});

module.exports = ProxyHandler;