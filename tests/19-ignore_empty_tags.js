exports.name = "Ignore empty tags";
exports.options = {
	  handler: { enforceEmptyTags: false }
	, parser: {}
};
exports.html = "<link>text</link>";
exports.expected =
	[
		  { raw: 'link', data: 'link', type: 'tag', name: 'link', children: [
		  	{ raw: 'text', data: 'text', type: 'text' }
		  ] }
	];