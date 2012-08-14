//Types of elements found in the DOM
module.exports = {
	Text: 0, //Text
	Directive: 1, //<? ... ?>
	Comment: 2, //<!-- ... -->
	Script: 3, //<script> tags
	Style: 4, //<style> tags
	Tag: 5, //Any tag
	CDATA: 6 //<![CDATA[ ... ]]>
};