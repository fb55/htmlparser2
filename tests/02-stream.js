var helper = require("./test-helper.js"),
	Stream = require("..").WritableStream,
	fs = require("fs");

exports.dir = "Stream";

exports.test = function(test, cb){
	var second = false,
	    handler = helper.getEventCollector(function(err, events){
			cb(err, events);
			if(!second){
				second = true;
				handler.onreset();
				stream = new Stream(handler, test.options);
				stream.end(fs.readFileSync(__dirname + test.file));
			}
		}),
		stream = new Stream(handler, test.options);

	fs.createReadStream(__dirname + test.file).pipe(stream);
};