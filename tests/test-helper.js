var Parser = require("../lib/Parser.js"),
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
}

exports.EVENTS = ["attribute", "cdatastart", "cdataend", "text", "processinginstruction", "comment", "commentend", "closetag", "opentag", "opentagname"/*, "error", "end"*/];