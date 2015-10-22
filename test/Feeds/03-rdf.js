exports.name = "RDF test";
exports.file = "/RDF_Example.xml";
exports.expected = {
	"type": "rdf",
	"id": "",
	"title": "A title to parse and remember",
	"link": "https://github.com/fb55/htmlparser2/",
	"items": [
		{
			"title": "Fast HTML Parsing",
			"link": "http://somefakesite/path/to/something.html",
			"description": "Great test content<br>A link: <a href=\"http://github.com\">Github</a>"
		},
		{
			"title": "This space intentionally left blank",
			"link": "http://somefakesite/path/to/something-else.html",
			"description": "The early bird gets the worm"
		}
	]
};
