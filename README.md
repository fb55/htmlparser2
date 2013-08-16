#htmlparser2 [![NPM version](https://badge.fury.io/js/htmlparser2.png)](https://npmjs.org/package/htmlparser2) [![Build Status](https://secure.travis-ci.org/fb55/htmlparser2.png)](http://travis-ci.org/fb55/htmlparser2) [![Dependency Status](https://david-dm.org/fb55/htmlparser2.png)](https://david-dm.org/fb55/htmlparser2)

A forgiving HTML/XML/RSS parser written in JS for NodeJS. The parser can handle streams (chunked data) and supports custom handlers for writing custom DOMs/output.

##Installing
	npm install htmlparser2
	
A live demo of htmlparser2 is available at http://demos.forbeslindesay.co.uk/htmlparser2/

##Usage

```javascript
var htmlparser = require("htmlparser2");
var parser = new htmlparser.Parser({
	onopentag: function(name, attribs){
		if(name === "script" && attribs.type === "text/javascript"){
			console.log("JS! Hooray!");
		}
	},
	ontext: function(text){
		console.log("-->", text);
	},
	onclosetag: function(tagname){
		if(tagname === "script"){
			console.log("That's it?!");
		}
	}
});
parser.write("Xyz <script type='text/javascript'>var foo = '<<bar>>';</ script>");
parser.end();
```

Output (simplified):

```javascript
--> Xyz 
JS! Hooray!
--> var foo = '<<bar>>';
That's it?!
```

Read more about the parser in the [wiki](https://github.com/fb55/htmlparser2/wiki/Parser-options).

##Get a DOM
The `DomHandler` (known as `DefaultHandler` in the original `htmlparser` module) produces a DOM (document object model) that can be manipulated using the [`DomUtils`](https://github.com/fb55/DomUtils) helper.

The `DomHandler`, while still bundled with this module, was moved to its [own module](https://github.com/fb55/domhandler). Have a look at it for further information.

##Parsing RSS/RDF/Atom Feeds

```javascript
new htmlparser.FeedHandler(function(<error> error, <object> feed){
    ...
});
```

##Performance

After having some artificial benchmarks for some time, __@AndreasMadsen__ published his [`htmlparser-benchmark`](https://github.com/AndreasMadsen/htmlparser-benchmark), which benchmarks HTML parses based on real-world websites.

At the time of writing, the latest versions of all supported parsers show the following performance characteristics on my MacBook:

```
gumbo-parser   : 28.9543 ms/file ± 15.9772
html-parser    : 19.0935 ms/file ± 13.4118
htmlparser     : 48.9674 ms/file ± 293.747
hubbub         : 30.1816 ms/file ± 16.1811
libxmljs       : 13.0610 ms/file ± 18.6695
sax            : 44.5736 ms/file ± 22.6353
htmlparser2-dom: 5.27927 ms/file ± 4.80156
htmlparser2    : 3.56451 ms/file ± 2.51882
```

##How is this different from [node-htmlparser](https://github.com/tautologistics/node-htmlparser)?
This is a fork of the `htmlparser` module. The main difference is that this is intended to be used only with node (it runs on other platforms using [browserify](https://github.com/substack/node-browserify)). `htmlparser2` was rewritten multiple times and, while it maintains an API that's compatible with `htmlparser` in most cases, the projects don't share any code anymore.

The parser now provides a callback interface close to [sax.js](https://github.com/isaacs/sax-js) (originally targeted at [readabilitySAX](https://github.com/fb55/readabilitysax)). As a result, old handlers won't work anymore.

The `DefaultHandler` and the `RssHandler` were renamed to clarify their purpose (to `DomHandler` and `FeedHandler`). The old names are still available when requiring `htmlparser2`, so your code should work as expected.
