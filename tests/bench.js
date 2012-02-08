/*
var node_xml = require("node-xml");

function NodeXmlParser() {
    var parser = new node_xml.SaxParser(function(cb) { });
    this.parse = function(s) {
	parser.parseString(s);
    };
}

var p = new NodeXmlParser();
*//*
var libxml = require("libxmljs");

function LibXmlJsParser() {
    var parser = new libxml.SaxPushParser(function(cb) { });
    this.parse = function(s) {
	parser.push(s, false);
    };
}

var p = new LibXmlJsParser();
*//*
var sax = require('sax');

function SaxParser() {
    var parser = sax.parser();
	this.parse = function(s) {
	parser.write(s);
	}
}

var p = new SaxParser();
*//*
var expat = require('node-expat');

function ExpatParser() {
    var parser = new expat.Parser();
    this.parse = function(s) {
	parser.parse(s, false);
    };
}

var p = new ExpatParser();
*//*
var htmlparser = require('htmlparser');

function HtmlParser() {
    var handler = new htmlparser.DefaultHandler();
    var parser = new htmlparser.Parser(handler);
    this.parse = function(s) {
    parser.parseComplete(s);
    };
}

var p = new HtmlParser();
*/
var htmlparser2 = require('htmlparser2/lib/Parser.js');

// provide callbacks
// otherwise, parsing would be optimized
var emptyCBs = {
    onopentagname: function(){},
    onattribute: function(){},
    ontext: function(){},
    onclosetag: function(){}
};

function HtmlParser2() {
    var parser = new htmlparser2(emptyCBs);
    this.parse = function(s) {
    parser.write(s);
    };
}

var p = new HtmlParser2();


p.parse("<r>");
var nEl = 0;
(function d() {
    p.parse("<foo bar='baz'>quux</foo>");
    nEl++;
    process.nextTick(d);
})();

var its =[];
setInterval(function() {
    console.log(nEl + " el/s");
	its.push(nEl);
    nEl = 0;
}, 1e3);

process.on('SIGINT', function () {
	var average = its.reduce(function(average, v){
		return average+v;
	}) / its.length;
	console.log("Average:", average, "el/s");
	process.exit(0);
});