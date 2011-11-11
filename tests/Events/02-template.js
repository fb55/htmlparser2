exports.name = "Template script tags";
exports.options = {handler: {}, parser: {}};
exports.html = "<script type=\"text/template\"><h1>Heading1</h1></script>";
exports.expected = [
  {
    "event": "open",
    "name": "script",
    "attributes": {
      "type": "text/template"
    }
  },
  {
    "event": "text",
    "text": "<h1"
  },
  {
    "event": "text",
    "text": ">Heading1"
  },
  {
    "event": "text",
    "text": "</h1"
  },
  {
    "event": "text",
    "text": ">"
  },
  {
    "event": "close",
    "name": "script"
  }
];