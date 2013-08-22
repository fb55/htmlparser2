var htmlparser2 = require(".."),
    fs = require("fs"),
    path = require("path"),
    assert = require("assert"),
	Parser = htmlparser2.Parser,
	CollectingHandler = htmlparser2.CollectingHandler,
	chunkSize = 5;

exports.writeToParser = function(handler, options, data){
	var parser = new Parser(handler, options);
	//first, try to run the test via chunks
	for(var i = 0; i < data.length; i += chunkSize){
		parser.write(data.substr(i, chunkSize));
	}
	parser.end();
	//then parse everything
	parser.parseComplete(data);
};

//returns a tree structure
exports.getEventCollector = function(cb){
	var handler = new CollectingHandler({onerror: cb, onend: function(){
		cb(null, handler.events
			.reduce(function(events, arr){
				if(arr[0] === "onerror" || arr[0] === "onend");
				else if(arr[0] === "ontext" && events.length && events[events.length-1].event === "text"){
					events[events.length-1].data[0] += arr[1];
				} else {
					events.push({
						event: arr[0].substr(2),
						data: arr.slice(1)
					});
				}

				return events;
			}, [])
		);
	}});

	return handler;
};

exports.readFiles = function(root, folder){
	var dir = path.join(root, folder);

	return fs
			.readdirSync(dir)
			.filter(RegExp.prototype.test, /^[^\._]/) //ignore all files with a leading dot or underscore
			.map(function(name){
				return path.join(dir, name);
			})
			.map(require);
};

function deepEqual(expected, actual, message){
	try {
		assert.deepEqual(expected, actual, message);
	} catch(e){
		e.expected = JSON.stringify(expected, null, 2);
		e.actual = JSON.stringify(actual, null, 2);
		throw e;
	}
}

exports.deepEqual = deepEqual;

exports.getCallback = function(expected, done){
	var repeated = false;

	return function(err, dom){
		assert.ifError(err);
		deepEqual(expected, dom, "didn't get expected output");

		if(repeated) done();
		else repeated = true;
	};
};