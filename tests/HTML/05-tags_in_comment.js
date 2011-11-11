exports.name = "Special char in comment";
exports.options = {
	  handler: {}
	, parser: {}
};
exports.html = "<head><!-- commented out tags <title>Test</title>--></head>";
exports.expected = [
  {
    "type": "tag",
    "name": "head",
    "children": [
      {
        "data": " commented out tags <title>Test</title>",
        "type": "comment"
      }
    ]
  }
];