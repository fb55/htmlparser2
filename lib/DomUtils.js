var ElementType = require("./ElementType.js");

function getTest (checkVal) {
	return function (value) { return value === checkVal; };
}

function testElement(options, element) {
	if (!element) return false;
    
    var type = element.type;

    for (var key in options) {
    	if (key === "tag_name") {
    		if (type !== ElementType.Tag && type !== ElementType.Script && type !== ElementType.Style) return false;
    		if (!options.tag_name(element.name)) return false;
    	} else if (key === "tag_type") {
    		if (!options.tag_type(type)) return false;
    	} else if (key === "tag_contains") {
    		if (type !== ElementType.Text && type !== ElementType.Comment && type !== ElementType.Directive) return false;
    		if (!options.tag_contains(element.data)) return false;
    	} else if (!element.attribs || !options[key](element.attribs[key]))
    		return false;
    }

    return true;
}

module.exports = {
	testElement: testElement, 
	
	getElements: function(options, currentElement, recurse, limit){
		recurse = recurse === undefined || recurse === null || recurse;
		if(isNaN(limit)) limit = -1;

		for(var key in options){
			if (typeof options[key] !== "function")
				options[key] = getTest(options[key]);
		}
		return this.testAttr(testElement.bind(null, options), currentElement, recurse, limit);
	}
	
	, getElementById: function(id, currentElement, recurse) {
		var result = this.getElements({ id: id }, currentElement, recurse, 1);
		return result.length ? result[0] : null;
		//function(elem){return elem.attribs && elem.attribs.id === id;}
	}
	
	, getElementsByTagName: function(name, currentElement, recurse, limit) {
		return this.getElements({ tag_name: name }, currentElement, recurse, limit);
		/*function(elem){
			var type = elem.type;
			if(type !== ElementType.Tag && type !== ElementType.Script && type !== ElementType.Style) return false;
			return elem.name === name;
		};*/
	}
	
	, getElementsByTagType: function(type, currentElement, recurse, limit){
		return this.getElements({tag_type: type}, currentElement, recurse, limit);
		//function(elem){return elem.type === type;}
	}
	
	, testAttr: function(test, element, recurse, limit){
		var found = [], elementList;
		if(!element) return found;
		if(test(element)) found.push(element);
		
		if(recurse && element.children) elementList = element.children;
		else if(Array.isArray(element)) elementList = element;
		else return found;
		
		for(var i = 0, j = elementList.length; i < j && (limit < 0 || found.length < limit); i++){
			found = found.concat(this.testAttr(test, elementList[i], recurse, limit));
		}
		
		return found;
	}};