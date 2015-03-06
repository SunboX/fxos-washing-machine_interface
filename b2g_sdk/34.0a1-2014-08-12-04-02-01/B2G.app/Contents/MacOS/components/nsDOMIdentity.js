"use strict";const{classes:Cc,interfaces:Ci,utils:Cu}=Components;const PREF_DEBUG="toolkit.identity.debug";const PREF_ENABLED="dom.identity.enabled";
const PREF_SYNTHETIC_EVENTS_OK="dom.identity.syntheticEventsOk";const MAX_STRING_LENGTH=2048;const MAX_RP_CALLS=100;Cu.import("resource://gre/modules/Services.jsm");Cu.import("resource://gre/modules/XPCOMUtils.jsm");XPCOMUtils.defineLazyModuleGetter(this,"checkDeprecated","resource://gre/modules/identity/IdentityUtils.jsm");XPCOMUtils.defineLazyModuleGetter(this,"checkRenamed","resource://gre/modules/identity/IdentityUtils.jsm");XPCOMUtils.defineLazyModuleGetter(this,"objectCopy","resource://gre/modules/identity/IdentityUtils.jsm");XPCOMUtils.defineLazyServiceGetter(this,"uuidgen","@mozilla.org/uuid-generator;1","nsIUUIDGenerator");XPCOMUtils.defineLazyServiceGetter(this,"cpmm","@mozilla.org/childprocessmessagemanager;1","nsIMessageSender");const ERRORS={"ERROR_INVALID_ASSERTION_AUDIENCE":"Assertion audience may not differ from origin","ERROR_REQUEST_WHILE_NOT_HANDLING_USER_INPUT":"The request() method may only be invoked when handling user input",};function nsDOMIdentity(aIdentityInternal){this._identityInternal=aIdentityInternal;}
nsDOMIdentity.prototype={__exposedProps__:{watch:'r',request:'r',logout:'r',get:'r',getVerifiedEmail:'r', beginProvisioning:'r',genKeyPair:'r',registerCertificate:'r',raiseProvisioningFailure:'r', beginAuthentication:'r',completeAuthentication:'r',raiseAuthenticationFailure:'r'}, get nativeEventsRequired(){if(Services.prefs.prefHasUserValue(PREF_SYNTHETIC_EVENTS_OK)&&(Services.prefs.getPrefType(PREF_SYNTHETIC_EVENTS_OK)===Ci.nsIPrefBranch.PREF_BOOL)){return!Services.prefs.getBoolPref(PREF_SYNTHETIC_EVENTS_OK);}
return true;},reportErrors:function(message){let onerror=function(){};if(this._rpWatcher&&this._rpWatcher.onerror){onerror=this._rpWatcher.onerror;}
message.errors.forEach((error)=>{ Cu.reportError(ERRORS[error]); onerror(error);});},watch:function nsDOMIdentity_watch(aOptions={}){aOptions=Cu.waiveXrays(aOptions);if(this._rpWatcher){


throw new Error("navigator.id.watch was already called");}
assertCorrectCallbacks(aOptions);let message=this.DOMIdentityMessage(aOptions);


checkRenamed(aOptions,"loggedInEmail","loggedInUser");message["loggedInUser"]=aOptions["loggedInUser"];let emailType=typeof(aOptions["loggedInUser"]);if(aOptions["loggedInUser"]&&aOptions["loggedInUser"]!=="undefined"){if(emailType!=="string"){throw new Error("loggedInUser must be a String or null");} 
if(aOptions["loggedInUser"].indexOf("@")==-1||aOptions["loggedInUser"].length>MAX_STRING_LENGTH){throw new Error("loggedInUser is not valid");}
message.loggedInUser=aOptions.loggedInUser;}
this._log("loggedInUser: "+message.loggedInUser);this._rpWatcher=aOptions;this._rpWatcher.audience=message.audience;if(message.errors.length){this.reportErrors(message);
return;}
this._identityInternal._mm.sendAsyncMessage("Identity:RP:Watch",message,null,this._window.document.nodePrincipal);},request:function nsDOMIdentity_request(aOptions={}){aOptions=Cu.waiveXrays(aOptions);this._log("request: "+JSON.stringify(aOptions));if(!this._rpWatcher){throw new Error("navigator.id.request called before navigator.id.watch");}
if(this._rpCalls>MAX_RP_CALLS){throw new Error("navigator.id.request called too many times");}
let util=this._window.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);let message=this.DOMIdentityMessage(aOptions);


if(!aOptions._internal&&this._appStatus!==Ci.nsIPrincipal.APP_STATUS_CERTIFIED&&this._appStatus!==Ci.nsIPrincipal.APP_STATUS_PRIVILEGED){

let util=this._window.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);if(!util.isHandlingUserInput&&this.nativeEventsRequired){message.errors.push("ERROR_REQUEST_WHILE_NOT_HANDLING_USER_INPUT");}}
if(message.errors.length){this.reportErrors(message);return;}
if(aOptions){ let optionalStringProps=["privacyPolicy","termsOfService"];for(let propName of optionalStringProps){if(!aOptions[propName]||aOptions[propName]==="undefined")
continue;if(typeof(aOptions[propName])!=="string"){throw new Error(propName+" must be a string representing a URL.");}
if(aOptions[propName].length>MAX_STRING_LENGTH){throw new Error(propName+" is invalid.");}
message[propName]=aOptions[propName];}
if(aOptions["oncancel"]&&typeof(aOptions["oncancel"])!=="function"){throw new Error("oncancel is not a function");}else{this._onCancelRequestCallback=aOptions.oncancel;}}
this._rpCalls++;this._identityInternal._mm.sendAsyncMessage("Identity:RP:Request",message,null,this._window.document.nodePrincipal);},logout:function nsDOMIdentity_logout(){if(!this._rpWatcher){throw new Error("navigator.id.logout called before navigator.id.watch");}
if(this._rpCalls>MAX_RP_CALLS){throw new Error("navigator.id.logout called too many times");}
this._rpCalls++;let message=this.DOMIdentityMessage();if(message.errors.length){this.reportErrors(message);return;}
this._identityInternal._mm.sendAsyncMessage("Identity:RP:Logout",message,null,this._window.document.nodePrincipal);},get:function nsDOMIdentity_get(aCallback,aOptions){var opts={};aOptions=aOptions||{};

this._rpWatcher=null;

opts._internal=true;opts.privacyPolicy=aOptions.privacyPolicy||undefined;opts.termsOfService=aOptions.termsOfService||undefined;opts.privacyURL=aOptions.privacyURL||undefined;opts.tosURL=aOptions.tosURL||undefined;opts.siteName=aOptions.siteName||undefined;opts.siteLogo=aOptions.siteLogo||undefined;opts.oncancel=function get_oncancel(){if(aCallback){aCallback(null);aCallback=null;}};if(checkDeprecated(aOptions,"silent")){

 if(aCallback){setTimeout(function(){aCallback(null);},0);}
return;}
var self=this;this.watch({_internal:true,onlogin:function get_onlogin(assertion,internalParams){if(assertion&&aCallback&&internalParams&&!internalParams.silent){aCallback(assertion);aCallback=null;}},onlogout:function get_onlogout(){},onready:function get_onready(){self.request(opts);}});},getVerifiedEmail:function nsDOMIdentity_getVerifiedEmail(aCallback){Cu.reportError("WARNING: getVerifiedEmail has been deprecated");this.get(aCallback,{});},beginProvisioning:function nsDOMIdentity_beginProvisioning(aCallback){this._log("beginProvisioning");if(this._beginProvisioningCallback){throw new Error("navigator.id.beginProvisioning already called.");}
if(!aCallback||typeof(aCallback)!=="function"){throw new Error("beginProvisioning callback is required.");}
this._beginProvisioningCallback=aCallback;this._identityInternal._mm.sendAsyncMessage("Identity:IDP:BeginProvisioning",this.DOMIdentityMessage(),null,this._window.document.nodePrincipal);},genKeyPair:function nsDOMIdentity_genKeyPair(aCallback){this._log("genKeyPair");if(!this._beginProvisioningCallback){throw new Error("navigator.id.genKeyPair called outside of provisioning");}
if(this._genKeyPairCallback){throw new Error("navigator.id.genKeyPair already called.");}
if(!aCallback||typeof(aCallback)!=="function"){throw new Error("genKeyPair callback is required.");}
this._genKeyPairCallback=aCallback;this._identityInternal._mm.sendAsyncMessage("Identity:IDP:GenKeyPair",this.DOMIdentityMessage(),null,this._window.document.nodePrincipal);},registerCertificate:function nsDOMIdentity_registerCertificate(aCertificate){this._log("registerCertificate");if(!this._genKeyPairCallback){throw new Error("navigator.id.registerCertificate called outside of provisioning");}
if(this._provisioningEnded){throw new Error("Provisioning already ended");}
this._provisioningEnded=true;let message=this.DOMIdentityMessage();message.cert=aCertificate;this._identityInternal._mm.sendAsyncMessage("Identity:IDP:RegisterCertificate",message,null,this._window.document.nodePrincipal);},raiseProvisioningFailure:function nsDOMIdentity_raiseProvisioningFailure(aReason){this._log("raiseProvisioningFailure '"+aReason+"'");if(this._provisioningEnded){throw new Error("Provisioning already ended");}
if(!aReason||typeof(aReason)!="string"){throw new Error("raiseProvisioningFailure reason is required");}
this._provisioningEnded=true;let message=this.DOMIdentityMessage();message.reason=aReason;this._identityInternal._mm.sendAsyncMessage("Identity:IDP:ProvisioningFailure",message,null,this._window.document.nodePrincipal);},beginAuthentication:function nsDOMIdentity_beginAuthentication(aCallback){this._log("beginAuthentication");if(this._beginAuthenticationCallback){throw new Error("navigator.id.beginAuthentication already called.");}
if(typeof(aCallback)!=="function"){throw new Error("beginAuthentication callback is required.");}
if(!aCallback||typeof(aCallback)!=="function"){throw new Error("beginAuthentication callback is required.");}
this._beginAuthenticationCallback=aCallback;this._identityInternal._mm.sendAsyncMessage("Identity:IDP:BeginAuthentication",this.DOMIdentityMessage(),null,this._window.document.nodePrincipal);},completeAuthentication:function nsDOMIdentity_completeAuthentication(){if(this._authenticationEnded){throw new Error("Authentication already ended");}
if(!this._beginAuthenticationCallback){throw new Error("navigator.id.completeAuthentication called outside of authentication");}
this._authenticationEnded=true;this._identityInternal._mm.sendAsyncMessage("Identity:IDP:CompleteAuthentication",this.DOMIdentityMessage(),null,this._window.document.nodePrincipal);},raiseAuthenticationFailure:function nsDOMIdentity_raiseAuthenticationFailure(aReason){if(this._authenticationEnded){throw new Error("Authentication already ended");}
if(!aReason||typeof(aReason)!="string"){throw new Error("raiseProvisioningFailure reason is required");}
let message=this.DOMIdentityMessage();message.reason=aReason;this._identityInternal._mm.sendAsyncMessage("Identity:IDP:AuthenticationFailure",message,null,this._window.document.nodePrincipal);},_init:function nsDOMIdentity__init(aWindow){this._initializeState();this._window=aWindow;this._origin=aWindow.document.nodePrincipal.origin;this._appStatus=aWindow.document.nodePrincipal.appStatus;this._appId=aWindow.document.nodePrincipal.appId;let util=aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);this._id=this._identityInternal._id;},_initializeState:function nsDOMIdentity__initializeState(){
 this._rpCalls=0;this._provisioningEnded=false;this._authenticationEnded=false;this._rpWatcher=null;this._onCancelRequestCallback=null;this._beginProvisioningCallback=null;this._genKeyPairCallback=null;this._beginAuthenticationCallback=null;},_receiveMessage:function nsDOMIdentity_receiveMessage(aMessage){let msg=aMessage.json;switch(aMessage.name){case"Identity:ResetState":if(!this._identityInternal._debug){return;}
this._initializeState();Services.obs.notifyObservers(null,"identity-DOM-state-reset",this._id);break;case"Identity:RP:Watch:OnLogin":if(!this._rpWatcher){this._log("WARNING: Received OnLogin message, but there is no RP watcher");return;}
if(this._rpWatcher.onlogin){if(this._rpWatcher._internal){this._rpWatcher.onlogin(msg.assertion,msg._internalParams);}else{this._rpWatcher.onlogin(msg.assertion);}}
break;case"Identity:RP:Watch:OnLogout":if(!this._rpWatcher){this._log("WARNING: Received OnLogout message, but there is no RP watcher");return;}
if(this._rpWatcher.onlogout){this._rpWatcher.onlogout();}
break;case"Identity:RP:Watch:OnReady":if(!this._rpWatcher){this._log("WARNING: Received OnReady message, but there is no RP watcher");return;}
if(this._rpWatcher.onready){this._rpWatcher.onready();}
break;case"Identity:RP:Watch:OnCancel":if(!this._rpWatcher){this._log("WARNING: Received OnCancel message, but there is no RP "+"watcher");return;}
if(this._onCancelRequestCallback){this._onCancelRequestCallback();}
break;case"Identity:RP:Watch:OnError":if(!this._rpWatcher){this._log("WARNING: Received OnError message, but there is no RP "+"watcher");return;}
if(this._rpWatcher.onerror){this._rpWatcher.onerror(JSON.stringify({name:msg.message.error}));}
break;case"Identity:IDP:CallBeginProvisioningCallback":this._callBeginProvisioningCallback(msg);break;case"Identity:IDP:CallGenKeyPairCallback":this._callGenKeyPairCallback(msg);break;case"Identity:IDP:CallBeginAuthenticationCallback":this._callBeginAuthenticationCallback(msg);break;}},_log:function nsDOMIdentity__log(msg){this._identityInternal._log(msg);},_callGenKeyPairCallback:function nsDOMIdentity__callGenKeyPairCallback(message){ let chrome_pubkey=JSON.parse(message.publicKey); function genPropDesc(value){return{enumerable:true,configurable:true,writable:true,value:value};}
let propList={};for(let k in chrome_pubkey){propList[k]=genPropDesc(chrome_pubkey[k]);}
let pubkey=Cu.createObjectIn(this._window);Object.defineProperties(pubkey,propList);Cu.makeObjectPropsNormal(pubkey); this._genKeyPairCallback(pubkey);},_callBeginProvisioningCallback:function nsDOMIdentity__callBeginProvisioningCallback(message){let identity=message.identity;let certValidityDuration=message.certDuration;this._beginProvisioningCallback(identity,certValidityDuration);},_callBeginAuthenticationCallback:function nsDOMIdentity__callBeginAuthenticationCallback(message){let identity=message.identity;this._beginAuthenticationCallback(identity);},DOMIdentityMessage:function DOMIdentityMessage(aOptions){aOptions=aOptions||{};let message={errors:[]};objectCopy(aOptions,message); message.id=this._id; message.origin=this._origin;


let _audience=message.origin;if(message.audience&&message.audience!=message.origin){if(this._appStatus===Ci.nsIPrincipal.APP_STATUS_CERTIFIED){_audience=message.audience;this._log("Certified app setting assertion audience: "+_audience);}else{message.errors.push("ERROR_INVALID_ASSERTION_AUDIENCE");}} 
message.audience=_audience;this._log("DOMIdentityMessage: "+JSON.stringify(message));return message;},uninit:function DOMIdentity_uninit(){this._log("nsDOMIdentity uninit() "+this._id);this._identityInternal._mm.sendAsyncMessage("Identity:RP:Unwatch",{id:this._id},null,this._window.document.nodePrincipal);}};function nsDOMIdentityInternal(){}
nsDOMIdentityInternal.prototype={ receiveMessage:function nsDOMIdentityInternal_receiveMessage(aMessage){let msg=aMessage.json;if(msg.id!=this._id){return;}
this._identity._receiveMessage(aMessage);}, observe:function nsDOMIdentityInternal_observe(aSubject,aTopic,aData){let wId=aSubject.QueryInterface(Ci.nsISupportsPRUint64).data;if(wId!=this._innerWindowID){return;}
this._identity.uninit();Services.obs.removeObserver(this,"inner-window-destroyed");this._identity._initializeState();this._identity=null;
try{for(let msgName of this._messages){this._mm.removeMessageListener(msgName,this);}}catch(ex){}
this._mm=null;}, init:function nsDOMIdentityInternal_init(aWindow){if(Services.prefs.getPrefType(PREF_ENABLED)!=Ci.nsIPrefBranch.PREF_BOOL||!Services.prefs.getBoolPref(PREF_ENABLED)){return null;}
this._debug=Services.prefs.getPrefType(PREF_DEBUG)==Ci.nsIPrefBranch.PREF_BOOL&&Services.prefs.getBoolPref(PREF_DEBUG);let util=aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);

this._id=uuidgen.generateUUID().toString();this._innerWindowID=util.currentInnerWindowID;
this._identity=new nsDOMIdentity(this);this._identity._init(aWindow);this._log("init was called from "+aWindow.document.location);this._mm=cpmm;this._messages=["Identity:ResetState","Identity:RP:Watch:OnLogin","Identity:RP:Watch:OnLogout","Identity:RP:Watch:OnReady","Identity:RP:Watch:OnCancel","Identity:RP:Watch:OnError","Identity:IDP:CallBeginProvisioningCallback","Identity:IDP:CallGenKeyPairCallback","Identity:IDP:CallBeginAuthenticationCallback"];this._messages.forEach(function(msgName){this._mm.addMessageListener(msgName,this);},this);Services.obs.addObserver(this,"inner-window-destroyed",false);return this._identity;},_log:function nsDOMIdentityInternal__log(msg){if(!this._debug){return;}
dump("nsDOMIdentity ("+this._id+"): "+msg+"\n");},classID:Components.ID("{210853d9-2c97-4669-9761-b1ab9cbf57ef}"),QueryInterface:XPCOMUtils.generateQI([Ci.nsIDOMGlobalPropertyInitializer,Ci.nsIMessageListener]),classInfo:XPCOMUtils.generateCI({classID:Components.ID("{210853d9-2c97-4669-9761-b1ab9cbf57ef}"),contractID:"@mozilla.org/dom/identity;1",interfaces:[],classDescription:"Identity DOM Implementation"})};function assertCorrectCallbacks(aOptions){



let requiredCallbacks=["onlogin"];let optionalCallbacks=["onlogout","onready","onerror"];if(aOptions.wantIssuer=="firefox-accounts"){requiredCallbacks=["onlogin","onlogout","onready"];optionalCallbacks=["onerror"];}
for(let cbName of requiredCallbacks){if(typeof(aOptions[cbName])!="function"){throw new Error(cbName+" callback is required.");}}
for(let cbName of optionalCallbacks){if(aOptions[cbName]&&typeof(aOptions[cbName])!="function"){throw new Error(cbName+" must be a function");}}}
this.NSGetFactory=XPCOMUtils.generateNSGetFactory([nsDOMIdentityInternal]);