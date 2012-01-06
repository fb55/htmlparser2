exports.name = "Lowercase tags";
exports.options = {handler: {}, parser: {lowerCaseTags:true}};
exports.html = "<H1 class=test>adsf</H1>";
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