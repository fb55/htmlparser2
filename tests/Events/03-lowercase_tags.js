exports.name = "simple";
exports.options = {handler: {}, parser: {lowerCaseTags:true}};
exports.html = "<H1 class=test>adsf</H1>";
exports.expected = [ { event: 'open',
    name: 'h1',
    attributes: { class: 'test' } },
  { event: 'text', text: 'adsf' },
  { event: 'close', name: 'h1' } ];