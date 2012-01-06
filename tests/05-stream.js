var helper = require("./test-helper.js"),
	Stream = require("..").Stream,
	sliceArr = Array.prototype.slice,
	fs = require("fs");

exports.dir = "/Stream/";

exports.test = function(test, cb){
	var tokens = [],
		stream = new Stream(test.options),
		second = false;
	
	if(typeof Proxy !== "undefined"){
		stream._events = Proxy.create({ get: function(a, name){
			if(name === "end"){
				return function(){
					cb(null, tokens.splice(0));
					if(!second){
						second = true;
						stream.parseComplete(fs.readFileSync(__dirname + test.file).toString());
					}
				};
			}
			if(helper.EVENTS.indexOf(name) !== -1) return function(){
				tokens.push({
					event: name,
					data: sliceArr.apply(arguments)
				});
			}
		}});
	}
	else {
		stream._events = {
			error: cb,
			end: function(){
				cb(null, tokens.splice(0));
				if(!second){
					second = true;
					stream.parseComplete(fs.readFileSync(__dirname + test.file).toString());
				}
			}
		};
		helper.EVENTS.forEach(function(name){
			stream._events[name] = function(){
				tokens.push({
					event: name,
					data: sliceArr.apply(arguments)
				});
			}
		});
	}
	fs.createReadStream(__dirname + test.file).pipe(stream);
};