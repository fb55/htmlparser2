exports.name = "Enforce empty tags";
exports.options = {
	  handler: {}
	, parser: {}
};
exports.html = "<link>text</link>";
exports.expected = [
  {
    "type": "tag",
    "name": "link"
  },
  {
    "data": "text",
    "type": "text"
  }
];