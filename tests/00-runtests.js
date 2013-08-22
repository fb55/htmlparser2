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
		test(file, function(err, dom){
			assert.ifError(err);
			helper.deepEqual(file.expected, dom, "didn't get expected output");
						
			if(second){
				testCount++;
				if(!--runCount && done){
					console.log("Total tests:", testCount);
				}
			}
			else second = true;
		});
	});
});

var done = true; //started all tests