exports.name = "Basic test";
exports.options = {
	  handler: {}
	, parser: {}
};
exports.html = "<!DOCTYPE html><html><title>The Title</title><body>Hello world</body></html>";
exports.expected = [ { raw: '!DOCTYPE html',
    data: '!DOCTYPE html',
    type: 'directive',
    name: '!DOCTYPE' },
  { raw: 'html',
    data: 'html',
    type: 'tag',
    name: 'html',
    children: 
     [ { raw: 'title',
         data: 'title',
         type: 'tag',
         name: 'title',
         children: [ { raw: 'The Title', data: 'The Title', type: 'text' } ] },
       { raw: 'body',
         data: 'body',
         type: 'tag',
         name: 'body',
         children: 
          [ { raw: 'Hello world',
              data: 'Hello world',
              type: 'text' } ] } ] } ];
