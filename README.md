#htmlparser2
A forgiving HTML/XML/RSS parser written in JS for NodeJS. The parser can handle streams (chunked data) and supports custom handlers for writing custom DOMs/output.

##Installing
	npm install htmlparser2

##Running Tests
	node tests/00-runtests.js

This project is linked to [Travis CI](http://travis-ci.org/). The latest builds status is:

[![Build Status](https://secure.travis-ci.org/FB55/node-htmlparser.png)](http://travis-ci.org/FB55/node-htmlparser)

##How is this different from [node-htmlparser](https://github.com/tautologistics/node-htmlparser)?
This is a fork of the project above. The main difference is that this is just intended to be used with node. Besides, the code is much better structured, has less duplications and is remarkably faster than the original. 

Besides, the parser now provides the interface of [sax.js](https://github.com/isaacs/sax-js) (originally intended for my readability port [readabilitySAX](https://github.com/fb55/readabilitysax)). I also fixed a couple of bugs & included some pull requests for the original project (eg. [RDF feed support](https://github.com/tautologistics/node-htmlparser/pull/35)).

The support for location data and verbose output was removed a couple of versions ago. It's still available in the [verbose branch](https://github.com/FB55/node-htmlparser/tree/verbose) (if you really need it, for whatever reason that may be).

##Usage

```javascript
var htmlparser = require("htmlparser");
var rawHtml = "Xyz <script language= javascript>var foo = '<<bar>>';< /  script><!--<!-- Waah! -- -->";
var handler = new htmlparser.DefaultHandler(function (error, dom) {
    if (error)
    	[...do something for errors...]
    else
    	[...parsing done, do something...]
        console.log(dom);
});
var parser = new htmlparser.Parser(handler);
parser.write(rawHtml);
parser.done();
```

Output:

```javascript
[{
    data: 'Xyz ',
    type: 'text'
}, {
    type: 'script',
    name: 'script',
    attribs: {
    	language: 'javascript'
    },
    children: [{
    	data: 'var foo = \'<bar>\';<',
    	type: 'text'
    }]
}, {
    data: '<!-- Waah! -- ',
    type: 'comment'
}]
```

##Streaming To Parser
```javascript
while (...) {
    ...
    parser.write(chunk);
}
parser.done();
```

##Parsing RSS/RDF/Atom Feeds

```javascript
new htmlparser.FeedHandler(function (error, feed) {
    ...
});
```

##Further reading
* [Parser options](https://github.com/FB55/node-htmlparser/wiki/Parser-options)
* [DefaultHandler options](https://github.com/FB55/node-htmlparser/wiki/DefaultHandler-options)