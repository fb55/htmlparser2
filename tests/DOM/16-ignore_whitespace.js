exports.name = "Options 'ignoreWhitespace' set to 'true'";
exports.options = {
	  handler: { ignoreWhitespace: true }
	, parser: {}
};
exports.html = "Line one\n<br> \t\n<br>\nline two<font>\n <br> x </font>";
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
    "type": "tag",
    "name": "br"
  },
  {
    "data": "\nline two",
    "type": "text"
  },
  {
    "type": "tag",
    "name": "font",
    "children": [
      {
        "type": "tag",
        "name": "br"
      },
      {
        "data": " x ",
        "type": "text"
      }
    ]
  }
];