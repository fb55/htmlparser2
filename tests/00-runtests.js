var fs = require("fs"),
    path = require("path"),
    assert = require("assert");

var runCount = 0,
	testCount = 0;

[
 "./01-events.js",
 "./02-stream.js",
 "./03-feed.js"
]
.map(require)
.forEach(function (test){
	var dir = path.resolve(__dirname, test.dir);

	//read files, load them, run them
	var f = fs
	.readdirSync(dir)
	.filter(RegExp.prototype.test, /^[^\._]/) //ignore all files with a leading dot or underscore
	.map(function(name){
		return path.resolve(dir, name);
	})
	.map(require)
	.forEach(function(file){
		runCount++;
		
		console.log("Testing:", file.name);
		
		var second = false; //every test runs twice
		test.test(file, function(err, dom){
			assert.ifError(err);
			assert.deepEqual(file.expected, dom, "didn't get expected output");
						
			if(second){
				runCount--;
				testCount++;
			}
			else second = true;
		});
	});
	console.log("->", test.dir, "started");
});

//log the results
(function check(){
	if(runCount !== 0) return process.nextTick(check);
	console.log("Total tests:", testCount);
}());