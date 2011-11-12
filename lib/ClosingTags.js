/*
*	List of tags that close others / are self-closing
*/

//Tags that close others
exports.others = {
	body: "head",
	p: "p",
	li: {
		close: "li",
		not: "ul"
	},
	tr: {
		close: "tr",
		not: "table"
	},
	td: {
		close: "td",
		not: "table"
	}
	//... TODO
};

//HTML Tags that shouldn't contain child nodes
exports.self = {
	area: true,
	base: true,
	basefont: true,
	br: true,
	col: true,
	frame: true,
	hr: true,
	img: true,
	input: true,
	isindex: true,
	link: true,
	meta: true,
	param: true,
	embed: true
};