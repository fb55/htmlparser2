exports.name = "Text outside tags";
exports.options = {
	  handler: {}
	, parser: {}
};
exports.html = "Line one\n<br>\nline two";
exports.expected = [
  {
    "data": "Line one\n",
    "type": "text"
  },
  {
    "type": "tag",
    "name": "br"
  },
  {
    "data": "\nline two",
    "type": "text"
  }
];