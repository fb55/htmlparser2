exports.name = "Comment within text within script";
exports.html = "<script>this is <!-- the comment --> the text</script>";
exports.expected =
[ { raw: 'script'
  , data: 'script'
  , type: 'script'
  , name: 'script'
  , children:
     [ { raw: 'this is '
       , data: 'this is '
       , type: 'text'
       }
       , { raw: ' the comment '
       , data: ' the comment '
       , type: 'comment'
       }
       , { raw: ' the text'
       , data: ' the text'
       , type: 'text'
       }

     ]
  }
];
