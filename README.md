#NodeHtmlParser
A forgiving HTML/XML/RSS parser written in JS for NodeJS. The parser can handle streams (chunked data) and supports custom handlers for writing custom DOMs/output.

##Installing
	`npm install htmlparser`

##Running Tests
	`node tests/00-runtests.js`

##Usage
	var htmlparser = require("htmlparser");
	var rawHtml = "Xyz &lt;script language= javascript>var foo = '&lt;&lt;bar>>';&lt; /  script>&lt;!--&lt;!-- Waah! -- -->";
	var handler = new htmlparser.DefaultHandler(function (error, dom) {
		if (error)
			[...do something for errors...]
		else
			[...parsing done, do something...]
	});
	var parser = new htmlparser.Parser(handler);
	parser.parseComplete(rawHtml);
	sys.puts(sys.inspect(handler.dom, false, null));


##Example output
	[ { raw: 'Xyz ', data: 'Xyz ', type: 'text' }
	, { raw: 'script language= javascript'
	  , data: 'script language= javascript'
	  , type: 'script'
	  , name: 'script'
	  , attribs: { language: 'javascript' }
	  , children: 
	     [ { raw: 'var foo = \'&lt;bar>\';&lt;'
	       , data: 'var foo = \'&lt;bar>\';&lt;'
	       , type: 'text'
	       }
	     ]
	  }
	, { raw: '&lt;!-- Waah! -- '
	  , data: '&lt;!-- Waah! -- '
	  , type: 'comment'
	  }
	]

##Streaming To Parser
	`while (...) {
		...
		parser.parseChunk(chunk);
	}
	parser.done();`

##Parsing RSS/Atom Feeds

	`new htmlparser.RssHandler(function (error, dom) {
		...
	});`

##DefaultHandler Options

###Usage
	`var handler = new htmlparser.DefaultHandler(
		  function (error) { ... }
		, { verbose: false, ignoreWhitespace: true }
		);`
	
###Option: ignoreWhitespace
Indicates whether the DOM should exclude text nodes that consists solely of whitespace. The default value is "false".

####Example: true
The following HTML:
	`&lt;font>
		&lt;br>this is the text
	&lt;font>`
becomes:
	[ { raw: 'font'
	  , data: 'font'
	  , type: 'tag'
	  , name: 'font'
	  , children: 
	     [ { raw: 'br', data: 'br', type: 'tag', name: 'br' }
	     , { raw: 'this is the text\n'
	       , data: 'this is the text\n'
	       , type: 'text'
	       }
	     , { raw: 'font', data: 'font', type: 'tag', name: 'font' }
	     ]
	  }
	]

####Example: false
The following HTML:
	`&lt;font>
		&lt;br>this is the text
	&lt;font>`
becomes:
	`[ { raw: 'font'
	  , data: 'font'
	  , type: 'tag'
	  , name: 'font'
	  , children: 
	     [ { raw: '\n\t', data: '\n\t', type: 'text' }
	     , { raw: 'br', data: 'br', type: 'tag', name: 'br' }
	     , { raw: 'this is the text\n'
	       , data: 'this is the text\n'
	       , type: 'text'
	       }
	     , { raw: 'font', data: 'font', type: 'tag', name: 'font' }
	     ]
	  }
	]`

###Option: verbose
Indicates whether to include extra information on each node in the DOM. This information consists of the "raw" attribute (original, unparsed text found between "&lt;" and ">") and the "data" attribute on "tag", "script", and "comment" nodes. The default value is "true". 

####Example: true
The following HTML:
	`&lt;a href="test.html">xxx&lt;/a>`
becomes:
	`[ { raw: 'a href="test.html"'
	  , data: 'a href="test.html"'
	  , type: 'tag'
	  , name: 'a'
	  , attribs: { href: 'test.html' }
	  , children: [ { raw: 'xxx', data: 'xxx', type: 'text' } ]
	  }
	]`

####Example: false
The following HTML:
	`&lt;a href="test.html">xxx&lt;/a>`
becomes:
	`[ { type: 'tag'
	  , name: 'a'
	  , attribs: { href: 'test.html' }
	  , children: [ { data: 'xxx', type: 'text' } ]
	  }
	]`

###Option: enforceEmptyTags
Indicates whether the DOM should prevent children on tags marked as empty in the HTML spec. Typically this should be set to "true" HTML parsing and "false" for XML parsing. The default value is "true".

####Example: true
The following HTML:
	`&lt;link>text&lt;/link>`
becomes:
	`[ { raw: 'link', data: 'link', type: 'tag', name: 'link' }
	, { raw: 'text', data: 'text', type: 'text' }
	]`

####Example: false
The following HTML:
	`&lt;link>text&lt;/link>`
becomes:
	`[ { raw: 'link'
	  , data: 'link'
	  , type: 'tag'
	  , name: 'link'
	  , children: [ { raw: 'text', data: 'text', type: 'text' } ]
	  }
	]`