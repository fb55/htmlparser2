exports.name = "Comment within text";
exports.options = {
	  handler: {}
	, parser: {}
};
exports.html = "this is <!-- the comment --> the text";
exports.expected = [
  {
    "data": "this is ",
    "type": "text"
  },
  {
    "data": " the comment ",
    "type": "comment"
  },
  {
    "data": " the text",
    "type": "text"
  }
];