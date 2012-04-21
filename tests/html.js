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
    this.Tautologistics.NodeHtmlParser.Tests.Html = exports;
}

exports['Basic test'] = {
        options: {
              builder: {}
            , parser: {}
        },
        data: ["<html><title>The Title</title><body>Hello world</body></html>"],
        expected: [
            {   raw: 'html'
              , type: 'tag'
              , name: 'html'
              , children:
                 [ { raw: 'title'
                   , type: 'tag'
                   , name: 'title'
                   , children: [ { data: 'The Title', type: 'text' } ]
                   }
                 , { raw: 'body'
                   , type: 'tag'
                   , name: 'body'
                   , children: [ { data: 'Hello world', type: 'text' } ]
                   }
                 ]
              }
            ]
    };

exports["Single Tag 1"] = {
    options: {
          builder: {}
        , parser: {}
    },
    data: ["<br>text</br>"],
    expected: [
          { raw: 'br', type: 'tag', name: 'br' }
        , { data: 'text', type: 'text' }
        ]
    };

exports["Single Tag 2"] = {
    options: {
          builder: {}
        , parser: {}
    },
    data: ["<br>text<br>"],
    expected: [
          { raw: 'br', type: 'tag', name: 'br' }
        , { data: 'text', type: 'text' }
        , { raw: 'br', type: 'tag', name: 'br' }
        ]
    };

exports["Unescaped chars in script"] = {
    options: {
          builder: {}
        , parser: {}
    },
    data: ["<head><script language=\"Javascript\">var foo = \"<bar>\"; alert(2 > foo); var baz = 10 << 2; var zip = 10 >> 1; var yap = \"<<>>>><<\";</script></head>"],
    expected: [
      { raw: 'head'
      , type: 'tag'
      , name: 'head'
      , children:
         [ { raw: 'script language="Javascript"'
           , type: 'tag'
           , name: 'script'
           , attributes: { language: 'Javascript' }
           , children:
              [ { data: 'var foo = "<bar>"; alert(2 > foo); var baz = 10 << 2; var zip = 10 >> 1; var yap = \"<<>>>><<\";'
                , type: 'text'
                }
              ]
           }
         ]
      }
    ]
    };

exports["Special char in comment"] = {
    options: {
          builder: {}
        , parser: {}
    },
    data: ["<head><!-- commented out tags <title>Test</title>--></head>"],
    expected: [
      { raw: 'head'
      , type: 'tag'
      , name: 'head'
      , children:
         [ { data: ' commented out tags <title>Test</title>'
           , type: 'comment'
           }
         ]
      }
    ]
    };

exports["Script source in comment"] = {
    options: {
          builder: {}
        , parser: {}
    },
    data: ["<script><!--var foo = 1;--></script>"],
    expected: [
      { raw: 'script'
      , type: 'tag'
      , name: 'script'
      , children:
          [ { data: '<!--var foo = 1;-->'
            , type: 'text'
            }
        ]
      }
    ]
    };

exports["Unescaped chars in style"] = {
    options: {
          builder: {}
        , parser: {}
    },
    data: ["<style type=\"text/css\">\n body > p\n  { font-weight: bold; }</style>"],
    expected: [
      { raw: 'style type="text/css"'
      , type: 'tag'
      , name: 'style'
      , attributes: { type: 'text/css' }
      , children:
         [ { data: "\n body > p\n  { font-weight: bold; }"
           , type: 'text'
           }
         ]
      }
    ]
    };

exports["Extra spaces in tag"] = {
    options: {
          builder: {}
        , parser: {}
    },
    data: ["<\n font    \n size='14' \n>the text<\n /   \nfont   \n>"],
    expected: [
      { raw: "\n font    \n size='14' \n"
      , type: 'tag'
      , name: 'font'
      , attributes: { size: '14' }
      , children:
         [ { data: 'the text'
           , type: 'text'
           }
         ]
      }
    ]
    };

exports["Unquoted attributes"] = {
    options: {
          builder: {}
        , parser: {}
    },
    data: ["<font size= 14>the text</font>"],
    expected: [
      { raw: 'font size= 14'
      , type: 'tag'
      , name: 'font'
      , attributes: { size: '14' }
      , children:
         [ { data: 'the text'
           , type: 'text'
           }
         ]
      }
    ]
    };

exports["Singular attribute"] = {
    options: {
          builder: {}
        , parser: {}
    },
    data: ["<option value='foo' selected>"],
    expected: [
      { raw: 'option value=\'foo\' selected'
      , type: 'tag'
      , name: 'option'
      , attributes: { value: 'foo', selected: null }
      }
    ]
    };

exports["Text outside tags"] = {
    options: {
          builder: {}
        , parser: {}
    },
    data: ["Line one\n<br>\nline two"],
    expected: [
      { data: 'Line one\n'
      , type: 'text'
      }
      , { raw: 'br'
      , type: 'tag'
      , name: 'br'
      }
      , { data: '\nline two'
      , type: 'text'
      }
    ]
    };

exports["Only text"] = {
    options: {
          builder: {}
        , parser: {}
    },
    data: ["this is the text"],
    expected: [
      { data: 'this is the text'
      , type: 'text'
      }
    ]
    };

exports["Comment within text"] = {
    options: {
          builder: {}
        , parser: {}
    },
    data: ["this is <!-- the comment --> the text"],
    expected: [
      { data: 'this is '
      , type: 'text'
      }
    , { data: ' the comment '
      , type: 'comment'
      }
    , { data: ' the text'
      , type: 'text'
      }
    ]
    };

exports["Comment within text within script"] = {
    options: {
          builder: {}
        , parser: {}
    },
    data: ["<script>this is <!-- the comment --> the text</script>"],
    expected: [
      { raw: 'script'
      , type: 'tag'
      , name: 'script'
      , children:
         [ { data: 'this is <!-- the comment --> the text'
           , type: 'text'
           }
         ]
      }
    ]
    };

exports["Option 'verbose' set to 'false'"] = {
    options: {
          builder: { verbose: false }
        , parser: {}
    },
    data: ["<\n font    \n size='14' \n>the text<\n /   \nfont   \n>"],
    expected: [
      { type: 'tag'
      , name: 'font'
      , attributes: { size: '14' }
      , children:
         [ { data: 'the text'
           , type: 'text'
           }
         ]
      }
    ]
    };

exports["Options 'ignoreWhitespace' set to 'true'"] = {
    options: {
          builder: { ignoreWhitespace: true }
        , parser: {}
    },
    data: ["Line one\n<br> \t\n<br>\nline two<font>\n <br> x </font>"],
    expected: [
      { data: 'Line one\n'
      , type: 'text'
      }
      , { raw: 'br'
      , type: 'tag'
      , name: 'br'
      }
      , { raw: 'br'
      , type: 'tag'
      , name: 'br'
      }
      , { data: '\nline two'
      , type: 'text'
      }
      , { raw: 'font'
      , type: 'tag'
      , name: 'font'
      , children:
        [ { raw: 'br'
          , type: 'tag'
          , name: 'br'
          }
          , { data: ' x '
          , type: 'text'
          }
          ]
        }
    ]
    };

exports["XML Namespace"] = {
    options: {
          builder: {}
        , parser: {}
    },
    data: ["<ns:tag>text</ns:tag>"],
    expected: [
        { raw: 'ns:tag'
        , type: 'tag'
        , name: 'ns:tag'
        , children: [
            { data: 'text', type: 'text' }
            ]
        }
        ]
    };

exports["Enforce empty tags"] = {
    options: {
          builder: {}
        , parser: {}
    },
    data: ["<link>text</link>"],
    expected: [
          { raw: 'link', type: 'tag', name: 'link' }
        , { data: 'text', type: 'text' }
        ]
    };

exports["Ignore empty tags"] = {
    options: {
          builder: { enforceEmptyTags: false }
        , parser: {}
    },
    data: ["<link>text</link>"],
    expected: [
          { raw: 'link', type: 'tag', name: 'link', children: [
            { data: 'text', type: 'text' }
          ] }
        ]
    };

exports["Postion data"] = {
    options: {
          builder: { includeLocation: true }
        , parser: {}
    },
    data: ["< html x='y' >\r\n\n\t<title>The Title</title><body>\nHello world\r\n\n</body>\n\n</html>"],
    expected: [
        {
            raw: " html x='y' ",
            type: 'tag',
            name: 'html',
            attributes: { x: 'y' },
            location: {
                line: 1,
                col: 1
            },
            children: [{
                data: '\r\n\n\t',
                type: 'text',
                location: {
                    line: 1,
                    col: 15
                }
            }, {
                raw: 'title',
                type: 'tag',
                name: 'title',
                location: {
                    line: 3,
                    col: 2
                },
                children: [{
                    data: 'The Title',
                    type: 'text',
                    location: {
                        line: 3,
                        col: 9
                    }
                }]
            }, {
                raw: 'body',
                type: 'tag',
                name: 'body',
                location: {
                    line: 3,
                    col: 26
                },
                children: [{
                    data: '\nHello world\r\n\n',
                    type: 'text',
                    location: {
                        line: 3,
                        col: 32
                    }
                }]
            }, {
                data: '\n\n',
                type: 'text',
                location: {
                    line: 6,
                    col: 8
                }
            }]
        }
        ]
    };

exports["Postion data w/self-closing tag"] = {
    options: {
          builder: { includeLocation: true }
        , parser: {}
    },
    data: ["\n<div />xxx"],
    expected: [
        { type: 'text', data: '\n', location: { line: 1, col: 1 } },
        { raw: "div /"
        , type: 'tag'
        , name: 'div'
        , location: {
              line: 2
            , col: 1
            }
          },
        { type: 'text'
        , data: 'xxx'
        , location: {
              line: 2
            , col: 8
            }
          }
        ]
    };

exports["Case insensitive tags"] = {
    options: {
          builder: {}
        , parser: {}
    },
    data: ["<DiV>"],
    expected: [
          { raw: 'DiV', type: 'tag', name: 'div' }
        ]
    };

exports["Case sensitive tags 1"] = {
    options: {
          builder: { caseSensitiveTags: true }
        , parser: {}
    },
    data: ["<DiV>"],
    expected: [
          { raw: 'DiV', type: 'tag', name: 'DiV' }
        ]
    };

exports["Case sensitive tags 2"] = {
    options: {
          builder: { caseSensitiveTags: true }
        , parser: {}
    },
    data: ["<DiV>xxx</div>"],
    expected: [
          { raw: 'DiV'
          , type: 'tag'
          , name: 'DiV'
          , children: [{ type: 'text', data: 'xxx' }]
          }
        ]
    };

})();
