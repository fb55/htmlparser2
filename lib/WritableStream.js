var Parser = require("./Parser.js");

var WritableStream = function(cbs, options){
	Parser.call(this, cbs, options);
};

require("util").inherits(WritableStream, require("stream").Stream);

//util.inherits would overwrite the prototype when called twice,
//so we need a different approach
Object.getOwnPropertyNames(Parser.prototype).forEach(function(name){
	WritableStream.prototype[name] = Parser.prototype[name];
});

WritableStream.prototype.writable = true;

// TODO improve support for Parser#pause and Parser#continue

module.exports = WritableStream;