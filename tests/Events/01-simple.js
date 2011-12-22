exports.name = "simple";
exports.options = {handler: {}, parser: {}};
exports.html = "<h1 class=test>adsf</h1>";
exports.expected = [
  {
    "event": "opentag",
    "data": [
      "h1",
      {
        "class": "test"
      },
      "tag"
    ]
  },
  {
    "event": "text",
    "data": [
      "adsf"
    ]
  },
  {
    "event": "closetag",
    "data": [
      "h1"
    ]
  }
];