exports.name = "simple";
exports.options = {handler: {}, parser: {lowerCaseTags:true}};
exports.html = "<H1 class=test>adsf</H1>";
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