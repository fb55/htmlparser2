var xml = Array(5e3).join("<!directive><tag attr='value'> text <!--Comment<>--></tag>"),
	empty = function(){},
	parser = new (require("../lib/Parser.js"))({
		onopentag: empty,
		onclosetag: empty,
		oncomment: empty,
		oncommentend: empty,
		onprocessinginstruction: empty
	}),
	ben = require("ben");

console.log("Test took (ms)", ben(1e2, function(){
	parser.parseComplete(xml);
}));