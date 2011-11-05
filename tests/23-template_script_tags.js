exports.name = "Template script tags";
exports.options = {
	  handler: {}
	, parser: {}
};
exports.html = "<script type=\"text/template\"><h1>Heading1</h1></script>";
exports.expected = [ { raw: 'script type="text/template"',
    data: 'script type="text/template"',
    type: 'script',
    name: 'script',
    attribs: { type: 'text/template' },
    children: 
     [ { raw: '<h1>Heading1</h1>',
         data: '<h1>Heading1</h1>',
         type: 'text' } ] } ];