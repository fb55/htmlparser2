var xml = Array(5e3).join("<!directive><tag attr='value'> text <!--Comment<>--></tag>"),
	handler = new (require("../lib/EventedHandler.js")),
	parser = new (require("../lib/Parser.js"))(handler),
	ben = require("ben");

console.log("Test took (ms)", ben(1e2, function(){
	parser.parseComplete(xml);
}));