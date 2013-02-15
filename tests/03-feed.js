//Runs tests for feeds

var helper = require("./test-helper.js"),
	FeedHandler = require("../lib/FeedHandler.js"),
	fs = require("fs"),
	parserOpts = {
		xmlMode: true
	};

exports.dir = "Feeds";

exports.test = function(test, cb){
	var handler = new FeedHandler(function(err, dom){
		if(err) cb(err, 0); //return the error
		else cb(null, dom);
	});
	var file = fs.readFileSync(__dirname + "/Documents/" + test.file).toString();
	helper.writeToParser(handler, parserOpts, file);
};