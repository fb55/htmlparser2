exports.name = "Text outside tags";
exports.html = "Line one\n<br>\nline two";
exports.expected =
[ { raw: 'Line one\n'
  , data: 'Line one\n'
  , type: 'text'
  }
  , { raw: 'br'
  , data: 'br'
  , type: 'tag'
  , name: 'br'
  }
  , { raw: '\nline two'
  , data: '\nline two'
  , type: 'text'
  }
];
