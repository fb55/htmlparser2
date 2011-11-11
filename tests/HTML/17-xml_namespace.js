exports.name = "XML Namespace";
exports.options = {
	  handler: {}
	, parser: {}
};
exports.html = "<ns:tag>text</ns:tag>";
exports.expected = [
  {
    "type": "tag",
    "name": "ns:tag",
    "children": [
      {
        "data": "text",
        "type": "text"
      }
    ]
  }
];