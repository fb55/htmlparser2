/***********************************************
Copyright 2010 - 2012, Chris Winberry <chris@winberry.net>. All rights reserved.
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to
deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE.
***********************************************/

(function () {

var exports;
if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') {
    exports = module.exports;
} else {
    exports = {};
    if (!this.Tautologistics) {
        this.Tautologistics = {};
    }
    if (!this.Tautologistics.NodeHtmlParser) {
        this.Tautologistics.NodeHtmlParser = {};
    }
    if (!this.Tautologistics.NodeHtmlParser.Tests) {
        this.Tautologistics.NodeHtmlParser.Tests = [];
    }
    this.Tautologistics.NodeHtmlParser.Tests.Parser = exports;
}

exports['plain text'] = {
    data: ['This is the text']
    , expected: [{ type: 'text', data: 'This is the text' }]
};

exports['simple tag'] = {
    data: ['<div>']
    , expected: [{ type: 'tag', name: 'div', raw: 'div' }]
};

exports['simple comment'] = {
    data: ['<!-- content -->']
    , expected: [{ type: 'comment', data: ' content ' }]
};

exports['simple cdata'] = {
    data: ['<![CDATA[ content ]]>']
    , expected: [{ type: 'cdata', data: ' content ' }]
};

exports['text before tag'] = {
    data: ['xxx<div>']
    , expected: [
        { type: 'text', data: 'xxx'},
        { type: 'tag', name: 'div', raw: 'div' }
        ]
};

exports['text after tag'] = {
    data: ['<div>xxx']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div' },
        { type: 'text', data: 'xxx'}
        ]
};

exports['text inside tag'] = {
    data: ['<div>xxx</div>']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div' },
        { type: 'text', data: 'xxx'},
        { type: 'tag', name: '/div', raw: '/div' }
        ]
};

exports['attribute with single quotes'] = {
    data: ['<div a=\'1\'>']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div a=\'1\'' },
        { type: 'attr', name:'a', data: '1'}
        ]
};

exports['attribute with double quotes'] = {
    data: ['<div a="1">']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div a="1"' },
        { type: 'attr', name:'a', data: '1'}
        ]
};

exports['attribute with no quotes'] = {
    data: ['<div a=1>']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div a=1' },
        { type: 'attr', name:'a', data: '1'}
        ]
};

exports['attribute with no value'] = {
    data: ['<div wierd>']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div wierd' },
        { type: 'attr', name:'wierd', data: null}
        ]
};

exports['attribute with no value, trailing text'] = {
    data: ['<div wierd>xxx']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div wierd' },
        { type: 'attr', name:'wierd', data: null},
        { type: 'text', data: 'xxx' }
        ]
};

exports['tag with multiple attributes'] = {
    data: ['<div a="1" b="2">']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div a="1" b="2"' },
        { type: 'attr', name:'a', data: '1'},
        { type: 'attr', name:'b', data: '2'}
        ]
};

exports['tag with multiple attributes, trailing text'] = {
    data: ['<div a="1" b="2">xxx']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div a="1" b="2"' },
        { type: 'attr', name:'a', data: '1'},
        { type: 'attr', name:'b', data: '2'},
        { type: 'text', data: 'xxx' }
        ]
};

exports['tag with mixed attributes #1'] = {
    data: ['<div a=1 b=\'2\' c="3">']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div a=1 b=\'2\' c="3"' },
        { type: 'attr', name:'a', data: '1'},
        { type: 'attr', name:'b', data: '2'},
        { type: 'attr', name:'c', data: '3'}
        ]
};

exports['tag with mixed attributes #2'] = {
    data: ['<div a=1 b="2" c=\'3\'>']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div a=1 b="2" c=\'3\'' },
        { type: 'attr', name:'a', data: '1'},
        { type: 'attr', name:'b', data: '2'},
        { type: 'attr', name:'c', data: '3'}
        ]
};

exports['tag with mixed attributes #3'] = {
    data: ['<div a=\'1\' b=2 c="3">']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div a=\'1\' b=2 c="3"' },
        { type: 'attr', name:'a', data: '1'},
        { type: 'attr', name:'b', data: '2'},
        { type: 'attr', name:'c', data: '3'}
        ]
};

exports['tag with mixed attributes #4'] = {
    data: ['<div a=\'1\' b="2" c=3>']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div a=\'1\' b="2" c=3' },
        { type: 'attr', name:'a', data: '1'},
        { type: 'attr', name:'b', data: '2'},
        { type: 'attr', name:'c', data: '3'}
        ]
};

exports['tag with mixed attributes #5'] = {
    data: ['<div a="1" b=2 c=\'3\'>']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div a="1" b=2 c=\'3\'' },
        { type: 'attr', name:'a', data: '1'},
        { type: 'attr', name:'b', data: '2'},
        { type: 'attr', name:'c', data: '3'}
        ]
};

exports['tag with mixed attributes #6'] = {
    data: ['<div a="1" b=\'2\' c="3">']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div a="1" b=\'2\' c="3"' },
        { type: 'attr', name:'a', data: '1'},
        { type: 'attr', name:'b', data: '2'},
        { type: 'attr', name:'c', data: '3'}
        ]
};

exports['tag with mixed attributes, trailing text'] = {
    data: ['<div a=1 b=\'2\' c="3">xxx']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div a=1 b=\'2\' c="3"' },
        { type: 'attr', name:'a', data: '1'},
        { type: 'attr', name:'b', data: '2'},
        { type: 'attr', name:'c', data: '3'},
        { type: 'text', data: 'xxx' }
        ]
};

exports['self closing tag'] = {
    data: ['<div/>']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div/' },
        { type: 'tag', name: '/div', raw: null }
        ]
};

exports['self closing tag, trailing text'] = {
    data: ['<div/>xxx']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div/' },
        { type: 'tag', name: '/div', raw: null },
        { type: 'text', data: 'xxx' }
        ]
};

exports['self closing tag with spaces #1'] = {
    data: ['<div />']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div /' },
        { type: 'tag', name: '/div', raw: null }
        ]
};

exports['self closing tag with spaces #2'] = {
    data: ['<div/ >']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div/ ' },
        { type: 'tag', name: '/div', raw: null }
        ]
};

exports['self closing tag with spaces #3'] = {
    data: ['<div / >']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div / ' },
        { type: 'tag', name: '/div', raw: null }
        ]
};

exports['self closing tag with spaces, trailing text'] = {
    data: ['<div / >xxx']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div / ' },
        { type: 'tag', name: '/div', raw: null },
        { type: 'text', data: 'xxx' }
        ]
};

exports['self closing tag with attribute'] = {
    data: ['<div a=b />']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div a=b /' },
        { type: 'attr', name:'a', data: 'b'},
        { type: 'tag', name: '/div', raw: null }
        ]
};

exports['self closing tag with attribute, trailing text'] = {
    data: ['<div a=b />xxx']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div a=b /' },
        { type: 'attr', name:'a', data: 'b'},
        { type: 'tag', name: '/div', raw: null },
        { type: 'text', data: 'xxx' }
        ]
};

exports['attribute missing close quote'] = {
    data: ['<div a="1><span id="foo">xxx']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div a="1><span id="foo' },
        { type: 'attr', name:'a', data: '1><span id='},
        { type: 'attr', name:'foo', data: null},
        { type: 'text', data: 'xxx'}
        ]
};

exports['text before complex tag'] = {
    data: ['xxx<div yyy="123">']
    , expected: [
        { type: 'text', data: 'xxx' },
        { type: 'tag', name: 'div', raw: 'div yyy="123"'},
        { type: 'attr', name: 'yyy', data: '123' }
        ]
};

exports['text after complex tag'] = {
    data: ['<div yyy="123">xxx']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div yyy="123"'},
        { type: 'attr', name: 'yyy', data: '123' },
        { type: 'text', data: 'xxx' }
        ]
};

exports['text inside complex tag'] = {
    data: ['<div yyy="123">xxx</div>']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div yyy="123"'},
        { type: 'attr', name: 'yyy', data: '123' },
        { type: 'text', data: 'xxx' },
        { type: 'tag', name: '/div', raw: '/div'}
        ]
};

exports['nested tags'] = {
    data: ['<div><span></span></div>']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div'},
        { type: 'tag', name: 'span', raw: 'span'},
        { type: 'tag', name: '/span', raw: '/span'},
        { type: 'tag', name: '/div', raw: '/div'}
        ]
};

exports['nested tags with attributes'] = {
    data: ['<div aaa="bbb"><span 123=\'456\'>xxx</span></div>']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div aaa="bbb"'},
        { type: 'attr', name: 'aaa', data: 'bbb' },
        { type: 'tag', name: 'span', raw: 'span 123=\'456\''},
        { type: 'attr', name: '123', data: '456' },
        { type: 'text', data: 'xxx' },
        { type: 'tag', name: '/span', raw: '/span'},
        { type: 'tag', name: '/div', raw: '/div'}
        ]
};

exports['comment inside tag'] = {
    data: ['<div><!-- comment text --></div>']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div'},
        { type: 'comment', data: ' comment text '},
        { type: 'tag', name: '/div', raw: '/div'}
        ]
};

exports['cdata inside tag'] = {
    data: ['<div><![CDATA[ CData content ]]></div>']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div'},
        { type: 'cdata', data: ' CData content '},
        { type: 'tag', name: '/div', raw: '/div'}
        ]
};

exports['html inside comment'] = {
    data: ['<!-- <div>foo</div> -->']
    , expected: [{ type: 'comment', data: ' <div>foo</div> '}]
};

exports['html inside cdata'] = {
    data: ['<![CDATA[ <div>foo</div> ]]>']
    , expected: [{ type: 'cdata', data: ' <div>foo</div> '}]
};

exports['quotes in attribute #1'] = {
    data: ['<div xxx=\'a"b\'>']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div xxx=\'a"b\''},
        { type: 'attr', name: 'xxx', data: 'a"b' }
        ]
};

exports['quotes in attribute #2'] = {
    data: ['<div xxx="a\'b">']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div xxx="a\'b"'},
        { type: 'attr', name: 'xxx', data: 'a\'b' }
        ]
};

exports['brackets in attribute'] = {
    data: ['<div xxx="</div>">']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div xxx="</div>"'},
        { type: 'attr', name: 'xxx', data: '</div>' }
        ]
};

exports['unfinished simple tag #1'] = {
    data: ['<div']
    , expected: [{ type: 'tag', name: 'div', raw: 'div'}]
};

exports['unfinished simple tag #2'] = {
    data: ['<div ']
    , expected: [{ type: 'tag', name: 'div', raw: 'div '}]
};

exports['unfinished complex tag #1'] = {
    data: ['<div foo="bar"']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div foo="bar"'},
        { type: 'attr', name: 'foo', data: 'bar' }
        ]
};

exports['unfinished complex tag #2'] = {
    data: ['<div foo="bar" ']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div foo="bar" '},
        { type: 'attr', name: 'foo', data: 'bar' }
        ]
};

exports['unfinished comment #1'] = {
    data: ['<!-- comment text']
    , expected: [{ type: 'comment', data: ' comment text'}]
};

exports['unfinished comment #2'] = {
    data: ['<!-- comment text ']
    , expected: [{ type: 'comment', data: ' comment text '}]
};

exports['unfinished comment #3'] = {
    data: ['<!-- comment text -']
    , expected: [{ type: 'comment', data: ' comment text -'}]
};

exports['unfinished comment #4'] = {
    data: ['<!-- comment text --']
    , expected: [{ type: 'comment', data: ' comment text --'}]
};

exports['unfinished cdata #1'] = {
    data: ['<![CDATA[ content']
    , expected: [{ type: 'cdata', data: ' content'}]
};

exports['unfinished cdata #2'] = {
    data: ['<![CDATA[ content ']
    , expected: [{ type: 'cdata', data: ' content '}]
};

exports['unfinished cdata #3'] = {
    data: ['<![CDATA[ content ]']
    , expected: [{ type: 'cdata', data: ' content ]'}]
};

exports['unfinished cdata #4'] = {
    data: ['<![CDATA[ content ]]']
    , expected: [{ type: 'cdata', data: ' content ]]'}]
};

exports['unfinished attribute #1'] = {
    data: ['<div foo="bar']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div foo="bar' },
        { type: 'attr', name: 'foo', data: 'bar' }
        ]
};

exports['unfinished attribute #2'] = {
    data: ['<div foo="']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div foo="' },
        { type: 'attr', name: 'foo', data: null }
        ]
};

exports['spaces in tag #1'] = {
    data: ['< div>']
    , expected: [{ type: 'tag', name: 'div', raw: ' div' }]
};

exports['spaces in tag #2'] = {
    data: ['<div >']
    , expected: [{ type: 'tag', name: 'div', raw: 'div ' }]
};

exports['spaces in tag #3'] = {
    data: ['< div >']
    , expected: [{ type: 'tag', name: 'div', raw: ' div ' }]
};

exports['spaces in closing tag #1'] = {
    data: ['< /div>']
    , expected: [{ type: 'tag', name: '/div', raw: ' /div' }]
};

exports['spaces in closing tag #2'] = {
    data: ['</ div>']
    , expected: [{ type: 'tag', name: '/div', raw: '/ div' }]
};

exports['spaces in closing tag #3'] = {
    data: ['</div >']
    , expected: [{ type: 'tag', name: '/div', raw: '/div ' }]
};

exports['spaces in closing tag #4'] = {
    data: ['< / div >']
    , expected: [{ type: 'tag', name: '/div', raw: ' / div ' }]
};

exports['spaces in tag, trailing text'] = {
    data: ['< div >xxx']
    , expected: [
        { type: 'tag', name: 'div', raw: ' div ' },
        { type: 'text', data: 'xxx' }
        ]
};

exports['spaces in attributes #1'] = {
    data: ['<div foo ="bar">']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div foo ="bar"' },
        { type: 'attr', name: 'foo', data: 'bar' }
        ]
};

exports['spaces in attributes #2'] = {
    data: ['<div foo= "bar">']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div foo= "bar"' },
        { type: 'attr', name: 'foo', data: 'bar' }
        ]
};

exports['spaces in attributes #3'] = {
    data: ['<div foo = "bar">']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div foo = "bar"' },
        { type: 'attr', name: 'foo', data: 'bar' }
        ]
};

exports['spaces in attributes #4'] = {
    data: ['<div foo =bar>']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div foo =bar' },
        { type: 'attr', name: 'foo', data: 'bar' }
        ]
};

exports['spaces in attributes #5'] = {
    data: ['<div foo= bar>']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div foo= bar' },
        { type: 'attr', name: 'foo', data: 'bar' }
        ]
};

exports['spaces in attributes #6'] = {
    data: ['<div foo = bar>']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div foo = bar' },
        { type: 'attr', name: 'foo', data: 'bar' }
        ]
};

exports['mixed case tag'] = {
    data: ['<diV>']
    , expected: [{ type: 'tag', name: 'diV', raw: 'diV' }]
};

exports['upper case tag'] = {
    data: ['<DIV>']
    , expected: [{ type: 'tag', name: 'DIV', raw: 'DIV' }]
};

exports['mixed case attribute'] = {
    data: ['<div xXx="yyy">']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div xXx="yyy"' },
        { type: 'attr', name: 'xXx', data: 'yyy' }
        ]
};

exports['upper case case attribute'] = {
    data: ['<div XXX="yyy">']
    , expected: [
        { type: 'tag', name: 'div', raw: 'div XXX="yyy"' },
        { type: 'attr', name: 'XXX', data: 'yyy' }
        ]
};

exports['multiline simple tag'] = {
    data: ["<\ndiv\n>"]
    , expected: [
        { type: 'tag', name: 'div', raw: "\ndiv\n" }
        ]
};

exports['multiline complex tag'] = {
    data: ["<\ndiv\nid='foo'\n>"]
    , expected: [
        { type: 'tag', name: 'div', raw: "\ndiv\nid='foo'\n" },
        { type: 'attr', name: 'id', data: 'foo' }
        ]
};

exports['multiline comment'] = {
    data: ["<!--\ncomment text\n-->"]
    , expected: [
        { type: 'comment', data: "\ncomment text\n" }
        ]
};

exports['cdata comment'] = {
    data: ["<![CDATA[\nCData content\n]]>"]
    , expected: [
        { type: 'cdata', data: "\nCData content\n" }
        ]
};

exports['multiline attribute #1'] = {
    data: ["<div id='\nxxx\nyyy\n'>"]
    , expected: [
        { type: 'tag', name: 'div', raw: "div id='\nxxx\nyyy\n'" },
        { type: 'attr', name: 'id', data: "\nxxx\nyyy\n" }
        ]
};

exports['multiline attribute #2'] = {
    data: ["<div id=\"\nxxx\nyyy\n\">"]
    , expected: [
        { type: 'tag', name: 'div', raw: "div id=\"\nxxx\nyyy\n\"" },
        { type: 'attr', name: 'id', data: "\nxxx\nyyy\n" }
        ]
};

exports['tags in script tag code'] = {
    data: ["<script language='javascript'>\nvar foo = '<bar>xxx</bar>';\n</script>"]
    , expected: [
        { type: 'tag', name: 'script', raw: "script language='javascript'" },
        { type: 'attr', name: 'language', data: 'javascript' },
        { type: 'text', data: "\nvar foo = '<bar>xxx</bar>';\n" },
        { type: 'tag', name: '/script', raw: "/script" },
        ]
};

exports['closing script tag in script tag code'] = {
    data: ["<script language='javascript'>\nvar foo = '</script>';\n</script>"]
    , expected: [
        { type: 'tag', name: 'script', raw: "script language='javascript'" },
        { type: 'attr', name: 'language', data: 'javascript' },
        { type: 'text', data: "\nvar foo = '" },
        { type: 'tag', name: '/script', raw: "/script" },
        { type: 'text', data: "';\n" },
        { type: 'tag', name: '/script', raw: "/script" }
        ]
};

exports['comment in script tag code'] = {
    data: ["<script language='javascript'>\nvar foo = '<!-- xxx -->';\n</script>"]
    , expected: [
        { type: 'tag', name: 'script', raw: "script language='javascript'" },
        { type: 'attr', name: 'language', data: 'javascript' },
        { type: 'text', data: "\nvar foo = '<!-- xxx -->';\n" },
        { type: 'tag', name: '/script', raw: "/script" },
        ]
};

exports['cdata in script tag code'] = {
    data: ["<script language='javascript'>\nvar foo = '<![CDATA[ xxx ]]>';\n</script>"]
    , expected: [
        { type: 'tag', name: 'script', raw: "script language='javascript'" },
        { type: 'attr', name: 'language', data: 'javascript' },
        { type: 'text', data: "\nvar foo = '<![CDATA[ xxx ]]>';\n" },
        { type: 'tag', name: '/script', raw: "/script" },
        ]
};

exports['commented script tag code'] = {
    data: ["<script language='javascript'>\n<!--\nvar foo = '<bar>xxx</bar>';\n//-->\n</script>"]
    , expected: [
        { type: 'tag', name: 'script', raw: "script language='javascript'" },
        { type: 'attr', name: 'language', data: 'javascript' },
        { type: 'text', data: "\n<!--\nvar foo = '<bar>xxx</bar>';\n//-->\n" },
        { type: 'tag', name: '/script', raw: "/script" },
        ]
};

exports['cdata in script tag'] = {
    data: ["<script language='javascript'>\n<![CDATA[\nvar foo = '<bar>xxx</bar>';\n]]>\n</script>"]
    , expected: [
        { type: 'tag', name: 'script', raw: "script language='javascript'" },
        { type: 'attr', name: 'language', data: 'javascript' },
        { type: 'text', data: "\n<![CDATA[\nvar foo = '<bar>xxx</bar>';\n]]>\n" },
        { type: 'tag', name: '/script', raw: "/script" },
        ]
};

})();
