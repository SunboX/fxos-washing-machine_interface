"use strict";const{classes:Cc,interfaces:Ci,utils:Cu}=Components;Cu.import("resource://gre/modules/XPCOMUtils.jsm");Cu.import("resource://gre/modules/Services.jsm");
const kPaymentShimFile="chrome://b2g/content/payment.js";const kOpenPaymentConfirmationEvent="open-payment-confirmation-dialog";const kOpenPaymentFlowEvent="open-payment-flow-dialog";const PREF_DEBUG="dom.payment.debug";XPCOMUtils.defineLazyServiceGetter(this,"uuidgen","@mozilla.org/uuid-generator;1","nsIUUIDGenerator");XPCOMUtils.defineLazyModuleGetter(this,"SystemAppProxy","resource://gre/modules/SystemAppProxy.jsm");function PaymentUI(){try{this._debug=Services.prefs.getPrefType(PREF_DEBUG)==Ci.nsIPrefBranch.PREF_BOOL&&Services.prefs.getBoolPref(PREF_DEBUG);}catch(e){this._debug=false;}}
PaymentUI.prototype={confirmPaymentRequest:function confirmPaymentRequest(aRequestId,aRequests,aSuccessCb,aErrorCb){let _error=function _error(errorMsg){if(aErrorCb){aErrorCb.onresult(aRequestId,errorMsg);}};
let id=kOpenPaymentConfirmationEvent+"-"+this.getRandomId();let detail={type:kOpenPaymentConfirmationEvent,id:id,requestId:aRequestId,paymentRequests:aRequests};

this._handleSelection=(function _handleSelection(evt){let msg=evt.detail;if(msg.id!=id){return;}
if(msg.userSelection&&aSuccessCb){aSuccessCb.onresult(aRequestId,msg.userSelection);}else if(msg.errorMsg){_error(msg.errorMsg);}
SystemAppProxy.removeEventListener("mozContentEvent",this._handleSelection);this._handleSelection=null;}).bind(this);SystemAppProxy.addEventListener("mozContentEvent",this._handleSelection);SystemAppProxy.dispatchEvent(detail);},showPaymentFlow:function showPaymentFlow(aRequestId,aPaymentFlowInfo,aErrorCb){let _error=function _error(errorMsg){if(aErrorCb){aErrorCb.onresult(aRequestId,errorMsg);}};let id=kOpenPaymentFlowEvent+"-"+this.getRandomId();let detail={type:kOpenPaymentFlowEvent,id:id,requestId:aRequestId,uri:aPaymentFlowInfo.uri,method:aPaymentFlowInfo.requestMethod,jwt:aPaymentFlowInfo.jwt};

this._loadPaymentShim=(function _loadPaymentShim(evt){let msg=evt.detail;if(msg.id!=id){return;}
if(msg.errorMsg){SystemAppProxy.removeEventListener("mozContentEvent",this._loadPaymentShim);this._loadPaymentShim=null;_error("ERROR_LOADING_PAYMENT_SHIM: "+msg.errorMsg);return;}
if(!msg.frame){SystemAppProxy.removeEventListener("mozContentEvent",this._loadPaymentShim);this._loadPaymentShim=null;_error("ERROR_LOADING_PAYMENT_SHIM");return;}

let frame=msg.frame;let frameLoader=frame.QueryInterface(Ci.nsIFrameLoaderOwner).frameLoader;let mm=frameLoader.messageManager;try{mm.loadFrameScript(kPaymentShimFile,true,true);mm.sendAsyncMessage("Payment:LoadShim",{requestId:aRequestId});}catch(e){if(this._debug){this.LOG("Error loading "+kPaymentShimFile+" as a frame script: "
+e);}
_error("ERROR_LOADING_PAYMENT_SHIM");}finally{SystemAppProxy.removeEventListener("mozContentEvent",this._loadPaymentShim);this._loadPaymentShim=null;}}).bind(this);SystemAppProxy.addEventListener("mozContentEvent",this._loadPaymentShim);
 this._notifyPayFlowClosed=(function _notifyPayFlowClosed(evt){let msg=evt.detail;if(msg.id!=id){return;}
if(msg.type!='cancel'){return;}
if(msg.errorMsg){_error(msg.errorMsg);}
SystemAppProxy.removeEventListener("mozContentEvent",this._notifyPayFlowClosed);this._notifyPayFlowClosed=null;}).bind(this);SystemAppProxy.addEventListener("mozContentEvent",this._notifyPayFlowClosed);SystemAppProxy.dispatchEvent(detail);},cleanup:function cleanup(){if(this._handleSelection){SystemAppProxy.removeEventListener("mozContentEvent",this._handleSelection);this._handleSelection=null;}
if(this._notifyPayFlowClosed){SystemAppProxy.removeEventListener("mozContentEvent",this._notifyPayFlowClosed);this._notifyPayFlowClosed=null;}
if(this._loadPaymentShim){SystemAppProxy.removeEventListener("mozContentEvent",this._loadPaymentShim);this._loadPaymentShim=null;}},getRandomId:function getRandomId(){return uuidgen.generateUUID().toString();},LOG:function LOG(s){if(!this._debug){return;}
dump("-*- PaymentGlue: "+s+"\n");},classID:Components.ID("{8b83eabc-7929-47f4-8b48-4dea8d887e4b}"),QueryInterface:XPCOMUtils.generateQI([Ci.nsIPaymentUIGlue])}
this.NSGetFactory=XPCOMUtils.generateNSGetFactory([PaymentUI]);