exports.name = "Ignore empty tags";
exports.options = {
	  handler: { enforceEmptyTags: false }
	, parser: {}
};
exports.html = "<link>text</link>";
exports.expected = [
  {
    "type": "tag",
    "name": "link",
    "children": [
      {
        "data": "text",
        "type": "text"
      }
    ]
  }
];