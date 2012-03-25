var ProxyHandler = function(cbs){
	if(cbs) this._cbs = cbs;
};

ProxyHandler.prototype._cbs = {};

Object.keys(require("./").EVENTS).forEach(function(name){
	name = "on" + name;
	Object.defineProperty(ProxyHandler.prototype, name, {
		enumerable:true, configurable:true,
		get: function(){ return this._cbs[name]; },
		set: function(value){
			//allow functions to be overwritten
			Object.defineProperty(this, name, {value: value});
		}
	});
});

module.exports = ProxyHandler;