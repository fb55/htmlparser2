exports.name = "simple";
exports.options = {handler: {}, parser: {}};
exports.html = "<h1 class=test>adsf</h1>";
exports.expected = [
  {
    "event": "opentagname",
    "data": [
      "h1"
    ]
  },
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
    "event": "attribute",
    "data": [
      "class",
      "test"
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