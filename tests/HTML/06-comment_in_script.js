exports.name = "Script source in comment";
exports.options = {
	  handler: {}
	, parser: {}
};
exports.html = "<script><!--var foo = 1;--></script>";
exports.expected = [
  {
    "type": "script",
    "name": "script",
    "children": [
      {
        "data": "var foo = 1;",
        "type": "comment"
      }
    ]
  }
];