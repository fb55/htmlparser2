var htmlparser = require(".."),
	Parser = htmlparser.Parser,
	chunkSize = 5;

exports.writeToParser = function(handler, options, data){
	var parser = new Parser(handler, options);
	//first, try to run the test via chunks
	for(var i = 0; i < data.length; i+=chunkSize){
		parser.write(data.substring(i, i + chunkSize));
	}
	parser.done();
	//then parse everything
	parser.parseComplete(data);
};

var EVENTS = Object.keys(htmlparser.EVENTS);

//remove onend and onerror from events
EVENTS.splice(EVENTS.indexOf("end"), 1);
EVENTS.splice(EVENTS.indexOf("error"), 1);

exports.EVENTS = EVENTS;