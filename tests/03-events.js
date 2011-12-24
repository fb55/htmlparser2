var helper = require("./test-helper.js"),
	sliceArr = Array.prototype.slice;

exports.dir = "/Events/";

exports.test = function(test, cb){
	var tokens = [], cbs;
	if(typeof Proxy !== "undefined"){
		cbs = Proxy.create({ get: function(a, name){
			if(name === "onend"){
				return function(){
					cb(null, tokens.splice(0));
				}
			}
			if(name === "onreset") return function(){};
			return function(){
				tokens.push({
					event: name.substr(2),
					data: sliceArr.apply(arguments)
				});
			}
		}});
	}
	else{
		cbs = {
			onerror: cb,
			onend: function(){
				cb(null, tokens.splice(0));
			}
		};
		helper.EVENTS.forEach(function(name){
			cbs["on" + name] = function(){
				tokens.push({
					event: name,
					data: sliceArr.apply(arguments)
				});
			}
		});
	}
	helper.writeToParser(cbs, test.options.parser, test.html);
};