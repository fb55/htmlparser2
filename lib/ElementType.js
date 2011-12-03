//Types of elements found in the DOM
module.exports = {
	Text: "text", //Plain text
	Directive: "directive", //Special tag <!...>
	Comment: "comment", //Special tag <!--...-->
	Script: "script", //Special tag <script>...</script>
	Style: "style", //Special tag <style>...</style>
	Tag: "tag" //Any tag that isn't special
};