exports.name = "Singular attribute";
exports.options = {
	  handler: {}
	, parser: {}
};
exports.html = "<option value='foo' selected>";
exports.expected = [
  {
    "type": "tag",
    "name": "option",
    "attribs": {
      "value": "foo",
      "selected": "selected"
    }
  }
];