exports.name = "Single Tag 1";
exports.options = {
	  handler: {}
	, parser: {}
};
exports.html = "<br>text</br>";
exports.expected = [
  {
    "type": "tag",
    "name": "br"
  },
  {
    "data": "text",
    "type": "text"
  },
  {
    "type": "tag",
    "name": "br"
  }
];