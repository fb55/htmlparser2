exports.name = "Unescaped chars in style";
exports.options = {
	  handler: {}
	, parser: {}
};
exports.html = "<style type=\"text/css\">\n body > p\n	{ font-weight: bold; }</style>";
exports.expected =
[ { type: 'style'
  , name: 'style'
  , attribs: { type: 'text/css' }
  , children:
     [ { data: '\n body > p\n	{ font-weight: bold; }'
       , type: 'text'
       }
     ]
  }
];