const Cc=Components.classes;const Ci=Components.interfaces;const Cr=Components.results;Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");Components.utils.import("resource://gre/modules/Services.jsm");Components.utils.import("resource://gre/modules/PrivateBrowsingUtils.jsm");function LoginManagerPromptFactory(){Services.obs.addObserver(this,"quit-application-granted",true);Services.obs.addObserver(this,"passwordmgr-crypto-login",true);Services.obs.addObserver(this,"passwordmgr-crypto-loginCanceled",true);}
LoginManagerPromptFactory.prototype={classID:Components.ID("{749e62f4-60ae-4569-a8a2-de78b649660e}"),QueryInterface:XPCOMUtils.generateQI([Ci.nsIPromptFactory,Ci.nsIObserver,Ci.nsISupportsWeakReference]),_debug:false,_asyncPrompts:{},_asyncPromptInProgress:false,observe:function(subject,topic,data){this.log("Observed: "+topic);if(topic=="quit-application-granted"){this._cancelPendingPrompts();}else if(topic=="passwordmgr-crypto-login"){this._doAsyncPrompt();}else if(topic=="passwordmgr-crypto-loginCanceled"){
this._cancelPendingPrompts();}},getPrompt:function(aWindow,aIID){var prefBranch=Services.prefs.getBranch("signon.");this._debug=prefBranch.getBoolPref("debug");var prompt=new LoginManagerPrompter().QueryInterface(aIID);prompt.init(aWindow,this);return prompt;},_doAsyncPrompt:function(){if(this._asyncPromptInProgress){this.log("_doAsyncPrompt bypassed, already in progress");return;} 
var hashKey=null;for(hashKey in this._asyncPrompts)
break;if(!hashKey){this.log("_doAsyncPrompt:run bypassed, no prompts in the queue");return;}

var prompt=this._asyncPrompts[hashKey];var prompter=prompt.prompter;var[hostname,httpRealm]=prompter._getAuthTarget(prompt.channel,prompt.authInfo);var hasLogins=(prompter._pwmgr.countLogins(hostname,null,httpRealm)>0);if(hasLogins&&prompter._pwmgr.uiBusy){this.log("_doAsyncPrompt:run bypassed, master password UI busy");return;}
this._asyncPromptInProgress=true;prompt.inProgress=true;var self=this;var runnable={run:function(){var ok=false;try{self.log("_doAsyncPrompt:run - performing the prompt for '"+hashKey+"'");ok=prompter.promptAuth(prompt.channel,prompt.level,prompt.authInfo);}catch(e if(e instanceof Components.Exception)&&e.result==Cr.NS_ERROR_NOT_AVAILABLE){self.log("_doAsyncPrompt:run bypassed, UI is not available in this context");}catch(e){Components.utils.reportError("LoginManagerPrompter: "+"_doAsyncPrompt:run: "+e+"\n");}
delete self._asyncPrompts[hashKey];prompt.inProgress=false;self._asyncPromptInProgress=false;for each(var consumer in prompt.consumers){if(!consumer.callback)
 
continue;self.log("Calling back to "+consumer.callback+" ok="+ok);try{if(ok)
consumer.callback.onAuthAvailable(consumer.context,prompt.authInfo);else
consumer.callback.onAuthCancelled(consumer.context,true);}catch(e){}}
self._doAsyncPrompt();}}
Services.tm.mainThread.dispatch(runnable,Ci.nsIThread.DISPATCH_NORMAL);this.log("_doAsyncPrompt:run dispatched");},_cancelPendingPrompts:function(){this.log("Canceling all pending prompts...");var asyncPrompts=this._asyncPrompts;this.__proto__._asyncPrompts={};for each(var prompt in asyncPrompts){

if(prompt.inProgress){this.log("skipping a prompt in progress");continue;}
for each(var consumer in prompt.consumers){if(!consumer.callback)
continue;this.log("Canceling async auth prompt callback "+consumer.callback);try{consumer.callback.onAuthCancelled(consumer.context,true);}catch(e){}}}},log:function(message){if(!this._debug)
return;dump("Pwmgr PromptFactory: "+message+"\n");Services.console.logStringMessage("Pwmgr PrompFactory: "+message);}};function LoginManagerPrompter(){}
LoginManagerPrompter.prototype={classID:Components.ID("{8aa66d77-1bbb-45a6-991e-b8f47751c291}"),QueryInterface:XPCOMUtils.generateQI([Ci.nsIAuthPrompt,Ci.nsIAuthPrompt2,Ci.nsILoginManagerPrompter]),_factory:null,_window:null,_debug:false, __pwmgr:null, get _pwmgr(){if(!this.__pwmgr)
this.__pwmgr=Cc["@mozilla.org/login-manager;1"].getService(Ci.nsILoginManager);return this.__pwmgr;},__promptService:null, get _promptService(){if(!this.__promptService)
this.__promptService=Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService2);return this.__promptService;},__strBundle:null, get _strBundle(){if(!this.__strBundle){var bunService=Cc["@mozilla.org/intl/stringbundle;1"].getService(Ci.nsIStringBundleService);this.__strBundle=bunService.createBundle("chrome://passwordmgr/locale/passwordmgr.properties");if(!this.__strBundle)
throw"String bundle for Login Manager not present!";}
return this.__strBundle;},__ellipsis:null,get _ellipsis(){if(!this.__ellipsis){this.__ellipsis="\u2026";try{this.__ellipsis=Services.prefs.getComplexValue("intl.ellipsis",Ci.nsIPrefLocalizedString).data;}catch(e){}}
return this.__ellipsis;}, get _inPrivateBrowsing(){if(this._window){return PrivateBrowsingUtils.isWindowPrivate(this._window);}else{


return true;}},log:function(message){if(!this._debug)
return;dump("Pwmgr Prompter: "+message+"\n");Services.console.logStringMessage("Pwmgr Prompter: "+message);},prompt:function(aDialogTitle,aText,aPasswordRealm,aSavePassword,aDefaultText,aResult){if(aSavePassword!=Ci.nsIAuthPrompt.SAVE_PASSWORD_NEVER)
throw Components.results.NS_ERROR_NOT_IMPLEMENTED;this.log("===== prompt() called =====");if(aDefaultText){aResult.value=aDefaultText;}
return this._promptService.prompt(this._window,aDialogTitle,aText,aResult,null,{});},promptUsernameAndPassword:function(aDialogTitle,aText,aPasswordRealm,aSavePassword,aUsername,aPassword){this.log("===== promptUsernameAndPassword() called =====");if(aSavePassword==Ci.nsIAuthPrompt.SAVE_PASSWORD_FOR_SESSION)
throw Components.results.NS_ERROR_NOT_IMPLEMENTED;var selectedLogin=null;var checkBox={value:false};var checkBoxLabel=null;var[hostname,realm,unused]=this._getRealmInfo(aPasswordRealm);if(hostname){var canRememberLogin;if(this._inPrivateBrowsing)
canRememberLogin=false;else
canRememberLogin=(aSavePassword==Ci.nsIAuthPrompt.SAVE_PASSWORD_PERMANENTLY)&&this._pwmgr.getLoginSavingEnabled(hostname);if(canRememberLogin)
checkBoxLabel=this._getLocalizedString("rememberPassword");var foundLogins=this._pwmgr.findLogins({},hostname,null,realm);
if(foundLogins.length>0){selectedLogin=foundLogins[0];

if(aUsername.value)
selectedLogin=this._repickSelectedLogin(foundLogins,aUsername.value);if(selectedLogin){checkBox.value=true;aUsername.value=selectedLogin.username;if(!aPassword.value)
aPassword.value=selectedLogin.password;}}}
var ok=this._promptService.promptUsernameAndPassword(this._window,aDialogTitle,aText,aUsername,aPassword,checkBoxLabel,checkBox);if(!ok||!checkBox.value||!hostname)
return ok;if(!aPassword.value){this.log("No password entered, so won't offer to save.");return ok;}


selectedLogin=this._repickSelectedLogin(foundLogins,aUsername.value);
if(!selectedLogin){ this.log("New login seen for "+realm);var newLogin=Cc["@mozilla.org/login-manager/loginInfo;1"].createInstance(Ci.nsILoginInfo);newLogin.init(hostname,null,realm,aUsername.value,aPassword.value,"","");this._pwmgr.addLogin(newLogin);}else if(aPassword.value!=selectedLogin.password){ this.log("Updating password for  "+realm);this._updateLogin(selectedLogin,aPassword.value);}else{this.log("Login unchanged, no further action needed.");this._updateLogin(selectedLogin);}
return ok;},promptPassword:function(aDialogTitle,aText,aPasswordRealm,aSavePassword,aPassword){this.log("===== promptPassword called() =====");if(aSavePassword==Ci.nsIAuthPrompt.SAVE_PASSWORD_FOR_SESSION)
throw Components.results.NS_ERROR_NOT_IMPLEMENTED;var checkBox={value:false};var checkBoxLabel=null;var[hostname,realm,username]=this._getRealmInfo(aPasswordRealm);username=decodeURIComponent(username);if(hostname&&!this._inPrivateBrowsing){var canRememberLogin=(aSavePassword==Ci.nsIAuthPrompt.SAVE_PASSWORD_PERMANENTLY)&&this._pwmgr.getLoginSavingEnabled(hostname);if(canRememberLogin)
checkBoxLabel=this._getLocalizedString("rememberPassword");if(!aPassword.value){var foundLogins=this._pwmgr.findLogins({},hostname,null,realm);


for(var i=0;i<foundLogins.length;++i){if(foundLogins[i].username==username){aPassword.value=foundLogins[i].password; return true;}}}}
var ok=this._promptService.promptPassword(this._window,aDialogTitle,aText,aPassword,checkBoxLabel,checkBox);if(ok&&checkBox.value&&hostname&&aPassword.value){var newLogin=Cc["@mozilla.org/login-manager/loginInfo;1"].createInstance(Ci.nsILoginInfo);newLogin.init(hostname,null,realm,username,aPassword.value,"","");this.log("New login seen for "+realm);this._pwmgr.addLogin(newLogin);}
return ok;},_getRealmInfo:function(aRealmString){var httpRealm=/^.+ \(.+\)$/;if(httpRealm.test(aRealmString))
return[null,null,null];var uri=Services.io.newURI(aRealmString,null,null);var pathname="";if(uri.path!="/")
pathname=uri.path;var formattedHostname=this._getFormattedHostname(uri);return[formattedHostname,formattedHostname+pathname,uri.username];},promptAuth:function(aChannel,aLevel,aAuthInfo){var selectedLogin=null;var checkbox={value:false};var checkboxLabel=null;var epicfail=false;var canAutologin=false;try{this.log("===== promptAuth called =====");

this._removeLoginNotifications();var[hostname,httpRealm]=this._getAuthTarget(aChannel,aAuthInfo);var foundLogins=this._pwmgr.findLogins({},hostname,null,httpRealm);this.log("found "+foundLogins.length+" matching logins.");if(foundLogins.length>0){selectedLogin=foundLogins[0];this._SetAuthInfo(aAuthInfo,selectedLogin.username,selectedLogin.password); if(aAuthInfo.flags&Ci.nsIAuthInformation.AUTH_PROXY&&!(aAuthInfo.flags&Ci.nsIAuthInformation.PREVIOUS_FAILED)&&Services.prefs.getBoolPref("signon.autologin.proxy")&&!this._inPrivateBrowsing){this.log("Autologin enabled, skipping auth prompt.");canAutologin=true;}
checkbox.value=true;}
var canRememberLogin=this._pwmgr.getLoginSavingEnabled(hostname);if(this._inPrivateBrowsing)
canRememberLogin=false;var notifyBox=this._getNotifyBox();if(canRememberLogin&&!notifyBox)
checkboxLabel=this._getLocalizedString("rememberPassword");}catch(e){epicfail=true;Components.utils.reportError("LoginManagerPrompter: "+"Epic fail in promptAuth: "+e+"\n");}
var ok=canAutologin||this._promptService.promptAuth(this._window,aChannel,aLevel,aAuthInfo,checkboxLabel,checkbox);


var rememberLogin=notifyBox?canRememberLogin:checkbox.value;if(!ok||!rememberLogin||epicfail)
return ok;try{var[username,password]=this._GetAuthInfo(aAuthInfo);if(!password){this.log("No password entered, so won't offer to save.");return ok;}


selectedLogin=this._repickSelectedLogin(foundLogins,username);
if(!selectedLogin){this.log("New login seen for "+username+" @ "+hostname+" ("+httpRealm+")");var newLogin=Cc["@mozilla.org/login-manager/loginInfo;1"].createInstance(Ci.nsILoginInfo);newLogin.init(hostname,null,httpRealm,username,password,"","");var notifyObj=this._getPopupNote()||notifyBox;if(notifyObj)
this._showSaveLoginNotification(notifyObj,newLogin);else
this._pwmgr.addLogin(newLogin);}else if(password!=selectedLogin.password){this.log("Updating password for "+username+" @ "+hostname+" ("+httpRealm+")");var notifyObj=this._getPopupNote()||notifyBox;if(notifyObj)
this._showChangeLoginNotification(notifyObj,selectedLogin,password);else
this._updateLogin(selectedLogin,password);}else{this.log("Login unchanged, no further action needed.");this._updateLogin(selectedLogin);}}catch(e){Components.utils.reportError("LoginManagerPrompter: "+"Fail2 in promptAuth: "+e+"\n");}
return ok;},asyncPromptAuth:function(aChannel,aCallback,aContext,aLevel,aAuthInfo){var cancelable=null;try{this.log("===== asyncPromptAuth called =====");

this._removeLoginNotifications();cancelable=this._newAsyncPromptConsumer(aCallback,aContext);var[hostname,httpRealm]=this._getAuthTarget(aChannel,aAuthInfo);var hashKey=aLevel+"|"+hostname+"|"+httpRealm;this.log("Async prompt key = "+hashKey);var asyncPrompt=this._factory._asyncPrompts[hashKey];if(asyncPrompt){this.log("Prompt bound to an existing one in the queue, callback = "+aCallback);asyncPrompt.consumers.push(cancelable);return cancelable;}
this.log("Adding new prompt to the queue, callback = "+aCallback);asyncPrompt={consumers:[cancelable],channel:aChannel,authInfo:aAuthInfo,level:aLevel,inProgress:false,prompter:this}
this._factory._asyncPrompts[hashKey]=asyncPrompt;this._factory._doAsyncPrompt();}
catch(e){Components.utils.reportError("LoginManagerPrompter: "+"asyncPromptAuth: "+e+"\nFalling back to promptAuth\n");
 throw e;}
return cancelable;},init:function(aWindow,aFactory){this._window=aWindow;this._factory=aFactory||null;var prefBranch=Services.prefs.getBranch("signon.");this._debug=prefBranch.getBoolPref("debug");this.log("===== initialized =====");},promptToSavePassword:function(aLogin){var notifyObj=this._getPopupNote()||this._getNotifyBox();if(notifyObj)
this._showSaveLoginNotification(notifyObj,aLogin);else
this._showSaveLoginDialog(aLogin);},_showLoginNotification:function(aNotifyBox,aName,aText,aButtons){var oldBar=aNotifyBox.getNotificationWithValue(aName);const priority=aNotifyBox.PRIORITY_INFO_MEDIUM;this.log("Adding new "+aName+" notification bar");var newBar=aNotifyBox.appendNotification(aText,aName,"chrome://mozapps/skin/passwordmgr/key.png",priority,aButtons);
newBar.persistence++;


newBar.timeout=Date.now()+20000; if(oldBar){this.log("(...and removing old "+aName+" notification bar)");aNotifyBox.removeNotification(oldBar);}},_showSaveLoginNotification:function(aNotifyObj,aLogin){


var neverButtonText=this._getLocalizedString("notifyBarNeverRememberButtonText");var neverButtonAccessKey=this._getLocalizedString("notifyBarNeverRememberButtonAccessKey");var rememberButtonText=this._getLocalizedString("notifyBarRememberPasswordButtonText");var rememberButtonAccessKey=this._getLocalizedString("notifyBarRememberPasswordButtonAccessKey");var displayHost=this._getShortDisplayHost(aLogin.hostname);var notificationText;if(aLogin.username){var displayUser=this._sanitizeUsername(aLogin.username);notificationText=this._getLocalizedString("rememberPasswordMsg",[displayUser,displayHost]);}else{notificationText=this._getLocalizedString("rememberPasswordMsgNoUsername",[displayHost]);}


var pwmgr=this._pwmgr; if(aNotifyObj==this._getPopupNote()){ var mainAction={label:rememberButtonText,accessKey:rememberButtonAccessKey,callback:function(aNotifyObj,aButton){pwmgr.addLogin(aLogin);browser.focus();}};var secondaryActions=[{label:neverButtonText,accessKey:neverButtonAccessKey,callback:function(aNotifyObj,aButton){pwmgr.setLoginSavingEnabled(aLogin.hostname,false);browser.focus();}}];var notifyWin=this._getNotifyWindow();var chromeWin=this._getChromeWindow(notifyWin).wrappedJSObject;var browser=chromeWin.gBrowser.getBrowserForDocument(notifyWin.top.document);aNotifyObj.show(browser,"password-save",notificationText,"password-notification-icon",mainAction,secondaryActions,{timeout:Date.now()+10000,persistWhileVisible:true});}else{var notNowButtonText=this._getLocalizedString("notifyBarNotNowButtonText");var notNowButtonAccessKey=this._getLocalizedString("notifyBarNotNowButtonAccessKey");var buttons=[{label:rememberButtonText,accessKey:rememberButtonAccessKey,popup:null,callback:function(aNotifyObj,aButton){pwmgr.addLogin(aLogin);}},{label:neverButtonText,accessKey:neverButtonAccessKey,popup:null,callback:function(aNotifyObj,aButton){pwmgr.setLoginSavingEnabled(aLogin.hostname,false);}},{label:notNowButtonText,accessKey:notNowButtonAccessKey,popup:null,callback:function(){}}];this._showLoginNotification(aNotifyObj,"password-save",notificationText,buttons);}},_removeLoginNotifications:function(){var popupNote=this._getPopupNote();if(popupNote)
popupNote=popupNote.getNotification("password-save");if(popupNote)
popupNote.remove();var notifyBox=this._getNotifyBox();if(notifyBox){var oldBar=notifyBox.getNotificationWithValue("password-save");if(oldBar){this.log("Removing save-password notification bar.");notifyBox.removeNotification(oldBar);}
oldBar=notifyBox.getNotificationWithValue("password-change");if(oldBar){this.log("Removing change-password notification bar.");notifyBox.removeNotification(oldBar);}}},_showSaveLoginDialog:function(aLogin){const buttonFlags=Ci.nsIPrompt.BUTTON_POS_1_DEFAULT+
(Ci.nsIPrompt.BUTTON_TITLE_IS_STRING*Ci.nsIPrompt.BUTTON_POS_0)+
(Ci.nsIPrompt.BUTTON_TITLE_IS_STRING*Ci.nsIPrompt.BUTTON_POS_1)+
(Ci.nsIPrompt.BUTTON_TITLE_IS_STRING*Ci.nsIPrompt.BUTTON_POS_2);var displayHost=this._getShortDisplayHost(aLogin.hostname);var dialogText;if(aLogin.username){var displayUser=this._sanitizeUsername(aLogin.username);dialogText=this._getLocalizedString("rememberPasswordMsg",[displayUser,displayHost]);}else{dialogText=this._getLocalizedString("rememberPasswordMsgNoUsername",[displayHost]);}
var dialogTitle=this._getLocalizedString("savePasswordTitle");var neverButtonText=this._getLocalizedString("neverForSiteButtonText");var rememberButtonText=this._getLocalizedString("rememberButtonText");var notNowButtonText=this._getLocalizedString("notNowButtonText");this.log("Prompting user to save/ignore login");var userChoice=this._promptService.confirmEx(this._window,dialogTitle,dialogText,buttonFlags,rememberButtonText,notNowButtonText,neverButtonText,null,{});

 if(userChoice==2){this.log("Disabling "+aLogin.hostname+" logins by request.");this._pwmgr.setLoginSavingEnabled(aLogin.hostname,false);}else if(userChoice==0){this.log("Saving login for "+aLogin.hostname);this._pwmgr.addLogin(aLogin);}else{this.log("Ignoring login.");}},promptToChangePassword:function(aOldLogin,aNewLogin){var notifyObj=this._getPopupNote()||this._getNotifyBox();if(notifyObj)
this._showChangeLoginNotification(notifyObj,aOldLogin,aNewLogin.password);else
this._showChangeLoginDialog(aOldLogin,aNewLogin.password);},_showChangeLoginNotification:function(aNotifyObj,aOldLogin,aNewPassword){var notificationText;if(aOldLogin.username){var displayUser=this._sanitizeUsername(aOldLogin.username);notificationText=this._getLocalizedString("updatePasswordMsg",[displayUser]);}else{notificationText=this._getLocalizedString("updatePasswordMsgNoUser");}
var changeButtonText=this._getLocalizedString("notifyBarUpdateButtonText");var changeButtonAccessKey=this._getLocalizedString("notifyBarUpdateButtonAccessKey");

var self=this; if(aNotifyObj==this._getPopupNote()){ var mainAction={label:changeButtonText,accessKey:changeButtonAccessKey,popup:null,callback:function(aNotifyObj,aButton){self._updateLogin(aOldLogin,aNewPassword);}};var notifyWin=this._getNotifyWindow();var chromeWin=this._getChromeWindow(notifyWin).wrappedJSObject;var browser=chromeWin.gBrowser.getBrowserForDocument(notifyWin.top.document);aNotifyObj.show(browser,"password-change",notificationText,"password-notification-icon",mainAction,null,{timeout:Date.now()+10000,persistWhileVisible:true});}else{var dontChangeButtonText=this._getLocalizedString("notifyBarDontChangeButtonText");var dontChangeButtonAccessKey=this._getLocalizedString("notifyBarDontChangeButtonAccessKey");var buttons=[{label:changeButtonText,accessKey:changeButtonAccessKey,popup:null,callback:function(aNotifyObj,aButton){self._updateLogin(aOldLogin,aNewPassword);}},{label:dontChangeButtonText,accessKey:dontChangeButtonAccessKey,popup:null,callback:function(aNotifyObj,aButton){}}];this._showLoginNotification(aNotifyObj,"password-change",notificationText,buttons);}},_showChangeLoginDialog:function(aOldLogin,aNewPassword){const buttonFlags=Ci.nsIPrompt.STD_YES_NO_BUTTONS;var dialogText;if(aOldLogin.username)
dialogText=this._getLocalizedString("updatePasswordMsg",[aOldLogin.username]);else
dialogText=this._getLocalizedString("updatePasswordMsgNoUser");var dialogTitle=this._getLocalizedString("passwordChangeTitle");var ok=!this._promptService.confirmEx(this._window,dialogTitle,dialogText,buttonFlags,null,null,null,null,{});if(ok){this.log("Updating password for user "+aOldLogin.username);this._updateLogin(aOldLogin,aNewPassword);}},promptToChangePasswordWithUsernames:function(logins,count,aNewLogin){const buttonFlags=Ci.nsIPrompt.STD_YES_NO_BUTTONS;var usernames=logins.map(function(l)l.username);var dialogText=this._getLocalizedString("userSelectText");var dialogTitle=this._getLocalizedString("passwordChangeTitle");var selectedIndex={value:null};
var ok=this._promptService.select(this._window,dialogTitle,dialogText,usernames.length,usernames,selectedIndex);if(ok){var selectedLogin=logins[selectedIndex.value];this.log("Updating password for user "+selectedLogin.username);this._updateLogin(selectedLogin,aNewLogin.password);}},_updateLogin:function(login,newPassword){var now=Date.now();var propBag=Cc["@mozilla.org/hash-property-bag;1"].createInstance(Ci.nsIWritablePropertyBag);if(newPassword){propBag.setProperty("password",newPassword);

propBag.setProperty("timePasswordChanged",now);}
propBag.setProperty("timeLastUsed",now);propBag.setProperty("timesUsedIncrement",1);this._pwmgr.modifyLogin(login,propBag);},_getChromeWindow:function(aWindow){var chromeWin=aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation).QueryInterface(Ci.nsIDocShell).chromeEventHandler.ownerDocument.defaultView;return chromeWin;},_getNotifyWindow:function(){try{var notifyWin=this._window.top;

if(notifyWin.opener){var chromeDoc=this._getChromeWindow(notifyWin).document.documentElement;var webnav=notifyWin.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation);

if(chromeDoc.getAttribute("chromehidden")&&webnav.sessionHistory.count==1){this.log("Using opener window for notification bar.");notifyWin=notifyWin.opener;}}
return notifyWin;}catch(e){this.log("Unable to get notify window");return null;}},_getPopupNote:function(){let popupNote=null;try{let notifyWin=this._getNotifyWindow();let chromeWin=this._getChromeWindow(notifyWin).wrappedJSObject;popupNote=chromeWin.PopupNotifications;}catch(e){this.log("Popup notifications not available on window");}
return popupNote;},_getNotifyBox:function(){let notifyBox=null;try{let notifyWin=this._getNotifyWindow();let chromeWin=this._getChromeWindow(notifyWin).wrappedJSObject;notifyBox=chromeWin.getNotificationBox(notifyWin);}catch(e){this.log("Notification bars not available on window");}
return notifyBox;},_repickSelectedLogin:function(foundLogins,username){for(var i=0;i<foundLogins.length;i++)
if(foundLogins[i].username==username)
return foundLogins[i];return null;},_getLocalizedString:function(key,formatArgs){if(formatArgs)
return this._strBundle.formatStringFromName(key,formatArgs,formatArgs.length);else
return this._strBundle.GetStringFromName(key);},_sanitizeUsername:function(username){if(username.length>30){username=username.substring(0,30);username+=this._ellipsis;}
return username.replace(/['"]/g,"");},_getFormattedHostname:function(aURI){var uri;if(aURI instanceof Ci.nsIURI){uri=aURI;}else{uri=Services.io.newURI(aURI,null,null);}
var scheme=uri.scheme;var hostname=scheme+"://"+uri.host;
port=uri.port;if(port!=-1){var handler=Services.io.getProtocolHandler(scheme);if(port!=handler.defaultPort)
hostname+=":"+port;}
return hostname;},_getShortDisplayHost:function(aURIString){var displayHost;var eTLDService=Cc["@mozilla.org/network/effective-tld-service;1"].getService(Ci.nsIEffectiveTLDService);var idnService=Cc["@mozilla.org/network/idn-service;1"].getService(Ci.nsIIDNService);try{var uri=Services.io.newURI(aURIString,null,null);var baseDomain=eTLDService.getBaseDomain(uri);displayHost=idnService.convertToDisplayIDN(baseDomain,{});}catch(e){this.log("_getShortDisplayHost couldn't process "+aURIString);}
if(!displayHost)
displayHost=aURIString;return displayHost;},_getAuthTarget:function(aChannel,aAuthInfo){var hostname,realm;
if(aAuthInfo.flags&Ci.nsIAuthInformation.AUTH_PROXY){this.log("getAuthTarget is for proxy auth");if(!(aChannel instanceof Ci.nsIProxiedChannel))
throw"proxy auth needs nsIProxiedChannel";var info=aChannel.proxyInfo;if(!info)
throw"proxy auth needs nsIProxyInfo";var idnService=Cc["@mozilla.org/network/idn-service;1"].getService(Ci.nsIIDNService);hostname="moz-proxy://"+
idnService.convertUTF8toACE(info.host)+":"+info.port;realm=aAuthInfo.realm;if(!realm)
realm=hostname;return[hostname,realm];}
hostname=this._getFormattedHostname(aChannel.URI);

realm=aAuthInfo.realm;if(!realm)
realm=hostname;return[hostname,realm];},_GetAuthInfo:function(aAuthInfo){var username,password;var flags=aAuthInfo.flags;if(flags&Ci.nsIAuthInformation.NEED_DOMAIN&&aAuthInfo.domain)
username=aAuthInfo.domain+"\\"+aAuthInfo.username;else
username=aAuthInfo.username;password=aAuthInfo.password;return[username,password];},_SetAuthInfo:function(aAuthInfo,username,password){var flags=aAuthInfo.flags;if(flags&Ci.nsIAuthInformation.NEED_DOMAIN){ var idx=username.indexOf("\\");if(idx==-1){aAuthInfo.username=username;}else{aAuthInfo.domain=username.substring(0,idx);aAuthInfo.username=username.substring(idx+1);}}else{aAuthInfo.username=username;}
aAuthInfo.password=password;},_newAsyncPromptConsumer:function(aCallback,aContext){return{QueryInterface:XPCOMUtils.generateQI([Ci.nsICancelable]),callback:aCallback,context:aContext,cancel:function(){this.callback.onAuthCancelled(this.context,false);this.callback=null;this.context=null;}}}};var component=[LoginManagerPromptFactory,LoginManagerPrompter];this.NSGetFactory=XPCOMUtils.generateNSGetFactory(component);