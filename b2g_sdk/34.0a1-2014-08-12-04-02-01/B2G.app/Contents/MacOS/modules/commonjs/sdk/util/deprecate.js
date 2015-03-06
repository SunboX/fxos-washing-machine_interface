"use strict";module.metadata={"stability":"experimental"};const{get,format}=require("../console/traceback");const{get:getPref}=require("../preferences/service");const PREFERENCE="devtools.errorconsole.deprecation_warnings";function deprecateUsage(msg){
 let stack=get().slice(2);if(getPref(PREFERENCE))
console.error("DEPRECATED: "+msg+"\n"+format(stack));}
exports.deprecateUsage=deprecateUsage;function deprecateFunction(fun,msg){return function deprecated(){deprecateUsage(msg);return fun.apply(this,arguments);};}
exports.deprecateFunction=deprecateFunction;function deprecateEvent(fun,msg,evtTypes){return function deprecateEvent(evtType){if(evtTypes.indexOf(evtType)>=0)
deprecateUsage(msg);return fun.apply(this,arguments);};}
exports.deprecateEvent=deprecateEvent;