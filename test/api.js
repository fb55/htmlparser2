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
		assert.equal(p.endIndex, 2);

		p.write("<bar>");

		assert.equal(p.startIndex, 3);
		assert.equal(p.endIndex, 7);
	});

	it("should update the position when a single tag is spread across multiple chunks", function(){
		var p = new htmlparser2.Parser(null);

		p.write("<div ");
		p.write("foo=bar>");

		assert.equal(p.startIndex, 0);
		assert.equal(p.endIndex, 12);
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
});