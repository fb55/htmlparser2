exports.name = "Options 'ignoreWhitespace' set to 'true'";
exports.options = {
	  handler: { ignoreWhitespace: true }
	, parser: {}
};
exports.html = "Line one\n<br> \t\n<br>\nline two<font>\n <br> x </font>";
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
  , { raw: 'br'
  , data: 'br'
  , type: 'tag'
  , name: 'br'
  }
  , { raw: '\nline two'
  , data: '\nline two'
  , type: 'text'
  }
  , { raw: 'font'
  , data: 'font'
  , type: 'tag'
  , name: 'font'
  , children: 
	[ { raw: 'br'
  , data: 'br'
  , type: 'tag'
  , name: 'br'
  }
  , { raw: ' x '
  , data: ' x '
  , type: 'text'
  }
	  ]
	}
];