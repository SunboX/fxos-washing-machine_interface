"use strict";let gDebuggingEnabled=false;function debug(s){if(gDebuggingEnabled)
dump("-*- PushService.jsm: "+s+"\n");}
const Cc=Components.classes;const Ci=Components.interfaces;const Cu=Components.utils;const Cr=Components.results;Cu.import("resource://gre/modules/XPCOMUtils.jsm");Cu.import("resource://gre/modules/Services.jsm");Cu.import("resource://gre/modules/IndexedDBHelper.jsm");Cu.import("resource://gre/modules/Timer.jsm");Cu.import("resource://gre/modules/Preferences.jsm");Cu.import("resource://gre/modules/Promise.jsm");Cu.importGlobalProperties(["indexedDB"]);XPCOMUtils.defineLazyServiceGetter(this,"gDNSService","@mozilla.org/network/dns-service;1","nsIDNSService");XPCOMUtils.defineLazyModuleGetter(this,"AlarmService","resource://gre/modules/AlarmService.jsm");var threadManager=Cc["@mozilla.org/thread-manager;1"].getService(Ci.nsIThreadManager);this.EXPORTED_SYMBOLS=["PushService"];const prefs=new Preferences("services.push.");gDebuggingEnabled=prefs.get("debug");const kPUSHDB_DB_NAME="push";const kPUSHDB_DB_VERSION=1;const kPUSHDB_STORE_NAME="push";const kUDP_WAKEUP_WS_STATUS_CODE=4774;

const kCHILD_PROCESS_MESSAGES=["Push:Register","Push:Unregister","Push:Registrations"];this.PushDB=function PushDB(){debug("PushDB()"); this.initDBHelper(kPUSHDB_DB_NAME,kPUSHDB_DB_VERSION,[kPUSHDB_STORE_NAME]);};this.PushDB.prototype={__proto__:IndexedDBHelper.prototype,upgradeSchema:function(aTransaction,aDb,aOldVersion,aNewVersion){debug("PushDB.upgradeSchema()")
let objectStore=aDb.createObjectStore(kPUSHDB_STORE_NAME,{keyPath:"channelID"}); objectStore.createIndex("pushEndpoint","pushEndpoint",{unique:true});

 objectStore.createIndex("manifestURL","manifestURL",{unique:false});},put:function(aChannelRecord,aSuccessCb,aErrorCb){debug("put()");this.newTxn("readwrite",kPUSHDB_STORE_NAME,function txnCb(aTxn,aStore){debug("Going to put "+aChannelRecord.channelID);aStore.put(aChannelRecord).onsuccess=function setTxnResult(aEvent){debug("Request successful. Updated record ID: "+
aEvent.target.result);};},aSuccessCb,aErrorCb);},delete:function(aChannelID,aSuccessCb,aErrorCb){debug("delete()");this.newTxn("readwrite",kPUSHDB_STORE_NAME,function txnCb(aTxn,aStore){debug("Going to delete "+aChannelID);aStore.delete(aChannelID);},aSuccessCb,aErrorCb);},getByPushEndpoint:function(aPushEndpoint,aSuccessCb,aErrorCb){debug("getByPushEndpoint()");this.newTxn("readonly",kPUSHDB_STORE_NAME,function txnCb(aTxn,aStore){aTxn.result=undefined;let index=aStore.index("pushEndpoint");index.get(aPushEndpoint).onsuccess=function setTxnResult(aEvent){aTxn.result=aEvent.target.result;debug("Fetch successful "+aEvent.target.result);}},aSuccessCb,aErrorCb);},getByChannelID:function(aChannelID,aSuccessCb,aErrorCb){debug("getByChannelID()");this.newTxn("readonly",kPUSHDB_STORE_NAME,function txnCb(aTxn,aStore){aTxn.result=undefined;aStore.get(aChannelID).onsuccess=function setTxnResult(aEvent){aTxn.result=aEvent.target.result;debug("Fetch successful "+aEvent.target.result);}},aSuccessCb,aErrorCb);},getAllByManifestURL:function(aManifestURL,aSuccessCb,aErrorCb){debug("getAllByManifestURL()");if(!aManifestURL){if(typeof aErrorCb=="function"){aErrorCb("PushDB.getAllByManifestURL: Got undefined aManifestURL");}
return;}
let self=this;this.newTxn("readonly",kPUSHDB_STORE_NAME,function txnCb(aTxn,aStore){let index=aStore.index("manifestURL");let range=IDBKeyRange.only(aManifestURL);aTxn.result=[];index.openCursor(range).onsuccess=function(event){let cursor=event.target.result;if(cursor){debug(cursor.value.manifestURL+" "+cursor.value.channelID);aTxn.result.push(cursor.value);cursor.continue();}}},aSuccessCb,aErrorCb);},getAllChannelIDs:function(aSuccessCb,aErrorCb){debug("getAllChannelIDs()");this.newTxn("readonly",kPUSHDB_STORE_NAME,function txnCb(aTxn,aStore){aStore.mozGetAll().onsuccess=function(event){aTxn.result=event.target.result;}},aSuccessCb,aErrorCb);},drop:function(aSuccessCb,aErrorCb){debug("drop()");this.newTxn("readwrite",kPUSHDB_STORE_NAME,function txnCb(aTxn,aStore){aStore.clear();},aSuccessCb(),aErrorCb());}};this.PushWebSocketListener=function(pushService){this._pushService=pushService;}
this.PushWebSocketListener.prototype={onStart:function(context){if(!this._pushService)
return;this._pushService._wsOnStart(context);},onStop:function(context,statusCode){if(!this._pushService)
return;this._pushService._wsOnStop(context,statusCode);},onAcknowledge:function(context,size){},onBinaryMessageAvailable:function(context,message){},onMessageAvailable:function(context,message){if(!this._pushService)
return;this._pushService._wsOnMessageAvailable(context,message);},onServerClose:function(context,aStatusCode,aReason){if(!this._pushService)
return;this._pushService._wsOnServerClose(context,aStatusCode,aReason);}}

const STATE_SHUT_DOWN=0;const STATE_WAITING_FOR_WS_START=1;const STATE_WAITING_FOR_HELLO=2;const STATE_READY=3;this.PushService={observe:function observe(aSubject,aTopic,aData){switch(aTopic){case"xpcom-shutdown":this.uninit();case"network-active-changed":case"network:offline-status-changed":

if(this._udpServer){this._udpServer.close();this._udpServer=null;}
this._shutdownWS();
if(aTopic==="network-active-changed"||aData==="online"){this._startListeningIfChannelsPresent();}
break;case"nsPref:changed":if(aData=="services.push.serverURL"){debug("services.push.serverURL changed! websocket. new value "+
prefs.get("serverURL"));this._shutdownWS();}else if(aData=="services.push.connection.enabled"){if(prefs.get("connection.enabled")){this._startListeningIfChannelsPresent();}else{this._shutdownWS();}}else if(aData=="services.push.debug"){gDebuggingEnabled=prefs.get("debug");}
break;case"timer-callback":if(aSubject==this._requestTimeoutTimer){if(Object.keys(this._pendingRequests).length==0){this._requestTimeoutTimer.cancel();}
let requestTimedOut=false;for(let channelID in this._pendingRequests){let duration=Date.now()-this._pendingRequests[channelID].ctime;
if(requestTimedOut||duration>this._requestTimeout){debug("Request timeout: Removing "+channelID);requestTimedOut=true;this._pendingRequests[channelID].deferred.reject({status:0,error:"TimeoutError"});delete this._pendingRequests[channelID];for(let i=this._requestQueue.length-1;i>=0;--i)
if(this._requestQueue[i].channelID==channelID)
this._requestQueue.splice(i,1);}}

if(requestTimedOut){this._shutdownWS();this._reconnectAfterBackoff();}}
break;case"webapps-clear-data":debug("webapps-clear-data");let data=aSubject.QueryInterface(Ci.mozIApplicationClearPrivateDataParams);if(!data){debug("webapps-clear-data: Failed to get information about application");return;}
if(data.browserOnly){return;}
let appsService=Cc["@mozilla.org/AppsService;1"].getService(Ci.nsIAppsService);let manifestURL=appsService.getManifestURLByLocalId(data.appId);if(!manifestURL){debug("webapps-clear-data: No manifest URL found for "+data.appId);return;}
this._db.getAllByManifestURL(manifestURL,function(records){debug("Got "+records.length);for(let i=0;i<records.length;i++){this._db.delete(records[i].channelID,null,function(){debug("webapps-clear-data: "+manifestURL+" Could not delete entry "+records[i].channelID);});
 if(this._ws){debug("Had a connection, so telling the server");this._send("unregister",{channelID:records[i].channelID});}}}.bind(this),function(){debug("webapps-clear-data: Error in getAllByManifestURL("+manifestURL+")");});break;}},get _UAID(){return prefs.get("userAgentID");},set _UAID(newID){if(typeof(newID)!=="string"){debug("Got invalid, non-string UAID "+newID+". Not updating userAgentID");return;}
debug("New _UAID: "+newID);prefs.set("userAgentID",newID);}, _requestQueue:[],_ws:null,_pendingRequests:{},_currentState:STATE_SHUT_DOWN,_requestTimeout:0,_requestTimeoutTimer:null,_retryFailCount:0,_willBeWokenUpByUDP:false,_adaptiveEnabled:false,_recalculatePing:true,_pingIntervalRetryTimes:{},_lastGoodPingInterval:0,_upperLimit:0,_wsSendMessage:function(msg){if(!this._ws){debug("No WebSocket initialized. Cannot send a message.");return;}
msg=JSON.stringify(msg);debug("Sending message: "+msg);this._ws.sendMsg(msg);},init:function(){debug("init()");if(!prefs.get("enabled"))
return null;this._db=new PushDB();let ppmm=Cc["@mozilla.org/parentprocessmessagemanager;1"].getService(Ci.nsIMessageBroadcaster);kCHILD_PROCESS_MESSAGES.forEach(function addMessage(msgName){ppmm.addMessageListener(msgName,this);}.bind(this));this._alarmID=null;this._requestTimeout=prefs.get("requestTimeout");this._adaptiveEnabled=prefs.get('adaptive.enabled');this._upperLimit=prefs.get('adaptive.upperLimit');this._startListeningIfChannelsPresent();Services.obs.addObserver(this,"xpcom-shutdown",false);Services.obs.addObserver(this,"webapps-clear-data",false);









Services.obs.addObserver(this,this._getNetworkStateChangeEventName(),false);
prefs.observe("serverURL",this);prefs.observe("connection.enabled",this); prefs.observe("debug",this);this._started=true;},_shutdownWS:function(){debug("shutdownWS()");this._currentState=STATE_SHUT_DOWN;this._willBeWokenUpByUDP=false;if(this._wsListener)
this._wsListener._pushService=null;try{this._ws.close(0,null);}catch(e){}
this._ws=null;this._waitingForPong=false;this._stopAlarm();},uninit:function(){if(!this._started)
return;debug("uninit()");prefs.ignore("debug",this);prefs.ignore("connection.enabled",this);prefs.ignore("serverURL",this);Services.obs.removeObserver(this,this._getNetworkStateChangeEventName());Services.obs.removeObserver(this,"webapps-clear-data",false);Services.obs.removeObserver(this,"xpcom-shutdown",false);if(this._db){this._db.close();this._db=null;}
if(this._udpServer){this._udpServer.close();this._udpServer=null;}


this._shutdownWS();

this._stopAlarm();if(this._requestTimeoutTimer){this._requestTimeoutTimer.cancel();}
debug("shutdown complete!");},_reconnectAfterBackoff:function(){debug("reconnectAfterBackoff()"); this._calculateAdaptivePing(true);let retryTimeout=prefs.get("retryBaseInterval")*Math.pow(2,this._retryFailCount);retryTimeout=Math.min(retryTimeout,prefs.get("pingInterval"));this._retryFailCount++;debug("Retry in "+retryTimeout+" Try number "+this._retryFailCount);this._setAlarm(retryTimeout);},_calculateAdaptivePing:function(wsWentDown){debug('_calculateAdaptivePing()');if(!this._adaptiveEnabled){debug('Adaptive ping is disabled');return;}
if(this._retryFailCount>0){debug('Push has failed to connect to the Push Server '+
this._retryFailCount+' times. '+'Do not calculate a new pingInterval now');return;}
if(!this._recalculatePing&&!wsWentDown){debug('We do not need to recalculate the ping now, based on previous data');return;} 
let ns=this._getNetworkInformation();if(ns.ip){ debug('mobile');let oldNetwork=prefs.get('adaptive.mobile');let newNetwork='mobile-'+ns.mcc+'-'+ns.mnc; if(oldNetwork!==newNetwork){ debug('Mobile networks differ. Old network is '+oldNetwork+' and new is '+newNetwork);prefs.set('adaptive.mobile',newNetwork); this._recalculatePing=true;this._pingIntervalRetryTimes={}; let defaultPing=prefs.get('pingInterval.default');prefs.set('pingInterval',defaultPing);this._lastGoodPingInterval=defaultPing;}else{ prefs.set('pingInterval',prefs.get('pingInterval.mobile'));this._lastGoodPingInterval=prefs.get('adaptive.lastGoodPingInterval.mobile');}}else{ debug('wifi');prefs.set('pingInterval',prefs.get('pingInterval.wifi'));this._lastGoodPingInterval=prefs.get('adaptive.lastGoodPingInterval.wifi');}
let nextPingInterval;let lastTriedPingInterval=prefs.get('pingInterval');if(wsWentDown){debug('The WebSocket was disconnected, calculating next ping'); this._pingIntervalRetryTimes[lastTriedPingInterval]=(this._pingIntervalRetryTimes[lastTriedPingInterval]||0)+1;
if(this._pingIntervalRetryTimes[lastTriedPingInterval]<2){debug('pingInterval= '+lastTriedPingInterval+' tried only '+
this._pingIntervalRetryTimes[lastTriedPingInterval]+' times');return;} 
nextPingInterval=Math.floor(lastTriedPingInterval/2);
if(nextPingInterval-this._lastGoodPingInterval<prefs.get('adaptive.gap')){debug('We have reached the gap, we have finished the calculation');debug('nextPingInterval='+nextPingInterval);debug('lastGoodPing='+this._lastGoodPingInterval);nextPingInterval=this._lastGoodPingInterval;this._recalculatePing=false;}else{debug('We need to calculate next time');this._recalculatePing=true;}}else{debug('The WebSocket is still up');this._lastGoodPingInterval=lastTriedPingInterval;nextPingInterval=Math.floor(lastTriedPingInterval*1.5);} 
if(this._upperLimit<nextPingInterval){debug('Next ping will be bigger than the configured upper limit, capping interval');this._recalculatePing=false;this._lastGoodPingInterval=lastTriedPingInterval;nextPingInterval=lastTriedPingInterval;}
debug('Setting the pingInterval to '+nextPingInterval);prefs.set('pingInterval',nextPingInterval); if(ns.ip){prefs.set('pingInterval.mobile',nextPingInterval);prefs.set('adaptive.lastGoodPingInterval.mobile',this._lastGoodPingInterval);}else{prefs.set('pingInterval.wifi',nextPingInterval);prefs.set('adaptive.lastGoodPingInterval.wifi',this._lastGoodPingInterval);}},_beginWSSetup:function(){debug("beginWSSetup()");if(this._currentState!=STATE_SHUT_DOWN){debug("_beginWSSetup: Not in shutdown state! Current state "+
this._currentState);return;}
if(!prefs.get("connection.enabled")){debug("_beginWSSetup: connection.enabled is not set to true. Aborting.");return;}
this._stopAlarm();if(Services.io.offline){debug("Network is offline.");return;}
let serverURL=prefs.get("serverURL");if(!serverURL){debug("No services.push.serverURL found!");return;}
let uri;try{uri=Services.io.newURI(serverURL,null,null);}catch(e){debug("Error creating valid URI from services.push.serverURL ("+
serverURL+")");return;}
if(uri.scheme==="wss"){this._ws=Cc["@mozilla.org/network/protocol;1?name=wss"].createInstance(Ci.nsIWebSocketChannel);}
else if(uri.scheme==="ws"){debug("Push over an insecure connection (ws://) is not allowed!");return;}
else{debug("Unsupported websocket scheme "+uri.scheme);return;}
debug("serverURL: "+uri.spec);this._wsListener=new PushWebSocketListener(this);this._ws.protocol="push-notification";this._ws.asyncOpen(uri,serverURL,this._wsListener,null);this._currentState=STATE_WAITING_FOR_WS_START;},_startListeningIfChannelsPresent:function(){this._db.getAllChannelIDs(function(channelIDs){if(channelIDs.length>0){this._beginWSSetup();}}.bind(this));},_setAlarm:function(delay){
if(this._settingAlarm){
this._queuedAlarmDelay=delay;this._waitingForAlarmSet=true;return;}
this._stopAlarm();this._settingAlarm=true;AlarmService.add({date:new Date(Date.now()+delay),ignoreTimezone:true},this._onAlarmFired.bind(this),function onSuccess(alarmID){this._alarmID=alarmID;debug("Set alarm "+delay+" in the future "+this._alarmID);this._settingAlarm=false;if(this._waitingForAlarmSet){this._waitingForAlarmSet=false;this._setAlarm(this._queuedAlarmDelay);}}.bind(this))},_stopAlarm:function(){if(this._alarmID!==null){debug("Stopped existing alarm "+this._alarmID);AlarmService.remove(this._alarmID);this._alarmID=null;}},_onAlarmFired:function(){if(this._waitingForPong){debug("Did not receive pong in time. Reconnecting WebSocket.");this._shutdownWS();this._reconnectAfterBackoff();}
else if(this._currentState==STATE_READY){

try{this._wsSendMessage({});}catch(e){}
this._waitingForPong=true;this._setAlarm(prefs.get("requestTimeout"));}
else if(this._alarmID!==null){debug("reconnect alarm fired.");



this._beginWSSetup();}},_handleHelloReply:function(reply){debug("handleHelloReply()");if(this._currentState!=STATE_WAITING_FOR_HELLO){debug("Unexpected state "+this._currentState+"(expected STATE_WAITING_FOR_HELLO)");this._shutdownWS();return;}
if(typeof reply.uaid!=="string"){debug("No UAID received or non string UAID received");this._shutdownWS();return;}
if(reply.uaid===""){debug("Empty UAID received!");this._shutdownWS();return;}
if(reply.uaid.length>128){debug("UAID received from server was too long: "+
reply.uaid);this._shutdownWS();return;}
function finishHandshake(){this._UAID=reply.uaid;this._currentState=STATE_READY;this._processNextRequestInQueue();}


if(this._UAID&&this._UAID!=reply.uaid){debug("got new UAID: all re-register");this._notifyAllAppsRegister().then(this._dropRegistrations.bind(this)).then(finishHandshake.bind(this));return;} 
finishHandshake.bind(this)();},_handleRegisterReply:function(reply){debug("handleRegisterReply()");if(typeof reply.channelID!=="string"||typeof this._pendingRequests[reply.channelID]!=="object")
return;let tmp=this._pendingRequests[reply.channelID];delete this._pendingRequests[reply.channelID];if(Object.keys(this._pendingRequests).length==0&&this._requestTimeoutTimer)
this._requestTimeoutTimer.cancel();if(reply.status==200){tmp.deferred.resolve(reply);}else{tmp.deferred.reject(reply);}},_handleNotificationReply:function(reply){debug("handleNotificationReply()");if(typeof reply.updates!=='object'){debug("No 'updates' field in response. Type = "+typeof reply.updates);return;}
debug("Reply updates: "+reply.updates.length);for(let i=0;i<reply.updates.length;i++){let update=reply.updates[i];debug("Update: "+update.channelID+": "+update.version);if(typeof update.channelID!=="string"){debug("Invalid update literal at index "+i);continue;}
if(update.version===undefined){debug("update.version does not exist");continue;}
let version=update.version;if(typeof version==="string"){version=parseInt(version,10);}
if(typeof version==="number"&&version>=0){ this._receivedUpdate(update.channelID,version);this._sendAck(update.channelID,version);}}},_sendAck:function(channelID,version){debug("sendAck()");this._send('ack',{updates:[{channelID:channelID,version:version}]});},_sendRequest:function(action,data){debug("sendRequest() "+action);if(typeof data.channelID!=="string"){debug("Received non-string channelID");return Promise.reject("Received non-string channelID");}
let deferred=Promise.defer();if(Object.keys(this._pendingRequests).length==0){ if(!this._requestTimeoutTimer)
this._requestTimeoutTimer=Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);this._requestTimeoutTimer.init(this,this._requestTimeout,Ci.nsITimer.TYPE_REPEATING_SLACK);}
this._pendingRequests[data.channelID]={deferred:deferred,ctime:Date.now()};this._send(action,data);return deferred.promise;},_send:function(action,data){debug("send()");this._requestQueue.push([action,data]);debug("Queued "+action);this._processNextRequestInQueue();},_processNextRequestInQueue:function(){debug("_processNextRequestInQueue()");if(this._requestQueue.length==0){debug("Request queue empty");return;}
if(this._currentState!=STATE_READY){if(!this._ws){this._beginWSSetup();}
else{}
return;}
let[action,data]=this._requestQueue.shift();data.messageType=action;if(!this._ws){


debug("This should never happen!");this._shutdownWS();}
this._wsSendMessage(data);setTimeout(this._processNextRequestInQueue.bind(this),0);},_receivedUpdate:function(aChannelID,aLatestVersion){debug("Updating: "+aChannelID+" -> "+aLatestVersion);let compareRecordVersionAndNotify=function(aPushRecord){debug("compareRecordVersionAndNotify()");if(!aPushRecord){debug("No record for channel ID "+aChannelID);return;}
if(aPushRecord.version==null||aPushRecord.version<aLatestVersion){debug("Version changed, notifying app and updating DB");aPushRecord.version=aLatestVersion;this._notifyApp(aPushRecord);this._updatePushRecord(aPushRecord).then(null,function(e){debug("Error updating push record");});}
else{debug("No significant version change: "+aLatestVersion);}}
let recoverNoSuchChannelID=function(aChannelIDFromServer){debug("Could not get channelID "+aChannelIDFromServer+" from DB");}
this._db.getByChannelID(aChannelID,compareRecordVersionAndNotify.bind(this),recoverNoSuchChannelID.bind(this));},
_notifyAllAppsRegister:function(){debug("notifyAllAppsRegister()");let deferred=Promise.defer();function wakeupRegisteredApps(records){let wakeupTable={};for(let i=0;i<records.length;i++){let record=records[i];if(!(record.manifestURL in wakeupTable))
wakeupTable[record.manifestURL]=[];wakeupTable[record.manifestURL].push(record.pageURL);}
let messenger=Cc["@mozilla.org/system-message-internal;1"].getService(Ci.nsISystemMessagesInternal);for(let manifestURL in wakeupTable){wakeupTable[manifestURL].forEach(function(pageURL){messenger.sendMessage('push-register',{},Services.io.newURI(pageURL,null,null),Services.io.newURI(manifestURL,null,null));});}
deferred.resolve();}
this._db.getAllChannelIDs(wakeupRegisteredApps,deferred.reject);return deferred.promise;},_notifyApp:function(aPushRecord){if(!aPushRecord||!aPushRecord.pageURL||!aPushRecord.manifestURL){debug("notifyApp() something is undefined.  Dropping notification");return;}
debug("notifyApp() "+aPushRecord.pageURL+"  "+aPushRecord.manifestURL);let pageURI=Services.io.newURI(aPushRecord.pageURL,null,null);let manifestURI=Services.io.newURI(aPushRecord.manifestURL,null,null);let message={pushEndpoint:aPushRecord.pushEndpoint,version:aPushRecord.version};let messenger=Cc["@mozilla.org/system-message-internal;1"].getService(Ci.nsISystemMessagesInternal);messenger.sendMessage('push',message,pageURI,manifestURI);},_updatePushRecord:function(aPushRecord){debug("updatePushRecord()");let deferred=Promise.defer();this._db.put(aPushRecord,deferred.resolve,deferred.reject);return deferred.promise;},_dropRegistrations:function(){let deferred=Promise.defer();this._db.drop(deferred.resolve,deferred.reject);return deferred.promise;},receiveMessage:function(aMessage){debug("receiveMessage(): "+aMessage.name);if(kCHILD_PROCESS_MESSAGES.indexOf(aMessage.name)==-1){debug("Invalid message from child "+aMessage.name);return;}
let mm=aMessage.target.QueryInterface(Ci.nsIMessageSender);let json=aMessage.data;this[aMessage.name.slice("Push:".length).toLowerCase()](json,mm);},register:function(aPageRecord,aMessageManager){debug("register()");let uuidGenerator=Cc["@mozilla.org/uuid-generator;1"].getService(Ci.nsIUUIDGenerator);let channelID=uuidGenerator.generateUUID().toString().slice(1,-1);this._sendRequest("register",{channelID:channelID}).then(this._onRegisterSuccess.bind(this,aPageRecord,channelID),this._onRegisterError.bind(this,aPageRecord,aMessageManager)).then(function(message){aMessageManager.sendAsyncMessage("PushService:Register:OK",message);},function(message){aMessageManager.sendAsyncMessage("PushService:Register:KO",message);});},_onRegisterSuccess:function(aPageRecord,generatedChannelID,data){debug("_onRegisterSuccess()");let deferred=Promise.defer();let message={requestID:aPageRecord.requestID};if(typeof data.channelID!=="string"){debug("Invalid channelID "+message);message["error"]="Invalid channelID received";throw message;}
else if(data.channelID!=generatedChannelID){debug("Server replied with different channelID "+data.channelID+" than what UA generated "+generatedChannelID);message["error"]="Server sent 200 status code but different channelID";throw message;}
try{Services.io.newURI(data.pushEndpoint,null,null);}
catch(e){debug("Invalid pushEndpoint "+data.pushEndpoint);message["error"]="Invalid pushEndpoint "+data.pushEndpoint;throw message;}
let record={channelID:data.channelID,pushEndpoint:data.pushEndpoint,pageURL:aPageRecord.pageURL,manifestURL:aPageRecord.manifestURL,version:null};this._updatePushRecord(record).then(function(){message["pushEndpoint"]=data.pushEndpoint;deferred.resolve(message);},function(error){this._send("unregister",{channelID:record.channelID});message["error"]=error;deferred.reject(message);});return deferred.promise;},_onRegisterError:function(aPageRecord,aMessageManager,reply){debug("_onRegisterError()");if(!reply.error){debug("Called without valid error message!");}
throw{requestID:aPageRecord.requestID,error:reply.error};},unregister:function(aPageRecord,aMessageManager){debug("unregister()");let fail=function(error){debug("unregister() fail() error "+error);let message={requestID:aPageRecord.requestID,error:error};aMessageManager.sendAsyncMessage("PushService:Unregister:KO",message);}
this._db.getByPushEndpoint(aPageRecord.pushEndpoint,function(record){if(record===undefined){fail("NotFoundError");return;}
if(record.manifestURL!==aPageRecord.manifestURL){aMessageManager.sendAsyncMessage("PushService:Unregister:OK",{requestID:aPageRecord.requestID,pushEndpoint:aPageRecord.pushEndpoint});return;}
this._db.delete(record.channelID,function(){
this._send("unregister",{channelID:record.channelID});aMessageManager.sendAsyncMessage("PushService:Unregister:OK",{requestID:aPageRecord.requestID,pushEndpoint:aPageRecord.pushEndpoint});}.bind(this),fail);}.bind(this),fail);},registrations:function(aPageRecord,aMessageManager){debug("registrations()");if(aPageRecord.manifestURL){this._db.getAllByManifestURL(aPageRecord.manifestURL,this._onRegistrationsSuccess.bind(this,aPageRecord,aMessageManager),this._onRegistrationsError.bind(this,aPageRecord,aMessageManager));}
else{this._onRegistrationsError(aPageRecord,aMessageManager);}},_onRegistrationsSuccess:function(aPageRecord,aMessageManager,pushRecords){let registrations=[];pushRecords.forEach(function(pushRecord){registrations.push({__exposedProps__:{pushEndpoint:'r',version:'r'},pushEndpoint:pushRecord.pushEndpoint,version:pushRecord.version});});aMessageManager.sendAsyncMessage("PushService:Registrations:OK",{requestID:aPageRecord.requestID,registrations:registrations});},_onRegistrationsError:function(aPageRecord,aMessageManager){aMessageManager.sendAsyncMessage("PushService:Registrations:KO",{requestID:aPageRecord.requestID,error:"Database error"});}, _wsOnStart:function(context){debug("wsOnStart()");if(this._currentState!=STATE_WAITING_FOR_WS_START){debug("NOT in STATE_WAITING_FOR_WS_START. Current state "+
this._currentState+". Skipping");return;}
this._retryFailCount=0;let data={messageType:"hello",}
if(this._UAID)
data["uaid"]=this._UAID;function sendHelloMessage(ids){data["channelIDs"]=ids.map?ids.map(function(el){return el.channelID;}):[];this._wsSendMessage(data);this._currentState=STATE_WAITING_FOR_HELLO;}
this._getNetworkState((networkState)=>{if(networkState.ip){this._listenForUDPWakeup();data["wakeup_hostport"]={ip:networkState.ip,port:this._udpServer&&this._udpServer.port};data["mobilenetwork"]={mcc:networkState.mcc,mnc:networkState.mnc,netid:networkState.netid};}
this._db.getAllChannelIDs(sendHelloMessage.bind(this),sendHelloMessage.bind(this));});},_wsOnStop:function(context,statusCode){debug("wsOnStop()");if(statusCode!=Cr.NS_OK&&!(statusCode==Cr.NS_BASE_STREAM_CLOSED&&this._willBeWokenUpByUDP)){debug("Socket error "+statusCode);this._reconnectAfterBackoff();}


this._shutdownWS();},_wsOnMessageAvailable:function(context,message){debug("wsOnMessageAvailable() "+message);this._waitingForPong=false;let reply=undefined;try{reply=JSON.parse(message);}catch(e){debug("Parsing JSON failed. text : "+message);return;} 
if(this._currentState!=STATE_WAITING_FOR_HELLO){debug('Reseting _retryFailCount and _pingIntervalRetryTimes');this._retryFailCount=0;this._pingIntervalRetryTimes={};}
let doNotHandle=false;if((message==='{}')||(reply.messageType===undefined)||(reply.messageType==="ping")||(typeof reply.messageType!="string")){debug('Pong received');this._calculateAdaptivePing(false);doNotHandle=true;}

this._setAlarm(prefs.get("pingInterval"));if(doNotHandle){return;}

let handlers=["Hello","Register","Notification"];let handlerName=reply.messageType[0].toUpperCase()+
reply.messageType.slice(1).toLowerCase();if(handlers.indexOf(handlerName)==-1){debug("No whitelisted handler "+handlerName+". messageType: "+
reply.messageType);return;}
let handler="_handle"+handlerName+"Reply";if(typeof this[handler]!=="function"){debug("Handler whitelisted but not implemented! "+handler);return;}
this[handler](reply);},_wsOnServerClose:function(context,aStatusCode,aReason){debug("wsOnServerClose() "+aStatusCode+" "+aReason);if(aStatusCode==kUDP_WAKEUP_WS_STATUS_CODE){debug("Server closed with promise to wake up");this._willBeWokenUpByUDP=true;}},_listenForUDPWakeup:function(){debug("listenForUDPWakeup()");if(this._udpServer){debug("UDP Server already running");return;}
if(!prefs.get("udp.wakeupEnabled")){debug("UDP support disabled");return;}
this._udpServer=Cc["@mozilla.org/network/udp-socket;1"].createInstance(Ci.nsIUDPSocket);this._udpServer.init(-1,false);this._udpServer.asyncListen(this);debug("listenForUDPWakeup listening on "+this._udpServer.port);return this._udpServer.port;},onPacketReceived:function(aServ,aMessage){debug("Recv UDP datagram on port: "+this._udpServer.port);this._beginWSSetup();},onStopListening:function(aServ,aStatus){debug("UDP Server socket was shutdown. Status: "+aStatus);this._udpServer=undefined;this._beginWSSetup();},_getNetworkInformation:function(){debug("getNetworkInformation()");try{if(!prefs.get("udp.wakeupEnabled")){debug("UDP support disabled, we do not send any carrier info");throw new Error("UDP disabled");}
let nm=Cc["@mozilla.org/network/manager;1"].getService(Ci.nsINetworkManager);if(nm.active&&nm.active.type==Ci.nsINetworkInterface.NETWORK_TYPE_MOBILE){let icc=Cc["@mozilla.org/ril/content-helper;1"].getService(Ci.nsIIccProvider);



let clientId=0;let iccInfo=icc.getIccInfo(clientId);if(iccInfo){debug("Running on mobile data");let ips={};let prefixLengths={};nm.active.getAddresses(ips,prefixLengths);return{mcc:iccInfo.mcc,mnc:iccInfo.mnc,ip:ips.value[0]}}}}catch(e){debug("Error recovering mobile network information: "+e);}
debug("Running on wifi");return{mcc:0,mnc:0,ip:undefined};},_getNetworkState:function(callback){debug("getNetworkState()");if(typeof callback!=='function'){throw new Error("No callback method. Aborting push agent !");}
var networkInfo=this._getNetworkInformation();if(networkInfo.ip){this._getMobileNetworkId(networkInfo,function(netid){debug("Recovered netID = "+netid);callback({mcc:networkInfo.mcc,mnc:networkInfo.mnc,ip:networkInfo.ip,netid:netid});});}else{callback(networkInfo);}},_getNetworkStateChangeEventName:function(){try{Cc["@mozilla.org/network/manager;1"].getService(Ci.nsINetworkManager);return"network-active-changed";}catch(e){return"network:offline-status-changed";}},_getMobileNetworkId:function(networkInfo,callback){if(typeof callback!=='function'){return;}
function queryDNSForDomain(domain){debug("[_getMobileNetworkId:queryDNSForDomain] Querying DNS for "+
domain);let netIDDNSListener={onLookupComplete:function(aRequest,aRecord,aStatus){if(aRecord){let netid=aRecord.getNextAddrAsString();debug("[_getMobileNetworkId:queryDNSForDomain] NetID found: "+
netid);callback(netid);}else{debug("[_getMobileNetworkId:queryDNSForDomain] NetID not found");callback(null);}}};gDNSService.asyncResolve(domain,0,netIDDNSListener,threadManager.currentThread);return[];}
debug("[_getMobileNetworkId:queryDNSForDomain] Getting mobile network ID");let netidAddress="wakeup.mnc"+("00"+networkInfo.mnc).slice(-3)+".mcc"+("00"+networkInfo.mcc).slice(-3)+".3gppnetwork.org";queryDNSForDomain(netidAddress,callback);}}