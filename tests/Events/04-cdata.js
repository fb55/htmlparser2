exports.name = "simple";
exports.options = {handler: {}, parser: {}};
exports.html = "<tag><![CDATA[ asdf ><asdf></adsf><> fo]]></tag>";
exports.expected = [
  {
    "event": "opentag",
    "data": [
      "tag",
      {},
      "tag"
    ]
  },
  {
    "event": "cdatastart",
    "data": []
  },
  {
    "event": "text",
    "data": [
      " asdf "
    ]
  },
  {
    "event": "text",
    "data": [
      "<"
    ]
  },
  {
    "event": "text",
    "data": [
      "asdf>"
    ]
  },
  {
    "event": "text",
    "data": [
      "<"
    ]
  },
  {
    "event": "text",
    "data": [
      "/adsf>"
    ]
  },
  {
    "event": "text",
    "data": [
      "<"
    ]
  },
  {
    "event": "text",
    "data": [
      ">"
    ]
  },
  {
    "event": "text",
    "data": [
      " fo"
    ]
  },
  {
    "event": "cdataend",
    "data": []
  },
  {
    "event": "closetag",
    "data": [
      "tag"
    ]
  }
];