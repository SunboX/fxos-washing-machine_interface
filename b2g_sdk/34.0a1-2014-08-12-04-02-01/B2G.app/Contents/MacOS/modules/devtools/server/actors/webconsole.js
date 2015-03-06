"use strict";const{Cc,Ci,Cu}=require("chrome");const{DebuggerServer,ActorPool}=require("devtools/server/main");const{EnvironmentActor,LongStringActor,ObjectActor,ThreadActor}=require("devtools/server/actors/script");const{update}=require("devtools/toolkit/DevToolsUtils");Cu.import("resource://gre/modules/XPCOMUtils.jsm");XPCOMUtils.defineLazyModuleGetter(this,"Services","resource://gre/modules/Services.jsm");XPCOMUtils.defineLazyGetter(this,"NetworkMonitor",()=>{return require("devtools/toolkit/webconsole/network-monitor").NetworkMonitor;});XPCOMUtils.defineLazyGetter(this,"NetworkMonitorChild",()=>{return require("devtools/toolkit/webconsole/network-monitor").NetworkMonitorChild;});XPCOMUtils.defineLazyGetter(this,"ConsoleProgressListener",()=>{return require("devtools/toolkit/webconsole/network-monitor").ConsoleProgressListener;});XPCOMUtils.defineLazyGetter(this,"events",()=>{return require("sdk/event/core");});for(let name of["WebConsoleUtils","ConsoleServiceListener","ConsoleAPIListener","JSTermHelpers","JSPropertyProvider","ConsoleReflowListener"]){Object.defineProperty(this,name,{get:function(prop){if(prop=="WebConsoleUtils"){prop="Utils";}
return require("devtools/toolkit/webconsole/utils")[prop];}.bind(null,name),configurable:true,enumerable:true});}
function WebConsoleActor(aConnection,aParentActor)
{this.conn=aConnection;this.parentActor=aParentActor;this._actorPool=new ActorPool(this.conn);this.conn.addActorPool(this._actorPool);this._prefs={};this.dbg=this.parentActor.makeDebugger();this._netEvents=new Map();this._gripDepth=0;this._onWillNavigate=this._onWillNavigate.bind(this);this._onObserverNotification=this._onObserverNotification.bind(this);if(this.parentActor.isRootActor){Services.obs.addObserver(this._onObserverNotification,"last-pb-context-exited",false);}
this.traits={customNetworkRequest:!this._parentIsContentActor,};}
WebConsoleActor.l10n=new WebConsoleUtils.l10n("chrome://global/locale/console.properties");WebConsoleActor.prototype={dbg:null,_gripDepth:null,_actorPool:null,_prefs:null,_netEvents:null,conn:null,traits:null,get _parentIsContentActor(){return"ContentActor"in DebuggerServer&&this.parentActor instanceof DebuggerServer.ContentActor;},get window(){if(this.parentActor.isRootActor){return this._getWindowForBrowserConsole();}
return this.parentActor.window;},_getWindowForBrowserConsole:function WCA__getWindowForBrowserConsole()
{let window=this._lastChromeWindow&&this._lastChromeWindow.get();if(!window||window.closed){window=this.parentActor.window;if(!window){window=Services.wm.getMostRecentWindow("devtools:webconsole");let onChromeWindowOpened=()=>{Services.obs.removeObserver(onChromeWindowOpened,"domwindowopened");this._lastChromeWindow=null;};Services.obs.addObserver(onChromeWindowOpened,"domwindowopened",false);}
this._handleNewWindow(window);}
return window;},_handleNewWindow:function WCA__handleNewWindow(window)
{if(window){if(this._hadChromeWindow){let contextChangedMsg=WebConsoleActor.l10n.getStr("evaluationContextChanged");Services.console.logStringMessage(contextChangedMsg);}
this._lastChromeWindow=Cu.getWeakReference(window);this._hadChromeWindow=true;}else{this._lastChromeWindow=null;}},_hadChromeWindow:false,_lastChromeWindow:null,_evalWindow:null,get evalWindow(){return this._evalWindow||this.window;},set evalWindow(aWindow){this._evalWindow=aWindow;if(!this._progressListenerActive){events.on(this.parentActor,"will-navigate",this._onWillNavigate);this._progressListenerActive=true;}},_progressListenerActive:false,consoleServiceListener:null,consoleAPIListener:null,networkMonitor:null,consoleProgressListener:null,consoleReflowListener:null,_jstermHelpersCache:null,actorPrefix:"console",grip:function WCA_grip()
{return{actor:this.actorID};},hasNativeConsoleAPI:function WCA_hasNativeConsoleAPI(aWindow){let isNative=false;try{
let console=aWindow.wrappedJSObject.console;isNative=console instanceof aWindow.Console;}
catch(ex){}
return isNative;},_createValueGrip:ThreadActor.prototype.createValueGrip,_stringIsLong:ThreadActor.prototype._stringIsLong,_findProtoChain:ThreadActor.prototype._findProtoChain,_removeFromProtoChain:ThreadActor.prototype._removeFromProtoChain,disconnect:function WCA_disconnect()
{if(this.consoleServiceListener){this.consoleServiceListener.destroy();this.consoleServiceListener=null;}
if(this.consoleAPIListener){this.consoleAPIListener.destroy();this.consoleAPIListener=null;}
if(this.networkMonitor){this.networkMonitor.destroy();this.networkMonitor=null;}
if(this.consoleProgressListener){this.consoleProgressListener.destroy();this.consoleProgressListener=null;}
if(this.consoleReflowListener){this.consoleReflowListener.destroy();this.consoleReflowListener=null;}
this.conn.removeActorPool(this._actorPool);if(this.parentActor.isRootActor){Services.obs.removeObserver(this._onObserverNotification,"last-pb-context-exited");}
this._actorPool=null;this._jstermHelpersCache=null;this._evalWindow=null;this._netEvents.clear();this.dbg.enabled=false;this.dbg=null;this.conn=null;},createEnvironmentActor:function WCA_createEnvironmentActor(aEnvironment){if(!aEnvironment){return undefined;}
if(aEnvironment.actor){return aEnvironment.actor;}
let actor=new EnvironmentActor(aEnvironment,this);this._actorPool.addActor(actor);aEnvironment.actor=actor;return actor;},createValueGrip:function WCA_createValueGrip(aValue)
{return this._createValueGrip(aValue,this._actorPool);},makeDebuggeeValue:function WCA_makeDebuggeeValue(aValue,aUseObjectGlobal)
{let global=this.window;if(aUseObjectGlobal&&typeof aValue=="object"){try{global=Cu.getGlobalForObject(aValue);}
catch(ex){}}
let dbgGlobal=this.dbg.makeGlobalObjectReference(global);return dbgGlobal.makeDebuggeeValue(aValue);},objectGrip:function WCA_objectGrip(aObject,aPool)
{let actor=new ObjectActor(aObject,this);aPool.addActor(actor);return actor.grip();},longStringGrip:function WCA_longStringGrip(aString,aPool)
{let actor=new LongStringActor(aString,this);aPool.addActor(actor);return actor.grip();},_createStringGrip:function NEA__createStringGrip(aString)
{if(aString&&this._stringIsLong(aString)){return this.longStringGrip(aString,this._actorPool);}
return aString;},getActorByID:function WCA_getActorByID(aActorID)
{return this._actorPool.get(aActorID);},releaseActor:function WCA_releaseActor(aActor)
{this._actorPool.removeActor(aActor.actorID);},onStartListeners:function WCA_onStartListeners(aRequest)
{let startedListeners=[];let window=!this.parentActor.isRootActor?this.window:null;let appId=null;let messageManager=null;if(this._parentIsContentActor){appId=this.parentActor.docShell.appId;messageManager=this.parentActor.messageManager;}
while(aRequest.listeners.length>0){let listener=aRequest.listeners.shift();switch(listener){case"PageError":if(!this.consoleServiceListener){this.consoleServiceListener=new ConsoleServiceListener(window,this);this.consoleServiceListener.init();}
startedListeners.push(listener);break;case"ConsoleAPI":if(!this.consoleAPIListener){this.consoleAPIListener=new ConsoleAPIListener(window,this);this.consoleAPIListener.init();}
startedListeners.push(listener);break;case"NetworkActivity":if(!this.networkMonitor){if(appId||messageManager){this.networkMonitor=new NetworkMonitorChild(appId,messageManager,this.parentActor.actorID,this);}
else{this.networkMonitor=new NetworkMonitor({window:window},this);}
this.networkMonitor.init();}
startedListeners.push(listener);break;case"FileActivity":if(!this.consoleProgressListener){this.consoleProgressListener=new ConsoleProgressListener(this.window,this);}
this.consoleProgressListener.startMonitor(this.consoleProgressListener.MONITOR_FILE_ACTIVITY);startedListeners.push(listener);break;case"ReflowActivity":if(!this.consoleReflowListener){this.consoleReflowListener=new ConsoleReflowListener(this.window,this);}
startedListeners.push(listener);break;}}
return{startedListeners:startedListeners,nativeConsoleAPI:this.hasNativeConsoleAPI(this.window),traits:this.traits,};},onStopListeners:function WCA_onStopListeners(aRequest)
{let stoppedListeners=[];
let toDetach=aRequest.listeners||["PageError","ConsoleAPI","NetworkActivity","FileActivity"];while(toDetach.length>0){let listener=toDetach.shift();switch(listener){case"PageError":if(this.consoleServiceListener){this.consoleServiceListener.destroy();this.consoleServiceListener=null;}
stoppedListeners.push(listener);break;case"ConsoleAPI":if(this.consoleAPIListener){this.consoleAPIListener.destroy();this.consoleAPIListener=null;}
stoppedListeners.push(listener);break;case"NetworkActivity":if(this.networkMonitor){this.networkMonitor.destroy();this.networkMonitor=null;}
stoppedListeners.push(listener);break;case"FileActivity":if(this.consoleProgressListener){this.consoleProgressListener.stopMonitor(this.consoleProgressListener.MONITOR_FILE_ACTIVITY);this.consoleProgressListener=null;}
stoppedListeners.push(listener);break;case"ReflowActivity":if(this.consoleReflowListener){this.consoleReflowListener.destroy();this.consoleReflowListener=null;}
stoppedListeners.push(listener);break;}}
return{stoppedListeners:stoppedListeners};},onGetCachedMessages:function WCA_onGetCachedMessages(aRequest)
{let types=aRequest.messageTypes;if(!types){return{error:"missingParameter",message:"The messageTypes parameter is missing.",};}
let messages=[];while(types.length>0){let type=types.shift();switch(type){case"ConsoleAPI":{if(!this.consoleAPIListener){break;}
let cache=this.consoleAPIListener.getCachedMessages(!this.parentActor.isRootActor);cache.forEach((aMessage)=>{let message=this.prepareConsoleMessageForRemote(aMessage);message._type=type;messages.push(message);});break;}
case"PageError":{if(!this.consoleServiceListener){break;}
let cache=this.consoleServiceListener.getCachedMessages(!this.parentActor.isRootActor);cache.forEach((aMessage)=>{let message=null;if(aMessage instanceof Ci.nsIScriptError){message=this.preparePageErrorForRemote(aMessage);message._type=type;}
else{message={_type:"LogMessage",message:this._createStringGrip(aMessage.message),timeStamp:aMessage.timeStamp,};}
messages.push(message);});break;}}}
messages.sort(function(a,b){return a.timeStamp-b.timeStamp;});return{from:this.actorID,messages:messages,};},onEvaluateJS:function WCA_onEvaluateJS(aRequest)
{let input=aRequest.text;let timestamp=Date.now();let evalOptions={bindObjectActor:aRequest.bindObjectActor,frameActor:aRequest.frameActor,url:aRequest.url,selectedNodeActor:aRequest.selectedNodeActor,};let evalInfo=this.evalWithDebugger(input,evalOptions);let evalResult=evalInfo.result;let helperResult=evalInfo.helperResult;let result,errorMessage,errorGrip=null;if(evalResult){if("return"in evalResult){result=evalResult.return;}
else if("yield"in evalResult){result=evalResult.yield;}
else if("throw"in evalResult){let error=evalResult.throw;errorGrip=this.createValueGrip(error);let errorToString=evalInfo.window.evalInGlobalWithBindings("ex + ''",{ex:error});if(errorToString&&typeof errorToString.return=="string"){errorMessage=errorToString.return;}}}
let resultGrip;try{resultGrip=this.createValueGrip(result);}catch(e){errorMessage=e;}
return{from:this.actorID,input:input,result:resultGrip,timestamp:timestamp,exception:errorGrip,exceptionMessage:errorMessage,helperResult:helperResult,};},onAutocomplete:function WCA_onAutocomplete(aRequest)
{let frameActorId=aRequest.frameActor;let dbgObject=null;let environment=null; if(frameActorId){let frameActor=this.conn.getActor(frameActorId);if(frameActor){let frame=frameActor.frame;environment=frame.environment;}
else{Cu.reportError("Web Console Actor: the frame actor was not found: "+
frameActorId);}}
else{dbgObject=this.dbg.makeGlobalObjectReference(this.evalWindow);}
let result=JSPropertyProvider(dbgObject,environment,aRequest.text,aRequest.cursor,frameActorId)||{};let matches=result.matches||[];let reqText=aRequest.text.substr(0,aRequest.cursor);
let lastNonAlphaIsDot=/[.][a-zA-Z0-9$]*$/.test(reqText);if(!lastNonAlphaIsDot){if(!this._jstermHelpersCache){let helpers={sandbox:Object.create(null)};JSTermHelpers(helpers);this._jstermHelpersCache=Object.getOwnPropertyNames(helpers.sandbox);}
matches=matches.concat(this._jstermHelpersCache.filter(n=>n.startsWith(result.matchProp)));}
return{from:this.actorID,matches:matches.sort(),matchProp:result.matchProp,};},onClearMessagesCache:function WCA_onClearMessagesCache()
{ let windowId=!this.parentActor.isRootActor?WebConsoleUtils.getInnerWindowId(this.window):null;let ConsoleAPIStorage=Cc["@mozilla.org/consoleAPI-storage;1"].getService(Ci.nsIConsoleAPIStorage);ConsoleAPIStorage.clearEvents(windowId);if(this.parentActor.isRootActor){Services.console.logStringMessage(null); Services.console.reset();}
return{};},onGetPreferences:function WCA_onGetPreferences(aRequest)
{let prefs=Object.create(null);for(let key of aRequest.preferences){prefs[key]=!!this._prefs[key];}
return{preferences:prefs};},onSetPreferences:function WCA_onSetPreferences(aRequest)
{for(let key in aRequest.preferences){this._prefs[key]=aRequest.preferences[key];if(key=="NetworkMonitor.saveRequestAndResponseBodies"&&this.networkMonitor){this.networkMonitor.saveRequestAndResponseBodies=this._prefs[key];}}
return{updated:Object.keys(aRequest.preferences)};},_getJSTermHelpers:function WCA__getJSTermHelpers(aDebuggerGlobal)
{let helpers={window:this.evalWindow,chromeWindow:this.chromeWindow.bind(this),makeDebuggeeValue:aDebuggerGlobal.makeDebuggeeValue.bind(aDebuggerGlobal),createValueGrip:this.createValueGrip.bind(this),sandbox:Object.create(null),helperResult:null,consoleActor:this,};JSTermHelpers(helpers);for(let name in helpers.sandbox){let desc=Object.getOwnPropertyDescriptor(helpers.sandbox,name);if(desc.get||desc.set){continue;}
helpers.sandbox[name]=aDebuggerGlobal.makeDebuggeeValue(desc.value);}
return helpers;},evalWithDebugger:function WCA_evalWithDebugger(aString,aOptions={})
{if(aString.trim()=="help"||aString.trim()=="?"){aString="help()";}
let frame=null,frameActor=null;if(aOptions.frameActor){frameActor=this.conn.getActor(aOptions.frameActor);if(frameActor){frame=frameActor.frame;}
else{Cu.reportError("Web Console Actor: the frame actor was not found: "+
aOptions.frameActor);}}




let dbg=frame?frameActor.threadActor.dbg:this.dbg;let dbgWindow=dbg.makeGlobalObjectReference(this.evalWindow);
let bindSelf=null;if(aOptions.bindObjectActor){let objActor=this.getActorByID(aOptions.bindObjectActor);if(objActor){let jsObj=objActor.obj.unsafeDereference();

let global=Cu.getGlobalForObject(jsObj);dbgWindow=dbg.makeGlobalObjectReference(global);bindSelf=dbgWindow.makeDebuggeeValue(jsObj);}}
let helpers=this._getJSTermHelpers(dbgWindow);let bindings=helpers.sandbox;if(bindSelf){bindings._self=bindSelf;}
if(aOptions.selectedNodeActor){let actor=this.conn.getActor(aOptions.selectedNodeActor);if(actor){helpers.selectedNode=actor.rawNode;}}

let found$=false,found$$=false;if(frame){let env=frame.environment;if(env){found$=!!env.find("$");found$$=!!env.find("$$");}}
else{found$=!!dbgWindow.getOwnPropertyDescriptor("$");found$$=!!dbgWindow.getOwnPropertyDescriptor("$$");}
let $=null,$$=null;if(found$){$=bindings.$;delete bindings.$;}
if(found$$){$$=bindings.$$;delete bindings.$$;}
helpers.evalInput=aString;let evalOptions;if(typeof aOptions.url=="string"){evalOptions={url:aOptions.url};}
let result;if(frame){result=frame.evalWithBindings(aString,bindings,evalOptions);}
else{result=dbgWindow.evalInGlobalWithBindings(aString,bindings,evalOptions);}
let helperResult=helpers.helperResult;delete helpers.evalInput;delete helpers.helperResult;delete helpers.selectedNode;if($){bindings.$=$;}
if($$){bindings.$$=$$;}
if(bindings._self){delete bindings._self;}
return{result:result,helperResult:helperResult,dbg:dbg,frame:frame,window:dbgWindow,};},onConsoleServiceMessage:function WCA_onConsoleServiceMessage(aMessage)
{let packet;if(aMessage instanceof Ci.nsIScriptError){packet={from:this.actorID,type:"pageError",pageError:this.preparePageErrorForRemote(aMessage),};}
else{packet={from:this.actorID,type:"logMessage",message:this._createStringGrip(aMessage.message),timeStamp:aMessage.timeStamp,};}
this.conn.send(packet);},preparePageErrorForRemote:function WCA_preparePageErrorForRemote(aPageError)
{let lineText=aPageError.sourceLine;if(lineText&&lineText.length>DebuggerServer.LONG_STRING_INITIAL_LENGTH){lineText=lineText.substr(0,DebuggerServer.LONG_STRING_INITIAL_LENGTH);}
return{errorMessage:this._createStringGrip(aPageError.errorMessage),sourceName:aPageError.sourceName,lineText:lineText,lineNumber:aPageError.lineNumber,columnNumber:aPageError.columnNumber,category:aPageError.category,timeStamp:aPageError.timeStamp,warning:!!(aPageError.flags&aPageError.warningFlag),error:!!(aPageError.flags&aPageError.errorFlag),exception:!!(aPageError.flags&aPageError.exceptionFlag),strict:!!(aPageError.flags&aPageError.strictFlag),private:aPageError.isFromPrivateWindow,};},onConsoleAPICall:function WCA_onConsoleAPICall(aMessage)
{let packet={from:this.actorID,type:"consoleAPICall",message:this.prepareConsoleMessageForRemote(aMessage),};this.conn.send(packet);},onNetworkEvent:function WCA_onNetworkEvent(aEvent,aChannel)
{let actor=this.getNetworkEventActor(aChannel);actor.init(aEvent);let packet={from:this.actorID,type:"networkEvent",eventActor:actor.grip(),};this.conn.send(packet);return actor;},getNetworkEventActor:function WCA_getNetworkEventActor(aChannel){let actor=this._netEvents.get(aChannel);if(actor){ this._netEvents.delete(aChannel);actor.channel=null;return actor;}
actor=new NetworkEventActor(aChannel,this);this._actorPool.addActor(actor);return actor;},onSendHTTPRequest:function WCA_onSendHTTPRequest(aMessage)
{let details=aMessage.request; let request=new this.window.XMLHttpRequest();request.open(details.method,details.url,true);for(let{name,value}of details.headers){request.setRequestHeader(name,value);}
request.send(details.body);let actor=this.getNetworkEventActor(request.channel); this._netEvents.set(request.channel,actor);return{from:this.actorID,eventActor:actor.grip()};},onFileActivity:function WCA_onFileActivity(aFileURI)
{let packet={from:this.actorID,type:"fileActivity",uri:aFileURI,};this.conn.send(packet);},onReflowActivity:function WCA_onReflowActivity(aReflowInfo)
{let packet={from:this.actorID,type:"reflowActivity",interruptible:aReflowInfo.interruptible,start:aReflowInfo.start,end:aReflowInfo.end,sourceURL:aReflowInfo.sourceURL,sourceLine:aReflowInfo.sourceLine,functionName:aReflowInfo.functionName};this.conn.send(packet);},prepareConsoleMessageForRemote:function WCA_prepareConsoleMessageForRemote(aMessage)
{let result=WebConsoleUtils.cloneObject(aMessage);delete result.wrappedJSObject;delete result.ID;delete result.innerID;delete result.consoleID;result.arguments=Array.map(aMessage.arguments||[],(aObj)=>{let dbgObj=this.makeDebuggeeValue(aObj,true);return this.createValueGrip(dbgObj);});result.styles=Array.map(aMessage.styles||[],(aString)=>{return this.createValueGrip(aString);});return result;},chromeWindow:function WCA_chromeWindow()
{let window=null;try{window=this.window.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation).QueryInterface(Ci.nsIDocShell).chromeEventHandler.ownerDocument.defaultView;}
catch(ex){
}
return window;},_onObserverNotification:function WCA__onObserverNotification(aSubject,aTopic)
{switch(aTopic){case"last-pb-context-exited":this.conn.send({from:this.actorID,type:"lastPrivateContextExited",});break;}},_onWillNavigate:function WCA__onWillNavigate({window,isTopLevel})
{if(isTopLevel){this._evalWindow=null;events.off(this.parentActor,"will-navigate",this._onWillNavigate);this._progressListenerActive=false;}},};WebConsoleActor.prototype.requestTypes={startListeners:WebConsoleActor.prototype.onStartListeners,stopListeners:WebConsoleActor.prototype.onStopListeners,getCachedMessages:WebConsoleActor.prototype.onGetCachedMessages,evaluateJS:WebConsoleActor.prototype.onEvaluateJS,autocomplete:WebConsoleActor.prototype.onAutocomplete,clearMessagesCache:WebConsoleActor.prototype.onClearMessagesCache,getPreferences:WebConsoleActor.prototype.onGetPreferences,setPreferences:WebConsoleActor.prototype.onSetPreferences,sendHTTPRequest:WebConsoleActor.prototype.onSendHTTPRequest};function AddonConsoleActor(aAddon,aConnection,aParentActor)
{this.addon=aAddon;WebConsoleActor.call(this,aConnection,aParentActor);}
AddonConsoleActor.prototype=Object.create(WebConsoleActor.prototype);update(AddonConsoleActor.prototype,{constructor:AddonConsoleActor,actorPrefix:"addonConsole",addon:null,get window(){return this.parentActor.global;},disconnect:function ACA_disconnect()
{WebConsoleActor.prototype.disconnect.call(this);this.addon=null;},onStartListeners:function ACA_onStartListeners(aRequest)
{let startedListeners=[];while(aRequest.listeners.length>0){let listener=aRequest.listeners.shift();switch(listener){case"ConsoleAPI":if(!this.consoleAPIListener){this.consoleAPIListener=new ConsoleAPIListener(null,this,"addon/"+this.addon.id);this.consoleAPIListener.init();}
startedListeners.push(listener);break;}}
return{startedListeners:startedListeners,nativeConsoleAPI:true,traits:this.traits,};},});AddonConsoleActor.prototype.requestTypes=Object.create(WebConsoleActor.prototype.requestTypes);AddonConsoleActor.prototype.requestTypes.startListeners=AddonConsoleActor.prototype.onStartListeners;exports.AddonConsoleActor=AddonConsoleActor;function NetworkEventActor(aChannel,aWebConsoleActor)
{this.parent=aWebConsoleActor;this.conn=this.parent.conn;this.channel=aChannel;this._request={method:null,url:null,httpVersion:null,headers:[],cookies:[],headersSize:null,postData:{},};this._response={headers:[],cookies:[],content:{},};this._timings={};this._longStringActors=new Set();}
NetworkEventActor.prototype={_request:null,_response:null,_timings:null,_longStringActors:null,actorPrefix:"netEvent",grip:function NEA_grip()
{return{actor:this.actorID,startedDateTime:this._startedDateTime,url:this._request.url,method:this._request.method,isXHR:this._isXHR,private:this._private,};},release:function NEA_release()
{for(let grip of this._longStringActors){let actor=this.parent.getActorByID(grip.actor);if(actor){this.parent.releaseActor(actor);}}
this._longStringActors=new Set();if(this.channel){this.parent._netEvents.delete(this.channel);}
this.parent.releaseActor(this);},onRelease:function NEA_onRelease()
{this.release();return{};},init:function NEA_init(aNetworkEvent)
{this._startedDateTime=aNetworkEvent.startedDateTime;this._isXHR=aNetworkEvent.isXHR;for(let prop of['method','url','httpVersion','headersSize']){this._request[prop]=aNetworkEvent[prop];}
this._discardRequestBody=aNetworkEvent.discardRequestBody;this._discardResponseBody=aNetworkEvent.discardResponseBody;this._private=aNetworkEvent.private;},onGetRequestHeaders:function NEA_onGetRequestHeaders()
{return{from:this.actorID,headers:this._request.headers,headersSize:this._request.headersSize,};},onGetRequestCookies:function NEA_onGetRequestCookies()
{return{from:this.actorID,cookies:this._request.cookies,};},onGetRequestPostData:function NEA_onGetRequestPostData()
{return{from:this.actorID,postData:this._request.postData,postDataDiscarded:this._discardRequestBody,};},onGetResponseHeaders:function NEA_onGetResponseHeaders()
{return{from:this.actorID,headers:this._response.headers,headersSize:this._response.headersSize,};},onGetResponseCookies:function NEA_onGetResponseCookies()
{return{from:this.actorID,cookies:this._response.cookies,};},onGetResponseContent:function NEA_onGetResponseContent()
{return{from:this.actorID,content:this._response.content,contentDiscarded:this._discardResponseBody,};},onGetEventTimings:function NEA_onGetEventTimings()
{return{from:this.actorID,timings:this._timings,totalTime:this._totalTime,};},addRequestHeaders:function NEA_addRequestHeaders(aHeaders)
{this._request.headers=aHeaders;this._prepareHeaders(aHeaders);let packet={from:this.actorID,type:"networkEventUpdate",updateType:"requestHeaders",headers:aHeaders.length,headersSize:this._request.headersSize,};this.conn.send(packet);},addRequestCookies:function NEA_addRequestCookies(aCookies)
{this._request.cookies=aCookies;this._prepareHeaders(aCookies);let packet={from:this.actorID,type:"networkEventUpdate",updateType:"requestCookies",cookies:aCookies.length,};this.conn.send(packet);},addRequestPostData:function NEA_addRequestPostData(aPostData)
{this._request.postData=aPostData;aPostData.text=this.parent._createStringGrip(aPostData.text);if(typeof aPostData.text=="object"){this._longStringActors.add(aPostData.text);}
let packet={from:this.actorID,type:"networkEventUpdate",updateType:"requestPostData",dataSize:aPostData.text.length,discardRequestBody:this._discardRequestBody,};this.conn.send(packet);},addResponseStart:function NEA_addResponseStart(aInfo)
{this._response.httpVersion=aInfo.httpVersion;this._response.status=aInfo.status;this._response.statusText=aInfo.statusText;this._response.headersSize=aInfo.headersSize;this._discardResponseBody=aInfo.discardResponseBody;let packet={from:this.actorID,type:"networkEventUpdate",updateType:"responseStart",response:aInfo,};this.conn.send(packet);},addResponseHeaders:function NEA_addResponseHeaders(aHeaders)
{this._response.headers=aHeaders;this._prepareHeaders(aHeaders);let packet={from:this.actorID,type:"networkEventUpdate",updateType:"responseHeaders",headers:aHeaders.length,headersSize:this._response.headersSize,};this.conn.send(packet);},addResponseCookies:function NEA_addResponseCookies(aCookies)
{this._response.cookies=aCookies;this._prepareHeaders(aCookies);let packet={from:this.actorID,type:"networkEventUpdate",updateType:"responseCookies",cookies:aCookies.length,};this.conn.send(packet);},addResponseContent:function NEA_addResponseContent(aContent,aDiscardedResponseBody)
{this._response.content=aContent;aContent.text=this.parent._createStringGrip(aContent.text);if(typeof aContent.text=="object"){this._longStringActors.add(aContent.text);}
let packet={from:this.actorID,type:"networkEventUpdate",updateType:"responseContent",mimeType:aContent.mimeType,contentSize:aContent.text.length,discardResponseBody:aDiscardedResponseBody,};this.conn.send(packet);},addEventTimings:function NEA_addEventTimings(aTotal,aTimings)
{this._totalTime=aTotal;this._timings=aTimings;let packet={from:this.actorID,type:"networkEventUpdate",updateType:"eventTimings",totalTime:aTotal,};this.conn.send(packet);},_prepareHeaders:function NEA__prepareHeaders(aHeaders)
{for(let header of aHeaders){header.value=this.parent._createStringGrip(header.value);if(typeof header.value=="object"){this._longStringActors.add(header.value);}}},};NetworkEventActor.prototype.requestTypes={"release":NetworkEventActor.prototype.onRelease,"getRequestHeaders":NetworkEventActor.prototype.onGetRequestHeaders,"getRequestCookies":NetworkEventActor.prototype.onGetRequestCookies,"getRequestPostData":NetworkEventActor.prototype.onGetRequestPostData,"getResponseHeaders":NetworkEventActor.prototype.onGetResponseHeaders,"getResponseCookies":NetworkEventActor.prototype.onGetResponseCookies,"getResponseContent":NetworkEventActor.prototype.onGetResponseContent,"getEventTimings":NetworkEventActor.prototype.onGetEventTimings,};exports.register=function(handle){handle.addGlobalActor(WebConsoleActor,"consoleActor");handle.addTabActor(WebConsoleActor,"consoleActor");};exports.unregister=function(handle){handle.removeGlobalActor(WebConsoleActor,"consoleActor");handle.removeTabActor(WebConsoleActor,"consoleActor");};