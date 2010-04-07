exports.name = "Basic test";
exports.html = "<html><title>The Title</title><body>Hello world</body></html>";
exports.expected =
	[ { raw: 'html'
		  , data: 'html'
		  , type: 'tag'
		  , name: 'html'
		  , children: 
		     [ { raw: 'title'
		       , data: 'title'
		       , type: 'tag'
		       , name: 'title'
		       , children: [ { raw: 'The Title', data: 'The Title', type: 'text' } ]
		       }
		     , { raw: 'body'
		       , data: 'body'
		       , type: 'tag'
		       , name: 'body'
		       , children: 
		          [ { raw: 'Hello world'
		            , data: 'Hello world'
		            , type: 'text'
		            }
		          ]
		       }
		     ]
		  }
		];
