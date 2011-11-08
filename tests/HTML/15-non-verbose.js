exports.name = "Option 'verbose' set to 'false'";
exports.options = {
	  handler: { verbose: false }
	, parser: {}
};
exports.html = "<\n font	\n size='14' \n>the text<\n /	\nfont	 \n>";
exports.expected =
[ { type: 'tag'
  , name: 'font'
  , attribs: { size: '14' }
  , children:
     [ { data: 'the text'
       , type: 'text'
       }
     ]
  }
];