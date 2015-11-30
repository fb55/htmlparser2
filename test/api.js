var htmlparser2 = require(".."),
		assert = require("assert");

describe("API", function(){

	it("should load all modules", function(){
		var Stream = require("../lib/Stream.js");
		assert.strictEqual(htmlparser2.Stream, Stream, "should load module");
		assert.strictEqual(htmlparser2.Stream, Stream, "should load it again (cache)");

		var ProxyHandler = require("../lib/ProxyHandler.js");
		assert.strictEqual(htmlparser2.ProxyHandler, ProxyHandler, "should load module");
		assert.strictEqual(htmlparser2.ProxyHandler, ProxyHandler, "should load it again (cache)");
	});

	it("should work without callbacks", function(){
		var p = new htmlparser2.Parser(null, {xmlMode: true, lowerCaseAttributeNames: true});

		p.end("<a foo><bar></a><!-- --><![CDATA[]]]><?foo?><!bar><boo/>boohay");
		p.write("foo");

		//check for an error
		p.end();
		var err = false;
		p._cbs.onerror = function(){ err = true; };
		p.write("foo");
		assert(err);
		err = false;
		p.end();
		assert(err);

		p.reset();

		//remove method
		p._cbs.onopentag = function(){};
		p.write("<a foo");
		p._cbs.onopentag = null;
		p.write(">");

		//pause/resume
		var processed = false;
		p._cbs.ontext = function(t){
			assert.equal(t, "foo");
			processed = true;
		};
		p.pause();
		p.write("foo");
		assert(!processed);
		p.resume();
		assert(processed);
		processed = false;
		p.pause();
		assert(!processed);
		p.resume();
		assert(!processed);
		p.pause();
		p.end("foo");
		assert(!processed);
		p.resume();
		assert(processed);

	});

	it("should update the position", function(){
		var p = new htmlparser2.Parser(null);

		p.write("foo");

		assert.equal(p.startIndex, 0);

		p.write("<bar>");

		assert.equal(p.startIndex, 3);
	});

	it("should support custom tokenizer", function(){
		function CustomTokenizer(options, cbs){
			htmlparser2.Tokenizer.call(this, options, cbs);
			return this;
		}
		CustomTokenizer.prototype = Object.create(htmlparser2.Tokenizer.prototype);
		CustomTokenizer.prototype.constructor = CustomTokenizer;

		var p = new htmlparser2.Parser({
			onparserinit: function(parser){
				assert(parser._tokenizer instanceof CustomTokenizer);
			}
		}, { Tokenizer: CustomTokenizer });
		p.done();
	});

	describe("should not parse code blocks", function(){
		it("with no attributes on code tag", function(){
			var html = "<code><Span /><Div className=\"foo\">inner</Div></code><h1>header</h1><code><Component prop=\"5\"/></code><span>after</span>";
			var output = "";

			var p = new htmlparser2.Parser({
				onopentagname: function(name){
					output += "<" + name + ">";
				},
				onclosetag: function(name){
					output += "</" + name + ">";
				},
				ontext: function(text){
					output += text;
				}
			}, {
				doNotParseCodeBlocks: true
			});
			p.write(html);

			assert.equal(output, html);
		});

		it("with attributes on code block", function(){
			var html = "<code lang=\"javascript\"><Span /><Div className=\"foo\">inner</Div></code><div>back to usual</div>";
			var output = "";

			var p = new htmlparser2.Parser({
				onopentag: function(name, attribs){
					output += "<" + name;
					for(var key in attribs){
						output += " " + key + "=\"" + attribs[key] + "\"";
					}
					output += ">";
				},
				onclosetag: function(name){
					output += "</" + name + ">";
				},
				ontext: function(text){
					output += text;
				}
			}, {
				doNotParseCodeBlocks: true
			});
			p.write(html);

			assert.equal(output, html);
		});
	});
});
