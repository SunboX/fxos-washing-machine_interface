"use strict";let frameworker;(function(){const{classes:Cc,interfaces:Ci,utils:Cu}=Components;Cu.import("resource://gre/modules/Services.jsm");Cu.import("resource://gre/modules/MessagePortBase.jsm");function navigate(url){let webnav=docShell.QueryInterface(Ci.nsIWebNavigation);webnav.loadURI(url,Ci.nsIWebNavigation.LOAD_FLAGS_NONE,null,null,null);}
function FrameWorker(url,name,origin,exposeLocalStorage){this.url=url;this.name=name||url;this.ports=new Map(); this.loaded=false;this.origin=origin;this._injectController=null;this.exposeLocalStorage=exposeLocalStorage;this.load();}
FrameWorker.prototype={load:function FrameWorker_loadWorker(){this._injectController=function(doc,topic,data){if(!doc.defaultView||doc.defaultView!=content){return;}
this._maybeRemoveInjectController();try{this.createSandbox();}catch(e){Cu.reportError("FrameWorker: failed to create sandbox for "+this.url+". "+e);}}.bind(this);Services.obs.addObserver(this._injectController,"document-element-inserted",false);navigate(this.url);},_maybeRemoveInjectController:function(){if(this._injectController){Services.obs.removeObserver(this._injectController,"document-element-inserted");this._injectController=null;}},createSandbox:function createSandbox(){let workerWindow=content;let sandbox=new Cu.Sandbox(workerWindow);

 let workerAPI=['WebSocket','atob','btoa','clearInterval','clearTimeout','dump','setInterval','setTimeout','XMLHttpRequest','FileReader','Blob','EventSource','indexedDB','location','Worker']; if(this.exposeLocalStorage){workerAPI.push('localStorage');}
 
let needsWaive=['XMLHttpRequest','WebSocket','Worker'];let needsBind=['atob','btoa','dump','setInterval','clearInterval','setTimeout','clearTimeout'];workerAPI.forEach(function(fn){try{if(needsWaive.indexOf(fn)!=-1)
sandbox[fn]=XPCNativeWrapper.unwrap(workerWindow)[fn];else if(needsBind.indexOf(fn)!=-1)
sandbox[fn]=workerWindow[fn].bind(workerWindow);else
sandbox[fn]=workerWindow[fn];}
catch(e){Cu.reportError("FrameWorker: failed to import API "+fn+"\n"+e+"\n");}});let navigator={__exposedProps__:{"appName":"r","appVersion":"r","platform":"r","userAgent":"r","onLine":"r"}, appName:workerWindow.navigator.appName,appVersion:workerWindow.navigator.appVersion,platform:workerWindow.navigator.platform,userAgent:workerWindow.navigator.userAgent, get onLine()workerWindow.navigator.onLine};sandbox.navigator=navigator;

sandbox._evalInSandbox=function(s,url){let baseURI=Services.io.newURI(workerWindow.location.href,null,null);Cu.evalInSandbox(s,sandbox,"1.8",Services.io.newURI(url,null,baseURI).spec,1);}; workerWindow.addEventListener('offline',function fw_onoffline(event){Cu.evalInSandbox("onoffline();",sandbox);},false);workerWindow.addEventListener('online',function fw_ononline(event){Cu.evalInSandbox("ononline();",sandbox);},false);sandbox._postMessage=function fw_postMessage(d,o){workerWindow.postMessage(d,o)};sandbox._addEventListener=function fw_addEventListener(t,l,c){workerWindow.addEventListener(t,l,c)};

let worker=this;workerWindow.addEventListener("DOMContentLoaded",function loadListener(){workerWindow.removeEventListener("DOMContentLoaded",loadListener); let scriptText=workerWindow.document.body.textContent.trim();if(!scriptText){Cu.reportError("FrameWorker: Empty worker script received");notifyWorkerError();return;} 
workerWindow.document.body.textContent="";
try{Services.scriptloader.loadSubScript("resource://gre/modules/MessagePortBase.jsm",sandbox);Services.scriptloader.loadSubScript("resource://gre/modules/MessagePortWorker.js",sandbox);}
catch(e){Cu.reportError("FrameWorker: Error injecting port code into content side of the worker: "+e+"\n"+e.stack);notifyWorkerError();return;}
try{initClientMessageHandler();}
catch(e){Cu.reportError("FrameWorker: Error setting up event listener for chrome side of the worker: "+e+"\n"+e.stack);notifyWorkerError();return;} 
try{Cu.evalInSandbox(scriptText,sandbox,"1.8",workerWindow.location.href,1);}catch(e){Cu.reportError("FrameWorker: Error evaluating worker script for "+worker.name+": "+e+"; "+
(e.lineNumber?("Line #"+e.lineNumber):"")+
(e.stack?("\n"+e.stack):""));notifyWorkerError();return;} 
worker.loaded=true;for(let[,port]of worker.ports){ if(!port._entangled){try{port._createWorkerAndEntangle(worker);}
catch(e){Cu.reportError("FrameWorker: Failed to entangle worker port: "+e+"\n"+e.stack);}}}});
workerWindow.addEventListener("unload",function unloadListener(){workerWindow.removeEventListener("unload",unloadListener);worker.loaded=false;

worker.ports.clear();if(sandbox){Cu.nukeSandbox(sandbox);sandbox=null;}});},};const FrameWorkerManager={init:function(){ docShell.allowAuth=false;docShell.allowPlugins=false;docShell.allowImages=false;docShell.allowMedia=false;docShell.allowWindowControl=false;addMessageListener("frameworker:init",this._onInit);addMessageListener("frameworker:connect",this._onConnect);addMessageListener("frameworker:port-message",this._onPortMessage);addMessageListener("frameworker:cookie-get",this._onCookieGet);},_onInit:function(msg){let{url,name,origin,exposeLocalStorage}=msg.data;frameworker=new FrameWorker(url,name,origin,exposeLocalStorage);},_onConnect:function(msg){let port=new ClientPort(msg.data.portId);frameworker.ports.set(msg.data.portId,port);if(frameworker.loaded&&!frameworker.reloading)
port._createWorkerAndEntangle(frameworker);},_onPortMessage:function(msg){
let port=frameworker.ports.get(msg.data.portId);port._dopost(msg.data);},_onCookieGet:function(msg){sendAsyncMessage("frameworker:cookie-get-response",content.document.cookie);},};FrameWorkerManager.init();

function initClientMessageHandler(){function _messageHandler(event){let data=event.data;let portid=data.portId;let port;if(!data.portFromType||data.portFromType!=="worker"){return;}
switch(data.portTopic){case"port-connection-error":
 notifyWorkerError();break;case"port-close":port=frameworker.ports.get(portid);if(!port){

return;}
frameworker.ports.delete(portid);port.close();break;case"port-message":port=frameworker.ports.get(portid);if(!port){return;}
port._onmessage(data.data);break;default:break;}}
function messageHandler(event){try{_messageHandler(event);}catch(ex){Cu.reportError("FrameWorker: Error handling client port control message: "+ex+"\n"+ex.stack);}}
content.addEventListener('message',messageHandler);}
function ClientPort(portid){this._pendingMessagesOutgoing=[];AbstractPort.call(this,portid);}
ClientPort.prototype={__proto__:AbstractPort.prototype,_portType:"client",
_entangled:false,_createWorkerAndEntangle:function fw_ClientPort_createWorkerAndEntangle(worker){this._entangled=true;this._postControlMessage("port-create");for(let message of this._pendingMessagesOutgoing){this._dopost(message);}
this._pendingMessagesOutgoing=[];
 if(this._closed){worker.ports.delete(this._portid);}},_dopost:function fw_ClientPort_dopost(data){if(!this._entangled){this._pendingMessagesOutgoing.push(data);}else{content.postMessage(data,"*");}},
_onmessage:function(data){sendAsyncMessage("frameworker:port-message",{portId:this._portid,data:data});},_onerror:function fw_ClientPort_onerror(err){Cu.reportError("FrameWorker: Port "+this+" handler failed: "+err+"\n"+err.stack);},close:function fw_ClientPort_close(){if(this._closed){return;}

this.postMessage({topic:"social.port-closing"});AbstractPort.prototype.close.call(this);
}}
function notifyWorkerError(){sendAsyncMessage("frameworker:notify-worker-error",{origin:frameworker.origin});}}());