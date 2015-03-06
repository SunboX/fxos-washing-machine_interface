"use strict";const{classes:Cc,interfaces:Ci,utils:Cu,results:Cr}=Components;Cu.import("resource://gre/modules/Services.jsm");Cu.import("resource://gre/modules/XPCOMUtils.jsm");XPCOMUtils.defineLazyModuleGetter(this,"FormAutofill","resource://gre/modules/FormAutofill.jsm");function FormAutofillStartup(){}
FormAutofillStartup.prototype={classID:Components.ID("{51c95b3d-7431-467b-8d50-383f158ce9e5}"),QueryInterface:XPCOMUtils.generateQI([Ci.nsIFrameMessageListener,Ci.nsIObserver,Ci.nsISupportsWeakReference,]), observe:function(aSubject,aTopic,aData){


let globalMM=Cc["@mozilla.org/globalmessagemanager;1"].getService(Ci.nsIMessageListenerManager);globalMM.addMessageListener("FormAutofill:RequestAutocomplete",this);}, receiveMessage:function(aMessage){

FormAutofill.processRequestAutocomplete(aMessage.data).catch(ex=>{exception:ex}).then(result=>{
let browserMM=aMessage.target.messageManager;browserMM.sendAsyncMessage("FormAutofill:RequestAutocompleteResult",result);}).catch(Cu.reportError);},};this.NSGetFactory=XPCOMUtils.generateNSGetFactory([FormAutofillStartup]);