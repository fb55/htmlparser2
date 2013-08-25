//Runs tests for feeds

var helper = require("./test-helper.js"),
	FeedHandler = require("../lib/FeedHandler.js"),
	fs = require("fs"),
	path = require("path"),
	parserOpts = {
		xmlMode: true
	};

helper.mochaTest("Feeds", __dirname, function(test, cb){
	var file = fs.readFile(
		path.join(__dirname, "Documents", test.file),
		function(err, file){
			helper.writeToParser(
				new FeedHandler(cb),
				parserOpts,
				file.toString()
			);
		}
	);
});