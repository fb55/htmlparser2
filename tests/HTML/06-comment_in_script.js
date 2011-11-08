exports.name = "Script source in comment";
exports.options = {
	  handler: {}
	, parser: {}
};
exports.html = "<script><!--var foo = 1;--></script>";
exports.expected =
[ { raw: 'script'
  , data: 'script'
  , type: 'script'
  , name: 'script'
  , children: 
     [ { raw: 'var foo = 1;'
       , data: 'var foo = 1;'
       , type: 'comment'
       }
     ]
  }
];