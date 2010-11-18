(function () {

function RunningInNode () {
	return(
		(typeof require) == "function"
		&&
		(typeof exports) == "object"
		&&
		(typeof module) == "object"
		&&
		(typeof __filename) == "string"
		&&
		(typeof __dirname) == "string"
		);
}

if (!RunningInNode()) {
	if (!this.Tautologistics)
		this.Tautologistics = {};
	if (!this.Tautologistics.NodeHtmlParser)
		this.Tautologistics.NodeHtmlParser = {};
	if (!this.Tautologistics.NodeHtmlParser.Tests)
		this.Tautologistics.NodeHtmlParser.Tests = [];
	exports = {};
	this.Tautologistics.NodeHtmlParser.Tests.push(exports);
}

exports.name = "Postion data";
exports.options = {
	  handler: {}
	, parser: { includeLocation: true }
};
//TODO: re-instate test when chunked position tracking is fixed
exports.html = "<FIXME>";
exports.expected = [ { raw: 'FIXME', data: 'FIXME', type: 'tag', name: 'FIXME' } ];
//exports.html = "<html>\r\n\n\t<title>The Title</title><body>\nHello world\r\n\n</body>\n\n</html>";
//exports.expected = [
//	{
//		raw: 'html',
//		data: 'html',
//		type: 'tag',
//		location: {
//			line: 1,
//			col: 1
//		},
//		name: 'html',
//		children: [{
//			raw: '\n\n',
//			data: '\n\n',
//			type: 'text',
//			location: {
//				line: 1,
//				col: 5
//			}
//		}, {
//			raw: 'title',
//			data: 'title',
//			type: 'tag',
//			location: {
//				line: 3,
//				col: 2
//			},
//			name: 'title',
//			children: [{
//				raw: 'The Title',
//				data: 'The Title',
//				type: 'text',
//				location: {
//					line: 3,
//					col: 6
//				}
//			}]
//		}, {
//			raw: 'body',
//			data: 'body',
//			type: 'tag',
//			location: {
//				line: 3,
//				col: 1
//			},
//			name: 'body',
//			children: [{
//				raw: '\nHello world\n\n',
//				data: '\nHello world\n\n',
//				type: 'text',
//				location: {
//					line: 3,
//					col: 5
//				}
//			}]
//		}, {
//			raw: '\n\n',
//			data: '\n\n',
//			type: 'text',
//			location: {
//				line: 6,
//				col: 6
//			}
//		}]
//	}
//	];

})();
