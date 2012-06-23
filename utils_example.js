//node --prof --prof_auto profile.js
//deps/v8/tools/mac-tick-processor v8.log
var util = require('util');
var htmlparser = require("./lib/htmlparser");

var html = "<a>text a</a><b id='x'>text b</b><c class='y'>text c</c><d id='z' class='w'><e>text e</e></d><g class='g h i'>hhh</g><yy>hellow</yy><yy id='secondyy'>world</yy>";

var handler = new htmlparser.DefaultHandler(function(err, dom) {
	if (err) {
		util.debug("Error: " + err);
	}
	else {
		util.debug(util.inspect(dom, false, null));
		var id = htmlparser.DomUtils.getElementById("x", dom);
		util.debug("id: " + util.inspect(id, false, null));
		var class = htmlparser.DomUtils.getElements({ class: "y" }, dom);
		util.debug("class: " + util.inspect(class, false, null));
		var multiclass = htmlparser.DomUtils.getElements({ class: function (value) { return(value && value.indexOf("h") > -1); } }, dom);
		util.debug("multiclass: " + util.inspect(multiclass, false, null));
		var name = htmlparser.DomUtils.getElementsByTagName("a", dom);
		util.debug("name: " + util.inspect(name, false, null));
		var text = htmlparser.DomUtils.getElementsByTagType("text", dom);
		util.debug("text: " + util.inspect(text, false, null));
		var nested = htmlparser.DomUtils.getElements({ tag_name: "d", id: "z", class: "w" }, dom);
		nested = htmlparser.DomUtils.getElementsByTagName("e", nested);
		nested = htmlparser.DomUtils.getElementsByTagType("text", nested);
		util.debug("nested: " + util.inspect(nested, false, null));
		var double = htmlparser.DomUtils.getElementsByTagName("yy", dom);
		util.debug("double: " + util.inspect(double, false, null));
		var single = htmlparser.DomUtils.getElements( { tag_name: "yy", id: "secondyy" }, dom);
		util.debug("single: " + util.inspect(single, false, null));
	}
}, { verbose: false });
var parser = new htmlparser.Parser(handler);
parser.parseComplete(html);
