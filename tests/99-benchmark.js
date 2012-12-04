var multiply = function(text){
		return Array(5e3+1).join(text);
	},
	tests = {
		self_closing: multiply("<br/>"),
		tag: multiply("<tag foo=bar foobar> Text </tag>"),
		comment: multiply("<!-- this is <<a> comment -->"),
		directive: multiply("<?foo bar?>"),
		special: multiply("<script> THIS IS <SPECIAL> </script>"),
		xml: multiply("<!directive><tag attr='value'> text <!--Comment<>--></tag>")
	},
	empty = function(){},
	cbs = {};

require("./test-helper.js").EVENTS.forEach(function(name){
    cbs["on" + name] = empty;
});

var parser = new (require("../lib/Parser.js"))(cbs),
	ben = require("ben");

Object.keys(tests).forEach(function(name){
	console.log("Test", name, "took", ben(150, function(){
		parser.parseComplete(tests[name]);
	}));
});