const Cu=Components.utils;const Cc=Components.classes;const Ci=Components.interfaces;const Cr=Components.results;this.EXPORTED_SYMBOLS=["DOMRequestIpcHelper"];Cu.import("resource://gre/modules/XPCOMUtils.jsm");Cu.import("resource://gre/modules/Services.jsm");XPCOMUtils.defineLazyServiceGetter(this,"cpmm","@mozilla.org/childprocessmessagemanager;1","nsIMessageListenerManager");this.DOMRequestIpcHelper=function DOMRequestIpcHelper(){




this._listeners=null;this._requests=null;this._window=null;}
DOMRequestIpcHelper.prototype={QueryInterface:XPCOMUtils.generateQI([Ci.nsISupportsWeakReference,Ci.nsIObserver]),addMessageListeners:function(aMessages){if(!aMessages){return;}
if(!this._listeners){this._listeners={};}
if(!Array.isArray(aMessages)){aMessages=[aMessages];}
aMessages.forEach((aMsg)=>{let name=aMsg.name||aMsg;
if(this._listeners[name]!=undefined){if(!!aMsg.weakRef==this._listeners[name].weakRef){this._listeners[name].count++;return;}else{throw Cr.NS_ERROR_FAILURE;}}
aMsg.weakRef?cpmm.addWeakMessageListener(name,this):cpmm.addMessageListener(name,this);this._listeners[name]={weakRef:!!aMsg.weakRef,count:1};});},removeMessageListeners:function(aMessages){if(!this._listeners||!aMessages){return;}
if(!Array.isArray(aMessages)){aMessages=[aMessages];}
aMessages.forEach((aName)=>{if(this._listeners[aName]==undefined){return;}

if(!--this._listeners[aName].count){this._listeners[aName].weakRef?cpmm.removeWeakMessageListener(aName,this):cpmm.removeMessageListener(aName,this);delete this._listeners[aName];}});},initDOMRequestHelper:function(aWindow,aMessages){
this.QueryInterface(Ci.nsISupportsWeakReference);this.QueryInterface(Ci.nsIObserver);if(aMessages){this.addMessageListeners(aMessages);}
this._id=this._getRandomId();this._window=aWindow;if(this._window){let util=this._window.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);this.innerWindowID=util.currentInnerWindowID;}
this._destroyed=false;Services.obs.addObserver(this,"inner-window-destroyed",true);},destroyDOMRequestHelper:function(){if(this._destroyed){return;}
this._destroyed=true;Services.obs.removeObserver(this,"inner-window-destroyed");if(this._listeners){Object.keys(this._listeners).forEach((aName)=>{this._listeners[aName].weakRef?cpmm.removeWeakMessageListener(aName,this):cpmm.removeMessageListener(aName,this);});}
this._listeners=null;this._requests=null;if(this.uninit){this.uninit();}
this._window=null;},observe:function(aSubject,aTopic,aData){if(aTopic!=="inner-window-destroyed"){return;}
let wId=aSubject.QueryInterface(Ci.nsISupportsPRUint64).data;if(wId!=this.innerWindowID){return;}
this.destroyDOMRequestHelper();},getRequestId:function(aRequest){if(!this._requests){this._requests={};}
let id="id"+this._getRandomId();this._requests[id]=aRequest;return id;},getPromiseResolverId:function(aPromiseResolver){
return this.getRequestId(aPromiseResolver);},getRequest:function(aId){if(this._requests&&this._requests[aId]){return this._requests[aId];}},getPromiseResolver:function(aId){
return this.getRequest(aId);},removeRequest:function(aId){if(this._requests&&this._requests[aId]){delete this._requests[aId];}},removePromiseResolver:function(aId){
this.removeRequest(aId);},takeRequest:function(aId){if(!this._requests||!this._requests[aId]){return null;}
let request=this._requests[aId];delete this._requests[aId];return request;},takePromiseResolver:function(aId){
return this.takeRequest(aId);},_getRandomId:function(){return Cc["@mozilla.org/uuid-generator;1"].getService(Ci.nsIUUIDGenerator).generateUUID().toString();},createRequest:function(){return Services.DOMRequest.createRequest(this._window);},createPromise:function(aPromiseInit){return new this._window.Promise(aPromiseInit);},forEachRequest:function(aCallback){if(!this._requests){return;}
Object.keys(this._requests).forEach((aKey)=>{if(this.getRequest(aKey)instanceof this._window.DOMRequest){aCallback(aKey);}});},forEachPromiseResolver:function(aCallback){if(!this._requests){return;}
Object.keys(this._requests).forEach((aKey)=>{if("resolve"in this.getPromiseResolver(aKey)&&"reject"in this.getPromiseResolver(aKey)){aCallback(aKey);}});},}