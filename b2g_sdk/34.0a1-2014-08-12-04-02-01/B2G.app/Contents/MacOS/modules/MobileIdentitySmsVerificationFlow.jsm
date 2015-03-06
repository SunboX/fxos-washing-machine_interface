"use strict";this.EXPORTED_SYMBOLS=["MobileIdentitySmsVerificationFlow"];const{classes:Cc,interfaces:Ci,utils:Cu}=Components;Cu.import("resource://gre/modules/MobileIdentityCommon.jsm");Cu.import("resource://gre/modules/MobileIdentityVerificationFlow.jsm");Cu.import("resource://gre/modules/Promise.jsm");Cu.import("resource://gre/modules/XPCOMUtils.jsm");this.MobileIdentitySmsVerificationFlow=function(aVerificationOptions,aUI,aClient,aVerifyStrategy){this.smsVerifyStrategy=aVerifyStrategy;log.debug("aVerificationOptions ${}",aVerificationOptions);MobileIdentityVerificationFlow.call(this,aVerificationOptions,aUI,aClient,this._verifyStrategy,this._cleanupStrategy);};this.MobileIdentitySmsVerificationFlow.prototype={__proto__:MobileIdentityVerificationFlow.prototype,observedSilentNumber:null,onSilentSms:null,_verifyStrategy:function(){if(!this.smsVerifyStrategy){return Promise.reject(ERROR_INTERNAL_UNEXPECTED);}




return this.smsVerifyStrategy();},_cleanupStrategy:function(){}};