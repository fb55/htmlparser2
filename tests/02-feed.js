//Runs tests for feeds

var helper = require("./test-helper.js"),
	RssHandler = require("../lib/RssHandler.js");

exports.dir = "./Feeds/";

exports.test = function(test, cb){
	var handler = new RssHandler(function(err, dom){
		if(err) cb(err, 0); //return the error
		else cb(null, dom);
	}, test.options.handler);
	helper.writeToParser(handler, test.options.parser, test.html);
}