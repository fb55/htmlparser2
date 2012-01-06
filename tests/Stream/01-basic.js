exports.name = "Basic html";
exports.options = {};

exports.file = "/Documents/Basic.html";
exports.expected = [
  {
    "event": "processinginstruction",
    "data": [
      "!DOCTYPE",
      "!DOCTYPE html"
    ]
  },
  {
    "event": "opentagname",
    "data": [
      "html"
    ]
  },
  {
    "event": "opentag",
    "data": [
      "html",
      {},
      "tag"
    ]
  },
  {
    "event": "opentagname",
    "data": [
      "title"
    ]
  },
  {
    "event": "opentag",
    "data": [
      "title",
      {},
      "tag"
    ]
  },
  {
    "event": "text",
    "data": [
      "The Title"
    ]
  },
  {
    "event": "closetag",
    "data": [
      "title"
    ]
  },
  {
    "event": "opentagname",
    "data": [
      "body"
    ]
  },
  {
    "event": "opentag",
    "data": [
      "body",
      {},
      "tag"
    ]
  },
  {
    "event": "text",
    "data": [
      "Hello world"
    ]
  },
  {
    "event": "closetag",
    "data": [
      "body"
    ]
  },
  {
    "event": "closetag",
    "data": [
      "html"
    ]
  }
];