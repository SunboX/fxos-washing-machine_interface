const{classes:Cc,interfaces:Ci,utils:Cu}=Components;Cu.import("resource://gre/modules/Services.jsm");Cu.import("resource://gre/modules/XPCOMUtils.jsm");XPCOMUtils.defineLazyModuleGetter(this,"SocialService","resource://gre/modules/SocialService.jsm");XPCOMUtils.defineLazyModuleGetter(this,"Social","resource:///modules/Social.jsm");XPCOMUtils.defineLazyModuleGetter(this,"Chat","resource:///modules/Chat.jsm");XPCOMUtils.defineLazyModuleGetter(this,"PrivateBrowsingUtils","resource://gre/modules/PrivateBrowsingUtils.jsm");this.EXPORTED_SYMBOLS=["MozSocialAPI","openChatWindow","findChromeWindowForChats","closeAllChatWindows","hookWindowCloseForPanelClose"];this.MozSocialAPI={_enabled:false,_everEnabled:false,set enabled(val){let enable=!!val;if(enable==this._enabled){return;}
this._enabled=enable;if(enable){Services.obs.addObserver(injectController,"document-element-inserted",false);if(!this._everEnabled){this._everEnabled=true;Services.telemetry.getHistogramById("SOCIAL_ENABLED_ON_SESSION").add(true);}}else{Services.obs.removeObserver(injectController,"document-element-inserted");}}};function injectController(doc,topic,data){try{let window=doc.defaultView;if(!window||PrivateBrowsingUtils.isWindowPrivate(window))
return; if(doc.documentURIObject.scheme=="about"){return;}
let containingBrowser=window.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation).QueryInterface(Ci.nsIDocShell).chromeEventHandler;
 let allowTabs=false;try{allowTabs=containingBrowser.contentWindow==window&&Services.prefs.getBoolPref("social.debug.injectIntoTabs");}catch(e){}
let origin=containingBrowser.getAttribute("origin");if(!allowTabs&&!origin){return;}


hookWindowCloseForPanelClose(window);SocialService.getProvider(doc.nodePrincipal.origin,function(provider){if(provider&&provider.enabled){attachToWindow(provider,window);}});}catch(e){Cu.reportError("MozSocialAPI injectController: unable to attachToWindow for "+doc.location+": "+e);}}
function attachToWindow(provider,targetWindow){
let targetDocURI=targetWindow.document.documentURIObject;if(!provider.isSameOrigin(targetDocURI)){let msg="MozSocialAPI: not attaching mozSocial API for "+provider.origin+" to "+targetDocURI.spec+" since origins differ."
Services.console.logStringMessage(msg);return;}
let port=provider.workerURL?provider.getWorkerPort(targetWindow):null;let mozSocialObj={
getWorker:{enumerable:true,configurable:true,writable:true,value:function(){return{port:port,__exposedProps__:{port:"r"}};}},hasBeenIdleFor:{enumerable:true,configurable:true,writable:true,value:function(){return false;}},openChatWindow:{enumerable:true,configurable:true,writable:true,value:function(toURL,callback){let url=targetWindow.document.documentURIObject.resolve(toURL);openChatWindow(targetWindow,provider,url,callback);}},openPanel:{enumerable:true,configurable:true,writable:true,value:function(toURL,offset,callback){let chromeWindow=getChromeWindow(targetWindow);if(!chromeWindow.SocialFlyout)
return;let url=targetWindow.document.documentURIObject.resolve(toURL);if(!provider.isSameOrigin(url))
return;chromeWindow.SocialFlyout.open(url,offset,callback);}},closePanel:{enumerable:true,configurable:true,writable:true,value:function(toURL,offset,callback){let chromeWindow=getChromeWindow(targetWindow);if(!chromeWindow.SocialFlyout||!chromeWindow.SocialFlyout.panel)
return;chromeWindow.SocialFlyout.panel.hidePopup();}}, share:{enumerable:true,configurable:true,writable:true,value:function(data){let chromeWindow=getChromeWindow(targetWindow);if(!chromeWindow.SocialShare||chromeWindow.SocialShare.shareButton.hidden)
throw new Error("Share is unavailable"); let dwu=chromeWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);if(!dwu.isHandlingUserInput)
throw new Error("Attempt to share without user input"); let dataOut={};for(let sub of["url","title","description","source"]){dataOut[sub]=data[sub];}
if(data.image)
dataOut.previews=[data.image];chromeWindow.SocialShare.sharePage(null,dataOut);}},getAttention:{enumerable:true,configurable:true,writable:true,value:function(){getChromeWindow(targetWindow).getAttention();}},isVisible:{enumerable:true,configurable:true,get:function(){return targetWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation).QueryInterface(Ci.nsIDocShell).isActive;}}};let contentObj=Cu.createObjectIn(targetWindow);Object.defineProperties(contentObj,mozSocialObj);Cu.makeObjectPropsNormal(contentObj);targetWindow.navigator.wrappedJSObject.__defineGetter__("mozSocial",function(){


delete targetWindow.navigator.wrappedJSObject.mozSocial;return targetWindow.navigator.wrappedJSObject.mozSocial=contentObj;});if(port){targetWindow.addEventListener("unload",function(){

schedule(function(){port.close();});});}}
function hookWindowCloseForPanelClose(targetWindow){


let dwu=targetWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);dwu.allowScriptsToClose();targetWindow.addEventListener("DOMWindowClose",function _mozSocialDOMWindowClose(evt){let elt=targetWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation).QueryInterface(Ci.nsIDocShell).chromeEventHandler;while(elt){if(elt.localName=="panel"){elt.hidePopup();break;}else if(elt.localName=="chatbox"){elt.close();break;}
elt=elt.parentNode;}




evt.preventDefault();},true);}
function schedule(callback){Services.tm.mainThread.dispatch(callback,Ci.nsIThread.DISPATCH_NORMAL);}
function getChromeWindow(contentWin){return contentWin.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation).QueryInterface(Ci.nsIDocShellTreeItem).rootTreeItem.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindow);}
this.openChatWindow=function openChatWindow(contentWindow,provider,url,callback,mode){let fullURI=provider.resolveUri(url);if(!provider.isSameOrigin(fullURI)){Cu.reportError("Failed to open a social chat window - the requested URL is not the same origin as the provider.");return;}
let thisCallback=function(chatbox){Social.setErrorListener(chatbox.content,function(aBrowser){aBrowser.webNavigation.loadURI("about:socialerror?mode=compactInfo&origin="+
encodeURIComponent(aBrowser.getAttribute("origin")),null,null,null,null);});}
let chatbox=Chat.open(contentWindow,provider.origin,provider.name,fullURI.spec,mode,undefined,thisCallback);if(callback){chatbox.promiseChatLoaded.then(()=>{callback(chatbox.contentWindow);});}}
this.closeAllChatWindows=function closeAllChatWindows(provider){return Chat.closeAll(provider.origin);}