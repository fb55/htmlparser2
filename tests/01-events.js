var helper = require("./test-helper.js");

exports.dir = "Events";

exports.test = function(test, cb){
	helper.writeToParser(
		helper.getEventCollector(cb),
		test.options.parser,
		test.html
	);
};