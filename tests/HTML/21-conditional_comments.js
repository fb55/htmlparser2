exports.name = "Conditional comments";
exports.options = {
	  handler: {}
	, parser: {}
};
exports.html = "<!--[if lt IE 7]> <html class='no-js ie6 oldie' lang='en'> <![endif]--><!--[if lt IE 7]> <html class='no-js ie6 oldie' lang='en'> <![endif]-->";
exports.expected = [
  {
    "data": "[if lt IE 7]> <html class='no-js ie6 oldie' lang='en'> <![endif]",
    "type": "comment"
  },
  {
    "data": "[if lt IE 7]> <html class='no-js ie6 oldie' lang='en'> <![endif]",
    "type": "comment"
  }
];