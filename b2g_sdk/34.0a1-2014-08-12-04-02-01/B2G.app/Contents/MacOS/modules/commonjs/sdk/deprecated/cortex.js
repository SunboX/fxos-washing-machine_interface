"use strict";module.metadata={"stability":"deprecated"};
function get(object,name){return object[name];}

function set(object,name,value){return object[name]=value;}
function createAliasProperty(object,name){
var property=Object.getOwnPropertyDescriptor(object,name);var descriptor={configurable:property.configurable,enumerable:property.enumerable,alias:true};


if("get"in property&&property.get)
descriptor.get=property.get.bind(object);if("set"in property&&property.set)
descriptor.set=property.set.bind(object);if("value"in property){if(typeof property.value==="function"){descriptor.value=property.value.bind(object);descriptor.writable=property.writable;}


else{descriptor.get=get.bind(null,object,name);descriptor.set=set.bind(null,object,name);}}
return descriptor;}



function defineAlias(source,target,name,alias){return Object.defineProperty(target,alias||name,createAliasProperty(source,name));}
exports.Cortex=function Cortex(object,names,prototype){



var cortex=Object.create(prototype||Object.getPrototypeOf(object));

Object.getOwnPropertyNames(object).forEach(function(name){if((!names&&"_"!==name.charAt(0))||(names&&~names.indexOf(name)))
defineAlias(object,cortex,name);});return cortex;}