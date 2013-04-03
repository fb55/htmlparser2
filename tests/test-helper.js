var htmlparser = require(".."),
	Parser = htmlparser.Parser,
	CollectingHandler = htmlparser.CollectingHandler,
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
						event: arr[0].slice(2),
						data: arr.slice(1)
					});
				}

				return events;
			}, [])
		);
	}});

	return handler;
};