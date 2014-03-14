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
		var err = false;
		p._cbs.onerror = function(){ err = true; };
		p.done();
		assert(err);

		p.reset();

		//remove method
		p._cbs.onopentag = function(){};
		p.write("<a foo");
		p._cbs.onopentag = null;
		p.write(">");
	});
});