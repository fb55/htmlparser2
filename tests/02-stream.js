var helper = require("./test-helper.js"),
	Stream = require("..").WritableStream,
	fs = require("fs");

exports.dir = "Stream";

exports.test = function(test, cb){
	var stream = new Stream(test.options),
	    second = false,
	    handler = helper.getEventCollector(function(err, events){
			cb(err, events);
			if(!second){
				second = true;
				stream.parseComplete(fs.readFileSync(__dirname + test.file));
			}
		});
	
	fs.createReadStream(__dirname + test.file).pipe(stream);
};