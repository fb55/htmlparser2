exports.name = "Only text";
exports.options = {
	  handler: {}
	, parser: {}
};
exports.html = "this is the text";
exports.expected =
[ { raw: 'this is the text'
  , data: 'this is the text'
  , type: 'text'
  }
];