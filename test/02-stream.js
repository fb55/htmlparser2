var helper = require("./test-helper.js");
var Stream = require("..").WritableStream;
var fs = require("fs");
var path = require("path");

helper.mochaTest("Stream", __dirname, function(test, cb) {
    var filePath = path.join(__dirname, "Documents", test.file);
    fs.createReadStream(filePath)
        .pipe(
            new Stream(
                helper.getEventCollector(function(err, events) {
                    cb(err, events);

                    var handler = helper.getEventCollector(cb),
                        stream = new Stream(handler, test.options);

                    fs.readFile(filePath, function(err, data) {
                        if (err) throw err;
                        else stream.end(data);
                    });
                }),
                test.options
            )
        )
        .on("error", cb);
});
