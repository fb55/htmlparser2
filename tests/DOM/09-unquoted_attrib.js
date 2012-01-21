exports.name = "Unquoted attributes";
exports.options = {
	  handler: {}
	, parser: {}
};
exports.html = "<font size= 14>the text</font>";
exports.expected = [
  {
    "type": "tag",
    "name": "font",
    "attribs": {
      "size": "14"
    },
    "children": [
      {
        "data": "the text",
        "type": "text"
      }
    ]
  }
];