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
	it("should pause at the correct index", function() {
                var p = new htmlparser2.Parser(null, {xmlMode: true, lowerCaseAttributeNames: true});
                var count = 0;
                p._cbs.onopentag = function(name){
                        if (name === "title") count++;
                        p.pause();
                        if (count <= 1) p.resume();
                };
                p.end("<title>TITLE</title><body></body>");
                assert.equal(count, 1);
        });	
});
