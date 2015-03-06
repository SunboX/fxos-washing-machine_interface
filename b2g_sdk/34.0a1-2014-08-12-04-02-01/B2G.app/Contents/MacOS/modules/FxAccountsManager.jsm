"use strict";this.EXPORTED_SYMBOLS=["FxAccountsManager"];const{classes:Cc,interfaces:Ci,utils:Cu}=Components;Cu.import("resource://gre/modules/XPCOMUtils.jsm");Cu.import("resource://gre/modules/Services.jsm");Cu.import("resource://gre/modules/FxAccounts.jsm");Cu.import("resource://gre/modules/Promise.jsm");Cu.import("resource://gre/modules/FxAccountsCommon.js");XPCOMUtils.defineLazyServiceGetter(this,"permissionManager","@mozilla.org/permissionmanager;1","nsIPermissionManager");this.FxAccountsManager={init:function(){Services.obs.addObserver(this,ONLOGOUT_NOTIFICATION,false);Services.obs.addObserver(this,ON_FXA_UPDATE_NOTIFICATION,false);},observe:function(aSubject,aTopic,aData){ this._activeSession=null;if(aData==ONVERIFIED_NOTIFICATION){log.debug("FxAccountsManager: cache cleared, broadcasting: "+aData);Services.obs.notifyObservers(null,aData,null);}},
_fxAccounts:fxAccounts,
_activeSession:null,
_refreshing:false,get _user(){if(!this._activeSession||!this._activeSession.email){return null;}
return{email:this._activeSession.email,verified:this._activeSession.verified}},_error:function(aError,aDetails){log.error(aError);let reason={error:aError};if(aDetails){reason.details=aDetails;}
return Promise.reject(reason);},_getError:function(aServerResponse){if(!aServerResponse||!aServerResponse.error||!aServerResponse.error.errno){return;}
let error=SERVER_ERRNO_TO_ERROR[aServerResponse.error.errno];return error;},_serverError:function(aServerResponse){let error=this._getError({error:aServerResponse});return this._error(error?error:ERROR_SERVER_ERROR,aServerResponse);},



_getFxAccountsClient:function(){return this._fxAccounts.getAccountsClient();},_signInSignUp:function(aMethod,aEmail,aPassword){if(Services.io.offline){return this._error(ERROR_OFFLINE);}
if(!aEmail){return this._error(ERROR_INVALID_EMAIL);}
if(!aPassword){return this._error(ERROR_INVALID_PASSWORD);}
if((!this._refreshing)&&this._activeSession){return this._error(ERROR_ALREADY_SIGNED_IN_USER,{user:this._user});}
let client=this._getFxAccountsClient();return this._fxAccounts.getSignedInUser().then(user=>{if((!this._refreshing)&&user){return this._error(ERROR_ALREADY_SIGNED_IN_USER,{user:this._user});}
return client[aMethod](aEmail,aPassword);}).then(user=>{let error=this._getError(user);if(!user||!user.uid||!user.sessionToken||error){return this._error(error?error:ERROR_INTERNAL_INVALID_USER,{user:user});}


user.email=user.email||aEmail;

 if(this._refreshing){return Promise.resolve({user:this._user});}
return this._fxAccounts.setSignedInUser(user).then(()=>{this._activeSession=user;log.debug("User signed in: "+JSON.stringify(this._user)+" - Account created "+(aMethod=="signUp"));return Promise.resolve({accountCreated:aMethod==="signUp",user:this._user});});},reason=>{return this._serverError(reason);});},_handleGetAssertionError:function(reason,aAudience,aPrincipal){let errno=(reason?reason.errno:NaN)||NaN;if(errno==ERRNO_INVALID_AUTH_TOKEN){return this._fxAccounts.accountStatus().then((exists)=>{
if(exists){return this.getAccount().then((user)=>{return this._refreshAuthentication(aAudience,user.email,aPrincipal,true);});}}); return this._localSignOut().then(()=>{return this._uiRequest(UI_REQUEST_SIGN_IN_FLOW,aAudience,aPrincipal);},(reason)=>{ log.error("Signing out in response to server error threw: "+
reason);return this._error(reason);});}
return Promise.reject(reason);},_getAssertion:function(aAudience,aPrincipal){return this._fxAccounts.getAssertion(aAudience).then((result)=>{if(aPrincipal){this._addPermission(aPrincipal);}
return result;},(reason)=>{return this._handleGetAssertionError(reason,aAudience,aPrincipal);});},_refreshAuthentication:function(aAudience,aEmail,aPrincipal,logoutOnFailure=false){this._refreshing=true;return this._uiRequest(UI_REQUEST_REFRESH_AUTH,aAudience,aPrincipal,aEmail).then((assertion)=>{this._refreshing=false;return assertion;},(reason)=>{this._refreshing=false;if(logoutOnFailure){return this._signOut().then(()=>{return this._error(reason);});}
return this._error(reason);});},_localSignOut:function(){return this._fxAccounts.signOut(true);},_signOut:function(){if(!this._activeSession){return Promise.resolve();}



let sessionToken=this._activeSession.sessionToken;return this._localSignOut().then(()=>{if(Services.io.offline){return Promise.resolve();}
let client=this._getFxAccountsClient();return client.signOut(sessionToken).then(result=>{let error=this._getError(result);if(error){return this._error(error,result);}
log.debug("Signed out");return Promise.resolve();},reason=>{return this._serverError(reason);});});},_uiRequest:function(aRequest,aAudience,aPrincipal,aParams){let ui=Cc["@mozilla.org/fxaccounts/fxaccounts-ui-glue;1"].createInstance(Ci.nsIFxAccountsUIGlue);if(!ui[aRequest]){return this._error(ERROR_UI_REQUEST);}
if(!aParams||!Array.isArray(aParams)){aParams=[aParams];}
return ui[aRequest].apply(this,aParams).then(result=>{
if(result&&result.verified){return this._getAssertion(aAudience,aPrincipal);}
return this._error(ERROR_UNVERIFIED_ACCOUNT,{user:result});},error=>{return this._error(ERROR_UI_ERROR,error);});},_addPermission:function(aPrincipal){
try{permissionManager.addFromPrincipal(aPrincipal,FXACCOUNTS_PERMISSION,Ci.nsIPermissionManager.ALLOW_ACTION);}catch(e){log.warn("Could not add permission "+e);}},signIn:function(aEmail,aPassword){return this._signInSignUp("signIn",aEmail,aPassword);},signUp:function(aEmail,aPassword){return this._signInSignUp("signUp",aEmail,aPassword);},signOut:function(){if(!this._activeSession){
return this.getAccount().then(result=>{if(!result){return Promise.resolve();}
return this._signOut();});}
return this._signOut();},resendVerificationEmail:function(){return this._fxAccounts.resendVerificationEmail().then((result)=>{return result;},(error)=>{return this._error(ERROR_SERVER_ERROR,error);});},getAccount:function(){if(this._activeSession){if(this._activeSession&&!this._activeSession.verified&&!Services.io.offline){this.verificationStatus(this._activeSession);}
log.debug("Account "+JSON.stringify(this._user));return Promise.resolve(this._user);}
return this._fxAccounts.getSignedInUser().then(user=>{if(!user||!user.email){log.debug("No signed in account");return Promise.resolve(null);}
this._activeSession=user;if(!user.verified&&!Services.io.offline){log.debug("Unverified account");this.verificationStatus(user);}
log.debug("Account "+JSON.stringify(this._user));return Promise.resolve(this._user);});},queryAccount:function(aEmail){log.debug("queryAccount "+aEmail);if(Services.io.offline){return this._error(ERROR_OFFLINE);}
let deferred=Promise.defer();if(!aEmail){return this._error(ERROR_INVALID_EMAIL);}
let client=this._getFxAccountsClient();return client.accountExists(aEmail).then(result=>{log.debug("Account "+result?"":"does not"+" exists");let error=this._getError(result);if(error){return this._error(error,result);}
return Promise.resolve({registered:result});},reason=>{this._serverError(reason);});},verificationStatus:function(){log.debug("verificationStatus");if(!this._activeSession||!this._activeSession.sessionToken){this._error(ERROR_NO_TOKEN_SESSION);}
 
if(this._activeSession.verified){log.debug("Account already verified");return;}
if(Services.io.offline){this._error(ERROR_OFFLINE);}
let client=this._getFxAccountsClient();client.recoveryEmailStatus(this._activeSession.sessionToken).then(data=>{let error=this._getError(data);if(error){this._error(error,data);}
if(this._activeSession.verified!=data.verified){this._activeSession.verified=data.verified;this._fxAccounts.setSignedInUser(this._activeSession);}
log.debug(JSON.stringify(this._user));},reason=>{this._serverError(reason);});},getAssertion:function(aAudience,aPrincipal,aOptions){if(!aAudience){return this._error(ERROR_INVALID_AUDIENCE);}
if(Services.io.offline){return this._error(ERROR_OFFLINE);}
let secMan=Cc["@mozilla.org/scriptsecuritymanager;1"].getService(Ci.nsIScriptSecurityManager);let uri=Services.io.newURI(aPrincipal.origin,null,null);let principal=secMan.getAppCodebasePrincipal(uri,aPrincipal.appId,aPrincipal.isInBrowserElement);return this.getAccount().then(user=>{if(user){if(!user.verified){return this._error(ERROR_UNVERIFIED_ACCOUNT,{user:user});}
if(aOptions&&(typeof(aOptions.refreshAuthentication)!="undefined")){let gracePeriod=aOptions.refreshAuthentication;if(typeof(gracePeriod)!=="number"||isNaN(gracePeriod)){return this._error(ERROR_INVALID_REFRESH_AUTH_VALUE);}
if(aOptions.silent){return this._error(ERROR_NO_SILENT_REFRESH_AUTH);}
let secondsSinceAuth=(Date.now()/1000)-
this._activeSession.authAt;if(secondsSinceAuth>gracePeriod){return this._refreshAuthentication(aAudience,user.email,principal,false);}}





let permission=permissionManager.testPermissionFromPrincipal(principal,FXACCOUNTS_PERMISSION);if(permission==Ci.nsIPermissionManager.PROMPT_ACTION&&!this._refreshing){return this._refreshAuthentication(aAudience,user.email,principal,false);}else if(permission==Ci.nsIPermissionManager.DENY_ACTION&&!this._refreshing){return this._error(ERROR_PERMISSION_DENIED);}
return this._getAssertion(aAudience,principal);}
log.debug("No signed in user");if(aOptions&&aOptions.silent){return Promise.resolve(null);}
return this._uiRequest(UI_REQUEST_SIGN_IN_FLOW,aAudience,principal);});}};FxAccountsManager.init();