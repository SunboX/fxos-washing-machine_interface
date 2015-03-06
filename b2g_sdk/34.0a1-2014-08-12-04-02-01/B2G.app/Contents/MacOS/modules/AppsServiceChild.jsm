"use strict";const Cu=Components.utils;const Cc=Components.classes;const Ci=Components.interfaces;
this.EXPORTED_SYMBOLS=["DOMApplicationRegistry","WrappedManifestCache"];Cu.import("resource://gre/modules/AppsUtils.jsm");Cu.import("resource://gre/modules/Services.jsm");function debug(s){}
const APPS_IPC_MSG_NAMES=["Webapps:AddApp","Webapps:RemoveApp","Webapps:UpdateApp","Webapps:CheckForUpdate:Return:KO","Webapps:FireEvent","Webapps:UpdateState"];this.WrappedManifestCache={_cache:{},get:function mcache_get(aManifestURL,aManifest,aWindow,aInnerWindowID){if(!aManifest){return;}
if(!(aManifestURL in this._cache)){this._cache[aManifestURL]={};}
let winObjs=this._cache[aManifestURL];if(!(aInnerWindowID in winObjs)){winObjs[aInnerWindowID]=Cu.cloneInto(aManifest,aWindow);}
return winObjs[aInnerWindowID];},evict:function mcache_evict(aManifestURL,aInnerWindowID){debug("Evicting manifest "+aManifestURL+" window ID "+
aInnerWindowID);if(aManifestURL in this._cache){let winObjs=this._cache[aManifestURL];if(aInnerWindowID in winObjs){delete winObjs[aInnerWindowID];}
if(Object.keys(winObjs).length==0){delete this._cache[aManifestURL];}}},observe:function(aSubject,aTopic,aData){this._cache={};Cu.forceGC();},init:function(){Services.obs.addObserver(this,"memory-pressure",false);}};this.WrappedManifestCache.init();
this.DOMApplicationRegistry={
DOMApps:{},ready:false,webapps:null,init:function init(){this.cpmm=Cc["@mozilla.org/childprocessmessagemanager;1"].getService(Ci.nsISyncMessageSender);APPS_IPC_MSG_NAMES.forEach((function(aMsgName){this.cpmm.addMessageListener(aMsgName,this);}).bind(this));this.cpmm.sendAsyncMessage("Webapps:RegisterForMessages",{messages:APPS_IPC_MSG_NAMES});let list=this.cpmm.sendSyncMessage("Webapps:GetList",{})[0];this.webapps=list.webapps;this.localIdIndex={};for(let id in this.webapps){let app=this.webapps[id];this.localIdIndex[app.localId]=app;app.manifest=list.manifests[id];}
Services.obs.addObserver(this,"xpcom-shutdown",false);},observe:function(aSubject,aTopic,aData){
this.webapps=null;this.DOMApps=null;APPS_IPC_MSG_NAMES.forEach((aMsgName)=>{this.cpmm.removeMessageListener(aMsgName,this);});this.cpmm.sendAsyncMessage("Webapps:UnregisterForMessages",APPS_IPC_MSG_NAMES)},receiveMessage:function receiveMessage(aMessage){debug("Received "+aMessage.name+" message.");let msg=aMessage.data;switch(aMessage.name){case"Webapps:AddApp":this.webapps[msg.id]=msg.app;this.localIdIndex[msg.app.localId]=msg.app;if(msg.manifest){this.webapps[msg.id].manifest=msg.manifest;}
break;case"Webapps:RemoveApp":delete this.DOMApps[this.webapps[msg.id].manifestURL];delete this.localIdIndex[this.webapps[msg.id].localId];delete this.webapps[msg.id];break;case"Webapps:UpdateApp":let app=this.webapps[msg.oldId];if(!app){return;}
if(msg.app){for(let prop in msg.app){app[prop]=msg.app[prop];}}
this.webapps[msg.newId]=app;this.localIdIndex[app.localId]=app;delete this.webapps[msg.oldId];let apps=this.DOMApps[msg.app.manifestURL];if(!apps){return;}
for(let i=0;i<apps.length;i++){let domApp=apps[i].get();if(!domApp||domApp._window===null){apps.splice(i,1);continue;}
domApp._proxy=new Proxy(domApp,{get:function(target,prop){if(!DOMApplicationRegistry.webapps[msg.newId]){return;}
return DOMApplicationRegistry.webapps[msg.newId][prop];},set:function(target,prop,val){if(!DOMApplicationRegistry.webapps[msg.newId]){return;}
DOMApplicationRegistry.webapps[msg.newId][prop]=val;return;},});}
break;case"Webapps:FireEvent":this._fireEvent(aMessage);break;case"Webapps:UpdateState":this._updateState(msg);break;case"Webapps:CheckForUpdate:Return:KO":let DOMApps=this.DOMApps[msg.manifestURL];if(!DOMApps||!msg.requestID){return;}
DOMApps.forEach((DOMApp)=>{let domApp=DOMApp.get();if(domApp&&msg.requestID){domApp._fireRequestResult(aMessage,true);}});break;}},
addDOMApp:function(aApp,aManifestURL,aId){let weakRef=Cu.getWeakReference(aApp);if(!this.DOMApps[aManifestURL]){this.DOMApps[aManifestURL]=[];}
let apps=this.DOMApps[aManifestURL];for(let i=0;i<apps.length;i++){let app=apps[i].get();if(!app||app._window===null){apps.splice(i,1);}}
apps.push(weakRef);

return{get:function(target,prop){if(!DOMApplicationRegistry.webapps[aId]){return;}
return DOMApplicationRegistry.webapps[aId][prop];},set:function(target,prop,val){if(!DOMApplicationRegistry.webapps[aId]){return;}
DOMApplicationRegistry.webapps[aId][prop]=val;return;},};},_fireEvent:function(aMessage){let msg=aMessage.data;debug("_fireEvent "+JSON.stringify(msg));if(!this.DOMApps||!msg.manifestURL||!msg.eventType){return;}
let DOMApps=this.DOMApps[msg.manifestURL];if(!DOMApps){return;}


if(!Array.isArray(msg.eventType)){msg.eventType=[msg.eventType];}
DOMApps.forEach((DOMApp)=>{let domApp=DOMApp.get();if(!domApp){return;}
msg.eventType.forEach((aEventType)=>{if('on'+aEventType in domApp){domApp._fireEvent(aEventType);}});if(msg.requestID){aMessage.data.result=msg.manifestURL;domApp._fireRequestResult(aMessage);}});},_updateState:function(aMessage){if(!this.DOMApps||!aMessage.id){return;}
let app=this.webapps[aMessage.id];if(!app){return;}
if(aMessage.app){for(let prop in aMessage.app){app[prop]=aMessage.app[prop];}}
if("error"in aMessage){app.downloadError=aMessage.error;}
if(aMessage.manifest){app.manifest=aMessage.manifest;let DOMApps=this.DOMApps[app.manifestURL];if(!DOMApps){return;}
DOMApps.forEach((DOMApp)=>{let domApp=DOMApp.get();if(!domApp){return;}
WrappedManifestCache.evict(app.manifestURL,domApp.innerWindowID);});}},getAll:function(aCallback){debug("getAll()\n");if(!aCallback||typeof aCallback!=="function"){return;}
let res=[];for(let id in this.webapps){res.push(this.webapps[id]);}
aCallback(res);},getAppByManifestURL:function getAppByManifestURL(aManifestURL){debug("getAppByManifestURL "+aManifestURL);return AppsUtils.getAppByManifestURL(this.webapps,aManifestURL);},getAppLocalIdByManifestURL:function getAppLocalIdByManifestURL(aManifestURL){debug("getAppLocalIdByManifestURL "+aManifestURL);return AppsUtils.getAppLocalIdByManifestURL(this.webapps,aManifestURL);},getCSPByLocalId:function(aLocalId){debug("getCSPByLocalId:"+aLocalId);return AppsUtils.getCSPByLocalId(this.webapps,aLocalId);},getAppLocalIdByStoreId:function(aStoreId){debug("getAppLocalIdByStoreId:"+aStoreId);return AppsUtils.getAppLocalIdByStoreId(this.webapps,aStoreId);},getAppByLocalId:function getAppByLocalId(aLocalId){debug("getAppByLocalId "+aLocalId+" - ready: "+this.ready);let app=this.localIdIndex[aLocalId];if(!app){debug("Ouch, No app!");return null;}
return new mozIApplication(app);},getManifestURLByLocalId:function getManifestURLByLocalId(aLocalId){debug("getManifestURLByLocalId "+aLocalId);return AppsUtils.getManifestURLByLocalId(this.webapps,aLocalId);},getCoreAppsBasePath:function getCoreAppsBasePath(){debug("getCoreAppsBasePath() not yet supported on child!");return null;},getWebAppsBasePath:function getWebAppsBasePath(){debug("getWebAppsBasePath() not yet supported on child!");return null;},getAppInfo:function getAppInfo(aAppId){return AppsUtils.getAppInfo(this.webapps,aAppId);}}
DOMApplicationRegistry.init();