# htmlparser2

[![NPM version](https://img.shields.io/npm/v/htmlparser2.svg)](https://npmjs.org/package/htmlparser2)
[![Downloads](https://img.shields.io/npm/dm/htmlparser2.svg)](https://npmjs.org/package/htmlparser2)
[![Node.js CI](https://github.com/fb55/htmlparser2/actions/workflows/nodejs-test.yml/badge.svg)](https://github.com/fb55/htmlparser2/actions/workflows/nodejs-test.yml)
[![Coverage](https://img.shields.io/coveralls/fb55/htmlparser2.svg)](https://coveralls.io/r/fb55/htmlparser2)

The fast & forgiving HTML/XML parser.

_htmlparser2 is [the fastest HTML parser](#performance), and takes some shortcuts to get there. If you need strict HTML spec compliance, have a look at [parse5](https://github.com/inikulin/parse5)._

## Installation

    npm install htmlparser2

A live demo of `htmlparser2` is available [on AST Explorer](https://astexplorer.net/#/2AmVrGuGVJ).

## Ecosystem

| Name                                                          | Description                                             |
| ------------------------------------------------------------- | ------------------------------------------------------- |
| [htmlparser2](https://github.com/fb55/htmlparser2)            | Fast & forgiving HTML/XML parser                        |
| [domhandler](https://github.com/fb55/domhandler)              | Handler for htmlparser2 that turns documents into a DOM |
| [domutils](https://github.com/fb55/domutils)                  | Utilities for working with domhandler's DOM             |
| [css-select](https://github.com/fb55/css-select)              | CSS selector engine, compatible with domhandler's DOM   |
| [cheerio](https://github.com/cheeriojs/cheerio)               | The jQuery API for domhandler's DOM                     |
| [dom-serializer](https://github.com/cheeriojs/dom-serializer) | Serializer for domhandler's DOM                         |

## Usage

`htmlparser2` itself provides a callback interface that allows consumption of documents with minimal allocations.
For a more ergonomic experience, read [Getting a DOM](#getting-a-dom) below.

```js
import * as htmlparser2 from "htmlparser2";

const parser = new htmlparser2.Parser({
    onopentag(name, attributes) {
        /*
         * This fires when a new tag is opened.
         *
         * If you don't need an aggregated `attributes` object,
         * have a look at the `onopentagname` and `onattribute` events.
         */
        if (name === "script" && attributes.type === "text/javascript") {
            console.log("JS! Hooray!");
        }
    },
    ontext(text) {
        /*
         * Fires whenever a section of text was processed.
         *
         * Note that this can fire at any point within text and you might
         * have to stitch together multiple pieces.
         */
        console.log("-->", text);
    },
    onclosetag(tagname) {
        /*
         * Fires when a tag is closed.
         *
         * You can rely on this event only firing when you have received an
         * equivalent opening tag before. Closing tags without corresponding
         * opening tags will be ignored.
         */
        if (tagname === "script") {
            console.log("That's it?!");
        }
    },
});
parser.write(
    "Xyz <script type='text/javascript'>const foo = '<<bar>>';</script>",
);
parser.end();
```

Output (with multiple text events combined):

```
--> Xyz
JS! Hooray!
--> const foo = '<<bar>>';
That's it?!
```

### Parser events

All callbacks are optional. The handler object you pass to `Parser` may implement any subset of these:

| Event                                        | Description                                                                                                                                      |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `onopentag(name, attribs, isImplied)`        | Opening tag. `attribs` is an object mapping attribute names to values. `isImplied` is `true` when the tag was opened implicitly (HTML mode only). |
| `onopentagname(name)`                        | Emitted for the tag name as soon as it is available (before attributes are parsed).                                                              |
| `onattribute(name, value, quote)`            | Attribute. `quote` is `"` / `'` / `null` (unquoted) / `undefined` (no value, e.g. `disabled`).                                                  |
| `onclosetag(name, isImplied)`                | Closing tag. `isImplied` is `true` when the tag was closed implicitly (HTML mode only).                                                          |
| `ontext(data)`                               | Text content. May fire multiple times for a single text node.                                                                                    |
| `oncomment(data)`                            | Comment (content between `<!--` and `-->`).                                                                                                      |
| `oncdatastart()`                             | Opening of a CDATA section (`<![CDATA[`).                                                                                                        |
| `oncdataend()`                               | End of a CDATA section (`]]>`).                                                                                                                  |
| `onprocessinginstruction(name, data)`        | Processing instruction (e.g. `<?xml ...?>`).                                                                                                     |
| `oncommentend()`                             | Fires after a comment has ended.                                                                                                                 |
| `onparserinit(parser)`                       | Fires when the parser is initialized or reset.                                                                                                   |
| `onreset()`                                  | Fires when `parser.reset()` is called.                                                                                                           |
| `onend()`                                    | Fires when parsing is complete.                                                                                                                  |
| `onerror(error)`                             | Fires on error.                                                                                                                                  |

### Parser options

| Option                   | Type      | Default    | Description                                                                                                                                              |
| ------------------------ | --------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `xmlMode`                | `boolean` | `false`    | Treat the document as XML. This affects entity decoding, self-closing tags, CDATA handling, and more. Set this to `true` for XML, RSS, Atom and RDF feeds. |
| `decodeEntities`         | `boolean` | `true`     | Decode HTML entities (e.g. `&amp;` -> `&`).                                                                                                              |
| `lowerCaseTags`          | `boolean` | `!xmlMode` | Lowercase tag names.                                                                                                                                     |
| `lowerCaseAttributeNames`| `boolean` | `!xmlMode` | Lowercase attribute names.                                                                                                                               |
| `recognizeSelfClosing`   | `boolean` | `xmlMode`  | Recognize self-closing tags (e.g. `<br/>`). Always enabled in `xmlMode`.                                                                                 |
| `recognizeCDATA`         | `boolean` | `xmlMode`  | Recognize CDATA sections as text. Always enabled in `xmlMode`.                                                                                           |

### Usage with streams

While the `Parser` interface closely resembles Node.js streams, it's not a 100% match.
Use the `WritableStream` interface to process a streaming input:

```js
import { WritableStream } from "htmlparser2/WritableStream";

const parserStream = new WritableStream({
    ontext(text) {
        console.log("Streaming:", text);
    },
});

const htmlStream = fs.createReadStream("./my-file.html");
htmlStream.pipe(parserStream).on("finish", () => console.log("done"));
```

## Getting a DOM

The `parseDocument` helper parses a string and returns a DOM tree (a [`Document`](https://github.com/fb55/domhandler) node).

```js
import * as htmlparser2 from "htmlparser2";

const dom = htmlparser2.parseDocument(
    `<ul id="fruits">
        <li class="apple">Apple</li>
        <li class="orange">Orange</li>
    </ul>`,
);
```

`parseDocument` accepts an optional second argument with both parser and [DOM handler options](https://github.com/fb55/domhandler):

```js
const dom = htmlparser2.parseDocument(data, {
    // Parser options
    xmlMode: true,

    // domhandler options
    withStartIndices: true, // Add `startIndex` to each node
    withEndIndices: true,   // Add `endIndex` to each node
});
```

### Searching the DOM

The [`DomUtils`](https://github.com/fb55/domutils) module (re-exported on the main `htmlparser2` export) provides helpers for finding nodes:

```js
import * as htmlparser2 from "htmlparser2";

const dom = htmlparser2.parseDocument(`<div><p id="greeting">Hello</p></div>`);

// Find elements by ID, tag name, or class
const greeting = htmlparser2.DomUtils.getElementById("greeting", dom);
const paragraphs = htmlparser2.DomUtils.getElementsByTagName("p", dom);

// Find elements with custom test functions
const all = htmlparser2.DomUtils.findAll(
    (el) => el.attribs?.class === "active",
    dom,
);

// Get text content
htmlparser2.DomUtils.textContent(greeting); // "Hello"
```

For CSS selector queries, use [`css-select`](https://github.com/fb55/css-select):

```js
import { selectAll, selectOne } from "css-select";

const results = selectAll("ul#fruits > li", dom);
const first = selectOne("li.apple", dom);
```

Or, if you'd prefer a jQuery-like API, use [`cheerio`](https://github.com/cheeriojs/cheerio).

### Modifying and serializing the DOM

Use `DomUtils` to modify the tree, and [`dom-serializer`](https://github.com/cheeriojs/dom-serializer) (also available as `DomUtils.getOuterHTML`) to serialize it back to HTML:

```js
import * as htmlparser2 from "htmlparser2";

const dom = htmlparser2.parseDocument(
    `<ul><li>Apple</li><li>Orange</li></ul>`,
);

// Remove the first <li>
const items = htmlparser2.DomUtils.getElementsByTagName("li", dom);
htmlparser2.DomUtils.removeElement(items[0]);

// Serialize back to HTML
const html = htmlparser2.DomUtils.getOuterHTML(dom);
// "<ul><li>Orange</li></ul>"
```

Other manipulation helpers include `appendChild`, `prependChild`, `append`, `prepend`, and `replaceElement` -- see the [`domutils` docs](https://github.com/fb55/domutils) for the full API.

## Parsing feeds

`htmlparser2` makes it easy to parse RSS, RDF and Atom feeds, by providing a `parseFeed` method:

```javascript
const feed = htmlparser2.parseFeed(content);
```

This returns an object with `type`, `title`, `link`, `description`, `updated`, `author`, and `items` (an array of feed entries), or `null` if the document isn't a recognized feed format.

The `xmlMode` option is enabled by default for `parseFeed`. If you pass custom options, make sure to include `xmlMode: true`.

## Performance

After having some artificial benchmarks for some time, **@AndreasMadsen** published his [`htmlparser-benchmark`](https://github.com/AndreasMadsen/htmlparser-benchmark), which benchmarks HTML parses based on real-world websites.

At the time of writing, the latest versions of all supported parsers show the following performance characteristics on GitHub Actions (sourced from [here](https://github.com/AndreasMadsen/htmlparser-benchmark/blob/e78cd8fc6c2adac08deedd4f274c33537451186b/stats.txt)):

```
htmlparser2        : 2.17215 ms/file ± 3.81587
node-html-parser   : 2.35983 ms/file ± 1.54487
html5parser        : 2.43468 ms/file ± 2.81501
neutron-html5parser: 2.61356 ms/file ± 1.70324
htmlparser2-dom    : 3.09034 ms/file ± 4.77033
html-dom-parser    : 3.56804 ms/file ± 5.15621
libxmljs           : 4.07490 ms/file ± 2.99869
htmljs-parser      : 6.15812 ms/file ± 7.52497
parse5             : 9.70406 ms/file ± 6.74872
htmlparser         : 15.0596 ms/file ± 89.0826
html-parser        : 28.6282 ms/file ± 22.6652
saxes              : 45.7921 ms/file ± 128.691
html5              : 120.844 ms/file ± 153.944
```

## Security contact information

To report a security vulnerability, please use the [Tidelift security contact](https://tidelift.com/security).
Tidelift will coordinate the fix and disclosure.
