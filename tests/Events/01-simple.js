exports.name = "Events";
exports.type = "event";
exports.options = {handler: {}, parser: {}};
exports.callbacks = [
	"onopentag", function(name, attributes){
		this.push({event:"open", name: name, attributes: attributes});
	},
	"onclosetag", function(name){
		this.push({event:"close", name: name});
	},
	"ontext", function(text){
		this.push({event:"text", text: text});
	}
];
exports.html = "<h1 class=test>adsf</h1>";
exports.expected = [ { event: 'open',
    name: 'h1',
    attributes: { class: 'test' } },
  { event: 'text', text: 'adsf' },
  { event: 'close', name: 'h1' } ];