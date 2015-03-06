


this.EXPORTED_SYMBOLS=["RemoteAddonsParent"];const Ci=Components.interfaces;const Cc=Components.classes;const Cu=Components.utils;Cu.import("resource://gre/modules/XPCOMUtils.jsm");Cu.import('resource://gre/modules/Services.jsm');XPCOMUtils.defineLazyModuleGetter(this,"BrowserUtils","resource://gre/modules/BrowserUtils.jsm");XPCOMUtils.defineLazyModuleGetter(this,"NetUtil","resource://gre/modules/NetUtil.jsm");function setDefault(dict,key,default_)
{if(key in dict){return dict[key];}
dict[key]=default_;return default_;}




let NotificationTracker={



_paths:{},init:function(){let ppmm=Cc["@mozilla.org/parentprocessmessagemanager;1"].getService(Ci.nsIMessageBroadcaster);ppmm.addMessageListener("Addons:GetNotifications",this);},add:function(path){let tracked=this._paths;for(let component of path){tracked=setDefault(tracked,component,{});}
let count=tracked._count||0;count++;tracked._count=count;let ppmm=Cc["@mozilla.org/parentprocessmessagemanager;1"].getService(Ci.nsIMessageBroadcaster);ppmm.broadcastAsyncMessage("Addons:AddNotification",path);},remove:function(path){let tracked=this._paths;for(let component of path){tracked=setDefault(tracked,component,{});}
tracked._count--;let ppmm=Cc["@mozilla.org/parentprocessmessagemanager;1"].getService(Ci.nsIMessageBroadcaster);ppmm.broadcastAsyncMessage("Addons:RemoveNotification",path);},receiveMessage:function(msg){if(msg.name=="Addons:GetNotifications"){return this._paths;}}};NotificationTracker.init();

function Interposition(base)
{if(base){this.methods=Object.create(base.methods);this.getters=Object.create(base.getters);this.setters=Object.create(base.setters);}else{this.methods={};this.getters={};this.setters={};}}


let ContentPolicyParent={init:function(){let ppmm=Cc["@mozilla.org/parentprocessmessagemanager;1"].getService(Ci.nsIMessageBroadcaster);ppmm.addMessageListener("Addons:ContentPolicy:Run",this);this._policies=[];},addContentPolicy:function(cid){this._policies.push(cid);NotificationTracker.add(["content-policy"]);},removeContentPolicy:function(cid){let index=this._policies.lastIndexOf(cid);if(index>-1){this._policies.splice(index,1);}
NotificationTracker.remove(["content-policy"]);},receiveMessage:function(aMessage){switch(aMessage.name){case"Addons:ContentPolicy:Run":return this.shouldLoad(aMessage.data,aMessage.objects);break;}},shouldLoad:function(aData,aObjects){for(let policyCID of this._policies){let policy=Cc[policyCID].getService(Ci.nsIContentPolicy);try{let result=policy.shouldLoad(aObjects.contentType,aObjects.contentLocation,aObjects.requestOrigin,aObjects.node,aObjects.mimeTypeGuess,null);if(result!=Ci.nsIContentPolicy.ACCEPT&&result!=0)
return result;}catch(e){Cu.reportError(e);}}
return Ci.nsIContentPolicy.ACCEPT;},};ContentPolicyParent.init();
let CategoryManagerInterposition=new Interposition();CategoryManagerInterposition.methods.addCategoryEntry=function(addon,target,category,entry,value,persist,replace){if(category=="content-policy"){ContentPolicyParent.addContentPolicy(entry);}
target.addCategoryEntry(category,entry,value,persist,replace);};CategoryManagerInterposition.methods.deleteCategoryEntry=function(addon,target,category,entry,persist){if(category=="content-policy"){ContentPolicyParent.remoteContentPolicy(entry);}
target.deleteCategoryEntry(category,entry,persist);};
let AboutProtocolParent={init:function(){let ppmm=Cc["@mozilla.org/parentprocessmessagemanager;1"].getService(Ci.nsIMessageBroadcaster);ppmm.addMessageListener("Addons:AboutProtocol:GetURIFlags",this);ppmm.addMessageListener("Addons:AboutProtocol:OpenChannel",this);this._protocols=[];},registerFactory:function(class_,className,contractID,factory){this._protocols.push({contractID:contractID,factory:factory});NotificationTracker.add(["about-protocol",contractID]);},unregisterFactory:function(class_,factory){for(let i=0;i<this._protocols.length;i++){if(this._protocols[i].factory==factory){NotificationTracker.remove(["about-protocol",this._protocols[i].contractID]);this._protocols.splice(i,1);break;}}},receiveMessage:function(msg){switch(msg.name){case"Addons:AboutProtocol:GetURIFlags":return this.getURIFlags(msg);case"Addons:AboutProtocol:OpenChannel":return this.openChannel(msg);break;}},getURIFlags:function(msg){let uri=BrowserUtils.makeURI(msg.data.uri);let contractID=msg.data.contractID;let module=Cc[contractID].getService(Ci.nsIAboutModule);try{return module.getURIFlags(uri);}catch(e){Cu.reportError(e);}},
openChannel:function(msg){let uri=BrowserUtils.makeURI(msg.data.uri);let contractID=msg.data.contractID;let module=Cc[contractID].getService(Ci.nsIAboutModule);try{let channel=module.newChannel(uri);channel.notificationCallbacks=msg.objects.notificationCallbacks;channel.loadGroup={notificationCallbacks:msg.objects.loadGroupNotificationCallbacks};let stream=channel.open();let data=NetUtil.readInputStreamToString(stream,stream.available(),{});return{data:data,contentType:channel.contentType};}catch(e){Cu.reportError(e);}},};AboutProtocolParent.init();let ComponentRegistrarInterposition=new Interposition();ComponentRegistrarInterposition.methods.registerFactory=function(addon,target,class_,className,contractID,factory){if(contractID.startsWith("@mozilla.org/network/protocol/about;1?")){AboutProtocolParent.registerFactory(class_,className,contractID,factory);}
target.registerFactory(class_,className,contractID,factory);};ComponentRegistrarInterposition.methods.unregisterFactory=function(addon,target,class_,factory){AboutProtocolParent.tryUnregisterFactory(class_,factory);target.unregisterFactory(class_,factory);};





let ObserverParent={init:function(){let ppmm=Cc["@mozilla.org/parentprocessmessagemanager;1"].getService(Ci.nsIMessageBroadcaster);ppmm.addMessageListener("Addons:Observer:Run",this);},addObserver:function(observer,topic,ownsWeak){Services.obs.addObserver(observer,"e10s-"+topic,ownsWeak);NotificationTracker.add(["observer",topic]);},removeObserver:function(observer,topic){Services.obs.removeObserver(observer,"e10s-"+topic);NotificationTracker.remove(["observer",topic]);},receiveMessage:function(msg){switch(msg.name){case"Addons:Observer:Run":this.notify(msg.objects.subject,msg.objects.topic,msg.objects.data);break;}},notify:function(subject,topic,data){let e=Services.obs.enumerateObservers("e10s-"+topic);while(e.hasMoreElements()){let obs=e.getNext().QueryInterface(Ci.nsIObserver);try{obs.observe(subject,topic,data);}catch(e){Cu.reportError(e);}}}};ObserverParent.init();let TOPIC_WHITELIST=["content-document-global-created","document-element-inserted",];
let ObserverInterposition=new Interposition();ObserverInterposition.methods.addObserver=function(addon,target,observer,topic,ownsWeak){if(TOPIC_WHITELIST.indexOf(topic)>=0){ObserverParent.addObserver(observer,topic);}
target.addObserver(observer,topic,ownsWeak);};ObserverInterposition.methods.removeObserver=function(addon,target,observer,topic){if(TOPIC_WHITELIST.indexOf(topic)>=0){ObserverParent.removeObserver(observer,topic);}
target.removeObserver(observer,topic);};
let EventTargetParent={init:function(){
this._listeners=new WeakMap();let mm=Cc["@mozilla.org/globalmessagemanager;1"].getService(Ci.nsIMessageListenerManager);mm.addMessageListener("Addons:Event:Run",this);},




redirectEventTarget:function(target){if(Cu.isCrossProcessWrapper(target)){return null;}
if(target instanceof Ci.nsIDOMChromeWindow){return target;}
const XUL_NS="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";if(target instanceof Ci.nsIDOMXULElement){if(target.localName=="browser"){return target;}else if(target.localName=="tab"){return target.linkedBrowser;}

let window=target.ownerDocument.defaultView;if(target.contains(window.gBrowser)){return window;}}
return null;},

getTargets:function(browser){let window=browser.ownerDocument.defaultView;return[browser,window];},addEventListener:function(target,type,listener,useCapture,wantsUntrusted){let newTarget=this.redirectEventTarget(target);if(!newTarget){return;}
useCapture=useCapture||false;wantsUntrusted=wantsUntrusted||false;NotificationTracker.add(["event",type,useCapture]);let listeners=this._listeners.get(newTarget);if(!listeners){listeners={};this._listeners.set(newTarget,listeners);}
let forType=setDefault(listeners,type,[]);for(let i=0;i<forType.length;i++){if(forType[i].listener===listener&&forType[i].useCapture===useCapture&&forType[i].wantsUntrusted===wantsUntrusted){return;}}
forType.push({listener:listener,wantsUntrusted:wantsUntrusted,useCapture:useCapture});},removeEventListener:function(target,type,listener,useCapture){let newTarget=this.redirectEventTarget(target);if(!newTarget){return;}
useCapture=useCapture||false;let listeners=this._listeners.get(newTarget);if(!listeners){return;}
let forType=setDefault(listeners,type,[]);for(let i=0;i<forType.length;i++){if(forType[i].listener===listener&&forType[i].useCapture===useCapture){forType.splice(i,1);NotificationTracker.remove(["event",type,useCapture]);break;}}},receiveMessage:function(msg){switch(msg.name){case"Addons:Event:Run":this.dispatch(msg.target,msg.data.type,msg.data.isTrusted,msg.objects.event);break;}},dispatch:function(browser,type,isTrusted,event){let targets=this.getTargets(browser);for(target of targets){let listeners=this._listeners.get(target);if(!listeners){continue;}
let forType=setDefault(listeners,type,[]);for(let{listener,wantsUntrusted}of forType){if(wantsUntrusted||isTrusted){try{if("handleEvent"in listener){listener.handleEvent(event);}else{listener.call(event.target,event);}}catch(e){Cu.reportError(e);}}}}}};EventTargetParent.init();
let EventTargetInterposition=new Interposition();EventTargetInterposition.methods.addEventListener=function(addon,target,type,listener,useCapture,wantsUntrusted){EventTargetParent.addEventListener(target,type,listener,useCapture,wantsUntrusted);target.addEventListener(type,listener,useCapture,wantsUntrusted);};EventTargetInterposition.methods.removeEventListener=function(addon,target,type,listener,useCapture){EventTargetParent.removeEventListener(target,type,listener,useCapture);target.removeEventListener(type,listener,useCapture);};

let ContentDocShellTreeItemInterposition=new Interposition();ContentDocShellTreeItemInterposition.getters.rootTreeItem=function(addon,target){let chromeGlobal=target.rootTreeItem.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIContentFrameMessageManager);let browser=RemoteAddonsParent.globalToBrowser.get(chromeGlobal);if(!browser){

return null;}
let chromeWin=browser.ownerDocument.defaultView;return chromeWin.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation).QueryInterface(Ci.nsIDocShellTreeItem);};


let SandboxParent={componentsMap:new WeakMap(),makeContentSandbox:function(principal,...rest){let chromeGlobal=principal.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation).QueryInterface(Ci.nsIDocShellTreeItem).rootTreeItem.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIContentFrameMessageManager);let cu=chromeGlobal.Components.utils;let sandbox=cu.Sandbox(principal,...rest);

chromeGlobal.addSandbox(sandbox);

this.componentsMap.set(sandbox,cu);return sandbox;},evalInSandbox:function(code,sandbox,...rest){let cu=this.componentsMap.get(sandbox);return cu.evalInSandbox(code,sandbox,...rest);}};

let ComponentsUtilsInterposition=new Interposition();ComponentsUtilsInterposition.methods.Sandbox=function(addon,target,principal,...rest){if(principal&&typeof(principal)=="object"&&Cu.isCrossProcessWrapper(principal)&&principal instanceof Ci.nsIDOMWindow){return SandboxParent.makeContentSandbox(principal,...rest);}else{return Components.utils.Sandbox(principal,...rest);}};ComponentsUtilsInterposition.methods.evalInSandbox=function(addon,target,code,sandbox,...rest){if(sandbox&&Cu.isCrossProcessWrapper(sandbox)){return SandboxParent.evalInSandbox(code,sandbox,...rest);}else{return Components.utils.evalInSandbox(code,sandbox,...rest);}};


let ContentDocumentInterposition=new Interposition();ContentDocumentInterposition.methods.importNode=function(addon,target,node,deep){if(!Cu.isCrossProcessWrapper(node)){


Cu.reportError("Calling contentDocument.importNode on a XUL node is not allowed.");return node;}
return target.importNode(node,deep);};
let RemoteBrowserElementInterposition=new Interposition(EventTargetInterposition);RemoteBrowserElementInterposition.getters.docShell=function(addon,target){let remoteChromeGlobal=RemoteAddonsParent.browserToGlobal.get(target);if(!remoteChromeGlobal){return null;}
return remoteChromeGlobal.docShell;};let RemoteAddonsParent={init:function(){let mm=Cc["@mozilla.org/globalmessagemanager;1"].getService(Ci.nsIMessageListenerManager);mm.addMessageListener("Addons:RegisterGlobal",this);this.globalToBrowser=new WeakMap();this.browserToGlobal=new WeakMap();},getInterfaceInterpositions:function(){let result={};function register(intf,interp){result[intf.number]=interp;}
register(Ci.nsICategoryManager,CategoryManagerInterposition);register(Ci.nsIComponentRegistrar,ComponentRegistrarInterposition);register(Ci.nsIObserverService,ObserverInterposition);register(Ci.nsIXPCComponents_Utils,ComponentsUtilsInterposition);return result;},getTaggedInterpositions:function(){let result={};function register(tag,interp){result[tag]=interp;}
register("EventTarget",EventTargetInterposition);register("ContentDocShellTreeItem",ContentDocShellTreeItemInterposition);register("ContentDocument",ContentDocumentInterposition);register("RemoteBrowserElement",RemoteBrowserElementInterposition);return result;},receiveMessage:function(msg){switch(msg.name){case"Addons:RegisterGlobal":this.browserToGlobal.set(msg.target,msg.objects.global);this.globalToBrowser.set(msg.objects.global,msg.target);break;}}};