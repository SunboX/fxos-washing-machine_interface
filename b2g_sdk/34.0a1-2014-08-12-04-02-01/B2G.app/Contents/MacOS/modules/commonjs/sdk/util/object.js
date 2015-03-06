"use strict";module.metadata={"stability":"unstable"};const{flatten}=require('./array');function merge(source){let descriptor={};

Array.slice(arguments,1).filter(Boolean).forEach(function onEach(properties){Object.getOwnPropertyNames(properties).forEach(function(name){descriptor[name]=Object.getOwnPropertyDescriptor(properties,name);});});return Object.defineProperties(source,descriptor);}
exports.merge=merge;function extend(source){let rest=Array.slice(arguments,1);rest.unshift(Object.create(source));return merge.apply(null,rest);}
exports.extend=extend;function has(obj,key)obj.hasOwnProperty(key);exports.has=has;function each(obj,fn){for(let key in obj)has(obj,key)&&fn(obj[key],key,obj);}
exports.each=each;function safeMerge(source){Array.slice(arguments,1).forEach(function onEach(obj){for(let prop in obj)source[prop]=obj[prop];});return source;}
exports.safeMerge=safeMerge;function omit(source,...values){let copy={};let keys=flatten(values);for(let prop in source)
if(!~keys.indexOf(prop))
copy[prop]=source[prop];return copy;}
exports.omit=omit;