exports.name = "XML Namespace";
exports.options = {
	  handler: {}
	, parser: {}
};
exports.html = "<ns:tag>text</ns:tag>";
exports.expected =
	[ { raw: 'ns:tag', data: 'ns:tag', type: 'tag', name: 'ns:tag', children: [ { raw: 'text', data: 'text', type: 'text' } ] }
	];