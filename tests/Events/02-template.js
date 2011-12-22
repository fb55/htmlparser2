exports.name = "Template script tags";
exports.options = {handler: {}, parser: {}};
exports.html = "<script type=\"text/template\"><h1>Heading1</h1></script>";
exports.expected = [
  {
    "event": "opentag",
    "data": [
      "script",
      {
        "type": "text/template"
      },
      "script"
    ]
  },
  {
    "event": "text",
    "data": [
      "<h1"
    ]
  },
  {
    "event": "text",
    "data": [
      ">Heading1"
    ]
  },
  {
    "event": "text",
    "data": [
      "</h1"
    ]
  },
  {
    "event": "text",
    "data": [
      ">"
    ]
  },
  {
    "event": "closetag",
    "data": [
      "script"
    ]
  }
];