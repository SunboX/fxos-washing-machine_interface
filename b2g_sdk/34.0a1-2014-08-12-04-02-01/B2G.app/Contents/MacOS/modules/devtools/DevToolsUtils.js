"use strict";var{Ci,Cu}=require("chrome");var Services=require("Services");var promise=require("promise");var{setTimeout}=require("Timer");exports.safeErrorString=function safeErrorString(aError){try{let errorString=aError.toString();if(typeof errorString=="string"){
try{if(aError.stack){let stack=aError.stack.toString();if(typeof stack=="string"){errorString+="\nStack: "+stack;}}}catch(ee){}
if(typeof aError.lineNumber=="number"&&typeof aError.columnNumber=="number"){errorString+="Line: "+aError.lineNumber+", column: "+aError.columnNumber;}
return errorString;}}catch(ee){}
return"<failed trying to find error description>";}
exports.reportException=function reportException(aWho,aException){let msg=aWho+" threw an exception: "+exports.safeErrorString(aException);dump(msg+"\n");if(Cu.reportError){Cu.reportError(msg);}}
exports.makeInfallible=function makeInfallible(aHandler,aName){if(!aName)
aName=aHandler.name;return function(){try{return aHandler.apply(this,arguments);}catch(ex){let who="Handler function";if(aName){who+=" "+aName;}
exports.reportException(who,ex);}}}
exports.zip=function zip(a,b){if(!b){return a;}
if(!a){return b;}
const pairs=[];for(let i=0,aLength=a.length,bLength=b.length;i<aLength||i<bLength;i++){pairs.push([a[i],b[i]]);}
return pairs;};exports.executeSoon=function executeSoon(aFn){if(isWorker){setTimeout(aFn,0);}else{Services.tm.mainThread.dispatch({run:exports.makeInfallible(aFn)},Ci.nsIThread.DISPATCH_NORMAL);}};exports.waitForTick=function waitForTick(){let deferred=promise.defer();exports.executeSoon(deferred.resolve);return deferred.promise;};exports.waitForTime=function waitForTime(aDelay){let deferred=promise.defer();setTimeout(deferred.resolve,aDelay);return deferred.promise;};exports.yieldingEach=function yieldingEach(aArray,aFn){const deferred=promise.defer();let i=0;let len=aArray.length;let outstanding=[deferred.promise];(function loop(){const start=Date.now();while(i<len){


if(Date.now()-start>16){exports.executeSoon(loop);return;}
try{outstanding.push(aFn(aArray[i],i++));}catch(e){deferred.reject(e);return;}}
deferred.resolve();}());return promise.all(outstanding);}
exports.defineLazyPrototypeGetter=function defineLazyPrototypeGetter(aObject,aKey,aCallback){Object.defineProperty(aObject,aKey,{configurable:true,get:function(){const value=aCallback.call(this);Object.defineProperty(this,aKey,{configurable:true,writable:true,value:value});return value;}});}
exports.getProperty=function getProperty(aObj,aKey){let root=aObj;try{do{const desc=aObj.getOwnPropertyDescriptor(aKey);if(desc){if("value"in desc){return desc.value;}
return exports.hasSafeGetter(desc)?desc.get.call(root).return:undefined;}
aObj=aObj.proto;}while(aObj);}catch(e){exports.reportException("getProperty",e);}
return undefined;};exports.hasSafeGetter=function hasSafeGetter(aDesc){let fn=aDesc.get;return fn&&fn.callable&&fn.class=="Function"&&fn.script===undefined;};exports.isSafeJSObject=function isSafeJSObject(aObj){if(isWorker){return false;}
if(Cu.getGlobalForObject(aObj)==Cu.getGlobalForObject(exports.isSafeJSObject)){return true;}
let principal=Cu.getObjectPrincipal(aObj);if(Services.scriptSecurityManager.isSystemPrincipal(principal)){return true;}
return Cu.isXrayWrapper(aObj);};exports.dumpn=function dumpn(str){if(exports.dumpn.wantLogging){dump("DBG-SERVER: "+str+"\n");}}

exports.dumpn.wantLogging=false;exports.dumpv=function(msg){if(exports.dumpv.wantVerbose){exports.dumpn(msg);}};
exports.dumpv.wantVerbose=false;exports.dbg_assert=function dbg_assert(cond,e){if(!cond){return e;}}
exports.update=function update(aTarget,aNewAttrs){for(let key in aNewAttrs){let desc=Object.getOwnPropertyDescriptor(aNewAttrs,key);if(desc){Object.defineProperty(aTarget,key,desc);}}}
exports.defineLazyGetter=function defineLazyGetter(aObject,aName,aLambda){Object.defineProperty(aObject,aName,{get:function(){delete aObject[aName];return aObject[aName]=aLambda.apply(aObject);},configurable:true,enumerable:true});};exports.defineLazyModuleGetter=function defineLazyModuleGetter(aObject,aName,aResource,aSymbol)
{this.defineLazyGetter(aObject,aName,function XPCU_moduleLambda(){var temp={};Cu.import(aResource,temp);return temp[aSymbol||aName];});};