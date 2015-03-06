'use strict';module.metadata={'stability':'unstable'};const{Class}=require('../core/heritage');const{EventTarget}=require('../event/target');const{on,off,emit}=require('../event/core');const{requiresAddonGlobal}=require('./utils');const{delay:async}=require('../lang/functional');const{Ci,Cu,Cc}=require('chrome');const timer=require('../timers');const{URL}=require('../url');const{sandbox,evaluate,load}=require('../loader/sandbox');const{merge}=require('../util/object');const{getTabForContentWindow}=require('../tabs/utils');const{getInnerId}=require('../window/utils');const{PlainTextConsole}=require('../console/plain-text');const{data}=require('../self');const sandboxes=new WeakMap();let prefix=module.uri.split('sandbox.js')[0];const CONTENT_WORKER_URL=prefix+'content-worker.js';const metadata=require('@loader/options').metadata;


const permissions=(metadata&&metadata['permissions'])||{};const EXPANDED_PRINCIPALS=permissions['cross-domain-content']||[];const waiveSecurityMembrane=!!permissions['unsafe-content-script'];const nsIScriptSecurityManager=Ci.nsIScriptSecurityManager;const secMan=Cc["@mozilla.org/scriptsecuritymanager;1"].getService(Ci.nsIScriptSecurityManager);const JS_VERSION='1.8';const WorkerSandbox=Class({implements:[EventTarget],emit:function emit(type,...args){let replacer=(k,v)=>typeof(v)==="function"?(type==="console"?Function.toString.call(v):void(0)):v; async(()=>emitToContent(this,JSON.stringify([type,...args],replacer)));},emitSync:function emitSync(...args){return emitToContent(this,args);},hasListenerFor:function hasListenerFor(name){return modelFor(this).hasListenerFor(name);},initialize:function WorkerSandbox(worker,window){let model={};sandboxes.set(this,model);model.worker=worker; let proto=window;this.emit=this.emit.bind(this);this.emitSync=this.emitSync.bind(this);







let principals=window;let wantGlobalProperties=[];let isSystemPrincipal=secMan.isSystemPrincipal(window.document.nodePrincipal);if(!isSystemPrincipal&&!requiresAddonGlobal(worker)){if(EXPANDED_PRINCIPALS.length>0){
delete proto.XMLHttpRequest;wantGlobalProperties.push('XMLHttpRequest');}
if(!waiveSecurityMembrane)
principals=EXPANDED_PRINCIPALS.concat(window);}

let content=sandbox(principals,{sandboxPrototype:proto,wantXrays:!requiresAddonGlobal(worker),wantGlobalProperties:wantGlobalProperties,wantExportHelpers:true,sameZoneAs:window,metadata:{SDKContentScript:true,'inner-window-id':getInnerId(window)}});model.sandbox=content;

let top=window.top===window?content:content.top;let parent=window.parent===window?content:content.parent;merge(content,{get window()content,get top()top,get parent()parent});



var unsafeWindowGetter=new content.Function('return window.wrappedJSObject || window;');Object.defineProperty(content,'unsafeWindow',{get:unsafeWindowGetter});let ContentWorker=load(content,CONTENT_WORKER_URL);let options='contentScriptOptions'in worker?JSON.stringify(worker.contentScriptOptions):undefined;





 let onEvent=onContentEvent.bind(null,this);let chromeAPI=createChromeAPI();let result=Cu.waiveXrays(ContentWorker).inject(content,chromeAPI,onEvent,options);

 merge(model,result);let console=new PlainTextConsole(null,getInnerId(window));setListeners(this,console);if(requiresAddonGlobal(worker)){Object.defineProperty(getUnsafeWindow(window),'addon',{value:content.self});}

if(!getTabForContentWindow(window)){let win=getUnsafeWindow(window); let con=Cu.createObjectIn(win);let genPropDesc=function genPropDesc(fun){return{enumerable:true,configurable:true,writable:true,value:console[fun]};}
const properties={log:genPropDesc('log'),info:genPropDesc('info'),warn:genPropDesc('warn'),error:genPropDesc('error'),debug:genPropDesc('debug'),trace:genPropDesc('trace'),dir:genPropDesc('dir'),group:genPropDesc('group'),groupCollapsed:genPropDesc('groupCollapsed'),groupEnd:genPropDesc('groupEnd'),time:genPropDesc('time'),timeEnd:genPropDesc('timeEnd'),profile:genPropDesc('profile'),profileEnd:genPropDesc('profileEnd'),__noSuchMethod__:{enumerable:true,configurable:true,writable:true,value:function(){}}};Object.defineProperties(con,properties);Cu.makeObjectPropsNormal(con);win.console=con;};

let contentScriptFile=('contentScriptFile'in worker)?worker.contentScriptFile:null,contentScript=('contentScript'in worker)?worker.contentScript:null;if(contentScriptFile)
importScripts.apply(null,[this].concat(contentScriptFile));if(contentScript){evaluateIn(this,Array.isArray(contentScript)?contentScript.join(';\n'):contentScript);}},destroy:function destroy(reason){if(typeof reason!='string')
reason='';this.emitSync('event','detach',reason);let model=modelFor(this);model.sandbox=null
model.worker=null;},});exports.WorkerSandbox=WorkerSandbox;function importScripts(workerSandbox,...urls){let{worker,sandbox}=modelFor(workerSandbox);for(let i in urls){let contentScriptFile=data.url(urls[i]);try{let uri=URL(contentScriptFile);if(uri.scheme==='resource')
load(sandbox,String(uri));else
throw Error('Unsupported `contentScriptFile` url: '+String(uri));}
catch(e){emit(worker,'error',e);}}}
function setListeners(workerSandbox,console){let{worker}=modelFor(workerSandbox); workerSandbox.on('console',function consoleListener(kind,...args){console[kind].apply(console,args);}); workerSandbox.on('message',function postMessage(data){if(worker)
emit(worker,'message',data);}); workerSandbox.on('event',function portEmit(...eventArgs){
 if(worker)
emit.apply(null,[worker.port].concat(eventArgs));}); workerSandbox.on('error',function onError({instanceOfError,value}){if(worker){let error=value;if(instanceOfError){error=new Error(value.message,value.fileName,value.lineNumber);error.stack=value.stack;error.name=value.name;}
emit(worker,'error',error);}});}
function evaluateIn(workerSandbox,code,filename){let{worker,sandbox}=modelFor(workerSandbox);try{evaluate(sandbox,code,filename||'javascript:'+code);}
catch(e){emit(worker,'error',e);}}
function onContentEvent(workerSandbox,args){ async(function(){ emit.apply(null,[workerSandbox].concat(JSON.parse(args)));});}
function modelFor(workerSandbox){return sandboxes.get(workerSandbox);}
function getUnsafeWindow(win){return win.wrappedJSObject||win;}
function emitToContent(workerSandbox,args){return modelFor(workerSandbox).emitToContent(args);}
function createChromeAPI(){return{timers:{setTimeout:timer.setTimeout,setInterval:timer.setInterval,clearTimeout:timer.clearTimeout,clearInterval:timer.clearInterval,__exposedProps__:{setTimeout:'r',setInterval:'r',clearTimeout:'r',clearInterval:'r'},},sandbox:{evaluate:evaluate,__exposedProps__:{evaluate:'r'}},__exposedProps__:{timers:'r',sandbox:'r'}};}