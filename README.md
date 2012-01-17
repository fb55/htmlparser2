#htmlparser2 [![Build Status](https://secure.travis-ci.org/FB55/node-htmlparser.png)](http://travis-ci.org/FB55/node-htmlparser)

A forgiving HTML/XML/RSS parser written in JS for NodeJS. The parser can handle streams (chunked data) and supports custom handlers for writing custom DOMs/output.

##Installing
	npm install htmlparser2

##How is this different from [node-htmlparser](https://github.com/tautologistics/node-htmlparser)?
This is a fork of the project above. The main difference is that this is just intended to be used with node (it runs on other platforms using [browserify](https://github.com/substack/node-browserify)). Besides, the code is much better structured, has less duplications and is remarkably faster than the original. 

The parser now provides a callback interface close to [sax.js](https://github.com/isaacs/sax-js) (originally intended for [readabilitySAX](https://github.com/fb55/readabilitysax)). I also fixed a couple of bugs & included some pull requests for the original project (eg. [RDF feed support](https://github.com/tautologistics/node-htmlparser/pull/35)).

The support for location data and verbose output was removed a couple of versions ago. It's still available in the [verbose branch](https://github.com/FB55/node-htmlparser/tree/verbose) (if you really need it, for whatever reason that may be). 

The `DefaultHandler` and the `RssHandler` were renamed to clarify their purpose (to `DomHandler` and `FeedHandler`). The old names are still available when requiring `htmlparser2`, so your code should work as expected.

##Usage

```javascript
var htmlparser = require("htmlparser2");
var parser = new htmlparser.Parser({
	onopentag: function(name, attribs){
		if(name === "script" && attribs["language"] === "javascript"){
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
parser.write("Xyz <script language= javascript>var foo = '<<bar>>';< /  script>");
parser.done();
```

Output (simplified):

```javascript
--> Xyz 
JS! Hooray!
--> var foo = '<<bar>>';
That's it?!
```

Read more about the parser in the [wiki](https://github.com/FB55/node-htmlparser/wiki/Parser-options).

##Get a DOM
The `DomHandler` (known as `DefaultHandler` in the original `htmlparser` module) produces a DOM (document object model) that may be manipulated using the `DomUtils` helper.

Read more about the DomHandler in the [wiki](https://github.com/FB55/node-htmlparser/wiki/DomHandler).

##Parsing RSS/RDF/Atom Feeds

```javascript
new htmlparser.FeedHandler(function (error, feed) {
    ...
});
```