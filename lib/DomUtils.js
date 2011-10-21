module.exports = {
	testElement: function(options, element) {
		if (!element) return false;
		
		var type = element.type;

		for (var key in options) {
			if (key === "tag_name") {
				if (type !== "tag" && type !== "script" && type !== "style") return false;
				if (!options.tag_name(element.name)) return false;
			} else if (key === "tag_type") {
				if (!options.tag_type(type)) return false;
			} else if (key === "tag_contains") {
				if (type !== "text" && type !== "comment" && type !== "directive") return false;
				if (!options.tag_contains(element.data)) return false;
			} else if (!element.attribs || !options[key](element.attribs[key]))
				return false;
		}
	
		return true;
	}

	, getElements: function(options, currentElement, recurse, limit) {
		if (!currentElement) return [];

		recurse = (recurse === undefined || recurse === null) || !!recurse;

		var parsed_limit = parseInt(limit, 10);
		limit = isNaN(parsed_limit) ? -1 : parsed_limit;

		var found = [];
		var elementList;

		function getTest (checkVal) {
			return function (value) { return value === checkVal; };
		}
		for (var key in options) {
			if (typeof options[key] !== "function") {
				options[key] = getTest(options[key]);
			}
		}

		if (this.testElement(options, currentElement)) {
			found.push(currentElement);
		}

		if (limit >= 0 && found.length >= limit) return found;

		if(recurse && currentElement.children) elementList = currentElement.children;
		else if(Array.isArray(currentElement)) elementList = currentElement;
		else return found;

		for (var i = 0; i < elementList.length; i++) {
			found = found.concat(this.getElements(options, elementList[i], recurse, limit));

			if (limit >= 0 && found.length >= limit) break;
		}

		return found;
	}
	
	, getElementById: function(id, currentElement, recurse) {
		var result = this.getElements({ id: id }, currentElement, recurse, 1);
		return result.length ? result[0] : null;
	}
	
	, getElementsByTagName: function(name, currentElement, recurse, limit) {
		return this.getElements({ tag_name: name }, currentElement, recurse, limit);
	}
	
	, getElementsByTagType: function(type, currentElement, recurse, limit) {
		return this.getElements({ tag_type: type }, currentElement, recurse, limit);
	}
};