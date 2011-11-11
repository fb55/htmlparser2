exports.name = "Only text";
exports.options = {
	  handler: {}
	, parser: {}
};
exports.html = "this is the text";
exports.expected = [
  {
    "data": "this is the text",
    "type": "text"
  }
];