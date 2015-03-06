"use strict";const Cu=Components.utils;const Ci=Components.interfaces;const Cc=Components.classes;Cu.import("resource://gre/modules/XPCOMUtils.jsm");Cu.import("resource://gre/modules/Services.jsm");XPCOMUtils.defineLazyModuleGetter(this,"UserAutoCompleteResult","resource://gre/modules/LoginManagerContent.jsm");XPCOMUtils.defineLazyModuleGetter(this,"AutoCompleteE10S","resource://gre/modules/AutoCompleteE10S.jsm");this.EXPORTED_SYMBOLS=["LoginManagerParent"];var gDebug;function log(...pieces){function generateLogMessage(args){let strings=['Login Manager (parent):'];args.forEach(function(arg){if(typeof arg==='string'){strings.push(arg);}else if(typeof arg==='undefined'){strings.push('undefined');}else if(arg===null){strings.push('null');}else{try{strings.push(JSON.stringify(arg,null,2));}catch(err){strings.push("<<something>>");}}});return strings.join(' ');}
if(!gDebug)
return;let message=generateLogMessage(pieces);dump(message+"\n");Services.console.logStringMessage(message);}
function prefChanged(){gDebug=Services.prefs.getBoolPref("signon.debug");}
Services.prefs.addObserver("signon.debug",prefChanged,false);prefChanged();var LoginManagerParent={init:function(){let mm=Cc["@mozilla.org/globalmessagemanager;1"].getService(Ci.nsIMessageListenerManager);mm.addMessageListener("RemoteLogins:findLogins",this);mm.addMessageListener("RemoteLogins:onFormSubmit",this);mm.addMessageListener("RemoteLogins:autoCompleteLogins",this);},receiveMessage:function(msg){let data=msg.data;switch(msg.name){case"RemoteLogins:findLogins":{this.findLogins(data.options.showMasterPassword,data.formOrigin,data.actionOrigin,data.requestId,msg.target.messageManager);break;}
case"RemoteLogins:onFormSubmit":{this.onFormSubmit(data.hostname,data.formSubmitURL,data.usernameField,data.newPasswordField,data.oldPasswordField,msg.target);break;}
case"RemoteLogins:autoCompleteLogins":{this.doAutocompleteSearch(data,msg.target);break;}}},findLogins:function(showMasterPassword,formOrigin,actionOrigin,requestId,target){if(!showMasterPassword&&!Services.logins.isLoggedIn){target.sendAsyncMessage("RemoteLogins:loginsFound",{requestId:requestId,logins:[]});return;}
if(!Services.logins.countLogins(formOrigin,"",null)){target.sendAsyncMessage("RemoteLogins:loginsFound",{requestId:requestId,logins:[]});return;}

if(Services.logins.uiBusy){log("deferring onFormPassword for",formOrigin);let self=this;let observer={QueryInterface:XPCOMUtils.generateQI([Ci.nsIObserver,Ci.nsISupportsWeakReference]),observe:function(subject,topic,data){log("Got deferred onFormPassword notification:",topic);Services.obs.removeObserver(this,"passwordmgr-crypto-login");Services.obs.removeObserver(this,"passwordmgr-crypto-loginCanceled");if(topic=="passwordmgr-crypto-loginCanceled"){target.sendAsyncMessage("RemoteLogins:loginsFound",{requestId:requestId,logins:[]});return;}
self.findLogins(showMasterPassword,formOrigin,actionOrigin,requestId,target);},};


Services.obs.addObserver(observer,"passwordmgr-crypto-login",false);Services.obs.addObserver(observer,"passwordmgr-crypto-loginCanceled",false);return;}
var logins=Services.logins.findLogins({},formOrigin,actionOrigin,null);target.sendAsyncMessage("RemoteLogins:loginsFound",{requestId:requestId,logins:logins});},doAutocompleteSearch:function({formOrigin,actionOrigin,searchString,previousResult,rect,requestId,remote},target){
var result;var matchingLogins;let searchStringLower=searchString.toLowerCase();let logins;if(previousResult&&searchStringLower.startsWith(previousResult.searchString.toLowerCase())){log("Using previous autocomplete result");
logins=previousResult.logins;}else{log("Creating new autocomplete search result.");logins=Services.logins.findLogins({},formOrigin,actionOrigin,null);}
let matchingLogins=logins.filter(function(fullMatch){let match=fullMatch.username;return match&&match.toLowerCase().startsWith(searchStringLower);});



if(remote){result=new UserAutoCompleteResult(searchString,matchingLogins);AutoCompleteE10S.showPopupWithResults(target.ownerDocument.defaultView,rect,result);}
target.messageManager.sendAsyncMessage("RemoteLogins:loginsAutoCompleted",{requestId:requestId,logins:matchingLogins});},onFormSubmit:function(hostname,formSubmitURL,usernameField,newPasswordField,oldPasswordField,target){function getPrompter(){var prompterSvc=Cc["@mozilla.org/login-manager/prompter;1"].createInstance(Ci.nsILoginManagerPrompter);


prompterSvc.init(target.isRemoteBrowser?target.ownerDocument.defaultView:target.contentWindow);return prompterSvc;}
if(!Services.logins.getLoginSavingEnabled(hostname)){log("(form submission ignored -- saving is disabled for:",hostname,")");return;}
var formLogin=Cc["@mozilla.org/login-manager/loginInfo;1"].createInstance(Ci.nsILoginInfo);formLogin.init(hostname,formSubmitURL,null,(usernameField?usernameField.value:""),newPasswordField.value,(usernameField?usernameField.name:""),newPasswordField.name);

if(!usernameField&&oldPasswordField){var logins=Services.logins.findLogins({},hostname,formSubmitURL,null);if(logins.length==0){log("(no logins for this host -- pwchange ignored)");return;}
var prompter=getPrompter();if(logins.length==1){var oldLogin=logins[0];formLogin.username=oldLogin.username;formLogin.usernameField=oldLogin.usernameField;prompter.promptToChangePassword(oldLogin,formLogin);}else{prompter.promptToChangePasswordWithUsernames(logins,logins.length,formLogin);}
return;}
var existingLogin=null;var logins=Services.logins.findLogins({},hostname,formSubmitURL,null);for(var i=0;i<logins.length;i++){var same,login=logins[i];


if(!login.username&&formLogin.username){var restoreMe=formLogin.username;formLogin.username="";same=formLogin.matches(login,false);formLogin.username=restoreMe;}else if(!formLogin.username&&login.username){formLogin.username=login.username;same=formLogin.matches(login,false);formLogin.username="";}else{same=formLogin.matches(login,true);}
if(same){existingLogin=login;break;}}
if(existingLogin){log("Found an existing login matching this form submission");if(existingLogin.password!=formLogin.password){log("...passwords differ, prompting to change.");prompter=getPrompter();prompter.promptToChangePassword(existingLogin,formLogin);}else{var propBag=Cc["@mozilla.org/hash-property-bag;1"].createInstance(Ci.nsIWritablePropertyBag);propBag.setProperty("timeLastUsed",Date.now());propBag.setProperty("timesUsedIncrement",1);Services.logins.modifyLogin(existingLogin,propBag);}
return;}
prompter=getPrompter();prompter.promptToSavePassword(formLogin);}};