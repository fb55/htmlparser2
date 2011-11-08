exports.name = "Unquoted attributes";
exports.options = {
	  handler: {}
	, parser: {}
};
exports.html = "<font size= 14>the text</font>";
exports.expected =
[ { raw: 'font size= 14'
  , data: 'font size= 14'
  , type: 'tag'
  , name: 'font'
  , attribs: { size: '14' }
  , children:
     [ { raw: 'the text'
       , data: 'the text'
       , type: 'text'
       }
     ]
  }
];