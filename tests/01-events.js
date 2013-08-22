var helper = require("./test-helper.js");

module.exports = function events(test, cb){
	helper.writeToParser(
		helper.getEventCollector(cb),
		test.options.parser,
		test.html
	);
};

module.exports.files = helper.readFiles(__dirname, "Events");