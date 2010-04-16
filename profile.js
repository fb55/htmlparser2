//node --prof --prof_auto profile.js
//deps/v8/tools/mac-tick-processor v8.log
var sys = require("sys");
var fs = require("fs");
var http = require("http");
var htmlparser = require("./node-htmlparser");
var libxml = require('./libxmljs');

function GetTime () {
	return((new Date()).getTime());
}

function TimeCode (loops, func) {
	var start = GetTime();

	while (loops--)
		func();

	return(GetTime() - start);
}

var html = "";
http.createClient(80, "en.wikipedia.org")
	.request("GET", "/wiki/Javascript", {host: "en.wikipedia.org"})
	.addListener("response", function (response) {
		if (response.statusCode == "200") {
			response.setEncoding("utf8");
			response.addListener("data", function (chunk) {
				html += chunk;
			}).addListener("end", function() {
				var timeNodeHtmlParser = TimeCode(100, function () {
					var handler = new htmlparser.DefaultHandler(function(err, dom) {
						if (err)
							sys.debug("Error: " + err);
					});
					var parser = new htmlparser.Parser(handler);
					parser.ParseComplete(html);
				})
				
				var timeLibXmlJs = TimeCode(100, function () {
					var dom = libxml.parseHtmlString(html);
				})
				
				sys.debug("NodeHtmlParser: "  + timeNodeHtmlParser);
				sys.debug("LibXmlJs: "  + timeLibXmlJs);
				sys.debug("Difference: " + ((timeNodeHtmlParser - timeLibXmlJs) / timeLibXmlJs) * 100);
			});
		}
		else
			sys.debug("Error: got response status " + response.statusCode);
	})
	.end();
