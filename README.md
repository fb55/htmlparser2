#htmlparser2 [![Build Status](https://secure.travis-ci.org/fb55/node-htmlparser.png)](http://travis-ci.org/fb55/node-htmlparser)

A forgiving HTML/XML/RSS parser written in JS for NodeJS. The parser can handle streams (chunked data) and supports custom handlers for writing custom DOMs/output.

##Installing
	npm install htmlparser2

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
parser.write("Xyz <script type="text/javascript">var foo = '<<bar>>';< /  script>");
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
The `DomHandler` (known as `DefaultHandler` in the original `htmlparser` module) produces a DOM (document object model) that can be manipulated using the `DomUtils` helper.

The `DomHandler`, while still bundled with this module, was recently moved to it's [own module](https://github.com/FB55/domhandler). Have a look at it for further information.

##Parsing RSS/RDF/Atom Feeds

```javascript
new htmlparser.FeedHandler(function(<error> error, <object> feed){
    ...
});
```

##Performance
Using a modified version of [node-expat](https://github.com/astro/node-expat)s `bench.js`, I received the following results (on OSX):

```
node-xml:     28.03 ms/el
libxmljs:     11.11 ms/el
sax:          26.92 ms/el
node-expat:   07.32 ms/el
htmlparser:   16.40 ms/el
htmlparser2:  06.32 ms/el

Winner: htmlparser2
```

The test can be found in [`tests/bench.js`](tests/bench.js).

##How is this different from [node-htmlparser](https://github.com/tautologistics/node-htmlparser)?
This is a fork of the project above. The main difference is that this is intended to be used only with node (it runs on other platforms using [browserify](https://github.com/substack/node-browserify)). Besides, the code is much better structured, has less duplications and is remarkably faster than the original. 

The parser now provides a callback interface close to [sax.js](https://github.com/isaacs/sax-js) (originally targeted at [readabilitySAX](https://github.com/fb55/readabilitysax)). I also fixed a couple of bugs & included some pull requests for the original project (eg. [RDF feed support](https://github.com/tautologistics/node-htmlparser/pull/35)).

The support for location data and verbose output was removed a couple of versions ago. It's still available in the [verbose branch](https://github.com/FB55/node-htmlparser/tree/verbose). 

The `DefaultHandler` and the `RssHandler` were renamed to clarify their purpose (to `DomHandler` and `FeedHandler`). The old names are still available when requiring `htmlparser2`, so your code should work as expected.
