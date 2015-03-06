"use strict";this.EXPORTED_SYMBOLS=["Task"];const Cc=Components.classes;const Ci=Components.interfaces;const Cu=Components.utils;const Cr=Components.results;Cu.import("resource://gre/modules/Promise.jsm");
const ERRORS_TO_REPORT=["EvalError","RangeError","ReferenceError","TypeError"];let gCurrentTask=null;let gMaintainStack=false;function*linesOf(string){let reLine=/([^\r\n])+/g;let match;while((match=reLine.exec(string))){yield[match[0],match.index];}};function isGenerator(aValue){return Object.prototype.toString.call(aValue)=="[object Generator]";}
this.Task={spawn:function Task_spawn(aTask){return createAsyncFunction(aTask).call(undefined);},async:function Task_async(aTask){if(typeof(aTask)!="function"){throw new TypeError("aTask argument must be a function");}
return createAsyncFunction(aTask);},Result:function Task_Result(aValue){this.value=aValue;}};function createAsyncFunction(aTask){let asyncFunction=function(){let result=aTask;if(aTask&&typeof(aTask)=="function"){if(aTask.isAsyncFunction){throw new TypeError("Cannot use an async function in place of a promise. "+"You should either invoke the async function first "+"or use 'Task.spawn' instead of 'Task.async' to start "+"the Task and return its promise.");}
try{result=aTask.apply(this,arguments);}catch(ex if ex instanceof Task.Result){return Promise.resolve(ex.value);}catch(ex){return Promise.reject(ex);}}
if(isGenerator(result)){return new TaskImpl(result).deferred.promise;}
return Promise.resolve(result);};asyncFunction.isAsyncFunction=true;return asyncFunction;}
function TaskImpl(iterator){if(gMaintainStack){this._stack=(new Error()).stack;}
this.deferred=Promise.defer();this._iterator=iterator;this._isStarGenerator=!("send"in iterator);this._run(true);}
TaskImpl.prototype={deferred:null,_iterator:null,_isStarGenerator:false,_run:function TaskImpl_run(aSendResolved,aSendValue){try{gCurrentTask=this;if(this._isStarGenerator){try{let result=aSendResolved?this._iterator.next(aSendValue):this._iterator.throw(aSendValue);if(result.done){this.deferred.resolve(result.value);}else{this._handleResultValue(result.value);}}catch(ex){this._handleException(ex);}}else{try{let yielded=aSendResolved?this._iterator.send(aSendValue):this._iterator.throw(aSendValue);this._handleResultValue(yielded);}catch(ex if ex instanceof Task.Result){
this.deferred.resolve(ex.value);}catch(ex if ex instanceof StopIteration){this.deferred.resolve(undefined);}catch(ex){this._handleException(ex);}}}finally{





if(gCurrentTask==this){gCurrentTask=null;}}},_handleResultValue:function TaskImpl_handleResultValue(aValue){

if(isGenerator(aValue)){aValue=Task.spawn(aValue);}
if(aValue&&typeof(aValue.then)=="function"){

aValue.then(this._run.bind(this,true),this._run.bind(this,false));}else{
this._run(true,aValue);}},_handleException:function TaskImpl_handleException(aException){gCurrentTask=this;if(aException&&typeof aException=="object"&&"stack"in aException){let stack=aException.stack;if(gMaintainStack&&aException._capturedTaskStack!=this._stack&&typeof stack=="string"){let bottomStack=this._stack;let topStack=stack;stack=Task.Debugging.generateReadableStack(stack);aException.stack=stack;aException._capturedTaskStack=bottomStack;}else if(!stack){stack="Not available";}
if("name"in aException&&ERRORS_TO_REPORT.indexOf(aException.name)!=-1){


dump("*************************\n");dump("A coding exception was thrown and uncaught in a Task.\n\n");dump("Full message: "+aException+"\n");dump("Full stack: "+aException.stack+"\n");dump("*************************\n");}}
this.deferred.reject(aException);},get callerStack(){
for(let[line,index]of linesOf(this._stack||"")){if(line.indexOf("/Task.jsm:")==-1){return this._stack.substring(index);}}
return"";}};Task.Debugging={get maintainStack(){return gMaintainStack;},set maintainStack(x){if(!x){gCurrentTask=null;}
return gMaintainStack=x;},generateReadableStack:function(topStack,prefix=""){if(!gCurrentTask){return topStack;}
let lines=[];for(let[line]of linesOf(topStack)){if(line.indexOf("/Task.jsm:")!=-1){break;}
lines.push(prefix+line);}
if(!prefix){lines.push(gCurrentTask.callerStack);}else{for(let[line]of linesOf(gCurrentTask.callerStack)){lines.push(prefix+line);}}
return lines.join("\n");}};