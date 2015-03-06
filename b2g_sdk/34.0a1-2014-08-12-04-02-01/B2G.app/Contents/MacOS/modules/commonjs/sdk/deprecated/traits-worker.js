"use strict";module.metadata={"stability":"deprecated"};const{Trait}=require('./traits');const{EventEmitter,EventEmitterTrait}=require('./events');const{Ci,Cu,Cc}=require('chrome');const timer=require('../timers');const{URL}=require('../url');const unload=require('../system/unload');const observers=require('../system/events');const{Cortex}=require('./cortex');const{sandbox,evaluate,load}=require("../loader/sandbox");const{merge}=require('../util/object');const{getInnerId}=require("../window/utils");const{getTabForWindow}=require('../tabs/helpers');const{getTabForContentWindow}=require('../tabs/utils');let prefix=module.uri.split('deprecated/traits-worker.js')[0];const CONTENT_WORKER_URL=prefix+'content/content-worker.js';


const permissions=require('@loader/options').metadata['permissions']||{};const EXPANDED_PRINCIPALS=permissions['cross-domain-content']||[];const JS_VERSION='1.8';const ERR_DESTROYED="Couldn't find the worker to receive this message. "+"The script may not be initialized yet, or may already have been unloaded.";const ERR_FROZEN="The page is currently hidden and can no longer be used "+"until it is visible again.";const WorkerSandbox=EventEmitter.compose({emit:function emit(){
let array=Array.slice(arguments);function replacer(k,v){return typeof v==="function"?undefined:v;} 
let self=this;timer.setTimeout(function(){self._emitToContent(JSON.stringify(array,replacer));},0);},emitSync:function emitSync(){let args=Array.slice(arguments);return this._emitToContent(args);},hasListenerFor:function hasListenerFor(name){return this._hasListenerFor(name);},_onContentEvent:function onContentEvent(args){ let self=this;timer.setTimeout(function(){ self._emit.apply(self,JSON.parse(args));},0);},constructor:function WorkerSandbox(worker){this._addonWorker=worker;this.emit=this.emit.bind(this);this.emitSync=this.emitSync.bind(this); let window=worker._window;let proto=window;




let principals=window;let wantGlobalProperties=[]
if(EXPANDED_PRINCIPALS.length>0&&!worker._injectInDocument){principals=EXPANDED_PRINCIPALS.concat(window);
delete proto.XMLHttpRequest;wantGlobalProperties.push("XMLHttpRequest");}

let content=this._sandbox=sandbox(principals,{sandboxPrototype:proto,wantXrays:!worker._injectInDocument,wantGlobalProperties:wantGlobalProperties,sameZoneAs:window,metadata:{SDKContentScript:true,'inner-window-id':getInnerId(window)}});

let top=window.top===window?content:content.top;let parent=window.parent===window?content:content.parent;merge(content,{get window()content,get top()top,get parent()parent});



var unsafeWindowGetter=new content.Function('return window.wrappedJSObject || window;');Object.defineProperty(content,'unsafeWindow',{get:unsafeWindowGetter});let ContentWorker=load(content,CONTENT_WORKER_URL);let options='contentScriptOptions'in worker?JSON.stringify(worker.contentScriptOptions):undefined;





 let chromeAPI={timers:{setTimeout:timer.setTimeout,setInterval:timer.setInterval,clearTimeout:timer.clearTimeout,clearInterval:timer.clearInterval,__exposedProps__:{setTimeout:'r',setInterval:'r',clearTimeout:'r',clearInterval:'r'}},sandbox:{evaluate:evaluate,__exposedProps__:{evaluate:'r',}},__exposedProps__:{timers:'r',sandbox:'r',}};let onEvent=this._onContentEvent.bind(this);let result=Cu.waiveXrays(ContentWorker).inject(content,chromeAPI,onEvent,options);this._emitToContent=result.emitToContent;this._hasListenerFor=result.hasListenerFor;let self=this; this.on("console",function consoleListener(kind){console[kind].apply(console,Array.slice(arguments,1));}); this.on("message",function postMessage(data){if(self._addonWorker)
self._addonWorker._emit('message',data);}); this.on("event",function portEmit(name,args){if(self._addonWorker)
self._addonWorker._onContentScriptEvent.apply(self._addonWorker,arguments);}); this.on("error",function onError({instanceOfError,value}){if(self._addonWorker){let error=value;if(instanceOfError){error=new Error(value.message,value.fileName,value.lineNumber);error.stack=value.stack;error.name=value.name;}
self._addonWorker._emit('error',error);}});if(worker._injectInDocument){let win=window.wrappedJSObject?window.wrappedJSObject:window;Object.defineProperty(win,"addon",{value:content.self});}

if(!getTabForContentWindow(window)){let win=window.wrappedJSObject?window.wrappedJSObject:window; let con=Cu.createObjectIn(win);let genPropDesc=function genPropDesc(fun){return{enumerable:true,configurable:true,writable:true,value:console[fun]};}
const properties={log:genPropDesc('log'),info:genPropDesc('info'),warn:genPropDesc('warn'),error:genPropDesc('error'),debug:genPropDesc('debug'),trace:genPropDesc('trace'),dir:genPropDesc('dir'),group:genPropDesc('group'),groupCollapsed:genPropDesc('groupCollapsed'),groupEnd:genPropDesc('groupEnd'),time:genPropDesc('time'),timeEnd:genPropDesc('timeEnd'),profile:genPropDesc('profile'),profileEnd:genPropDesc('profileEnd'),__noSuchMethod__:{enumerable:true,configurable:true,writable:true,value:function(){}}};Object.defineProperties(con,properties);Cu.makeObjectPropsNormal(con);win.console=con;};

let contentScriptFile=('contentScriptFile'in worker)?worker.contentScriptFile:null,contentScript=('contentScript'in worker)?worker.contentScript:null;if(contentScriptFile){if(Array.isArray(contentScriptFile))
this._importScripts.apply(this,contentScriptFile);else
this._importScripts(contentScriptFile);}
if(contentScript){this._evaluate(Array.isArray(contentScript)?contentScript.join(';\n'):contentScript);}},destroy:function destroy(){this.emitSync("detach");this._sandbox=null;this._addonWorker=null;},_sandbox:null,_addonWorker:null,_evaluate:function(code,filename){try{evaluate(this._sandbox,code,filename||'javascript:'+code);}
catch(e){this._addonWorker._emit('error',e);}},_importScripts:function _importScripts(url){let urls=Array.slice(arguments,0);for(let contentScriptFile of urls){try{let uri=URL(contentScriptFile);if(uri.scheme==='resource')
load(this._sandbox,String(uri));else
throw Error("Unsupported `contentScriptFile` url: "+String(uri));}
catch(e){this._addonWorker._emit('error',e);}}}});const Worker=EventEmitter.compose({on:Trait.required,_removeAllListeners:Trait.required, get _earlyEvents(){delete this._earlyEvents;this._earlyEvents=[];return this._earlyEvents;},postMessage:function(data){let args=['message'].concat(Array.slice(arguments));if(!this._inited){this._earlyEvents.push(args);return;}
processMessage.apply(this,args);},get port(){
 
this._port=EventEmitterTrait.create({emit:this._emitEventToContent.bind(this)});

delete this._public.port;this._public.port=Cortex(this._port); delete this.port;this.port=this._public.port;return this._port;},_port:null,_emitEventToContent:function(){let args=['event'].concat(Array.slice(arguments));if(!this._inited){this._earlyEvents.push(args);return;}
processMessage.apply(this,args);},_inited:false,_frozen:true,constructor:function Worker(options){options=options||{};if('contentScriptFile'in options)
this.contentScriptFile=options.contentScriptFile;if('contentScriptOptions'in options)
this.contentScriptOptions=options.contentScriptOptions;if('contentScript'in options)
this.contentScript=options.contentScript;this._setListeners(options);unload.ensure(this._public,"destroy");
this.port;this._documentUnload=this._documentUnload.bind(this);this._pageShow=this._pageShow.bind(this);this._pageHide=this._pageHide.bind(this);if("window"in options)this._attach(options.window);},_setListeners:function(options){if('onError'in options)
this.on('error',options.onError);if('onMessage'in options)
this.on('message',options.onMessage);if('onDetach'in options)
this.on('detach',options.onDetach);},_attach:function(window){this._window=window;
 this._windowID=getInnerId(this._window);observers.on("inner-window-destroyed",this._documentUnload);
this._window.addEventListener("pageshow",this._pageShow,true);this._window.addEventListener("pagehide",this._pageHide,true);this._contentWorker=WorkerSandbox(this); this._inited=true;this._frozen=false;
this._earlyEvents.forEach((function(args){processMessage.apply(this,args);}).bind(this));},_documentUnload:function _documentUnload({subject,data}){let innerWinID=subject.QueryInterface(Ci.nsISupportsPRUint64).data;if(innerWinID!=this._windowID)return false;this._workerCleanup();return true;},_pageShow:function _pageShow(){this._contentWorker.emitSync("pageshow");this._emit("pageshow");this._frozen=false;},_pageHide:function _pageHide(){this._contentWorker.emitSync("pagehide");this._emit("pagehide");this._frozen=true;},get url(){ return this._window?this._window.document.location.href:null;},get tab(){ if(this._window)
return getTabForWindow(this._window);return null;},destroy:function destroy(){this._workerCleanup();this._inited=true;this._removeAllListeners();},_workerCleanup:function _workerCleanup(){
 if(this._contentWorker)
this._contentWorker.destroy();this._contentWorker=null;if(this._window){this._window.removeEventListener("pageshow",this._pageShow,true);this._window.removeEventListener("pagehide",this._pageHide,true);}
this._window=null; if(this._windowID){this._windowID=null;observers.off("inner-window-destroyed",this._documentUnload);this._earlyEvents.length=0;this._emit("detach");}
this._inited=false;},_onContentScriptEvent:function _onContentScriptEvent(){this._port._emit.apply(this._port,arguments);},_contentWorker:null,_window:null,_injectInDocument:false});function processMessage(){if(!this._contentWorker)
throw new Error(ERR_DESTROYED);if(this._frozen)
throw new Error(ERR_FROZEN);this._contentWorker.emit.apply(null,Array.slice(arguments));}
exports.Worker=Worker;