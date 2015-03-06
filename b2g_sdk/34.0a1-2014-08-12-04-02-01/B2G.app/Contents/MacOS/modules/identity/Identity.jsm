"use strict";this.EXPORTED_SYMBOLS=["IdentityService"];const Cu=Components.utils;const Ci=Components.interfaces;const Cc=Components.classes;const Cr=Components.results;Cu.import("resource://gre/modules/XPCOMUtils.jsm");Cu.import("resource://gre/modules/Services.jsm");Cu.import("resource://gre/modules/identity/LogUtils.jsm");Cu.import("resource://gre/modules/identity/IdentityStore.jsm");Cu.import("resource://gre/modules/identity/RelyingParty.jsm");Cu.import("resource://gre/modules/identity/IdentityProvider.jsm");XPCOMUtils.defineLazyModuleGetter(this,"jwcrypto","resource://gre/modules/identity/jwcrypto.jsm");function log(...aMessageArgs){Logger.log.apply(Logger,["core"].concat(aMessageArgs));}
function reportError(...aMessageArgs){Logger.reportError.apply(Logger,["core"].concat(aMessageArgs));}
function IDService(){Services.obs.addObserver(this,"quit-application-granted",false);Services.obs.addObserver(this,"identity-auth-complete",false);this._store=IdentityStore;this.RP=RelyingParty;this.IDP=IdentityProvider;}
IDService.prototype={QueryInterface:XPCOMUtils.generateQI([Ci.nsISupports,Ci.nsIObserver]),observe:function observe(aSubject,aTopic,aData){switch(aTopic){case"quit-application-granted":Services.obs.removeObserver(this,"quit-application-granted");this.shutdown();break;case"identity-auth-complete":if(!aSubject||!aSubject.wrappedJSObject)
break;let subject=aSubject.wrappedJSObject;log("Auth complete:",aSubject.wrappedJSObject);this.selectIdentity(subject.rpId,subject.identity);break;}},reset:function reset(){


this._store.reset();this.RP.reset();this.IDP.reset();},shutdown:function shutdown(){log("shutdown");Services.obs.removeObserver(this,"identity-auth-complete");try{Services.obs.removeObserver(this,"quit-application-granted");}catch(e){}},parseEmail:function parseEmail(email){var match=email.match(/^([^@]+)@([^@^/]+.[a-z]+)$/);if(match){return{username:match[1],domain:match[2]};}
return null;},addIdentity:function addIdentity(aIdentity){if(this._store.fetchIdentity(aIdentity)===null){this._store.addIdentity(aIdentity,null,null);}},selectIdentity:function selectIdentity(aRPId,aIdentity){log("selectIdentity: RP id:",aRPId,"identity:",aIdentity);let rp=this.RP._rpFlows[aRPId];if(!rp){reportError("selectIdentity","Invalid RP id: ",aRPId);return;}

let provId=rp.provId;let rpLoginOptions={loggedInUser:aIdentity,origin:rp.origin};log("selectIdentity: provId:",provId,"origin:",rp.origin);
let self=this;this.RP._generateAssertion(rp.origin,aIdentity,function hadReadyAssertion(err,assertion){if(!err&&assertion){self.RP._doLogin(rp,rpLoginOptions,assertion);return;}

self._discoverIdentityProvider(aIdentity,function gotIDP(err,idpParams){if(err){rp.doError(err);return;}

self.IDP._provisionIdentity(aIdentity,idpParams,provId,function gotID(err,aProvId){

rp.provId=aProvId;self.IDP._provisionFlows[aProvId].rpId=aRPId;

if(err){


if(self.IDP._provisionFlows[aProvId].didAuthentication){self.IDP._cleanUpProvisionFlow(aProvId);self.RP._cleanUpProvisionFlow(aRPId,aProvId);log("ERROR: selectIdentity: authentication hard fail");rp.doError("Authentication fail.");return;}


self.IDP._doAuthentication(aProvId,idpParams);return;}

self.RP._generateAssertion(rp.origin,aIdentity,function gotAssertion(err,assertion){if(err){rp.doError(err);return;}
self.RP._doLogin(rp,rpLoginOptions,assertion);self.RP._cleanUpProvisionFlow(aRPId,aProvId);return;});});});});},_discoverIdentityProvider:function _discoverIdentityProvider(aIdentity,aCallback){
 var parsedEmail=this.parseEmail(aIdentity);if(parsedEmail===null){return aCallback("Could not parse email: "+aIdentity);}
log("_discoverIdentityProvider: identity:",aIdentity,"domain:",parsedEmail.domain);this._fetchWellKnownFile(parsedEmail.domain,function fetchedWellKnown(err,idpParams){


 return aCallback(err,idpParams);});},_fetchWellKnownFile:function _fetchWellKnownFile(aDomain,aCallback,aScheme='https'){ let url=aScheme+'://'+aDomain+"/.well-known/browserid";log("_fetchWellKnownFile:",url); let req=Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Ci.nsIXMLHttpRequest);
 req.open("GET",url,true);req.responseType="json";req.mozBackgroundRequest=true;req.onload=function _fetchWellKnownFile_onload(){if(req.status<200||req.status>=400){log("_fetchWellKnownFile",url,": server returned status:",req.status);return aCallback("Error");}
try{let idpParams=req.response; if(!(idpParams.provisioning&&idpParams.authentication&&idpParams['public-key'])){let errStr="Invalid well-known file from: "+aDomain;log("_fetchWellKnownFile:",errStr);return aCallback(errStr);}
let callbackObj={domain:aDomain,idpParams:idpParams,};log("_fetchWellKnownFile result: ",callbackObj);return aCallback(null,callbackObj);}catch(err){reportError("_fetchWellKnownFile","Bad configuration from",aDomain,err);return aCallback(err.toString());}};req.onerror=function _fetchWellKnownFile_onerror(){log("_fetchWellKnownFile","ERROR:",req.status,req.statusText);log("ERROR: _fetchWellKnownFile:",err);return aCallback("Error");};req.send(null);},};this.IdentityService=new IDService();