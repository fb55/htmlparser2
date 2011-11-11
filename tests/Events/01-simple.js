exports.name = "simple";
exports.options = {handler: {}, parser: {}};
exports.html = "<h1 class=test>adsf</h1>";
exports.expected = [ { event: 'open',
    name: 'h1',
    attributes: { class: 'test' } },
  { event: 'text', text: 'adsf' },
  { event: 'close', name: 'h1' } ];