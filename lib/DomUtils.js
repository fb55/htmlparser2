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
    var type = element.type,
        keys = Object.keys(options),
        len = keys.length;

    for(var i = 0; i < len; i++){
        var key = keys[i];

        switch(key){
            case "tag_name":
                if(type !== ElementType.Tag && type !== ElementType.Script && type !== ElementType.Style) return false;
                if(!options.tag_name(element.name)) return false;
                break;
            case "tag_type":
                if(!options.tag_type(type)) return false;
                break;
            case "tag_contains":
                if(type !== ElementType.Text && type !== ElementType.Comment && type !== ElementType.Directive) return false;
                if(!options.tag_contains(element.data)) return false;
                break;
            default:
                if(!element.attribs || !options[key](element.attribs[key])) return false;
                break;
        }
    }

    return true;
}

DomUtils.getElements = function(options, element, recurse, limit){
    var keys = Object.keys(options),
        len = keys.length;

    for(var i = 0; i < len; i++){
        var key = keys[i];

        if(typeof options[key] !== "function"){
            var checker = options[key];
            options[key] = function(val){ return val === checker };
        }
    }

    return filter(this.testElement.bind(null, options), element, recurse, limit);
}

DomUtils.getElementById = function(id, element, recurse){
    var result;

    if(typeof id === "function"){
        result = filter(function(elem){ return elem.attribs && id(elem.attribs) }, element, recurse, 1);
    }else{
        result = filter(function(elem){ return elem.attribs && elem.attribs.id === id }, element, recurse, 1);
    }

    return result.length ? result[0] : null;
}

DomUtils.getElementsByTagName = function(name, element, recurse, limit){
    if(typeof name === "function") return filter(function(elem){
        var type = elem.type;
        if(type !== ElementType.Tag && type !== ElementType.Script && type !== ElementType.Style)
            return false;
        return name(elem.name);
    }, element, recurse, limit);

    return filter(function(elem){
        var type = elem.type;
        if(type !== ElementType.Tag && type !== ElementType.Script && type !== ElementType.Style)
            return false;
        return elem.name === name;
    }, element, recurse, limit);
}

DomUtils.getElementsByTagType = function(type, element, recurse, limit){
    if(typeof type === "function")
        return filter(function(elem){ return type(elem.type) }, element, recurse, limit);
    else
        return filter(function(elem){ return elem.type === type }, element, recurse, limit);
}

DomUtils.getInnerHTML = function(elem){
    if(!elem.children) return "";

    var childs = elem.children,
        childNum = childs.length,
        ret = "";

    for(var i = 0; i < childNum; i++){
        ret += this.getOuterHTML(childs[i]);
    }

    return ret;
}

DomUtils.getOuterHTML = function(elem){
    var type = elem.type,
        name = elem.name;

    if(type === ElementType.Text) return elem.data;
    if(type === ElementType.Comment) return "<!--" + elem.data + "-->";

    var attrStr = "";
    if(elem.attribs){
        var attrs = Object.keys(elem.attribs),
            len = attrs.length;

        for(var i = 0; i < len; i++){
            var attr = attrs[i],
                val = elem.attribs[attr];

            attrStr += " " + attr + "=\"" + val + "\"";

            /* Is this required? Method forgets quotes
            if(/^[^\s"\'\`\=\<\>]+$/.test(val))
                attrStr += val;
            else if(val.indeOf("\"") !== -1)
                attrStr += "'" + val + "'";
            else
                attrStr += "\"" + val + "\"";
            */
        }
    }

    var ret = "<" + name + attrStr + ">";

    if(type === ElementType.Directive) return ret;

    ret += this.getInnerHTML(elem) + "</" + name + ">"
    return ret;
}
