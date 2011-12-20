exports.name = "Basic test";
exports.options = {
	  handler: {}
	, parser: {lowerCaseTags:true}
};
exports.html = "<!DOCTYPE html><HTML><TITLE>The Title</title><BODY>Hello world</body></html>";
exports.expected = [
  {
    "name": "!doctype",
    "data": "!DOCTYPE html",
    "type": "directive"
  },
  {
    "type": "tag",
    "name": "html",
    "children": [
      {
        "type": "tag",
        "name": "title",
        "children": [
          {
            "data": "The Title",
            "type": "text"
          }
        ]
      },
      {
        "type": "tag",
        "name": "body",
        "children": [
          {
            "data": "Hello world",
            "type": "text"
          }
        ]
      }
    ]
  }
]
