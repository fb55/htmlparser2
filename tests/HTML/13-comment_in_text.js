exports.name = "Comment within text";
exports.options = {
	  handler: {}
	, parser: {}
};
exports.html = "this is <!-- the comment --> the text";
exports.expected =
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
];