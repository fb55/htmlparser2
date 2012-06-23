//node --prof --prof_auto profile.js
//deps/v8/tools/mac-tick-processor v8.log
var util = require('util');
var htmlparser = require("./htmlparser");

var html = "<link>text</link>";

var handler = new htmlparser.DefaultHandler(function(err, dom) {
	if (err)
		util.debug("Error: " + err);
	else
		util.debug(util.inspect(dom, false, null));
}, { enforceEmptyTags: true });
var parser = new htmlparser.Parser(handler);
parser.parseComplete(html);
