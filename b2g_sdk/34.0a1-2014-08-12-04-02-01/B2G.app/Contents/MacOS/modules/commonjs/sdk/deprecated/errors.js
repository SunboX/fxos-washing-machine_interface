"use strict";module.metadata={"stability":"deprecated"};function logToConsole(e){console.exception(e);}
var catchAndLog=exports.catchAndLog=function(callback,defaultResponse,logException){if(!logException)
logException=logToConsole;return function(){try{return callback.apply(this,arguments);}catch(e){logException(e);return defaultResponse;}};};exports.catchAndLogProps=function catchAndLogProps(object,props,defaultResponse,logException){if(typeof(props)=="string")
props=[props];props.forEach(function(property){object[property]=catchAndLog(object[property],defaultResponse,logException);});};exports.catchAndReturn=function(callback){return function(){try{return{returnValue:callback.apply(this,arguments)};}
catch(exception){return{exception:exception};}};};