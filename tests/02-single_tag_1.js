exports.name = "Single Tag 1";
exports.html = "<br>text</br>";
exports.expected =
	[ { raw: 'br', data: 'br', type: 'tag', name: 'br' }
	, { raw: 'text', data: 'text', type: 'text' }
	];
