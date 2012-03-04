var fs = require("fs"),
	assert = require("assert");

var runCount = 0,
	testCount = 0;

function runTests(test){
	//read files, load them, run them
	fs.readdirSync(__dirname + test.dir
	).map(function(file){
		if(file[0] === ".") return false;
		if(file.substr(-5) === ".json") return JSON.parse(
			fs.readFileSync(__dirname + test.dir + file)
		);
		return require(__dirname + test.dir + file);
	}).forEach(function(file){
		if(!file) return;
		var second = false;
		
		runCount++;
		
		console.log("Testing:", file.name);
		
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
	console.log("->", test.dir.slice(1, -1), "started");
};

//run all tests
[
 "./01-dom.js",
 "./02-feed.js",
 "./03-events.js",
 "./04-dom_utils.js",
 "./05-stream.js"
].map(require).forEach(runTests);

//log the results
(function check(){
	if(runCount !== 0) return process.nextTick(check);
	console.log("Total tests:", testCount);
})();