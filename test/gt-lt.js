var htmlparser2 = require(".."),
    assert = require("assert");

describe("Less Than and Greater Than", function(){

	it("should lastLt lastGt be true", function(){
		var html = " <!-- --> <div> text <br/> text <hr> text </div >  ";
		var listOpenTag = [
			"<div>",
			"<br/>",
			"<hr>"
		];
		var listCloseTag = [
			"<br/>",
			"<hr>",
			"</div >"
		];

		var stream = new htmlparser2.WritableStream({
			onopentag: function(name, attribs,lastLt,lastGt){
				var current = listOpenTag.shift();
				var t = html.substring(lastLt,lastGt + 1);
				assert.equal(t, current);
			},
			ontext: function(){
			},
			onclosetag: function(name,lastLt,lastGt){
				var current = listCloseTag.shift();
				var t = html.substring(lastLt,lastGt + 1);
				assert.equal(t, current);
			}
		});

		stream.write(html);
		stream.end();
	});
});