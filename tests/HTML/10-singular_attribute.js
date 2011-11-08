exports.name = "Singular attribute";
exports.options = {
	  handler: {}
	, parser: {}
};
exports.html = "<option value='foo' selected>";
exports.expected =
[ { raw: 'option value=\'foo\' selected'
  , data: 'option value=\'foo\' selected'
  , type: 'tag'
  , name: 'option'
  , attribs: { value: 'foo', selected: 'selected' }
  }
];