//Runs tests for feeds

var helper = require("./test-helper.js"),
	FeedHandler = require("../lib/FeedHandler.js");

exports.dir = "/Feeds/";

exports.test = function(test, cb){
	var handler = new FeedHandler(function(err, dom){
		if(err) cb(err, 0); //return the error
		else cb(null, dom);
	}, test.options.handler);
	helper.writeToParser(handler, test.options.parser, test.html);
};