"use strict";const{classes:Cc,interfaces:Ci,utils:Cu,results:Cr}=Components;this.EXPORTED_SYMBOLS=["InterAppCommService"];Cu.import("resource://gre/modules/Services.jsm");Cu.import("resource://gre/modules/XPCOMUtils.jsm");Cu.import("resource://gre/modules/AppsUtils.jsm");const DEBUG=false;function debug(aMsg){dump("-- InterAppCommService: "+Date.now()+": "+aMsg+"\n");}
XPCOMUtils.defineLazyServiceGetter(this,"appsService","@mozilla.org/AppsService;1","nsIAppsService");XPCOMUtils.defineLazyServiceGetter(this,"ppmm","@mozilla.org/parentprocessmessagemanager;1","nsIMessageBroadcaster");XPCOMUtils.defineLazyServiceGetter(this,"UUIDGenerator","@mozilla.org/uuid-generator;1","nsIUUIDGenerator");XPCOMUtils.defineLazyServiceGetter(this,"messenger","@mozilla.org/system-message-internal;1","nsISystemMessagesInternal");const kMessages=["Webapps:Connect","Webapps:GetConnections","InterAppConnection:Cancel","InterAppMessagePort:PostMessage","InterAppMessagePort:Register","InterAppMessagePort:Unregister","child-process-shutdown"];this.InterAppCommService={init:function(){Services.obs.addObserver(this,"xpcom-shutdown",false);Services.obs.addObserver(this,"webapps-clear-data",false);kMessages.forEach(function(aMsg){ppmm.addMessageListener(aMsg,this);},this);

this._registeredConnections={};


this._allowedConnections={};



this._promptUICallers={};

this._messagePortPairs={};},registerConnection:function(aKeyword,aHandlerPageURI,aManifestURI,aDescription,aRules){let manifestURL=aManifestURI.spec;let pageURL=aHandlerPageURI.spec;if(DEBUG){debug("registerConnection: aKeyword: "+aKeyword+" manifestURL: "+manifestURL+" pageURL: "+pageURL+" aDescription: "+aDescription+" aRules.minimumAccessLevel: "+aRules.minimumAccessLevel+" aRules.manifestURLs: "+aRules.manifestURLs+" aRules.installOrigins: "+aRules.installOrigins);}
let subAppManifestURLs=this._registeredConnections[aKeyword];if(!subAppManifestURLs){subAppManifestURLs=this._registeredConnections[aKeyword]={};}
subAppManifestURLs[manifestURL]={pageURL:pageURL,description:aDescription,rules:aRules,manifestURL:manifestURL};},_matchMinimumAccessLevel:function(aRules,aAppStatus){if(!aRules||!aRules.minimumAccessLevel){if(DEBUG){debug("rules.minimumAccessLevel is not available. No need to match.");}
return true;}
let minAccessLevel=aRules.minimumAccessLevel;switch(minAccessLevel){case"web":if(aAppStatus==Ci.nsIPrincipal.APP_STATUS_INSTALLED||aAppStatus==Ci.nsIPrincipal.APP_STATUS_PRIVILEGED||aAppStatus==Ci.nsIPrincipal.APP_STATUS_CERTIFIED){return true;}
break;case"privileged":if(aAppStatus==Ci.nsIPrincipal.APP_STATUS_PRIVILEGED||aAppStatus==Ci.nsIPrincipal.APP_STATUS_CERTIFIED){return true;}
break;case"certified":if(aAppStatus==Ci.nsIPrincipal.APP_STATUS_CERTIFIED){return true;}
break;}
if(DEBUG){debug("rules.minimumAccessLevel is not matched!"+" minAccessLevel: "+minAccessLevel+" aAppStatus : "+aAppStatus);}
return false;},_matchManifestURLs:function(aRules,aManifestURL){if(!aRules||!Array.isArray(aRules.manifestURLs)){if(DEBUG){debug("rules.manifestURLs is not available. No need to match.");}
return true;}
let manifestURLs=aRules.manifestURLs;if(manifestURLs.indexOf(aManifestURL)!=-1){return true;}
if(DEBUG){debug("rules.manifestURLs is not matched!"+" manifestURLs: "+manifestURLs+" aManifestURL : "+aManifestURL);}
return false;},_matchInstallOrigins:function(aRules,aInstallOrigin){if(!aRules||!Array.isArray(aRules.installOrigins)){if(DEBUG){debug("rules.installOrigins is not available. No need to match.");}
return true;}
let installOrigins=aRules.installOrigins;if(installOrigins.indexOf(aInstallOrigin)!=-1){return true;}
if(DEBUG){debug("rules.installOrigins is not matched!"+" installOrigins: "+installOrigins+" installOrigin : "+aInstallOrigin);}
return false;},_matchRules:function(aPubAppManifestURL,aPubRules,aSubAppManifestURL,aSubRules){let pubApp=appsService.getAppByManifestURL(aPubAppManifestURL);let subApp=appsService.getAppByManifestURL(aSubAppManifestURL);let isPubAppCertified=(pubApp.appStatus==Ci.nsIPrincipal.APP_STATUS_CERTIFIED);let isSubAppCertified=(subApp.appStatus==Ci.nsIPrincipal.APP_STATUS_CERTIFIED);


if(!isPubAppCertified||!isSubAppCertified){if(DEBUG){debug("Only certified apps are allowed to do connections.");}
return false;}
if(!aPubRules&&!aSubRules){if(DEBUG){debug("No rules for publisher and subscriber. No need to match.");}
return true;}
if(!this._matchMinimumAccessLevel(aPubRules,subApp.appStatus)||!this._matchMinimumAccessLevel(aSubRules,pubApp.appStatus)){return false;}
if(!this._matchManifestURLs(aPubRules,aSubAppManifestURL)||!this._matchManifestURLs(aSubRules,aPubAppManifestURL)){return false;}

if((!isSubAppCertified&&!this._matchInstallOrigins(aPubRules,subApp.installOrigin))||(!isPubAppCertified&&!this._matchInstallOrigins(aSubRules,pubApp.installOrigin))){return false;}
if(DEBUG)debug("All rules are matched.");return true;},_dispatchMessagePorts:function(aKeyword,aPubAppManifestURL,aAllowedSubAppManifestURLs,aTarget,aOuterWindowID,aRequestID){if(DEBUG){debug("_dispatchMessagePorts: aKeyword: "+aKeyword+" aPubAppManifestURL: "+aPubAppManifestURL+" aAllowedSubAppManifestURLs: "+aAllowedSubAppManifestURLs);}
if(aAllowedSubAppManifestURLs.length==0){if(DEBUG)debug("No apps are allowed to connect. Returning.");aTarget.sendAsyncMessage("Webapps:Connect:Return:KO",{oid:aOuterWindowID,requestID:aRequestID});return;}
let subAppManifestURLs=this._registeredConnections[aKeyword];if(!subAppManifestURLs){if(DEBUG)debug("No apps are subscribed to connect. Returning.");aTarget.sendAsyncMessage("Webapps:Connect:Return:KO",{oid:aOuterWindowID,requestID:aRequestID});return;}
let messagePortIDs=[];aAllowedSubAppManifestURLs.forEach(function(aAllowedSubAppManifestURL){let subscribedInfo=subAppManifestURLs[aAllowedSubAppManifestURL];if(!subscribedInfo){if(DEBUG){debug("The sunscribed info is not available. Skipping: "+
aAllowedSubAppManifestURL);}
return;}



let messagePortID=UUIDGenerator.generateUUID().toString();this._messagePortPairs[messagePortID]={keyword:aKeyword,publisher:{manifestURL:aPubAppManifestURL},subscriber:{manifestURL:aAllowedSubAppManifestURL}};messenger.sendMessage("connection",{keyword:aKeyword,messagePortID:messagePortID},Services.io.newURI(subscribedInfo.pageURL,null,null),Services.io.newURI(subscribedInfo.manifestURL,null,null));messagePortIDs.push(messagePortID);},this);if(messagePortIDs.length==0){if(DEBUG)debug("No apps are subscribed to connect. Returning.");aTarget.sendAsyncMessage("Webapps:Connect:Return:KO",{oid:aOuterWindowID,requestID:aRequestID});return;}
if(DEBUG)debug("messagePortIDs: "+messagePortIDs);aTarget.sendAsyncMessage("Webapps:Connect:Return:OK",{keyword:aKeyword,messagePortIDs:messagePortIDs,oid:aOuterWindowID,requestID:aRequestID});},_getAllowedSubAppManifestURLs:function(aKeyword,aPubAppManifestURL){let allowedPubAppManifestURLs=this._allowedConnections[aKeyword];if(!allowedPubAppManifestURLs){return[];}
let allowedSubAppManifestURLs=allowedPubAppManifestURLs[aPubAppManifestURL];if(!allowedSubAppManifestURLs){return[];}
return allowedSubAppManifestURLs;},_addSelectedApps:function(aKeyword,aPubAppManifestURL,aSelectedApps){let allowedPubAppManifestURLs=this._allowedConnections[aKeyword];if(!allowedPubAppManifestURLs){allowedPubAppManifestURLs=this._allowedConnections[aKeyword]={};}
let allowedSubAppManifestURLs=allowedPubAppManifestURLs[aPubAppManifestURL];if(!allowedSubAppManifestURLs){allowedSubAppManifestURLs=allowedPubAppManifestURLs[aPubAppManifestURL]=[];}
aSelectedApps.forEach(function(aSelectedApp){let allowedSubAppManifestURL=aSelectedApp.manifestURL;if(allowedSubAppManifestURLs.indexOf(allowedSubAppManifestURL)==-1){allowedSubAppManifestURLs.push(allowedSubAppManifestURL);}});return allowedSubAppManifestURLs;},_connect:function(aMessage,aTarget){let keyword=aMessage.keyword;let pubRules=aMessage.rules;let pubAppManifestURL=aMessage.manifestURL;let outerWindowID=aMessage.outerWindowID;let requestID=aMessage.requestID;let subAppManifestURLs=this._registeredConnections[keyword];if(!subAppManifestURLs){if(DEBUG){debug("No apps are subscribed for this connection. Returning.");}
this._dispatchMessagePorts(keyword,pubAppManifestURL,[],aTarget,outerWindowID,requestID);return;}


let allowedSubAppManifestURLs=this._getAllowedSubAppManifestURLs(keyword,pubAppManifestURL);let appsToSelect=[];for(let subAppManifestURL in subAppManifestURLs){if(allowedSubAppManifestURLs.indexOf(subAppManifestURL)!=-1){if(DEBUG){debug("Don't need to select again. Skipping: "+subAppManifestURL);}
continue;}
let subscribedInfo=subAppManifestURLs[subAppManifestURL];let subRules=subscribedInfo.rules;let matched=this._matchRules(pubAppManifestURL,pubRules,subAppManifestURL,subRules);if(!matched){if(DEBUG){debug("Rules are not matched. Skipping: "+subAppManifestURL);}
continue;}
appsToSelect.push({manifestURL:subAppManifestURL,description:subscribedInfo.description});}
if(appsToSelect.length==0){if(DEBUG){debug("No additional apps need to be selected for this connection. "+"Just dispatch message ports for the existing connections.");}
this._dispatchMessagePorts(keyword,pubAppManifestURL,allowedSubAppManifestURLs,aTarget,outerWindowID,requestID);return;}

let callerID=UUIDGenerator.generateUUID().toString();this._promptUICallers[callerID]={outerWindowID:outerWindowID,requestID:requestID,target:aTarget};let glue=Cc["@mozilla.org/dom/apps/inter-app-comm-ui-glue;1"].createInstance(Ci.nsIInterAppCommUIGlue);if(glue){glue.selectApps(callerID,pubAppManifestURL,keyword,appsToSelect).then(function(aData){this._handleSelectedApps(aData);}.bind(this),function(aError){if(DEBUG){debug("Error occurred in the UI glue component. "+aError)}
this._handleSelectedApps({callerID:callerID,keyword:keyword,manifestURL:pubAppManifestURL,selectedApps:[]});}.bind(this));}else{if(DEBUG){debug("Error! The UI glue component is not implemented.")}
this._handleSelectedApps({callerID:callerID,keyword:keyword,manifestURL:pubAppManifestURL,selectedApps:[]});}},_getConnections:function(aMessage,aTarget){let outerWindowID=aMessage.outerWindowID;let requestID=aMessage.requestID;let connections=[];for(let keyword in this._allowedConnections){let allowedPubAppManifestURLs=this._allowedConnections[keyword];for(let allowedPubAppManifestURL in allowedPubAppManifestURLs){let allowedSubAppManifestURLs=allowedPubAppManifestURLs[allowedPubAppManifestURL];allowedSubAppManifestURLs.forEach(function(allowedSubAppManifestURL){connections.push({keyword:keyword,pubAppManifestURL:allowedPubAppManifestURL,subAppManifestURL:allowedSubAppManifestURL});});}}
aTarget.sendAsyncMessage("Webapps:GetConnections:Return:OK",{connections:connections,oid:outerWindowID,requestID:requestID});},_cancelConnection:function(aMessage){let keyword=aMessage.keyword;let pubAppManifestURL=aMessage.pubAppManifestURL;let subAppManifestURL=aMessage.subAppManifestURL;let allowedPubAppManifestURLs=this._allowedConnections[keyword];if(!allowedPubAppManifestURLs){if(DEBUG)debug("keyword is not found: "+keyword);return;}
let allowedSubAppManifestURLs=allowedPubAppManifestURLs[pubAppManifestURL];if(!allowedSubAppManifestURLs){if(DEBUG)debug("publisher is not found: "+pubAppManifestURL);return;}
let index=allowedSubAppManifestURLs.indexOf(subAppManifestURL);if(index==-1){if(DEBUG)debug("subscriber is not found: "+subAppManifestURL);return;}
if(DEBUG)debug("Cancelling the connection.");allowedSubAppManifestURLs.splice(index,1);if(allowedSubAppManifestURLs.length==0){delete allowedPubAppManifestURLs[pubAppManifestURL];if(Object.keys(allowedPubAppManifestURLs).length==0){delete this._allowedConnections[keyword];}}
if(DEBUG)debug("Unregistering message ports based on this connection.");let messagePortIDs=[];for(let messagePortID in this._messagePortPairs){let pair=this._messagePortPairs[messagePortID];if(pair.keyword==keyword&&pair.publisher.manifestURL==pubAppManifestURL&&pair.subscriber.manifestURL==subAppManifestURL){messagePortIDs.push(messagePortID);}}
messagePortIDs.forEach(function(aMessagePortID){delete this._messagePortPairs[aMessagePortID];},this);},_identifyMessagePort:function(aMessagePortID,aManifestURL){let pair=this._messagePortPairs[aMessagePortID];if(!pair){if(DEBUG){debug("Error! The message port ID is invalid: "+aMessagePortID+", which should have been generated by parent.");}
return null;}
if(pair.publisher.manifestURL==aManifestURL){return{pair:pair,isPublisher:true};}
if(pair.subscriber.manifestURL==aManifestURL){return{pair:pair,isPublisher:false};}
if(DEBUG){debug("Error! The manifest URL is invalid: "+aManifestURL+", which might be a hacked app.");}
return null;},_registerMessagePort:function(aMessage,aTarget){let messagePortID=aMessage.messagePortID;let manifestURL=aMessage.manifestURL;let pageURL=aMessage.pageURL;let identity=this._identifyMessagePort(messagePortID,manifestURL);if(!identity){if(DEBUG){debug("Cannot identify the message port. Failed to register.");}
return;}
if(DEBUG)debug("Registering message port for "+manifestURL);let pair=identity.pair;let isPublisher=identity.isPublisher;let sender=isPublisher?pair.publisher:pair.subscriber;sender.target=aTarget;sender.pageURL=pageURL;sender.messageQueue=[];if(DEBUG){debug("Checking if the other port used to send messages but queued.");}
let receiver=isPublisher?pair.subscriber:pair.publisher;if(receiver.messageQueue){while(receiver.messageQueue.length){let message=receiver.messageQueue.shift();if(DEBUG)debug("Delivering message: "+JSON.stringify(message));sender.target.sendAsyncMessage("InterAppMessagePort:OnMessage",{message:message,manifestURL:sender.manifestURL,pageURL:sender.pageURL,messagePortID:messagePortID});}}},_unregisterMessagePort:function(aMessage){let messagePortID=aMessage.messagePortID;let manifestURL=aMessage.manifestURL;let identity=this._identifyMessagePort(messagePortID,manifestURL);if(!identity){if(DEBUG){debug("Cannot identify the message port. Failed to unregister.");}
return;}
if(DEBUG){debug("Unregistering message port for "+manifestURL);}
delete this._messagePortPairs[messagePortID];},_removeTarget:function(aTarget){if(!aTarget){if(DEBUG)debug("Error! aTarget cannot be null/undefined in any way.");return}
if(DEBUG)debug("Unregistering message ports based on this target.");let messagePortIDs=[];for(let messagePortID in this._messagePortPairs){let pair=this._messagePortPairs[messagePortID];if(pair.publisher.target===aTarget||pair.subscriber.target===aTarget){messagePortIDs.push(messagePortID);}}
messagePortIDs.forEach(function(aMessagePortID){delete this._messagePortPairs[aMessagePortID];},this);},_postMessage:function(aMessage){let messagePortID=aMessage.messagePortID;let manifestURL=aMessage.manifestURL;let message=aMessage.message;let identity=this._identifyMessagePort(messagePortID,manifestURL);if(!identity){if(DEBUG)debug("Cannot identify the message port. Failed to post.");return;}
let pair=identity.pair;let isPublisher=identity.isPublisher;let receiver=isPublisher?pair.subscriber:pair.publisher;if(!receiver.target){if(DEBUG){debug("The receiver's target is not ready yet. Queuing the message.");}
let sender=isPublisher?pair.publisher:pair.subscriber;sender.messageQueue.push(message);return;}
if(DEBUG)debug("Delivering message: "+JSON.stringify(message));receiver.target.sendAsyncMessage("InterAppMessagePort:OnMessage",{manifestURL:receiver.manifestURL,pageURL:receiver.pageURL,messagePortID:messagePortID,message:message});},_handleSelectedApps:function(aData){let callerID=aData.callerID;let caller=this._promptUICallers[callerID];if(!caller){if(DEBUG)debug("Error! Cannot find the caller.");return;}
delete this._promptUICallers[callerID];let outerWindowID=caller.outerWindowID;let requestID=caller.requestID;let target=caller.target;let pubAppManifestURL=aData.manifestURL;let keyword=aData.keyword;let selectedApps=aData.selectedApps;let allowedSubAppManifestURLs;if(selectedApps.length==0){
if(DEBUG)debug("No new apps are selected to connect.")
allowedSubAppManifestURLs=this._getAllowedSubAppManifestURLs(keyword,pubAppManifestURL);}else{
if(DEBUG)debug("Some new apps are selected to connect.")
allowedSubAppManifestURLs=this._addSelectedApps(keyword,pubAppManifestURL,selectedApps);}
this._dispatchMessagePorts(keyword,pubAppManifestURL,allowedSubAppManifestURLs,target,outerWindowID,requestID);},receiveMessage:function(aMessage){if(DEBUG)debug("receiveMessage: name: "+aMessage.name);let message=aMessage.json;let target=aMessage.target;
if(aMessage.name!=="child-process-shutdown"&&aMessage.name!=="InterAppMessagePort:Unregister"&&kMessages.indexOf(aMessage.name)!=-1){if(!target.assertContainApp(message.manifestURL)){if(DEBUG){debug("Got message from a process carrying illegal manifest URL.");}
return null;}}
switch(aMessage.name){case"Webapps:Connect":this._connect(message,target);break;case"Webapps:GetConnections":this._getConnections(message,target);break;case"InterAppConnection:Cancel":this._cancelConnection(message);break;case"InterAppMessagePort:PostMessage":this._postMessage(message);break;case"InterAppMessagePort:Register":this._registerMessagePort(message,target);break;case"InterAppMessagePort:Unregister":this._unregisterMessagePort(message);break;case"child-process-shutdown":this._removeTarget(target);break;}},observe:function(aSubject,aTopic,aData){switch(aTopic){case"xpcom-shutdown":Services.obs.removeObserver(this,"xpcom-shutdown");Services.obs.removeObserver(this,"webapps-clear-data");kMessages.forEach(function(aMsg){ppmm.removeMessageListener(aMsg,this);},this);ppmm=null;break;case"webapps-clear-data":let params=aSubject.QueryInterface(Ci.mozIApplicationClearPrivateDataParams);if(!params){if(DEBUG){debug("Error updating registered/allowed connections for an "+"uninstalled app.");}
return;}
if(params.browserOnly){if(DEBUG){debug("Only update registered/allowed connections for apps.");}
return;}
let manifestURL=appsService.getManifestURLByLocalId(params.appId);if(!manifestURL){if(DEBUG){debug("Error updating registered/allowed connections for an "+"uninstalled app.");}
return;}
for(let keyword in this._registeredConnections){let subAppManifestURLs=this._registeredConnections[keyword];if(subAppManifestURLs[manifestURL]){delete subAppManifestURLs[manifestURL];if(DEBUG){debug("Remove "+manifestURL+" from registered connections "+"due to app uninstallation.");}}}
for(let keyword in this._allowedConnections){let allowedPubAppManifestURLs=this._allowedConnections[keyword];if(allowedPubAppManifestURLs[manifestURL]){delete allowedPubAppManifestURLs[manifestURL];if(DEBUG){debug("Remove "+manifestURL+" (as a pub app) from allowed "+"connections due to app uninstallation.");}}
for(let pubAppManifestURL in allowedPubAppManifestURLs){let subAppManifestURLs=allowedPubAppManifestURLs[pubAppManifestURL];for(let i=subAppManifestURLs.length-1;i>=0;i--){if(subAppManifestURLs[i]===manifestURL){subAppManifestURLs.splice(i,1);if(DEBUG){debug("Remove "+manifestURL+" (as a sub app to pub "+
pubAppManifestURL+") from allowed connections "+"due to app uninstallation.");}}}}}
debug("Finish updating registered/allowed connections for an "+"uninstalled app.");break;}}};InterAppCommService.init();