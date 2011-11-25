var fs = require("fs");

var testCount = 0,
	failCount = 0,
	totalTime = 0;

function runTests(test){
	var begin = Date.now();
	//read files, load them, run them
	fs.readdirSync(test.dir
	).map(function(file){
		if(file[0] === ".") return false;
		return require(test.dir + file);
	}).forEach(function(file){
		if(file === false) return;
		var second = false,
			failed = false,
			start = Date.now()
			took = 0;
		
		console.log("Testing:", file.name);
		
		test.test(file, function(err, dom){
			if(err) console.log("Handler error:", err);
			took += Date.now() - start;
			
			var expected = JSON.stringify(file.expected, null, 2),
				got = JSON.stringify(dom, null, 2);
			if(expected !== got){
				failed = true;
				console.log("Expected", expected, "Got", got, second);
			}
			
			start = Date.now();
			
			if(second){
				testCount+=1;
				if(failed) failCount+=1;
				
				console.log("["+file.name+"]:",failed?"failed":"passed","(took",took,"ms)"); 
			}
			else second = true;
		});
	});
	var took = Date.now()-begin;
	totalTime+=took;
	console.log(test.dir,"took",took);
};

//run all tests
["./01-html.js", "./02-feed.js", "./03-events.js", "./04-dom_utils.js"]
	.map(require)
	.forEach(runTests);

//log the results
console.log("Total time:", totalTime);
console.log("Total tests:", testCount);
console.log("Failed tests:", failCount);

if(failCount !== 0){
	throw Error("Encountered " + failCount + " errors!");
}