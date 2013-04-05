//dependencies have to be installed manually

var ben = require("ben");

var parsers = [];

(function(){
	try{
		var node_xml = require("node-xml");

		function NodeXmlParser() {
			var parser = new node_xml.SaxParser(function(cb) { });
			this.parse = function(s) {
				parser.parseString(s);
			};
		}
		parsers.push([NodeXmlParser, "node-xml"]);
	} catch(e){}
}());

(function(){
	try{
		var libxml = require("libxmljs");

		function LibXmlJsParser() {
			var parser = new libxml.SaxPushParser(function(cb) { });
			this.parse = function(s) {
				parser.push(s, false);
			};
		}

		parsers.push([LibXmlJsParser, "libxmljs"]);
	} catch(e){}
}());

(function(){
	try{
		var sax = require('sax');

		function SaxParser() {
			var parser = sax.parser();
			this.parse = function(s) {
				parser.write(s);
			};
		}

		parsers.push([SaxParser, "sax"]);
	} catch(e){}
}());

(function(){
	try{
		var expat = require('node-expat');

		function ExpatParser() {
			var parser = new expat.Parser();
			this.parse = function(s) {
				parser.parse(s, false);
			};
		}

		parsers.push([ExpatParser, "node-expat"]);
	} catch(e){}
}());

(function(){
	try{
		var htmlparser = require('htmlparser');

		function HtmlParser() {
			var handler = new htmlparser.DefaultHandler();
			var parser = new htmlparser.Parser(handler);
			this.parse = function(s) {
				parser.parseComplete(s);
			};
		}

		parsers.push([HtmlParser, "htmlparser"]);
	} catch(e){}
}());

(function(){
	try{
		var htmlparser2 = require('../lib/Parser.js');

		function HtmlParser2() {
			var parser = new htmlparser2();
			this.parse = function(s) {
				parser.write(s);
			};
		}

		parsers.push([HtmlParser2, "htmlparser2"]);
	} catch(e){}
}());

parsers.forEach(function(arr){
	var p = new arr[0]();
	var name = arr[1];

	process.stdout.write(name + ":" + Array(14-name.length).join(" "));

	p.parse("<r>");
	var num = ben(1e6, function(){
		p.parse("<foo bar='baz'>quux</foo>");
	});

	console.log((num * 1e3).toFixed(2), "ms/el");
});
