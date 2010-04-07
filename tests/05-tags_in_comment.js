exports.name = "Special char in comment";
exports.html = "<head><!-- commented out tags <title>Test</title>--></head>";
exports.expected =
[ { raw: 'head'
  , data: 'head'
  , type: 'tag'
  , name: 'head'
  , children: 
     [ { raw: ' commented out tags <title>Test</title>'
       , data: ' commented out tags <title>Test</title>'
       , type: 'comment'
       }
     ]
  }
];
