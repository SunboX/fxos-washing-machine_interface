"use strict";this.EXPORTED_SYMBOLS=["LoginHelper",];const{classes:Cc,interfaces:Ci,utils:Cu,results:Cr}=Components;Cu.import("resource://gre/modules/XPCOMUtils.jsm");this.LoginHelper={checkHostnameValue:function(aHostname)
{

if(aHostname=="."||aHostname.indexOf("\r")!=-1||aHostname.indexOf("\n")!=-1||aHostname.indexOf("\0")!=-1){throw"Invalid hostname";}},checkLoginValues:function(aLogin)
{function badCharacterPresent(l,c)
{return((l.formSubmitURL&&l.formSubmitURL.indexOf(c)!=-1)||(l.httpRealm&&l.httpRealm.indexOf(c)!=-1)||l.hostname.indexOf(c)!=-1||l.usernameField.indexOf(c)!=-1||l.passwordField.indexOf(c)!=-1);}
if(badCharacterPresent(aLogin,"\0")){throw"login values can't contain nulls";}



if(aLogin.username.indexOf("\0")!=-1||aLogin.password.indexOf("\0")!=-1){throw"login values can't contain nulls";}
if(badCharacterPresent(aLogin,"\r")||badCharacterPresent(aLogin,"\n")){throw"login values can't contain newlines";}
if(aLogin.usernameField=="."||aLogin.formSubmitURL=="."){throw"login values can't be periods";}
if(aLogin.hostname.indexOf(" (")!=-1){throw"bad parens in hostname";}},buildModifiedLogin:function(aOldStoredLogin,aNewLoginData)
{function bagHasProperty(aPropName)
{try{aNewLoginData.getProperty(aPropName);return true;}catch(ex){}
return false;}
aOldStoredLogin.QueryInterface(Ci.nsILoginMetaInfo);let newLogin;if(aNewLoginData instanceof Ci.nsILoginInfo){
newLogin=aOldStoredLogin.clone();newLogin.init(aNewLoginData.hostname,aNewLoginData.formSubmitURL,aNewLoginData.httpRealm,aNewLoginData.username,aNewLoginData.password,aNewLoginData.usernameField,aNewLoginData.passwordField);newLogin.QueryInterface(Ci.nsILoginMetaInfo);if(newLogin.password!=aOldStoredLogin.password){newLogin.timePasswordChanged=Date.now();}}else if(aNewLoginData instanceof Ci.nsIPropertyBag){newLogin=aOldStoredLogin.clone();newLogin.QueryInterface(Ci.nsILoginMetaInfo);
if(bagHasProperty("password")){let newPassword=aNewLoginData.getProperty("password");if(newPassword!=aOldStoredLogin.password){newLogin.timePasswordChanged=Date.now();}}
let propEnum=aNewLoginData.enumerator;while(propEnum.hasMoreElements()){let prop=propEnum.getNext().QueryInterface(Ci.nsIProperty);switch(prop.name){ case"hostname":case"httpRealm":case"formSubmitURL":case"username":case"password":case"usernameField":case"passwordField": case"guid":case"timeCreated":case"timeLastUsed":case"timePasswordChanged":case"timesUsed":newLogin[prop.name]=prop.value;break;case"timesUsedIncrement":newLogin.timesUsed+=prop.value;break;default:throw"Unexpected propertybag item: "+prop.name;}}}else{throw"newLoginData needs an expected interface!";} 
if(newLogin.hostname==null||newLogin.hostname.length==0){throw"Can't add a login with a null or empty hostname.";}
if(newLogin.username==null){throw"Can't add a login with a null username.";}
if(newLogin.password==null||newLogin.password.length==0){throw"Can't add a login with a null or empty password.";}
if(newLogin.formSubmitURL||newLogin.formSubmitURL==""){if(newLogin.httpRealm!=null){throw"Can't add a login with both a httpRealm and formSubmitURL.";}}else if(newLogin.httpRealm){if(newLogin.formSubmitURL!=null){throw"Can't add a login with both a httpRealm and formSubmitURL.";}}else{throw"Can't add a login without a httpRealm or formSubmitURL.";}
this.checkLoginValues(newLogin);return newLogin;},};