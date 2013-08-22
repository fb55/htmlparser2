var helper = require("./test-helper.js"),
    assert = require("assert");

var runCount = 0,
	testCount = 0,
	done = false;

[
 "./01-events.js",
 "./02-stream.js",
 "./03-feed.js"
]
.map(require)
.forEach(function (test){
	console.log("\nStarting", test.name, "\n----");

	test.files
	.forEach(function(file){
		runCount++;
		
		console.log("Testing:", file.name);
		
		var second = false; //every test runs twice
		test(file, helper.getCallback(file.expected, function(){
			testCount++;
			if(!--runCount && done){
				console.log("Total tests:", testCount);
			}
		}));
	});
});

var done = true; //started all tests