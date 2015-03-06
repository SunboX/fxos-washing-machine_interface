"use strict";this.EXPORTED_SYMBOLS=["MobileIdentityManager"];const{classes:Cc,interfaces:Ci,utils:Cu}=Components;Cu.import("resource://gre/modules/MobileIdentityCommon.jsm");Cu.import("resource://gre/modules/MobileIdentityUIGlueCommon.jsm");Cu.import("resource://gre/modules/Promise.jsm");Cu.import("resource://gre/modules/XPCOMUtils.jsm");XPCOMUtils.defineLazyModuleGetter(this,"MobileIdentityCredentialsStore","resource://gre/modules/MobileIdentityCredentialsStore.jsm");XPCOMUtils.defineLazyModuleGetter(this,"MobileIdentityClient","resource://gre/modules/MobileIdentityClient.jsm");XPCOMUtils.defineLazyModuleGetter(this,"MobileIdentitySmsMtVerificationFlow","resource://gre/modules/MobileIdentitySmsMtVerificationFlow.jsm");XPCOMUtils.defineLazyModuleGetter(this,"MobileIdentitySmsMoMtVerificationFlow","resource://gre/modules/MobileIdentitySmsMoMtVerificationFlow.jsm");XPCOMUtils.defineLazyModuleGetter(this,"PhoneNumberUtils","resource://gre/modules/PhoneNumberUtils.jsm");XPCOMUtils.defineLazyModuleGetter(this,"jwcrypto","resource://gre/modules/identity/jwcrypto.jsm");XPCOMUtils.defineLazyServiceGetter(this,"uuidgen","@mozilla.org/uuid-generator;1","nsIUUIDGenerator");XPCOMUtils.defineLazyServiceGetter(this,"ppmm","@mozilla.org/parentprocessmessagemanager;1","nsIMessageListenerManager");XPCOMUtils.defineLazyServiceGetter(this,"permissionManager","@mozilla.org/permissionmanager;1","nsIPermissionManager");XPCOMUtils.defineLazyServiceGetter(this,"securityManager","@mozilla.org/scriptsecuritymanager;1","nsIScriptSecurityManager");XPCOMUtils.defineLazyServiceGetter(this,"appsService","@mozilla.org/AppsService;1","nsIAppsService");this.MobileIdentityManager={init:function(){log.debug("MobileIdentityManager init");Services.obs.addObserver(this,"xpcom-shutdown",false);ppmm.addMessageListener(GET_ASSERTION_IPC_MSG,this);this.messageManagers={};this.keyPairs={};this.certificates={};},receiveMessage:function(aMessage){log.debug("Received "+aMessage.name);if(aMessage.name!==GET_ASSERTION_IPC_MSG){return;}
let msg=aMessage.json;
let promiseId=msg.promiseId;this.messageManagers[promiseId]=aMessage.target;this.getMobileIdAssertion(aMessage.principal,promiseId,msg.options);},observe:function(subject,topic,data){if(topic!="xpcom-shutdown"){return;}
ppmm.removeMessageListener(GET_ASSERTION_IPC_MSG,this);Services.obs.removeObserver(this,"xpcom-shutdown");this.messageManagers=null;},get iccInfo(){if(this._iccInfo){return this._iccInfo;}
return null;},get iccIds(){return null;},get credStore(){if(!this._credStore){this._credStore=new MobileIdentityCredentialsStore();this._credStore.init();}
return this._credStore;},get ui(){if(!this._ui){this._ui=Cc["@mozilla.org/services/mobileid-ui-glue;1"].createInstance(Ci.nsIMobileIdentityUIGlue);this._ui.oncancel=this.onUICancel.bind(this);this._ui.onresendcode=this.onUIResendCode.bind(this);}
return this._ui;},get client(){if(!this._client){this._client=new MobileIdentityClient();}
return this._client;},get isMultiSim(){return this.iccInfo&&this.iccInfo.length>1;},getVerificationOptionsForIcc:function(aServiceId){log.debug("getVerificationOptionsForIcc "+aServiceId);log.debug("iccInfo ${}",this.iccInfo[aServiceId]);


return this.credStore.getByIccId(this.iccInfo[aServiceId].iccId).then((creds)=>{if(creds){this.iccInfo[aServiceId].credentials=creds;return;}
return this.credStore.getByMsisdn(this.iccInfo[aServiceId].msisdn);}).then((creds)=>{if(creds){this.iccInfo[aServiceId].credentials=creds;return;}

if(Services.io.offline){return Promise.reject(ERROR_OFFLINE);}
return this.client.discover(this.iccInfo[aServiceId].msisdn,this.iccInfo[aServiceId].mcc,this.iccInfo[aServiceId].mnc,this.iccInfo[aServiceId].roaming);}).then((result)=>{log.debug("Discover result ${}",result);if(!result||!result.verificationMethods){return;}
this.iccInfo[aServiceId].verificationMethods=result.verificationMethods;this.iccInfo[aServiceId].verificationDetails=result.verificationDetails;this.iccInfo[aServiceId].canDoSilentVerification=(result.verificationMethods.indexOf(SMS_MO_MT)!=-1);return;});},getVerificationOptions:function(){log.debug("getVerificationOptions");

if(!this.iccInfo||!this.iccInfo.length){let deferred=Promise.defer();deferred.resolve(null);return deferred.promise;}
let promises=[];for(let i=0;i<this.iccInfo.length;i++){promises.push(this.getVerificationOptionsForIcc(i));}
return Promise.all(promises);},getKeyPair:function(aSessionToken){if(this.keyPairs[aSessionToken]&&this.keyPairs[aSessionToken].validUntil>this.client.hawk.now()){return Promise.resolve(this.keyPairs[aSessionToken].keyPair);}
let validUntil=this.client.hawk.now()+KEY_LIFETIME;let deferred=Promise.defer();jwcrypto.generateKeyPair("DS160",(error,kp)=>{if(error){return deferred.reject(error);}
this.keyPairs[aSessionToken]={keyPair:kp,validUntil:validUntil};delete this.certificates[aSessionToken];deferred.resolve(kp);});return deferred.promise;},getCertificate:function(aSessionToken,aPublicKey){log.debug("getCertificate");if(this.certificates[aSessionToken]&&this.certificates[aSessionToken].validUntil>this.client.hawk.now()){return Promise.resolve(this.certificates[aSessionToken].cert);}
if(Services.io.offline){return Promise.reject(ERROR_OFFLINE);}
let validUntil=this.client.hawk.now()+KEY_LIFETIME;let deferred=Promise.defer();this.client.sign(aSessionToken,CERTIFICATE_LIFETIME,aPublicKey).then((signedCert)=>{log.debug("Got signed certificate");this.certificates[aSessionToken]={cert:signedCert.cert,validUntil:validUntil};deferred.resolve(signedCert.cert);},deferred.reject);return deferred.promise;},set ui(aUi){this._ui=aUi;},set credStore(aCredStore){this._credStore=aCredStore;},set client(aClient){this._client=aClient;},set iccInfo(aIccInfo){this._iccInfo=aIccInfo;},onUICancel:function(){log.debug("UI cancel");if(this.activeVerificationFlow){this.activeVerificationFlow.cleanup(true);}},onUIResendCode:function(){log.debug("UI resend code");if(!this.activeVerificationFlow){return;}
this.doVerification();},success:function(aPromiseId,aResult){let mm=this.messageManagers[aPromiseId];mm.sendAsyncMessage("MobileId:GetAssertion:Return:OK",{promiseId:aPromiseId,result:aResult});},error:function(aPromiseId,aError){let mm=this.messageManagers[aPromiseId];mm.sendAsyncMessage("MobileId:GetAssertion:Return:KO",{promiseId:aPromiseId,error:aError});},addPermission:function(aPrincipal){permissionManager.addFromPrincipal(aPrincipal,MOBILEID_PERM,Ci.nsIPermissionManager.ALLOW_ACTION);},rejectVerification:function(aReason){if(!this.activeVerificationDeferred){return;}
this.activeVerificationDeferred.reject(aReason);this.activeVerificationDeferred=null;this.cleanupVerification(true);},resolveVerification:function(aResult){if(!this.activeVerificationDeferred){return;}
this.activeVerificationDeferred.resolve(aResult);this.activeVerificationDeferred=null;this.cleanupVerification();},cleanupVerification:function(){if(!this.activeVerificationFlow){return;}
this.activeVerificationFlow.cleanup();this.activeVerificationFlow=null;},doVerification:function(){this.activeVerificationFlow.doVerification().then((verificationResult)=>{log.debug("onVerificationResult ");if(!verificationResult||!verificationResult.sessionToken||!verificationResult.msisdn){return this.rejectVerification(ERROR_INTERNAL_INVALID_VERIFICATION_RESULT);}
this.resolveVerification(verificationResult);}).then(null,reason=>{log.warn("doVerification "+reason);});},_verificationFlow:function(aToVerify,aOrigin){log.debug("toVerify ${}",aToVerify);

if(aToVerify.verificationMethod.indexOf(SMS_MT)!=-1&&aToVerify.msisdn&&aToVerify.verificationDetails&&aToVerify.verificationDetails.mtSender){this.activeVerificationFlow=new MobileIdentitySmsMtVerificationFlow({origin:aOrigin,msisdn:aToVerify.msisdn,mcc:aToVerify.mcc,mnc:aToVerify.mnc,iccId:aToVerify.iccId,external:aToVerify.serviceId===undefined,mtSender:aToVerify.verificationDetails.mtSender},this.ui,this.client);}else{return Promise.reject(ERROR_INTERNAL_CANNOT_VERIFY_SELECTION);}
if(!this.activeVerificationFlow){return Promise.reject(ERROR_INTERNAL_CANNOT_CREATE_VERIFICATION_FLOW);}
this.activeVerificationDeferred=Promise.defer();this.doVerification();return this.activeVerificationDeferred.promise;},verificationFlow:function(aUserSelection,aOrigin){log.debug("verificationFlow ${}",aUserSelection);if(!aUserSelection){return Promise.reject(ERROR_INTERNAL_INVALID_USER_SELECTION);}
let serviceId=aUserSelection.serviceId||undefined;
if(aUserSelection.msisdn&&this.iccInfo){for(let i=0;i<this.iccInfo.length;i++){if(aUserSelection.msisdn==this.iccInfo[i].msisdn){serviceId=i;break;}}}
let toVerify={};if(serviceId!==undefined){log.debug("iccInfo ${}",this.iccInfo[serviceId]);toVerify.serviceId=serviceId;toVerify.iccId=this.iccInfo[serviceId].iccId;toVerify.msisdn=this.iccInfo[serviceId].msisdn;toVerify.mcc=this.iccInfo[serviceId].mcc;toVerify.mnc=this.iccInfo[serviceId].mnc;toVerify.verificationMethod=this.iccInfo[serviceId].verificationMethods[0];toVerify.verificationDetails=this.iccInfo[serviceId].verificationDetails[toVerify.verificationMethod];return this._verificationFlow(toVerify,aOrigin);}else{toVerify.msisdn=aUserSelection.msisdn;toVerify.mcc=aUserSelection.mcc;return this.client.discover(aUserSelection.msisdn,aUserSelection.mcc).then((discoverResult)=>{if(!discoverResult||!discoverResult.verificationMethods){return Promise.reject(ERROR_INTERNAL_UNEXPECTED);}
log.debug("discoverResult ${}",discoverResult);toVerify.verificationMethod=discoverResult.verificationMethods[0];toVerify.verificationDetails=discoverResult.verificationDetails[toVerify.verificationMethod];return this._verificationFlow(toVerify,aOrigin);});}},



prompt:function prompt(aPrincipal,aManifestURL,aPhoneInfo){log.debug("prompt "+aPrincipal+", "+aManifestURL+", "+
aPhoneInfo);let phoneInfoArray=[];if(aPhoneInfo){phoneInfoArray.push(aPhoneInfo);}
if(this.iccInfo){for(let i=0;i<this.iccInfo.length;i++){

if(!this.iccInfo[i].msisdn&&!this.iccInfo[i].credentials&&!this.iccInfo[i].canDoSilentVerification){continue;}
let phoneInfo=new MobileIdentityUIGluePhoneInfo(this.iccInfo[i].msisdn,this.iccInfo[i].operator,i, false, false
);phoneInfoArray.push(phoneInfo);}}
return this.ui.startFlow(aManifestURL,phoneInfoArray).then((result)=>{log.debug("startFlow result ${} ",result);if(!result||(!result.phoneNumber&&(result.serviceId===undefined))){return Promise.reject(ERROR_INTERNAL_INVALID_PROMPT_RESULT);}
let msisdn;let mcc;

if(result.serviceId!==undefined&&result.serviceId!==null){let icc=this.iccInfo[result.serviceId];log.debug("icc ${}",icc);if(!icc||!icc.msisdn&&!icc.canDoSilentVerification){return Promise.reject(ERROR_INTERNAL_CANNOT_VERIFY_SELECTION);}
msisdn=icc.msisdn;mcc=icc.mcc;}else{msisdn=result.prefix?result.prefix+result.phoneNumber:result.phoneNumber;mcc=result.mcc;}


if(msisdn&&mcc&&!PhoneNumberUtils.parseWithMCC(msisdn,mcc)){this.ui.error(ERROR_INVALID_PHONE_NUMBER);return this.prompt(aPrincipal,aManifestURL,aPhoneInfo);}
log.debug("Selected msisdn (if any): "+msisdn+" - "+mcc);this.addPermission(aPrincipal);return{msisdn:msisdn,mcc:mcc,serviceId:result.serviceId};});},promptAndVerify:function(aPrincipal,aManifestURL,aCreds){log.debug("promptAndVerify "+aPrincipal+", "+aManifestURL+", ${}",aCreds);let userSelection;if(Services.io.offline){return Promise.reject(ERROR_OFFLINE);}


return this.getVerificationOptions().then(()=>{

let phoneInfo;if(aCreds){phoneInfo=new MobileIdentityUIGluePhoneInfo(aCreds.msisdn,null, undefined,!!aCreds.iccId, true
);}
return this.prompt(aPrincipal,aManifestURL,phoneInfo);}).then((promptResult)=>{log.debug("promptResult ${}",promptResult);

if(promptResult.msisdn&&aCreds&&promptResult.msisdn==aCreds.msisdn){return aCreds;}


if(promptResult.serviceId){let creds=this.iccInfo[promptResult.serviceId].credentials;if(creds){this.credStore.add(creds.iccId,creds.msisdn,aPrincipal.origin,creds.sessionToken,this.iccIds);return creds;}}


return this.credStore.getByMsisdn(promptResult.msisdn).then((creds)=>{if(creds){this.credStore.add(creds.iccId,creds.msisdn,aPrincipal.origin,creds.sessionToken,this.iccIds);return creds;}

return this.verificationFlow(promptResult,aPrincipal.origin);});});},checkNewCredentials:function(aOldCreds,aNewCreds,aOrigin){
if(aNewCreds.msisdn!=aOldCreds.msisdn){return this.credStore.removeOrigin(aOldCreds.msisdn,aOrigin).then(()=>{return aNewCreds;});}else{


return this.credStore.setDeviceIccIds(aOldCreds.msisdn,this.iccIds).then(()=>{return aOldCreds;});}},generateAssertion:function(aCredentials,aOrigin){if(!aCredentials.sessionToken){return Promise.reject(ERROR_INTERNAL_INVALID_TOKEN);}
let deferred=Promise.defer();this.getKeyPair(aCredentials.sessionToken).then((keyPair)=>{log.debug("keyPair "+keyPair.serializedPublicKey);let options={duration:ASSERTION_LIFETIME,now:this.client.hawk.now(),localtimeOffsetMsec:this.client.hawk.localtimeOffsetMsec};this.getCertificate(aCredentials.sessionToken,keyPair.serializedPublicKey).then((signedCert)=>{log.debug("generateAssertion "+signedCert);jwcrypto.generateAssertion(signedCert,keyPair,aOrigin,options,(error,assertion)=>{if(error){log.error("Error generating assertion "+err);deferred.reject(error);return;}
this.credStore.add(aCredentials.iccId,aCredentials.msisdn,aOrigin,aCredentials.sessionToken,this.iccIds).then(()=>{deferred.resolve(assertion);});});},deferred.reject);});return deferred.promise;},getMobileIdAssertion:function(aPrincipal,aPromiseId,aOptions){log.debug("getMobileIdAssertion ${}",aPrincipal);let uri=Services.io.newURI(aPrincipal.origin,null,null);let principal=securityManager.getAppCodebasePrincipal(uri,aPrincipal.appId,aPrincipal.isInBrowserElement);let manifestURL=appsService.getManifestURLByLocalId(aPrincipal.appId);let permission=permissionManager.testPermissionFromPrincipal(principal,MOBILEID_PERM);if(permission==Ci.nsIPermissionManager.DENY_ACTION||permission==Ci.nsIPermissionManager.UNKNOWN_ACTION){this.error(aPromiseId,ERROR_PERMISSION_DENIED);return;}
let _creds;
this.credStore.getByOrigin(aPrincipal.origin).then((creds)=>{log.debug("creds ${creds} - ${origin}",{creds:creds,origin:aPrincipal.origin});if(!creds||!creds.sessionToken){log.debug("No credentials");return;}
_creds=creds;
if(aOptions.forceSelection||aOptions.refreshCredentials){return this.promptAndVerify(principal,manifestURL,creds).then((newCreds)=>{return this.checkNewCredentials(creds,newCreds,principal.origin);});}



log.debug("Looking for SIM changes. Credentials ICCS ${creds} "+"Device ICCS ${device}",{creds:creds.deviceIccIds,device:this.iccIds});let simChanged=(creds.deviceIccIds==null&&this.iccIds!=null)||(creds.deviceIccIds!=null&&this.iccIds==null);if(!simChanged&&creds.deviceIccIds!=null&&this.IccIds!=null){simChanged=creds.deviceIccIds.length!=this.iccIds.length;}
if(!simChanged&&creds.deviceIccIds!=null&&this.IccIds!=null){let intersection=creds.deviceIccIds.filter((n)=>{return this.iccIds.indexOf(n)!=-1;});simChanged=intersection.length!=creds.deviceIccIds.length||intersection.length!=this.iccIds.length;}
if(!simChanged){return creds;}

return this.promptAndVerify(principal,manifestURL,creds).then((newCreds)=>{return this.checkNewCredentials(creds,newCreds,principal.origin);});}).then((creds)=>{



if(creds){if(permission==Ci.nsIPermissionManager.ALLOW_ACTION){return creds;}
return this.promptAndVerify(principal,manifestURL,creds);}
return this.promptAndVerify(principal,manifestURL);}).then((creds)=>{if(creds){return this.generateAssertion(creds,principal.origin);}
return Promise.reject(ERROR_INTERNAL_CANNOT_GENERATE_ASSERTION);}).then((assertion)=>{if(!assertion){return Promise.reject(ERROR_INTERNAL_CANNOT_GENERATE_ASSERTION);}
let segments=assertion.split(".");if(!segments){return Promise.reject(ERROR_INVALID_ASSERTION);}

let decodedPayload=JSON.parse(atob(segments[1].replace(/-/g,'+').replace(/_/g,'/')));if(!decodedPayload||!decodedPayload.verifiedMSISDN){return Promise.reject(ERROR_INVALID_ASSERTION);}
this.ui.verified(decodedPayload.verifiedMSISDN);this.success(aPromiseId,assertion);}).then(null,(error)=>{log.error("getMobileIdAssertion rejected with ${}",error);


if(error===ERROR_INVALID_AUTH_TOKEN&&!aOptions.refreshCredentials){log.debug("Need to get new credentials");aOptions.refreshCredentials=true;_creds&&this.credStore.delete(_creds.msisdn);this.getMobileIdAssertion(aPrincipal,aPromiseId,aOptions);return;}
this.ui.error(error);this.error(aPromiseId,error);});},};MobileIdentityManager.init();