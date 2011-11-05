#htmlparser2
A forgiving HTML/XML/RSS parser written in JS for NodeJS. The parser can handle streams (chunked data) and supports custom handlers for writing custom DOMs/output.

##Installing
	npm install htmlparser2

##Running Tests
	node tests/00-runtests.js

##How is this different from [node-htmlparser](https://github.com/tautologistics/node-htmlparser)?
This is a fork of the project above. The main difference is that this is just intended to be used with node. Besides, the code is much better structured, has less duplications and is remarkably faster than the original. 

Besides, it features an additional handler that provides the interface of [sax.js](https://github.com/isaacs/sax-js) (written for my readability port [readabilitySAX](https://github.com/fb55/readabilitysax)). I also fixed a couple of bugs & included some pull requests for the original project (eg. [RDF feed support](https://github.com/tautologistics/node-htmlparser/pull/35)).

##Usage

	var htmlparser = require("htmlparser");
	var rawHtml = "Xyz <script language= javascript>var foo = '<<bar>>';< /  script><!--<!-- Waah! -- -->";
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

	[{
		raw: 'Xyz ',
		data: 'Xyz ',
		type: 'text'
	}, {
		raw: 'script language= javascript',
		data: 'script language= javascript',
		type: 'script',
		name: 'script',
		attribs: {
			language: 'javascript'
		},
		children: [{
			raw: 'var foo = \'<bar>\';<',
			data: 'var foo = \'<bar>\';<',
			type: 'text'
		}]
	}, {
		raw: '<!-- Waah! -- ',
		data: '<!-- Waah! -- ',
		type: 'comment'
	}]

##Streaming To Parser
	while (...) {
		...
		parser.parseChunk(chunk);
	}
	parser.done();

##Parsing RSS/Atom Feeds
	new htmlparser.RssHandler(function (error, dom) {
		...
	});

##Parser options

###Usage
	var Parser = new htmlparser.Parser(handler, options);

###Option: includeLocation
Indicates whether the parser should include the location of a token as part of it. Default: false.

###Option: xmlMode
Indicates whether `<script>` and `<style>` tags should get special treatment. If false, their content will be text only. For RSS feeds and other XML content (not HTML), set this to true. Default: false.

##DefaultHandler options

###Usage
	var handler = new htmlparser.DefaultHandler(function (error) {...}, {
		verbose: false,
		ignoreWhitespace: true
	});
	
###Option: ignoreWhitespace
Indicates whether the DOM should exclude text nodes that consists solely of whitespace. The default value is "false". 

The following HTML will be used:

	<font>
		<br>this is the text
	<font>

####Example: true

	[{
		raw: 'font',
		data: 'font',
		type: 'tag',
		name: 'font',
		children: [{
			raw: 'br',
			data: 'br',
			type: 'tag',
			name: 'br'
		}, {
			raw: 'this is the text\n',
			data: 'this is the text\n',
			type: 'text'
		}, {
			raw: 'font',
			data: 'font',
			type: 'tag',
			name: 'font'
		}]
	}]

####Example: false

	[{
		raw: 'font',
		data: 'font',
		type: 'tag',
		name: 'font',
		children: [{
			raw: '\n\t',
			data: '\n\t',
			type: 'text'
		}, {
			raw: 'br',
			data: 'br',
			type: 'tag',
			name: 'br'
		}, {
			raw: 'this is the text\n',
			data: 'this is the text\n',
			type: 'text'
		}, {
			raw: 'font',
			data: 'font',
			type: 'tag',
			name: 'font'
		}]
	}]

###Option: verbose
Indicates whether to include extra information on each node in the DOM. This information consists of the "raw" attribute (original, unparsed text found between "<" and ">") and the "data" attribute on "tag", "script", and "comment" nodes. The default value is "true".

The following HTML is used:

	<a href="test.html">xxx</a>

####Example: true

	[{
		raw: 'a href="test.html"',
		data: 'a href="test.html"',
		type: 'tag',
		name: 'a',
		attribs: {
			href: 'test.html'
		},
		children: [{
			raw: 'xxx',
			data: 'xxx',
			type: 'text'
		}]
	}]

####Example: false

	[{
		type: 'tag',
		name: 'a',
		attribs: {
			href: 'test.html'
		},
		children: [{
			data: 'xxx',
			type: 'text'
		}]
	}]

###Option: enforceEmptyTags
Indicates whether the DOM should prevent children on tags marked as empty in the HTML spec. Typically this should be set to "true" HTML parsing and "false" for XML parsing. The default value is "true".

The following HTML is used:

	<link>text</link>

####Example: true

	[{
		raw: 'link',
		data: 'link',
		type: 'tag',
		name: 'link'
	}, {
		raw: 'text',
		data: 'text',
		type: 'text'
	}]

####Example: false

	[{
		raw: 'link',
		data: 'link',
		type: 'tag',
		name: 'link',
		children: [{
			raw: 'text',
			data: 'text',
			type: 'text'
		}]
	}]