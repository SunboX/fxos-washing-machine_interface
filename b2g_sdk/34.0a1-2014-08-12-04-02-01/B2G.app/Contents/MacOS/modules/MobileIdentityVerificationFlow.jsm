"use strict";this.EXPORTED_SYMBOLS=["MobileIdentityVerificationFlow"];const{utils:Cu,classes:Cc,interfaces:Ci}=Components;Cu.import("resource://gre/modules/MobileIdentityCommon.jsm");Cu.import("resource://gre/modules/Promise.jsm");Cu.import("resource://gre/modules/XPCOMUtils.jsm");this.MobileIdentityVerificationFlow=function(aVerificationOptions,aUI,aClient,aVerifyStrategy,aCleanupStrategy){this.verificationOptions=aVerificationOptions;this.ui=aUI;this.client=aClient;this.retries=VERIFICATIONCODE_RETRIES;this.verifyStrategy=aVerifyStrategy;this.cleanupStrategy=aCleanupStrategy;};MobileIdentityVerificationFlow.prototype={doVerification:function(){log.debug("Start verification flow");return this.register().then((registerResult)=>{log.debug("Register result ${}",registerResult);if(!registerResult||!registerResult.msisdnSessionToken){return Promise.reject(ERROR_INTERNAL_UNEXPECTED);}
this.sessionToken=registerResult.msisdnSessionToken;return this._doVerification();})},_doVerification:function(){log.debug("_doVerification");
if(!this.timer){log.debug("Creating verification code timer");this.timerCreation=Date.now();this.timer=Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);this.timer.initWithCallback(this.onVerificationCodeTimeout.bind(this),VERIFICATIONCODE_TIMEOUT,this.timer.TYPE_ONE_SHOT);}
if(!this.verifyStrategy){return Promise.reject(ERROR_INTERNAL_INVALID_VERIFICATION_FLOW);}
this.verificationCodeDeferred=Promise.defer();this.verifyStrategy().then(()=>{

if(this.verificationOptions.external){let timeLeft=0;if(this.timer){timeLeft=this.timerCreation+VERIFICATIONCODE_TIMEOUT-
Date.now();}
this.ui.verificationCodePrompt(this.retries,VERIFICATIONCODE_TIMEOUT/1000,timeLeft/1000).then((verificationCode)=>{if(!verificationCode){return this.verificationCodeDeferred.reject(ERROR_INTERNAL_INVALID_PROMPT_RESULT);}


this.ui.verify();this.verificationCodeDeferred.resolve(verificationCode);});}else{this.ui.verify();}},(reason)=>{this.verificationCodeDeferred.reject(reason);});return this.verificationCodeDeferred.promise.then(this.onVerificationCode.bind(this));},



onVerificationCode:function(aVerificationCode){log.debug("onVerificationCode "+aVerificationCode);if(!aVerificationCode){this.ui.error(ERROR_INVALID_VERIFICATION_CODE);return this._doVerification();}




this.verifying=true;return this.verifyCode(aVerificationCode).then((result)=>{if(!result){return Promise.reject(INTERNAL_UNEXPECTED);}


this.verificationOptions.sessionToken=this.sessionToken;this.verificationOptions.msisdn=result.msisdn||this.verificationOptions.msisdn;return this.verificationOptions;},(error)=>{log.error("Verification code error "+error);this.retries--;log.error("Retries left "+this.retries);if(!this.retries){this.ui.error(ERROR_NO_RETRIES_LEFT);return Promise.reject(ERROR_NO_RETRIES_LEFT);}
this.verifying=false;if(this.queuedTimeout){this.onVerificationCodeTimeout();}
return this._doVerification();});},onVerificationCodeTimeout:function(){


if(this.verifying){this.queuedTimeout=true;return;}

if(this.verificationCodeDeferred){this.verificationCodeDeferred.reject(ERROR_VERIFICATION_CODE_TIMEOUT);}
this.ui.error(ERROR_VERIFICATION_CODE_TIMEOUT);},register:function(){return this.client.register();},verifyCode:function(aVerificationCode){return this.client.verifyCode(this.sessionToken,aVerificationCode);},unregister:function(){return this.client.unregister(this.sessionToken);},cleanup:function(aUnregister=false){log.debug("Verification flow cleanup");this.queuedTimeout=false;this.retries=VERIFICATIONCODE_RETRIES;if(this.timer){this.timer.cancel();this.timer=null;}
if(aUnregister){this.unregister().then(()=>{this.sessionToken=null;});}
if(this.cleanupStrategy){this.cleanupStrategy();}}};