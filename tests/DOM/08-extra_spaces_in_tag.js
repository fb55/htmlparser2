exports.name = "Extra spaces in tag";
exports.options = {
	  handler: {}
	, parser: {}
};
exports.html = "<\n font\t\n size='14' \n>the text<\n /	\nfont	 \n>";
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
