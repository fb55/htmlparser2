var sys = require("sys");
var fs = require("fs");
var htmlparser = require("../lib/htmlparser");

var testFolder = ".";
var chunkSize = 5;

var testFiles = fs.readdirSync(testFolder);
var testCount = 0;
var failedCount = 0;
var totalTime = 0;
for (var i = 1; i < testFiles.length; i++) {
    testCount++;
    var moduleName = testFiles[i];
    var test = require(testFolder + "/" + moduleName);
    var handlerCallback = function handlerCallback(error) {
        if (error) sys.puts("Handler error: " + error);
    };
    console.log(testFiles[i]);
    var start = Date.now();
    var handler =
        test.type === "rss"
            ? new htmlparser.RssHandler(handlerCallback, test.options.handler)
            : new htmlparser.DefaultHandler(
                  handlerCallback,
                  test.options.handler
              );
    var parser = new htmlparser.Parser(handler, test.options.parser);
    parser.parseComplete(test.html);
    var resultComplete = handler.dom;
    var chunkPos = 0;
    parser.reset();
    while (chunkPos < test.html.length) {
        parser.parseChunk(test.html.substring(chunkPos, chunkPos + chunkSize));
        chunkPos += chunkSize;
    }
    parser.done();
    var resultChunk = handler.dom;
    var testResult =
        sys.inspect(resultComplete, false, null) ===
            sys.inspect(test.expected, false, null) &&
        sys.inspect(resultChunk, false, null) ===
            sys.inspect(test.expected, false, null);
    var took = Date.now() - start;
    totalTime += took;
    sys.puts(
        "[" +
            test.name +
            "]: " +
            (testResult ? "passed" : "FAILED") +
            " (took: " +
            took +
            "ms)"
    );
    if (!testResult) {
        failedCount++;
        sys.puts("== Complete ==");
        sys.puts(sys.inspect(resultComplete, false, null));
        sys.puts("== Chunked ==");
        sys.puts(sys.inspect(resultChunk, false, null));
        sys.puts("== Expected ==");
        sys.puts(sys.inspect(test.expected, false, null));
    }
}
sys.puts("Total time: " + totalTime);
sys.puts("Total tests: " + testCount);
sys.puts("Failed tests: " + failedCount);
