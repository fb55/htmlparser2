exports.name = "Comment within text within script";
exports.options = {
	  handler: {}
	, parser: {}
};
exports.html = "<script>this is <!-- the comment --> the text</script>";
exports.expected = [
  {
    "type": "script",
    "name": "script",
    "children": [
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
    ]
  }
];