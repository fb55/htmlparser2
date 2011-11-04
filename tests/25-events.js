exports.name = "Events";
exports.type = "event";
exports.result = [];
exports.options = {handler: {
	onopentag: function(name, attributes){
		exports.result.push({event:"open", name: name, attributes: attributes});
	},
	onclosetag: function(name){
		exports.result.push({event:"close", name: name});
	},
	ontext: function(text){
		exports.result.push({event:"text", text: text});
	}
}, parser: {}};
exports.html = "<h1 class=test>adsf</h1>";
exports.expected = [ { event: 'open',
    name: 'h1',
    attributes: { class: 'test' } },
  { event: 'text', text: 'adsf' },
  { event: 'close', name: 'h1' } ];