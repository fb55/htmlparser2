//dependencies have to be installed manually

var ben = require("ben");

var parsers = [];


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


try{
	var hubbub = require('hubbub');

	function Hubbub() {
		var handler = new hubbub.DefaultHandler();
		var parser = new hubbub.Parser(handler);
		this.parse = function(s) {
			parser.parseComplete(s);
		};
	}

	parsers.push([Hubbub, "hubbub"]);
} catch(e){}

try{
	var htmlParser = require("html-parser");

	function HTMLParser() {
		var cbs = {};
		this.parse = function(s){
			htmlParser.parse(s, cbs);
		};
	}

	parsers.push([HTMLParser, "html-parser"]);
} catch(e){}

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

var results = parsers.map(function(arr){
	var p = new arr[0]();
	var name = arr[1];

	process.stdout.write(name + ":" + Array(14-name.length).join(" "));

	p.parse("<r>");
	var num = ben(1e6, function(){
		p.parse("<foo bar='baz'>quux</foo>");
	});

	console.log((num > 0.01 ? "" : "0") + (num * 1e3).toFixed(2), "ms/el");

	return [name, num];
});

console.log(
	"\nWinner:",
	results.sort(function(a, b){
		return a[1] - b[1];
	})[0][0]
);