"use strict";module.metadata={"stability":"unstable"};function isUndefined(value){return value===undefined;}
exports.isUndefined=isUndefined;function isNull(value){return value===null;}
exports.isNull=isNull;function isNil(value){return value===null||value===undefined;}
exports.isNil=isNil;function isBoolean(value){return typeof value==="boolean";}
exports.isBoolean=isBoolean;function isString(value){return typeof value==="string";}
exports.isString=isString;function isNumber(value){return typeof value==="number";}
exports.isNumber=isNumber;function isRegExp(value){return isObject(value)&&instanceOf(value,RegExp);}
exports.isRegExp=isRegExp;function isDate(value){return isObject(value)&&instanceOf(value,Date);}
exports.isDate=isDate;function isFunction(value){return typeof value==="function";}
exports.isFunction=isFunction;function isObject(value){return typeof value==="object"&&value!==null;}
exports.isObject=isObject;var isArray=Array.isArray||function isArray(value){Object.prototype.toString.call(value)==="[object Array]";}
exports.isArray=isArray;function isArguments(value){Object.prototype.toString.call(value)==="[object Arguments]";}
exports.isArguments=isArguments;let isMap=value=>Object.prototype.toString.call(value)==="[object Map]"
exports.isMap=isMap;let isSet=value=>Object.prototype.toString.call(value)==="[object Set]"
exports.isSet=isSet;function isPrimitive(value){return!isFunction(value)&&!isObject(value);}
exports.isPrimitive=isPrimitive;function isFlat(object){return isObject(object)&&(isNull(Object.getPrototypeOf(object))||isNull(Object.getPrototypeOf(Object.getPrototypeOf(object))));}
exports.isFlat=isFlat;function isEmpty(object){if(isObject(object)){for(var key in object)
return false;return true;}
return false;}
exports.isEmpty=isEmpty;function isJSON(value,visited){(visited||(visited=[])).push(value);return isPrimitive(value)||
(isArray(value)&&value.every(function(element){return isJSON(element,visited);}))||
(isFlat(value)&&Object.keys(value).every(function(key){var $=Object.getOwnPropertyDescriptor(value,key);

return((!isObject($.value)||!~visited.indexOf($.value))&&!('get'in $)&&!('set'in $)&&isJSON($.value,visited));}));}
exports.isJSON=function(value){return isJSON(value);};function instanceOf(value,Type){var isConstructorNameSame;var isConstructorSourceSame;var isInstanceOf=value instanceof Type;


if(!isInstanceOf&&value){isConstructorNameSame=value.constructor.name===Type.name;isConstructorSourceSame=String(value.constructor)==String(Type);isInstanceOf=(isConstructorNameSame&&isConstructorSourceSame)||instanceOf(Object.getPrototypeOf(value),Type);}
return isInstanceOf;}
exports.instanceOf=instanceOf;function source(value,indent,limit,offset,visited){var result;var names;var nestingIndex;var isCompact=!isUndefined(limit);indent=indent||"    ";offset=(offset||"");result="";visited=visited||[];if(isUndefined(value)){result+="undefined";}
else if(isNull(value)){result+="null";}
else if(isString(value)){result+='"'+value+'"';}
else if(isFunction(value)){value=String(value).split("\n");if(isCompact&&value.length>2){value=value.splice(0,2);value.push("...}");}
result+=value.join("\n"+offset);}
else if(isArray(value)){if((nestingIndex=(visited.indexOf(value)+1))){result="#"+nestingIndex+"#";}
else{visited.push(value);if(isCompact)
value=value.slice(0,limit);result+="[\n";result+=value.map(function(value){return offset+indent+source(value,indent,limit,offset+indent,visited);}).join(",\n");result+=isCompact&&value.length>limit?",\n"+offset+"...]":"\n"+offset+"]";}}
else if(isObject(value)){if((nestingIndex=(visited.indexOf(value)+1))){result="#"+nestingIndex+"#"}
else{visited.push(value)
names=Object.keys(value);result+="{ // "+value+"\n";result+=(isCompact?names.slice(0,limit):names).map(function(name){var _limit=isCompact?limit-1:limit;var descriptor=Object.getOwnPropertyDescriptor(value,name);var result=offset+indent+"// ";var accessor;if(0<=name.indexOf(" "))
name='"'+name+'"';if(descriptor.writable)
result+="writable ";if(descriptor.configurable)
result+="configurable ";if(descriptor.enumerable)
result+="enumerable ";result+="\n";if("value"in descriptor){result+=offset+indent+name+": ";result+=source(descriptor.value,indent,_limit,indent+offset,visited);}
else{if(descriptor.get){result+=offset+indent+"get "+name+" ";accessor=source(descriptor.get,indent,_limit,indent+offset,visited);result+=accessor.substr(accessor.indexOf("{"));}
if(descriptor.set){result+=offset+indent+"set "+name+" ";accessor=source(descriptor.set,indent,_limit,indent+offset,visited);result+=accessor.substr(accessor.indexOf("{"));}}
return result;}).join(",\n");if(isCompact){if(names.length>limit&&limit>0){result+=",\n"+offset+indent+"//...";}}
else{if(names.length)
result+=",";result+="\n"+offset+indent+'"__proto__": ';result+=source(Object.getPrototypeOf(value),indent,0,offset+indent);}
result+="\n"+offset+"}";}}
else{result+=String(value);}
return result;}
exports.source=function(value,indentation,limit){return source(value,indentation,limit);};