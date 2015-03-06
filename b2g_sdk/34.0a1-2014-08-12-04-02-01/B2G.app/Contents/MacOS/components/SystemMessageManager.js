"use strict";const Cc=Components.classes;const Ci=Components.interfaces;const Cu=Components.utils;const Cr=Components.results;Cu.import("resource://gre/modules/XPCOMUtils.jsm");Cu.import("resource://gre/modules/DOMRequestHelper.jsm");Cu.import("resource://gre/modules/Services.jsm");const kSystemMessageInternalReady="system-message-internal-ready";XPCOMUtils.defineLazyServiceGetter(this,"cpmm","@mozilla.org/childprocessmessagemanager;1","nsISyncMessageSender");function debug(aMsg){}
function SystemMessageManager(){




this._dispatchers={};this._pendings={};this._registerManifestURLReady=false;let appInfo=Cc["@mozilla.org/xre/app-info;1"];this._isParentProcess=!appInfo||appInfo.getService(Ci.nsIXULRuntime).processType==Ci.nsIXULRuntime.PROCESS_TYPE_DEFAULT;if(this._isParentProcess){Services.obs.addObserver(this,kSystemMessageInternalReady,false);}}
SystemMessageManager.prototype={__proto__:DOMRequestIpcHelper.prototype,_dispatchMessage:function(aType,aDispatcher,aMessage){if(aDispatcher.isHandling){


aDispatcher.messages.push(aMessage);return;}
aDispatcher.isHandling=true;


debug("Dispatching "+JSON.stringify(aMessage)+"\n");let contractID="@mozilla.org/dom/system-messages/wrapper/"+aType+";1";let wrapped=false;if(contractID in Cc){debug(contractID+" is registered, creating an instance");let wrapper=Cc[contractID].createInstance(Ci.nsISystemMessagesWrapper);if(wrapper){aMessage=wrapper.wrapMessage(aMessage,this._window);wrapped=true;debug("wrapped = "+aMessage);}}
aDispatcher.handler.handleMessage(wrapped?aMessage:Cu.cloneInto(aMessage,this._window));cpmm.sendAsyncMessage("SystemMessageManager:HandleMessagesDone",{type:aType,manifestURL:this._manifestURL,pageURL:this._pageURL,handledCount:1});aDispatcher.isHandling=false;if(aDispatcher.messages.length>0){this._dispatchMessage(aType,aDispatcher,aDispatcher.messages.shift());}else{

 Services.obs.notifyObservers(null,"handle-system-messages-done",null);}},mozSetMessageHandler:function(aType,aHandler){debug("set message handler for ["+aType+"] "+aHandler);if(this._isInBrowserElement){debug("the app loaded in the browser cannot set message handler");return;}
if(!aType){return;}
let dispatchers=this._dispatchers;if(!aHandler){
delete dispatchers[aType];return;}
dispatchers[aType]={handler:aHandler,messages:[],isHandling:false};cpmm.sendAsyncMessage("SystemMessageManager:GetPendingMessages",{type:aType,pageURL:this._pageURL,manifestURL:this._manifestURL});},mozHasPendingMessage:function(aType){debug("asking pending message for ["+aType+"]");if(this._isInBrowserElement){debug("the app loaded in the browser cannot ask pending message");return false;}
if(aType in this._dispatchers){return false;}
return cpmm.sendSyncMessage("SystemMessageManager:HasPendingMessages",{type:aType,pageURL:this._pageURL,manifestURL:this._manifestURL})[0];},uninit:function(){this._dispatchers=null;this._pendings=null;if(this._isParentProcess){Services.obs.removeObserver(this,kSystemMessageInternalReady);}
if(this._isInBrowserElement){debug("the app loaded in the browser doesn't need to unregister "+"the manifest URL for listening to the system messages");return;}
cpmm.sendAsyncMessage("SystemMessageManager:Unregister",{manifestURL:this._manifestURL,pageURL:this._pageURL,innerWindowID:this.innerWindowID});},




receiveMessage:function(aMessage){let msg=aMessage.data;debug("receiveMessage "+aMessage.name+" for ["+msg.type+"] "+"with manifest URL = "+msg.manifestURL+" and page URL = "+msg.pageURL);

if(msg.manifestURL!==this._manifestURL||msg.pageURL!==this._pageURL){debug("This page shouldn't handle the messages because its "+"manifest URL = "+this._manifestURL+" and page URL = "+this._pageURL);return;}
let messages=(aMessage.name=="SystemMessageManager:Message")?[msg.msg]:msg.msgQueue;let dispatcher=this._dispatchers[msg.type];if(dispatcher){if(aMessage.name=="SystemMessageManager:Message"){

cpmm.sendAsyncMessage("SystemMessageManager:Message:Return:OK",{type:msg.type,manifestURL:this._manifestURL,pageURL:this._pageURL,msgID:msg.msgID});}
messages.forEach(function(aMsg){this._dispatchMessage(msg.type,dispatcher,aMsg);},this);}else{

cpmm.sendAsyncMessage("SystemMessageManager:HandleMessagesDone",{type:msg.type,manifestURL:this._manifestURL,pageURL:this._pageURL,handledCount:messages.length});

 Services.obs.notifyObservers(null,"handle-system-messages-done",null);}},init:function(aWindow){debug("init");this.initDOMRequestHelper(aWindow,["SystemMessageManager:Message","SystemMessageManager:GetPendingMessages:Return"]);let principal=aWindow.document.nodePrincipal;this._isInBrowserElement=principal.isInBrowserElement;this._pageURL=principal.URI.spec;let appsService=Cc["@mozilla.org/AppsService;1"].getService(Ci.nsIAppsService);this._manifestURL=appsService.getManifestURLByLocalId(principal.appId);let readyToRegister=true;if(this._isParentProcess){let ready=cpmm.sendSyncMessage("SystemMessageManager:AskReadyToRegister",null);if(ready.length==0||!ready[0]){readyToRegister=false;}}
if(readyToRegister){this._registerManifestURL();}
debug("done");},observe:function(aSubject,aTopic,aData){if(aTopic===kSystemMessageInternalReady){this._registerManifestURL();}
this.__proto__.__proto__.observe.call(this,aSubject,aTopic,aData);},_registerManifestURL:function(){if(this._isInBrowserElement){debug("the app loaded in the browser doesn't need to register "+"the manifest URL for listening to the system messages");return;}
if(!this._registerManifestURLReady){cpmm.sendAsyncMessage("SystemMessageManager:Register",{manifestURL:this._manifestURL,pageURL:this._pageURL,innerWindowID:this.innerWindowID});this._registerManifestURLReady=true;}},classID:Components.ID("{bc076ea0-609b-4d8f-83d7-5af7cbdc3bb2}"),QueryInterface:XPCOMUtils.generateQI([Ci.nsIDOMNavigatorSystemMessages,Ci.nsIDOMGlobalPropertyInitializer,Ci.nsIObserver,Ci.nsISupportsWeakReference])}
this.NSGetFactory=XPCOMUtils.generateNSGetFactory([SystemMessageManager]);