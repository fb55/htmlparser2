var ElementType = require("./ElementType.js"),
    arrayPush = Array.prototype.push,
    DomUtils = module.exports;

function filterArray(test, arr, recurse, limit){
	var result = [], childs;

	for(var i = 0, j = arr.length; i < j; i++){
		if(test(arr[i])){
			result.push(arr[i]);
			if(--limit <= 0) break;
		}

		childs = arr[i].children;
		if(recurse && childs){
			childs = filterArray(test, childs, recurse, limit);
			arrayPush.apply(result, childs);
			limit -= childs.length;
			if(limit <= 0) break;
		}
	}

	return result;
}

function filter(test, element, recurse, limit){
	if(recurse !== false) recurse = true;
	if(isNaN(limit)) limit = Infinity;
	if(!Array.isArray(element)) element = [element];

	return filterArray(test, element, recurse, limit);
}

DomUtils.testElement = function(options, element){
	var type = element.type;
	for(var key in options){
		if(!options.hasOwnProperty(key));
		else if(key === "tag_name"){
		    if(type !== ElementType.Tag && type !== ElementType.Script && type !== ElementType.Style) return false;
		    if(!options.tag_name(element.name)) return false;
		} else if(key === "tag_type"){
		    if(!options.tag_type(type)) return false;
		} else if(key === "tag_contains"){
		    if(type !== ElementType.Text && type !== ElementType.Comment && type !== ElementType.Directive) return false;
		    if(!options.tag_contains(element.data)) return false;
		} else if(!element.attribs || !options[key](element.attribs[key])) return false;
	}

	return true;
};

function getEqualityFunc(check){
	return (function(val){ return val === check; });
}

DomUtils.getElements = function(options, element, recurse, limit){
	for(var key in options){
		if(options.hasOwnProperty(key) && typeof options[key] !== "function"){
			options[key] = getEqualityFunc(options[key]);
		}
	}

    return filter(function(elem){ return DomUtils.testElement(options, elem); }, element, recurse, limit);
};

DomUtils.getElementById = function(id, element, recurse){
	var result;

	if(typeof id === "function"){
		result = filter(function(elem){ return elem.attribs && id(elem.attribs); }, element, recurse, 1);
	} else {
		result = filter(function(elem){ return elem.attribs && elem.attribs.id === id; }, element, recurse, 1);
	}

	return result.length ? result[0] : null;
};

DomUtils.getElementsByTagName = function(name, element, recurse, limit){
	if(typeof name === "function"){ 
		return filter(function(elem){
			var type = elem.type;
			if(type !== ElementType.Tag && type !== ElementType.Script && type !== ElementType.Style)
				return false;
			return name(elem.name);
		}, element, recurse, limit);
	}

	if(name === "*") return filter(function(elem){
		var type = elem.type;
		return type === ElementType.Tag || type === ElementType.Script || type === ElementType.Style;
	});

	return filter(function(elem){
		var type = elem.type;
		if(type !== ElementType.Tag && type !== ElementType.Script && type !== ElementType.Style)
			return false;
		return elem.name === name;
	}, element, recurse, limit);
};

DomUtils.getElementsByTagType = function(type, element, recurse, limit){
	if(typeof type === "function"){
		return filter(function(elem){ return type(elem.type); }, element, recurse, limit);
	} else {
		return filter(function(elem){ return elem.type === type; }, element, recurse, limit);
	}
};

DomUtils.getInnerHTML = function(elem){
	if(!elem.children) return "";

	var childs = elem.children,
		childNum = childs.length,
		ret = "";

	for(var i = 0; i < childNum; i++){
		ret += this.getOuterHTML(childs[i]);
	}

	return ret;
};

DomUtils.getOuterHTML = function(elem){
	var type = elem.type,
		name = elem.name;

	if(type === ElementType.Text) return elem.data;
	if(type === ElementType.Comment) return "<!--" + elem.data + "-->";
	if(type === ElementType.Directive) return "<" + elem.data + ">";

	var ret = "<" + name;
	if(elem.hasOwnProperty("attribs")){
		for(var attr in elem.attribs){
			if(elem.attribs.hasOwnProperty(attr)){
				ret += " " + attr + "=\"" + elem.attribs[attr] + "\"";
			}
		}
	}

	ret += ">";

	if(type === ElementType.Directive) return ret;

	return ret + this.getInnerHTML(elem) + "</" + name + ">";
};