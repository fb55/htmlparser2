exports.name = "Template script tags";
exports.options = {
	  handler: {}
	, parser: {}
};
exports.html = "<script type=\"text/template\"><h1>Heading1</h1></script>";
exports.expected = [ {
    type: 'script',
    name: 'script',
    attribs: { type: 'text/template' },
    children: 
     [ { data: '<h1>Heading1</h1>',
         type: 'text' } ] } ];