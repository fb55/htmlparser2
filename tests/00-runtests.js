var fs = require("fs");

var runCount = 0,
	testCount = 0,
	failCount = 0;

function runTests(test){
	var begin = Date.now();
	//read files, load them, run them
	fs.readdirSync(__dirname + test.dir
	).map(function(file){
		if(file[0] === ".") return false;
		return require(__dirname + test.dir + file);
	}).forEach(function(file){
		if(file === false) return;
		var second = false,
			failed = false;
		
		runCount++;
		
		console.log("Testing:", file.name);
		
		test.test(file, function(err, dom){
			if(err) console.log("Handler error:", err);
			
			var expected = JSON.stringify(file.expected, null, 2),
				got = JSON.stringify(dom, null, 2);
			if(expected !== got){
				failed = true;
				console.log("Expected", expected, "Got", got, second);
			}
			
			if(second){
				runCount--;
				testCount++;
				if(failed) failCount++;
				
				console.log("["+file.name+"]:", failed ? "failed":"passed"); 
			}
			else second = true;
		});
	});
	console.log("->", test.dir.slice(1, -1), "iterated");
};

//run all tests
[
 "./01-html.js",
 "./02-feed.js",
 "./03-events.js",
 "./04-dom_utils.js",
 "./05-stream.js"
].map(require).forEach(runTests);

//log the results
(function check(){
	if(runCount !== 0){
		return setTimeout(check, 50);
	}
	console.log("Total tests:", testCount);
	console.log("Failed tests:", failCount);
	
	if(failCount !== 0){
		throw Error("Encountered " + failCount + " errors!");
	}
})();