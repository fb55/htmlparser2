exports.name = "Enforce empty tags";
exports.options = {
	  handler: {}
	, parser: {}
};
exports.html = "<link>text</link>";
exports.expected =
	[
		  { raw: 'link', data: 'link', type: 'tag', name: 'link' }
		, { raw: 'text', data: 'text', type: 'text' }
	];