"use strict";module.metadata={"stability":"unstable"};const{Class}=require('../core/heritage');const{EventTarget}=require('../event/target');const{on,off,emit,setListeners}=require('../event/core');const{attach,detach,destroy}=require('./utils');const{method}=require('../lang/functional');const{Ci,Cu,Cc}=require('chrome');const unload=require('../system/unload');const events=require('../system/events');const{getInnerId}=require("../window/utils");const{WorkerSandbox}=require('./sandbox');const{getTabForWindow}=require('../tabs/helpers');const{isPrivate}=require('../private-browsing/utils');
const workers=new WeakMap();let modelFor=(worker)=>workers.get(worker);const ERR_DESTROYED="Couldn't find the worker to receive this message. "+"The script may not be initialized yet, or may already have been unloaded.";const ERR_FROZEN="The page is currently hidden and can no longer be used "+"until it is visible again.";const Worker=Class({implements:[EventTarget],initialize:function WorkerConstructor(options){ let model=createModel();workers.set(this,model);options=options||{};if('contentScriptFile'in options)
this.contentScriptFile=options.contentScriptFile;if('contentScriptOptions'in options)
this.contentScriptOptions=options.contentScriptOptions;if('contentScript'in options)
this.contentScript=options.contentScript;if('injectInDocument'in options)
this.injectInDocument=!!options.injectInDocument;setListeners(this,options);unload.ensure(this,"destroy");
this.port=createPort(this);model.documentUnload=documentUnload.bind(this);model.pageShow=pageShow.bind(this);model.pageHide=pageHide.bind(this);if('window'in options)
attach(this,options.window);},postMessage:function(...data){let model=modelFor(this);let args=['message'].concat(data);if(!model.inited){model.earlyEvents.push(args);return;}
processMessage.apply(null,[this].concat(args));},get url(){let model=modelFor(this); return model.window?model.window.document.location.href:null;},get contentURL(){let model=modelFor(this);return model.window?model.window.document.URL:null;},get tab(){let model=modelFor(this); if(model.window)
return getTabForWindow(model.window);return null;},
 getSandbox:function(){return modelFor(this).contentWorker;},toString:function(){return'[object Worker]';},attach:method(attach),detach:method(detach),destroy:method(destroy)});exports.Worker=Worker;attach.define(Worker,function(worker,window){let model=modelFor(worker);model.window=window;
 model.windowID=getInnerId(model.window);events.on("inner-window-destroyed",model.documentUnload);model.contentWorker=WorkerSandbox(worker,model.window);
model.window.addEventListener("pageshow",model.pageShow,true);model.window.addEventListener("pagehide",model.pageHide,true); model.inited=true;model.frozen=false; emit(worker,'attach',window);
model.earlyEvents.forEach(args=>processMessage.apply(null,[worker].concat(args)));});detach.define(Worker,function(worker,reason){let model=modelFor(worker); if(model.contentWorker){model.contentWorker.destroy(reason);}
model.contentWorker=null;if(model.window){model.window.removeEventListener("pageshow",model.pageShow,true);model.window.removeEventListener("pagehide",model.pageHide,true);}
model.window=null; if(model.windowID){model.windowID=null;events.off("inner-window-destroyed",model.documentUnload);model.earlyEvents.length=0;emit(worker,'detach');}
model.inited=false;});isPrivate.define(Worker,({tab})=>isPrivate(tab));destroy.define(Worker,function(worker,reason){detach(worker,reason);modelFor(worker).inited=true;
 off(worker);off(worker.port);});function documentUnload({subject,data}){let model=modelFor(this);let innerWinID=subject.QueryInterface(Ci.nsISupportsPRUint64).data;if(innerWinID!=model.windowID)return false;detach(this);return true;}
function pageShow(){let model=modelFor(this);model.contentWorker.emitSync('pageshow');emit(this,'pageshow');model.frozen=false;}
function pageHide(){let model=modelFor(this);model.contentWorker.emitSync('pagehide');emit(this,'pagehide');model.frozen=true;}
function processMessage(worker,...args){let model=modelFor(worker)||{};if(!model.contentWorker)
throw new Error(ERR_DESTROYED);if(model.frozen)
throw new Error(ERR_FROZEN);model.contentWorker.emit.apply(null,args);}
function createModel(){return{ earlyEvents:[],inited:false,frozen:true,contentWorker:null,window:null};}
function createPort(worker){let port=EventTarget();port.emit=emitEventToContent.bind(null,worker);return port;}
function emitEventToContent(worker,...eventArgs){let model=modelFor(worker);let args=['event'].concat(eventArgs);if(!model.inited){model.earlyEvents.push(args);return;}
processMessage.apply(null,[worker].concat(args));}