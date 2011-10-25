exports.name = "Single Tag 2";
exports.options = {
	  handler: {}
	, parser: {}
};
exports.html = "<br>text<br>";
exports.expected =
	[ { raw: 'br', data: 'br', type: 'tag', name: 'br' }
	, { raw: 'text', data: 'text', type: 'text' }
	, { raw: 'br', data: 'br', type: 'tag', name: 'br' }
	];