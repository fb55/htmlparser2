var helper = require("./test-helper.js"),
	EventedHandler = require("../lib/EventedHandler.js");

exports.dir = "./Events/";

exports.test = function(test, cb){
	var tokens = [];
	var cbs = {
		onend: function(){
			//deletes all tokens
			cb(null, tokens.splice(0));
		}
	};
	for(var i = 0; i < test.callbacks.length; i+=2){
		cbs[test.callbacks[i]] = test.callbacks[i+1].bind(tokens);
	};
	var handler = new EventedHandler(cbs, test.options.handler);
	helper.writeToParser(handler, test.options.parser, test.html);
}