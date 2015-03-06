"use strict";if(typeof Components!="undefined"){throw new Error("This module is meant to be used from the worker thread");}
if(typeof require=="undefined"||typeof module=="undefined"){throw new Error("this module is meant to be imported using the implementation of require() at resource://gre/modules/workers/require.js");}
importScripts("resource://gre/modules/workers/require.js");const EXCEPTION_NAMES={EvalError:"EvalError",InternalError:"InternalError",RangeError:"RangeError",ReferenceError:"ReferenceError",SyntaxError:"SyntaxError",TypeError:"TypeError",URIError:"URIError",};function Meta(data,meta){this.data=data;this.meta=meta;};exports.Meta=Meta;function AbstractWorker(agent){this._agent=agent;};AbstractWorker.prototype={ log:function(){},handleMessage:function(msg){let data=msg.data;this.log("Received message",data);let id=data.id;let start;let options;if(data.args){options=data.args[data.args.length-1];}

if(options&&typeof options==="object"&&"outExecutionDuration"in options){start=Date.now();}
let result;let exn;let durationMs;let method=data.fun;try{this.log("Calling method",method);result=this.dispatch(method,data.args);this.log("Method",method,"succeeded");}catch(ex){exn=ex;this.log("Error while calling agent method",method,exn,exn.moduleStack||exn.stack||"");}
if(start){ durationMs=Date.now()-start;this.log("Method took",durationMs,"ms");}


if(!exn){this.log("Sending positive reply",result,"id is",id);if(result instanceof Meta){if("transfers"in result.meta){ this.postMessage({ok:result.data,id:id,durationMs:durationMs},result.meta.transfers);}else{this.postMessage({ok:result.data,id:id,durationMs:durationMs});}
if(result.meta.shutdown||false){ this.close();}}else{this.postMessage({ok:result,id:id,durationMs:durationMs});}}else if(exn.constructor.name in EXCEPTION_NAMES){
this.log("Sending back exception",exn.constructor.name,"id is",id);let error={exn:exn.constructor.name,message:exn.message,fileName:exn.moduleName||exn.fileName,lineNumber:exn.lineNumber,stack:exn.moduleStack};this.postMessage({fail:error,id:id,durationMs:durationMs});}else if(exn==StopIteration){
this.log("Sending back StopIteration, id is",id);let error={exn:"StopIteration"};this.postMessage({fail:error,id:id,durationMs:durationMs});}else if("toMsg"in exn){


this.log("Sending back an error that knows how to serialize itself",exn,"id is",id);let msg=exn.toMsg();this.postMessage({fail:msg,id:id,durationMs:durationMs});}else{



this.log("Sending back regular error",exn,exn.moduleStack||exn.stack,"id is",id);try{ exn.filename=exn.moduleName;exn.stack=exn.moduleStack;}catch(_){}
throw exn;}}};exports.AbstractWorker=AbstractWorker;