"use strict";const{Cc,Ci,Cu}=require("chrome");Cu.import("resource://gre/modules/XPCOMUtils.jsm");loader.lazyGetter(this,"NetworkHelper",()=>require("devtools/toolkit/webconsole/network-helper"));loader.lazyImporter(this,"Services","resource://gre/modules/Services.jsm");loader.lazyImporter(this,"DevToolsUtils","resource://gre/modules/devtools/DevToolsUtils.jsm");loader.lazyImporter(this,"NetUtil","resource://gre/modules/NetUtil.jsm");loader.lazyImporter(this,"PrivateBrowsingUtils","resource://gre/modules/PrivateBrowsingUtils.jsm");loader.lazyServiceGetter(this,"gActivityDistributor","@mozilla.org/network/http-activity-distributor;1","nsIHttpActivityDistributor");
const PR_UINT32_MAX=4294967295;const HTTP_MOVED_PERMANENTLY=301;const HTTP_FOUND=302;const HTTP_SEE_OTHER=303;const HTTP_TEMPORARY_REDIRECT=307;const RESPONSE_BODY_LIMIT=1048576;function NetworkResponseListener(aOwner,aHttpActivity)
{this.owner=aOwner;this.receivedData="";this.httpActivity=aHttpActivity;this.bodySize=0;}
exports.NetworkResponseListener=NetworkResponseListener;NetworkResponseListener.prototype={QueryInterface:XPCOMUtils.generateQI([Ci.nsIStreamListener,Ci.nsIInputStreamCallback,Ci.nsIRequestObserver,Ci.nsISupports]),_foundOpenResponse:false,owner:null,sink:null,httpActivity:null,receivedData:null,bodySize:null,request:null,setAsyncListener:function NRL_setAsyncListener(aStream,aListener)
{aStream.asyncWait(aListener,0,0,Services.tm.mainThread);},onDataAvailable:function NRL_onDataAvailable(aRequest,aContext,aInputStream,aOffset,aCount)
{this._findOpenResponse();let data=NetUtil.readInputStreamToString(aInputStream,aCount);this.bodySize+=aCount;if(!this.httpActivity.discardResponseBody&&this.receivedData.length<RESPONSE_BODY_LIMIT){this.receivedData+=NetworkHelper.convertToUnicode(data,aRequest.contentCharset);}},onStartRequest:function NRL_onStartRequest(aRequest)
{this.request=aRequest;this._findOpenResponse();this.setAsyncListener(this.sink.inputStream,this);},onStopRequest:function NRL_onStopRequest()
{this._findOpenResponse();this.sink.outputStream.close();},_findOpenResponse:function NRL__findOpenResponse()
{if(!this.owner||this._foundOpenResponse){return;}
let openResponse=null;for each(let item in this.owner.openResponses){if(item.channel===this.httpActivity.channel){openResponse=item;break;}}
if(!openResponse){return;}
this._foundOpenResponse=true;delete this.owner.openResponses[openResponse.id];this.httpActivity.owner.addResponseHeaders(openResponse.headers);this.httpActivity.owner.addResponseCookies(openResponse.cookies);},onStreamClose:function NRL_onStreamClose()
{if(!this.httpActivity){return;}
this.setAsyncListener(this.sink.inputStream,null);this._findOpenResponse();if(!this.httpActivity.discardResponseBody&&this.receivedData.length){this._onComplete(this.receivedData);}
else if(!this.httpActivity.discardResponseBody&&this.httpActivity.responseStatus==304){let charset=this.request.contentCharset||this.httpActivity.charset;NetworkHelper.loadFromCache(this.httpActivity.url,charset,this._onComplete.bind(this));}
else{this._onComplete();}},_onComplete:function NRL__onComplete(aData)
{let response={mimeType:"",text:aData||"",};response.size=response.text.length;try{response.mimeType=this.request.contentType;}
catch(ex){}
if(!response.mimeType||!NetworkHelper.isTextMimeType(response.mimeType)){response.encoding="base64";response.text=btoa(response.text);}
if(response.mimeType&&this.request.contentCharset){response.mimeType+="; charset="+this.request.contentCharset;}
this.receivedData="";this.httpActivity.owner.addResponseContent(response,this.httpActivity.discardResponseBody);this.httpActivity.channel=null;this.httpActivity.owner=null;this.httpActivity=null;this.sink=null;this.inputStream=null;this.request=null;this.owner=null;},onInputStreamReady:function NRL_onInputStreamReady(aStream)
{if(!(aStream instanceof Ci.nsIAsyncInputStream)||!this.httpActivity){return;}
let available=-1;try{available=aStream.available();}
catch(ex){}
if(available!=-1){if(available!=0){

this.onDataAvailable(this.request,null,aStream,0,available);}
this.setAsyncListener(aStream,this);}
else{this.onStreamClose();}},};function NetworkMonitor(aFilters,aOwner)
{if(aFilters){this.window=aFilters.window;this.appId=aFilters.appId;this.topFrame=aFilters.topFrame;}
if(!this.window&&!this.appId&&!this.topFrame){this._logEverything=true;}
this.owner=aOwner;this.openRequests={};this.openResponses={};this._httpResponseExaminer=DevToolsUtils.makeInfallible(this._httpResponseExaminer).bind(this);}
exports.NetworkMonitor=NetworkMonitor;NetworkMonitor.prototype={_logEverything:false,window:null,appId:null,topFrame:null,httpTransactionCodes:{0x5001:"REQUEST_HEADER",0x5002:"REQUEST_BODY_SENT",0x5003:"RESPONSE_START",0x5004:"RESPONSE_HEADER",0x5005:"RESPONSE_COMPLETE",0x5006:"TRANSACTION_CLOSE",0x804b0003:"STATUS_RESOLVING",0x804b000b:"STATUS_RESOLVED",0x804b0007:"STATUS_CONNECTING_TO",0x804b0004:"STATUS_CONNECTED_TO",0x804b0005:"STATUS_SENDING_TO",0x804b000a:"STATUS_WAITING_FOR",0x804b0006:"STATUS_RECEIVING_FROM"},
responsePipeSegmentSize:null,owner:null,saveRequestAndResponseBodies:false,openRequests:null,openResponses:null,init:function NM_init()
{this.responsePipeSegmentSize=Services.prefs.getIntPref("network.buffer.cache.size");gActivityDistributor.addObserver(this);if(Services.appinfo.processType!=Ci.nsIXULRuntime.PROCESS_TYPE_CONTENT){Services.obs.addObserver(this._httpResponseExaminer,"http-on-examine-response",false);}},_httpResponseExaminer:function NM__httpResponseExaminer(aSubject,aTopic)
{


if(!this.owner||aTopic!="http-on-examine-response"||!(aSubject instanceof Ci.nsIHttpChannel)){return;}
let channel=aSubject.QueryInterface(Ci.nsIHttpChannel);if(!this._matchRequest(channel)){return;}
let response={id:gSequenceId(),channel:channel,headers:[],cookies:[],};let setCookieHeader=null;channel.visitResponseHeaders({visitHeader:function NM__visitHeader(aName,aValue){let lowerName=aName.toLowerCase();if(lowerName=="set-cookie"){setCookieHeader=aValue;}
response.headers.push({name:aName,value:aValue});}});if(!response.headers.length){return;}
if(setCookieHeader){response.cookies=NetworkHelper.parseSetCookieHeader(setCookieHeader);}
let httpVersionMaj={};let httpVersionMin={};channel.QueryInterface(Ci.nsIHttpChannelInternal);channel.getResponseVersion(httpVersionMaj,httpVersionMin);response.status=channel.responseStatus;response.statusText=channel.responseStatusText;response.httpVersion="HTTP/"+httpVersionMaj.value+"."+
httpVersionMin.value;this.openResponses[response.id]=response;},observeActivity:DevToolsUtils.makeInfallible(function NM_observeActivity(aChannel,aActivityType,aActivitySubtype,aTimestamp,aExtraSizeData,aExtraStringData)
{if(!this.owner||aActivityType!=gActivityDistributor.ACTIVITY_TYPE_HTTP_TRANSACTION&&aActivityType!=gActivityDistributor.ACTIVITY_TYPE_SOCKET_TRANSPORT){return;}
if(!(aChannel instanceof Ci.nsIHttpChannel)){return;}
aChannel=aChannel.QueryInterface(Ci.nsIHttpChannel);if(aActivitySubtype==gActivityDistributor.ACTIVITY_SUBTYPE_REQUEST_HEADER){this._onRequestHeader(aChannel,aTimestamp,aExtraStringData);return;}

let httpActivity=null;for each(let item in this.openRequests){if(item.channel===aChannel){httpActivity=item;break;}}
if(!httpActivity){return;}
let transCodes=this.httpTransactionCodes;if(aActivitySubtype in transCodes){let stage=transCodes[aActivitySubtype];if(stage in httpActivity.timings){httpActivity.timings[stage].last=aTimestamp;}
else{httpActivity.timings[stage]={first:aTimestamp,last:aTimestamp,};}}
switch(aActivitySubtype){case gActivityDistributor.ACTIVITY_SUBTYPE_REQUEST_BODY_SENT:this._onRequestBodySent(httpActivity);break;case gActivityDistributor.ACTIVITY_SUBTYPE_RESPONSE_HEADER:this._onResponseHeader(httpActivity,aExtraStringData);break;case gActivityDistributor.ACTIVITY_SUBTYPE_TRANSACTION_CLOSE:this._onTransactionClose(httpActivity);break;default:break;}}),_matchRequest:function NM__matchRequest(aChannel)
{if(this._logEverything){return true;}
if(this.window){let win=NetworkHelper.getWindowForRequest(aChannel);if(win&&win.top===this.window){return true;}}
if(this.topFrame){let topFrame=NetworkHelper.getTopFrameForRequest(aChannel);if(topFrame&&topFrame===this.topFrame){return true;}}
if(this.appId){let appId=NetworkHelper.getAppIdForRequest(aChannel);if(appId&&appId==this.appId){return true;}}
return false;},_onRequestHeader:function NM__onRequestHeader(aChannel,aTimestamp,aExtraStringData)
{if(!this._matchRequest(aChannel)){return;}
let win=NetworkHelper.getWindowForRequest(aChannel);let httpActivity=this.createActivityObject(aChannel);httpActivity.charset=win?win.document.characterSet:null;httpActivity.private=win?PrivateBrowsingUtils.isWindowPrivate(win):false;httpActivity.timings.REQUEST_HEADER={first:aTimestamp,last:aTimestamp};let httpVersionMaj={};let httpVersionMin={};let event={};event.startedDateTime=new Date(Math.round(aTimestamp/1000)).toISOString();event.headersSize=aExtraStringData.length;event.method=aChannel.requestMethod;event.url=aChannel.URI.spec;event.private=httpActivity.private;try{let callbacks=aChannel.notificationCallbacks;let xhrRequest=callbacks?callbacks.getInterface(Ci.nsIXMLHttpRequest):null;httpActivity.isXHR=event.isXHR=!!xhrRequest;}catch(e){httpActivity.isXHR=event.isXHR=false;}
aChannel.QueryInterface(Ci.nsIHttpChannelInternal);aChannel.getRequestVersion(httpVersionMaj,httpVersionMin);event.httpVersion="HTTP/"+httpVersionMaj.value+"."+
httpVersionMin.value;event.discardRequestBody=!this.saveRequestAndResponseBodies;event.discardResponseBody=!this.saveRequestAndResponseBodies;let headers=[];let cookies=[];let cookieHeader=null;aChannel.visitRequestHeaders({visitHeader:function NM__visitHeader(aName,aValue)
{if(aName=="Cookie"){cookieHeader=aValue;}
headers.push({name:aName,value:aValue});}});if(cookieHeader){cookies=NetworkHelper.parseCookieHeader(cookieHeader);}
httpActivity.owner=this.owner.onNetworkEvent(event,aChannel,this);this._setupResponseListener(httpActivity);this.openRequests[httpActivity.id]=httpActivity;httpActivity.owner.addRequestHeaders(headers);httpActivity.owner.addRequestCookies(cookies);},createActivityObject:function NM_createActivityObject(aChannel)
{return{id:gSequenceId(),channel:aChannel,charset:null,url:aChannel.URI.spec,discardRequestBody:!this.saveRequestAndResponseBodies,discardResponseBody:!this.saveRequestAndResponseBodies,timings:{},responseStatus:null,owner:null,};},_setupResponseListener:function NM__setupResponseListener(aHttpActivity)
{let channel=aHttpActivity.channel;channel.QueryInterface(Ci.nsITraceableChannel);
let sink=Cc["@mozilla.org/pipe;1"].createInstance(Ci.nsIPipe);
sink.init(false,false,this.responsePipeSegmentSize,PR_UINT32_MAX,null);let newListener=new NetworkResponseListener(this,aHttpActivity);newListener.inputStream=sink.inputStream;newListener.sink=sink;let tee=Cc["@mozilla.org/network/stream-listener-tee;1"].createInstance(Ci.nsIStreamListenerTee);let originalListener=channel.setNewListener(tee);tee.init(originalListener,sink.outputStream,newListener);},_onRequestBodySent:function NM__onRequestBodySent(aHttpActivity)
{if(aHttpActivity.discardRequestBody){return;}
let sentBody=NetworkHelper.readPostTextFromRequest(aHttpActivity.channel,aHttpActivity.charset);if(!sentBody&&this.window&&aHttpActivity.url==this.window.location.href){




let webNav=this.window.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation);sentBody=NetworkHelper.readPostTextFromPageViaWebNav(webNav,aHttpActivity.charset);}
if(sentBody){aHttpActivity.owner.addRequestPostData({text:sentBody});}},_onResponseHeader:function NM__onResponseHeader(aHttpActivity,aExtraStringData)
{




let headers=aExtraStringData.split(/\r\n|\n|\r/);let statusLine=headers.shift();let statusLineArray=statusLine.split(" ");let response={};response.httpVersion=statusLineArray.shift();response.status=statusLineArray.shift();response.statusText=statusLineArray.join(" ");response.headersSize=aExtraStringData.length;aHttpActivity.responseStatus=response.status;switch(parseInt(response.status)){case HTTP_MOVED_PERMANENTLY:case HTTP_FOUND:case HTTP_SEE_OTHER:case HTTP_TEMPORARY_REDIRECT:aHttpActivity.discardResponseBody=true;break;}
response.discardResponseBody=aHttpActivity.discardResponseBody;aHttpActivity.owner.addResponseStart(response);},_onTransactionClose:function NM__onTransactionClose(aHttpActivity)
{let result=this._setupHarTimings(aHttpActivity);aHttpActivity.owner.addEventTimings(result.total,result.timings);delete this.openRequests[aHttpActivity.id];},_setupHarTimings:function NM__setupHarTimings(aHttpActivity)
{let timings=aHttpActivity.timings;let harTimings={};harTimings.blocked=-1;
harTimings.dns=timings.STATUS_RESOLVING&&timings.STATUS_RESOLVED?timings.STATUS_RESOLVED.last-
timings.STATUS_RESOLVING.first:-1;if(timings.STATUS_CONNECTING_TO&&timings.STATUS_CONNECTED_TO){harTimings.connect=timings.STATUS_CONNECTED_TO.last-
timings.STATUS_CONNECTING_TO.first;}
else if(timings.STATUS_SENDING_TO){harTimings.connect=timings.STATUS_SENDING_TO.first-
timings.REQUEST_HEADER.first;}
else{harTimings.connect=-1;}
if((timings.STATUS_WAITING_FOR||timings.STATUS_RECEIVING_FROM)&&(timings.STATUS_CONNECTED_TO||timings.STATUS_SENDING_TO)){harTimings.send=(timings.STATUS_WAITING_FOR||timings.STATUS_RECEIVING_FROM).first-
(timings.STATUS_CONNECTED_TO||timings.STATUS_SENDING_TO).last;}
else{harTimings.send=-1;}
if(timings.RESPONSE_START){harTimings.wait=timings.RESPONSE_START.first-
(timings.REQUEST_BODY_SENT||timings.STATUS_SENDING_TO).last;}
else{harTimings.wait=-1;}
if(timings.RESPONSE_START&&timings.RESPONSE_COMPLETE){harTimings.receive=timings.RESPONSE_COMPLETE.last-
timings.RESPONSE_START.first;}
else{harTimings.receive=-1;}
let totalTime=0;for(let timing in harTimings){let time=Math.max(Math.round(harTimings[timing]/1000),-1);harTimings[timing]=time;if(time>-1){totalTime+=time;}}
return{total:totalTime,timings:harTimings,};},destroy:function NM_destroy()
{if(Services.appinfo.processType!=Ci.nsIXULRuntime.PROCESS_TYPE_CONTENT){Services.obs.removeObserver(this._httpResponseExaminer,"http-on-examine-response");}
gActivityDistributor.removeObserver(this);this.openRequests={};this.openResponses={};this.owner=null;this.window=null;this.topFrame=null;},};function NetworkMonitorChild(appId,messageManager,connID,owner){this.appId=appId;this.connID=connID;this.owner=owner;this._messageManager=messageManager;this._onNewEvent=this._onNewEvent.bind(this);this._onUpdateEvent=this._onUpdateEvent.bind(this);this._netEvents=new Map();}
exports.NetworkMonitorChild=NetworkMonitorChild;NetworkMonitorChild.prototype={appId:null,owner:null,_netEvents:null,_saveRequestAndResponseBodies:false,get saveRequestAndResponseBodies(){return this._saveRequestAndResponseBodies;},set saveRequestAndResponseBodies(val){this._saveRequestAndResponseBodies=val;this._messageManager.sendAsyncMessage("debug:netmonitor:"+this.connID,{appId:this.appId,action:"setPreferences",preferences:{saveRequestAndResponseBodies:this._saveRequestAndResponseBodies,},});},init:function(){let mm=this._messageManager;mm.addMessageListener("debug:netmonitor:"+this.connID+":newEvent",this._onNewEvent);mm.addMessageListener("debug:netmonitor:"+this.connID+":updateEvent",this._onUpdateEvent);mm.sendAsyncMessage("debug:netmonitor:"+this.connID,{appId:this.appId,action:"start",});},_onNewEvent:DevToolsUtils.makeInfallible(function _onNewEvent(msg){let{id,event}=msg.data;let actor=this.owner.onNetworkEvent(event);this._netEvents.set(id,Cu.getWeakReference(actor));}),_onUpdateEvent:DevToolsUtils.makeInfallible(function _onUpdateEvent(msg){let{id,method,args}=msg.data;let weakActor=this._netEvents.get(id);let actor=weakActor?weakActor.get():null;if(!actor){Cu.reportError("Received debug:netmonitor:updateEvent for unknown event ID: "+id);return;}
if(!(method in actor)){Cu.reportError("Received debug:netmonitor:updateEvent unsupported method: "+method);return;}
actor[method].apply(actor,args);}),destroy:function(){let mm=this._messageManager;mm.removeMessageListener("debug:netmonitor:"+this.connID+":newEvent",this._onNewEvent);mm.removeMessageListener("debug:netmonitor:"+this.connID+":updateEvent",this._onUpdateEvent);mm.sendAsyncMessage("debug:netmonitor:"+this.connID,{action:"disconnect",});this._netEvents.clear();this._messageManager=null;this.owner=null;},};function NetworkEventActorProxy(messageManager,connID){this.id=gSequenceId();this.connID=connID;this.messageManager=messageManager;}
exports.NetworkEventActorProxy=NetworkEventActorProxy;NetworkEventActorProxy.methodFactory=function(method){return DevToolsUtils.makeInfallible(function(){let args=Array.slice(arguments);let mm=this.messageManager;mm.sendAsyncMessage("debug:netmonitor:"+this.connID+":updateEvent",{id:this.id,method:method,args:args,});},"NetworkEventActorProxy."+method);};NetworkEventActorProxy.prototype={init:DevToolsUtils.makeInfallible(function(event)
{let mm=this.messageManager;mm.sendAsyncMessage("debug:netmonitor:"+this.connID+":newEvent",{id:this.id,event:event,});return this;}),};(function(){let methods=["addRequestHeaders","addRequestCookies","addRequestPostData","addResponseStart","addResponseHeaders","addResponseCookies","addResponseContent","addEventTimings"];let factory=NetworkEventActorProxy.methodFactory;for(let method of methods){NetworkEventActorProxy.prototype[method]=factory(method);}})();function NetworkMonitorManager(frame,id)
{this.id=id;let mm=frame.QueryInterface(Ci.nsIFrameLoaderOwner).frameLoader.messageManager;this.messageManager=mm;this.frame=frame;this.onNetMonitorMessage=this.onNetMonitorMessage.bind(this);this.onNetworkEvent=this.onNetworkEvent.bind(this);mm.addMessageListener("debug:netmonitor:"+id,this.onNetMonitorMessage);}
exports.NetworkMonitorManager=NetworkMonitorManager;NetworkMonitorManager.prototype={netMonitor:null,frame:null,messageManager:null,onNetMonitorMessage:DevToolsUtils.makeInfallible(function _onNetMonitorMessage(msg){let{action,appId}=msg.json;switch(action){case"start":if(!this.netMonitor){this.netMonitor=new NetworkMonitor({topFrame:this.frame,appId:appId,},this);this.netMonitor.init();}
break;case"setPreferences":{let{preferences}=msg.json;for(let key of Object.keys(preferences)){if(key=="saveRequestAndResponseBodies"&&this.netMonitor){this.netMonitor.saveRequestAndResponseBodies=preferences[key];}}
break;}
case"stop":if(this.netMonitor){this.netMonitor.destroy();this.netMonitor=null;}
break;case"disconnect":this.destroy();break;}}),onNetworkEvent:DevToolsUtils.makeInfallible(function _onNetworkEvent(event){return new NetworkEventActorProxy(this.messageManager,this.id).init(event);}),destroy:function()
{if(this.messageManager){this.messageManager.removeMessageListener("debug:netmonitor:"+this.id,this.onNetMonitorMessage);}
this.messageManager=null;this.filters=null;if(this.netMonitor){this.netMonitor.destroy();this.netMonitor=null;}},};function ConsoleProgressListener(aWindow,aOwner)
{this.window=aWindow;this.owner=aOwner;}
exports.ConsoleProgressListener=ConsoleProgressListener;ConsoleProgressListener.prototype={MONITOR_FILE_ACTIVITY:1,MONITOR_LOCATION_CHANGE:2,_fileActivity:false,_locationChange:false,_initialized:false,_webProgress:null,QueryInterface:XPCOMUtils.generateQI([Ci.nsIWebProgressListener,Ci.nsISupportsWeakReference]),_init:function CPL__init()
{if(this._initialized){return;}
this._webProgress=this.window.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation).QueryInterface(Ci.nsIWebProgress);this._webProgress.addProgressListener(this,Ci.nsIWebProgress.NOTIFY_STATE_ALL);this._initialized=true;},startMonitor:function CPL_startMonitor(aMonitor)
{switch(aMonitor){case this.MONITOR_FILE_ACTIVITY:this._fileActivity=true;break;case this.MONITOR_LOCATION_CHANGE:this._locationChange=true;break;default:throw new Error("ConsoleProgressListener: unknown monitor type "+
aMonitor+"!");}
this._init();},stopMonitor:function CPL_stopMonitor(aMonitor)
{switch(aMonitor){case this.MONITOR_FILE_ACTIVITY:this._fileActivity=false;break;case this.MONITOR_LOCATION_CHANGE:this._locationChange=false;break;default:throw new Error("ConsoleProgressListener: unknown monitor type "+
aMonitor+"!");}
if(!this._fileActivity&&!this._locationChange){this.destroy();}},onStateChange:function CPL_onStateChange(aProgress,aRequest,aState,aStatus)
{if(!this.owner){return;}
if(this._fileActivity){this._checkFileActivity(aProgress,aRequest,aState,aStatus);}
if(this._locationChange){this._checkLocationChange(aProgress,aRequest,aState,aStatus);}},_checkFileActivity:function CPL__checkFileActivity(aProgress,aRequest,aState,aStatus)
{if(!(aState&Ci.nsIWebProgressListener.STATE_START)){return;}
let uri=null;if(aRequest instanceof Ci.imgIRequest){let imgIRequest=aRequest.QueryInterface(Ci.imgIRequest);uri=imgIRequest.URI;}
else if(aRequest instanceof Ci.nsIChannel){let nsIChannel=aRequest.QueryInterface(Ci.nsIChannel);uri=nsIChannel.URI;}
if(!uri||!uri.schemeIs("file")&&!uri.schemeIs("ftp")){return;}
this.owner.onFileActivity(uri.spec);},_checkLocationChange:function CPL__checkLocationChange(aProgress,aRequest,aState,aStatus)
{let isStart=aState&Ci.nsIWebProgressListener.STATE_START;let isStop=aState&Ci.nsIWebProgressListener.STATE_STOP;let isNetwork=aState&Ci.nsIWebProgressListener.STATE_IS_NETWORK;let isWindow=aState&Ci.nsIWebProgressListener.STATE_IS_WINDOW;if(!isNetwork||!isWindow||aProgress.DOMWindow!=this.window){return;}
if(isStart&&aRequest instanceof Ci.nsIChannel){this.owner.onLocationChange("start",aRequest.URI.spec,"");}
else if(isStop){this.owner.onLocationChange("stop",this.window.location.href,this.window.document.title);}},onLocationChange:function(){},onStatusChange:function(){},onProgressChange:function(){},onSecurityChange:function(){},destroy:function CPL_destroy()
{if(!this._initialized){return;}
this._initialized=false;this._fileActivity=false;this._locationChange=false;try{this._webProgress.removeProgressListener(this);}
catch(ex){}
this._webProgress=null;this.window=null;this.owner=null;},};function gSequenceId(){return gSequenceId.n++;}
gSequenceId.n=1;