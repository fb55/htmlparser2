//Runs tests for the DOM handler

var helper = require("./test-helper.js"),
	DefaultHandler = require("../lib/DomHandler.js");

exports.dir = "/DOM/";

/*
	function test()
	runs a test, calls the callback afterwards
*/
exports.test = function(test, cb){
	var handler = new DefaultHandler(function(err, dom){
		if(err) cb(err, 0); //return the error
		else cb(null, dom);
	}, test.options.handler);
	helper.writeToParser(handler, test.options.parser, test.html);
}