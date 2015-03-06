"use strict";const{classes:Cc,interfaces:Ci,utils:Cu}=Components;Cu.import("resource://gre/modules/Services.jsm");Cu.import("resource://gre/modules/XPCOMUtils.jsm");Cu.import("resource://gre/modules/MessagePortBase.jsm");Cu.import("resource://gre/modules/Promise.jsm");XPCOMUtils.defineLazyModuleGetter(this,"SocialService","resource://gre/modules/SocialService.jsm");const XUL_NS="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";const HTML_NS="http://www.w3.org/1999/xhtml";this.EXPORTED_SYMBOLS=["getFrameWorkerHandle"];var workerCache={};var _nextPortId=1;
this.getFrameWorkerHandle=function getFrameWorkerHandle(url,clientWindow,name,origin,exposeLocalStorage=false){ if(['http','https'].indexOf(Services.io.newURI(url,null,null).scheme)<0)
throw new Error("getFrameWorkerHandle requires http/https urls");let existingWorker=workerCache[url];if(!existingWorker){
let browserPromise=makeRemoteBrowser();let options={url:url,name:name,origin:origin,exposeLocalStorage:exposeLocalStorage};existingWorker=workerCache[url]=new _Worker(browserPromise,options);}
let portid=_nextPortId++;existingWorker.browserPromise.then(browser=>{browser.messageManager.sendAsyncMessage("frameworker:connect",{portId:portid});}).then(null,(ex)=>{Cu.reportError("Could not send frameworker:connect: "+ex);});let port=new ParentPort(portid,existingWorker.browserPromise,clientWindow);existingWorker.ports.set(portid,port);return new WorkerHandle(port,existingWorker);};
function _Worker(browserPromise,options){this.browserPromise=browserPromise;this.options=options;this.ports=new Map();browserPromise.then(browser=>{browser.addEventListener("oop-browser-crashed",()=>{Cu.reportError("FrameWorker remote process crashed");notifyWorkerError(options.origin);});let mm=browser.messageManager;
mm.loadFrameScript("resource://gre/modules/FrameWorkerContent.js",true);mm.sendAsyncMessage("frameworker:init",this.options);mm.addMessageListener("frameworker:port-message",this);mm.addMessageListener("frameworker:notify-worker-error",this);});}
_Worker.prototype={receiveMessage:function(msg){switch(msg.name){case"frameworker:port-message":let port=this.ports.get(msg.data.portId);port._onmessage(msg.data.data);break;case"frameworker:notify-worker-error":notifyWorkerError(msg.data.origin);break;}}}


function WorkerHandle(port,worker){this.port=port;this._worker=worker;}
WorkerHandle.prototype={

terminate:function terminate(){let url=this._worker.options.url;if(!(url in workerCache)){ return;}
delete workerCache[url];for(let[portid,port]of this._worker.ports){port.close();}
this._worker.ports.clear();this._worker.ports=null;this._worker.browserPromise.then(browser=>{let iframe=browser.ownerDocument.defaultView.frameElement;iframe.parentNode.removeChild(iframe);});this._worker.browserPromise=null;this._worker=null;}};

function ParentPort(portid,browserPromise,clientWindow){this._clientWindow=clientWindow;this._browserPromise=browserPromise;AbstractPort.call(this,portid);}
ParentPort.prototype={__exposedProps__:{onmessage:"rw",postMessage:"r",close:"r",toString:"r"},__proto__:AbstractPort.prototype,_portType:"parent",_dopost:function(data){this._browserPromise.then(browser=>{browser.messageManager.sendAsyncMessage("frameworker:port-message",data);});},_onerror:function(err){Cu.reportError("FrameWorker: Port "+this+" handler failed: "+err+"\n"+err.stack);},_JSONParse:function(data){if(this._clientWindow){return XPCNativeWrapper.unwrap(this._clientWindow).JSON.parse(data);}
return JSON.parse(data);},close:function(){if(this._closed){return;}

this.postMessage({topic:"social.port-closing"});AbstractPort.prototype.close.call(this);this._clientWindow=null;
}}
function makeRemoteBrowser(){let deferred=Promise.defer();let hiddenDoc=Services.appShell.hiddenDOMWindow.document;let iframe=hiddenDoc.createElementNS(HTML_NS,"iframe");iframe.setAttribute("src","chrome://global/content/mozilla.xhtml");iframe.addEventListener("load",function onLoad(){iframe.removeEventListener("load",onLoad,true);let browser=iframe.contentDocument.createElementNS(XUL_NS,"browser");browser.setAttribute("type","content");browser.setAttribute("disableglobalhistory","true");browser.setAttribute("remote","true");iframe.contentDocument.documentElement.appendChild(browser);deferred.resolve(browser);},true);hiddenDoc.documentElement.appendChild(iframe);return deferred.promise;}
function notifyWorkerError(origin){
SocialService.getProvider(origin,function(provider){if(provider)
provider.errorState="frameworker-error";Services.obs.notifyObservers(null,"social:frameworker-error",origin);});}