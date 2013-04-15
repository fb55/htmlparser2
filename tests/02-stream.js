var helper = require("./test-helper.js"),
	Stream = require("..").WritableStream,
	fs = require("fs");

exports.dir = "Stream";

exports.test = function(test, cb){
	fs.createReadStream(__dirname + test.file).pipe(
		new Stream(
			helper.getEventCollector(function(err, events){
				cb(err, events);

				var handler = helper.getEventCollector(cb),
				    stream = new Stream(handler, test.options);

				stream.end(fs.readFileSync(__dirname + test.file));
			}
		), test.options)
	);
};