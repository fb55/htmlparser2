//Runs tests for feeds

var helper = require("./test-helper.js"),
	FeedHandler = require("../lib/FeedHandler.js"),
	parserOpts = {
		xmlMode: true
	};

exports.dir = "/Feeds/";

exports.test = function(test, cb){
	var handler = new FeedHandler(function(err, dom){
		if(err) cb(err, 0); //return the error
		else cb(null, dom);
	});
	helper.writeToParser(handler, parserOpts, test.html);
};