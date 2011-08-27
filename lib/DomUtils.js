var DomUtils = {
		testElement: function(options, element) {
		if (!element) {
			return false;
		}

		for (var key in options) {
			if (key === "tag_name") {
				if (element.type !== "tag" && element.type !== "script" && element.type !== "style") {
					return false;
				}
				if (!options.tag_name(element.name)) {
					return false;
				}
			} else if (key === "tag_type") {
				if (!options.tag_type(element.type)) {
					return false;
				}
			} else if (key === "tag_contains") {
				if (element.type !== "text" && element.type !== "comment" && element.type !== "directive") {
					return false;
				}
				if (!options.tag_contains(element.data)) {
					return false;
				}
			} else {
				if (!element.attribs || !options[key](element.attribs[key])) {
					return false;
				}
			}
		}
	
		return true;
	}

	, getElements: function(options, currentElement, recurse, limit) {
		recurse = (recurse === undefined || recurse === null) || !!recurse;
		limit = isNaN(parseInt(limit, 10)) ? -1 : parseInt(limit, 10);

		if (!currentElement) {
			return([]);
		}

		var found = [];
		var elementList;

		function getTest (checkVal) {
			return(function (value) { return(value === checkVal); });
		}
		for (var key in options) {
			if ((typeof options[key]) !== "function") {
				options[key] = getTest(options[key]);
			}
		}

		if (DomUtils.testElement(options, currentElement)) {
			found.push(currentElement);
		}

		if (limit >= 0 && found.length >= limit) {
			return(found);
		}

		if (recurse && currentElement.children) {
			elementList = currentElement.children;
		} else if (currentElement instanceof Array) {
			elementList = currentElement;
		} else {
			return(found);
		}

		for (var i = 0; i < elementList.length; i++) {
			found = found.concat(DomUtils.getElements(options, elementList[i], recurse, limit));
			if (limit >= 0 && found.length >= limit) {
				break;
			}
		}

		return(found);
	}
	
	, getElementById: function(id, currentElement, recurse) {
		var result = DomUtils.getElements({ id: id }, currentElement, recurse, 1);
		return(result.length ? result[0] : null);
	}
	
	, getElementsByTagName: function(name, currentElement, recurse, limit) {
		return(DomUtils.getElements({ tag_name: name }, currentElement, recurse, limit));
	}
	
	, getElementsByTagType: function(type, currentElement, recurse, limit) {
		return(DomUtils.getElements({ tag_type: type }, currentElement, recurse, limit));
	}
};

module.exports = DomUtils;