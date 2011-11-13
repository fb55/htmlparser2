exports.name = "Ignore empty tags (xml mode)";
exports.options = {
	  handler: {}
	, parser: {xmlMode:true}
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