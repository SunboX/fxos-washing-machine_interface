'use strict';module.metadata={"stability":"unstable"};var getPrototypeOf=Object.getPrototypeOf;var getNames=Object.getOwnPropertyNames;var getOwnPropertyDescriptor=Object.getOwnPropertyDescriptor;var create=Object.create;var freeze=Object.freeze;var unbind=Function.call.bind(Function.bind,Function.call);
var owns=unbind(Object.prototype.hasOwnProperty);var apply=unbind(Function.prototype.apply);var slice=Array.slice||unbind(Array.prototype.slice);var reduce=Array.reduce||unbind(Array.prototype.reduce);var map=Array.map||unbind(Array.prototype.map);var concat=Array.concat||unbind(Array.prototype.concat);function getOwnPropertyDescriptors(object){return reduce(getNames(object),function(descriptor,name){descriptor[name]=getOwnPropertyDescriptor(object,name);return descriptor;},{});}
function isDataProperty(property){var value=property.value;var type=typeof(property.value);return"value"in property&&(type!=="object"||value===null)&&type!=="function";}
function getDataProperties(object){var properties=getOwnPropertyDescriptors(object);return getNames(properties).reduce(function(result,name){var property=properties[name];if(isDataProperty(property)){result[name]={value:property.value,writable:true,configurable:true,enumerable:false};}
return result;},{})}
function obscure(source){var descriptor=reduce(getNames(source),function(descriptor,name){var property=getOwnPropertyDescriptor(source,name);property.enumerable=false;descriptor[name]=property;return descriptor;},{});return create(getPrototypeOf(source),descriptor);}
exports.obscure=obscure;var mix=function(source){var descriptor=reduce(slice(arguments),function(descriptor,source){return reduce(getNames(source),function(descriptor,name){descriptor[name]=getOwnPropertyDescriptor(source,name);return descriptor;},descriptor);},{});return create(getPrototypeOf(source),descriptor);};exports.mix=mix;function extend(prototype,properties){return create(prototype,getOwnPropertyDescriptors(properties));}
exports.extend=extend;var Class=new function(){function prototypeOf(input){return typeof(input)==='function'?input.prototype:input;}
var none=freeze([]);return function Class(options){
var descriptor={

extends:owns(options,'extends')?prototypeOf(options.extends):Class.prototype,
implements:owns(options,'implements')?freeze(map(options.implements,prototypeOf)):none};

var descriptors=concat(descriptor.implements,options,descriptor,{constructor:constructor});
function constructor(){var instance=create(prototype,attributes);if(initialize)apply(initialize,instance,arguments);return instance;}


var prototype=extend(descriptor.extends,mix.apply(mix,descriptors));var initialize=prototype.initialize;
var attributes=mix(descriptor.extends.constructor.attributes||{},getDataProperties(prototype));constructor.attributes=attributes;Object.defineProperty(constructor,'prototype',{configurable:false,writable:false,value:prototype});return constructor;};}
Class.prototype=extend(null,obscure({constructor:function constructor(){this.initialize.apply(this,arguments);return this;},initialize:function initialize(){},toString:Object.prototype.toString,toLocaleString:Object.prototype.toLocaleString,toSource:Object.prototype.toSource,valueOf:Object.prototype.valueOf,isPrototypeOf:Object.prototype.isPrototypeOf}));exports.Class=freeze(Class);