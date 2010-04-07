var sys = require("sys");
var fs = require("fs");
var htmlparser = require("./node-htmlparser");

var testFolder = "./tests";

var testFiles = fs.readdirSync(testFolder);
var testCount = 0;
var failedCount = 0;
for (var i in testFiles) {
	testCount++;
	var fileParts = testFiles[i].split(".");
	fileParts.pop();
	var moduleName = fileParts.join(".");
//	sys.puts("Loading module \"" + moduleName + "\"");
	var test = require(testFolder + "/" + moduleName);
	var result = sys.inspect(htmlparser.ParseHtml(test.html), false, null) === sys.inspect(test.expected, false, null);
	sys.puts("[" + test.name + "\]: " + (result ? "passed" : "FAILED"));
	if (!result) {
		failedCount++;
		sys.puts(sys.inspect(htmlparser.ParseHtml(test.html), false, null));
		sys.puts(sys.inspect(test.expected, false, null));
	}
}
sys.puts("Total tests: " + testCount);
sys.puts("Failed tests: " + failedCount);
