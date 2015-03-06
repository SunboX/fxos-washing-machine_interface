"use strict";this.EXPORTED_SYMBOLS=["LoginManagerContent","UserAutoCompleteResult"];const Ci=Components.interfaces;const Cr=Components.results;const Cc=Components.classes;const Cu=Components.utils;Cu.import("resource://gre/modules/XPCOMUtils.jsm");Cu.import("resource://gre/modules/Services.jsm");Cu.import("resource://gre/modules/PrivateBrowsingUtils.jsm");Cu.import("resource://gre/modules/Promise.jsm");var gEnabled,gDebug,gAutofillForms,gStoreWhenAutocompleteOff;function log(...pieces){function generateLogMessage(args){let strings=['Login Manager (content):'];args.forEach(function(arg){if(typeof arg==='string'){strings.push(arg);}else if(typeof arg==='undefined'){strings.push('undefined');}else if(arg===null){strings.push('null');}else{try{strings.push(JSON.stringify(arg,null,2));}catch(err){strings.push("<<something>>");}}});return strings.join(' ');}
if(!gDebug)
return;let message=generateLogMessage(pieces);dump(message+"\n");Services.console.logStringMessage(message);}
var observer={QueryInterface:XPCOMUtils.generateQI([Ci.nsIObserver,Ci.nsIFormSubmitObserver,Ci.nsISupportsWeakReference]), notify:function(formElement,aWindow,actionURI){log("observer notified for form submission.");
try{LoginManagerContent._onFormSubmit(formElement);}catch(e){log("Caught error in onFormSubmit(",e.lineNumber,"):",e.message);}
return true;},onPrefChange:function(){gDebug=Services.prefs.getBoolPref("signon.debug");gEnabled=Services.prefs.getBoolPref("signon.rememberSignons");gAutofillForms=Services.prefs.getBoolPref("signon.autofillForms");gStoreWhenAutocompleteOff=Services.prefs.getBoolPref("signon.storeWhenAutocompleteOff");},};Services.obs.addObserver(observer,"earlyformsubmit",false);var prefBranch=Services.prefs.getBranch("signon.");prefBranch.addObserver("",observer.onPrefChange,false);observer.onPrefChange();function messageManagerFromWindow(win){return win.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation).QueryInterface(Ci.nsIDocShell).QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIContentFrameMessageManager)}
var LoginManagerContent={__formFillService:null, get _formFillService(){if(!this.__formFillService)
this.__formFillService=Cc["@mozilla.org/satchel/form-fill-controller;1"].getService(Ci.nsIFormFillController);return this.__formFillService;},_getRandomId:function(){return Cc["@mozilla.org/uuid-generator;1"].getService(Ci.nsIUUIDGenerator).generateUUID().toString();},_messages:["RemoteLogins:loginsFound","RemoteLogins:loginsAutoCompleted"],_requests:new Map(),_managers:new Map(),_takeRequest:function(msg){let data=msg.data;let request=this._requests.get(data.requestId);this._requests.delete(data.requestId);let count=this._managers.get(msg.target);if(--count===0){this._managers.delete(msg.target);for(let message of this._messages)
msg.target.removeMessageListener(message,this);}else{this._managers.set(msg.target,count);}
return request;},_sendRequest:function(messageManager,requestData,name,messageData){let count;if(!(count=this._managers.get(messageManager))){this._managers.set(messageManager,1);for(let message of this._messages)
messageManager.addMessageListener(message,this);}else{this._managers.set(messageManager,++count);}
let requestId=this._getRandomId();messageData.requestId=requestId;messageManager.sendAsyncMessage(name,messageData);let deferred=Promise.defer();requestData.promise=deferred;this._requests.set(requestId,requestData);return deferred.promise;},receiveMessage:function(msg){let request=this._takeRequest(msg);switch(msg.name){case"RemoteLogins:loginsFound":{request.promise.resolve({form:request.form,loginsFound:msg.data.logins});break;}
case"RemoteLogins:loginsAutoCompleted":{request.promise.resolve(msg.data.logins);break;}}},_asyncFindLogins:function(form,options){let doc=form.ownerDocument;let win=doc.defaultView;let formOrigin=LoginUtils._getPasswordOrigin(doc.documentURI);let actionOrigin=LoginUtils._getActionOrigin(form);let messageManager=messageManagerFromWindow(win);let requestData={form:form};let messageData={formOrigin:formOrigin,actionOrigin:actionOrigin,options:options};return this._sendRequest(messageManager,requestData,"RemoteLogins:findLogins",messageData);},_autoCompleteSearchAsync:function(aSearchString,aPreviousResult,aElement,aRect){let doc=aElement.ownerDocument;let form=aElement.form;let win=doc.defaultView;let formOrigin=LoginUtils._getPasswordOrigin(doc.documentURI);let actionOrigin=LoginUtils._getActionOrigin(form);let messageManager=messageManagerFromWindow(win);let remote=(Services.appinfo.processType===Services.appinfo.PROCESS_TYPE_CONTENT);let requestData={};let messageData={formOrigin:formOrigin,actionOrigin:actionOrigin,searchString:aSearchString,previousResult:aPreviousResult,rect:aRect,remote:remote};return this._sendRequest(messageManager,requestData,"RemoteLogins:autoCompleteLogins",messageData);},onFormPassword:function(event){if(!event.isTrusted)
return;if(!gEnabled)
return;let form=event.target;log("onFormPassword for",form.ownerDocument.documentURI);this._asyncFindLogins(form,{showMasterPassword:true}).then(this.loginsFound.bind(this)).then(null,Cu.reportError);},loginsFound:function({form,loginsFound}){let doc=form.ownerDocument;let autofillForm=gAutofillForms&&!PrivateBrowsingUtils.isWindowPrivate(doc.defaultView);this._fillForm(form,autofillForm,false,false,false,loginsFound);},onUsernameInput:function(event){if(!event.isTrusted)
return;if(!gEnabled)
return;var acInputField=event.target;if(!(acInputField.ownerDocument instanceof Ci.nsIDOMHTMLDocument))
return;if(!this._isUsernameFieldType(acInputField))
return;var acForm=acInputField.form;if(!acForm)
return;

if(!acInputField.value)
return;log("onUsernameInput from",event.type);
var[usernameField,passwordField,ignored]=this._getFormFields(acForm,false);if(usernameField==acInputField&&passwordField){this._asyncFindLogins(acForm,{showMasterPassword:false}).then(({form,loginsFound})=>{this._fillForm(form,true,true,true,true,loginsFound);}).then(null,Cu.reportError);}else{}},_getPasswordFields:function(form,skipEmptyFields){var pwFields=[];for(var i=0;i<form.elements.length;i++){var element=form.elements[i];if(!(element instanceof Ci.nsIDOMHTMLInputElement)||element.type!="password")
continue;if(skipEmptyFields&&!element.value)
continue;pwFields[pwFields.length]={index:i,element:element};}
if(pwFields.length==0){log("(form ignored -- no password fields.)");return null;}else if(pwFields.length>3){log("(form ignored -- too many password fields. [ got ",pwFields.length,"])");return null;}
return pwFields;},_isUsernameFieldType:function(element){if(!(element instanceof Ci.nsIDOMHTMLInputElement))
return false;let fieldType=(element.hasAttribute("type")?element.getAttribute("type").toLowerCase():element.type);if(fieldType=="text"||fieldType=="email"||fieldType=="url"||fieldType=="tel"||fieldType=="number"){return true;}
return false;},_getFormFields:function(form,isSubmission){var usernameField=null;var pwFields=this._getPasswordFields(form,isSubmission);if(!pwFields)
return[null,null,null];


for(var i=pwFields[0].index-1;i>=0;i--){var element=form.elements[i];if(this._isUsernameFieldType(element)){usernameField=element;break;}}
if(!usernameField)
log("(form -- no username field found)");
if(!isSubmission||pwFields.length==1)
return[usernameField,pwFields[0].element,null];var oldPasswordField,newPasswordField;var pw1=pwFields[0].element.value;var pw2=pwFields[1].element.value;var pw3=(pwFields[2]?pwFields[2].element.value:null);if(pwFields.length==3){ if(pw1==pw2&&pw2==pw3){newPasswordField=pwFields[0].element;oldPasswordField=null;}else if(pw1==pw2){newPasswordField=pwFields[0].element;oldPasswordField=pwFields[2].element;}else if(pw2==pw3){oldPasswordField=pwFields[0].element;newPasswordField=pwFields[2].element;}else if(pw1==pw3){newPasswordField=pwFields[0].element;oldPasswordField=pwFields[1].element;}else{log("(form ignored -- all 3 pw fields differ)");return[null,null,null];}}else{ if(pw1==pw2){ newPasswordField=pwFields[0].element;oldPasswordField=null;}else{ oldPasswordField=pwFields[0].element;newPasswordField=pwFields[1].element;}}
return[usernameField,newPasswordField,oldPasswordField];},_isAutocompleteDisabled:function(element){if(element&&element.hasAttribute("autocomplete")&&element.getAttribute("autocomplete").toLowerCase()=="off")
return true;return false;},_onFormSubmit:function(form){var doc=form.ownerDocument;var win=doc.defaultView;if(PrivateBrowsingUtils.isWindowPrivate(win)){log("(form submission ignored in private browsing mode)");return;}
if(!gEnabled)
return;var hostname=LoginUtils._getPasswordOrigin(doc.documentURI);if(!hostname){log("(form submission ignored -- invalid hostname)");return;}
let topWin=win.top;if(/^about:accounts($|\?)/i.test(topWin.document.documentURI)){log("(form submission ignored -- about:accounts)");return;}
var formSubmitURL=LoginUtils._getActionOrigin(form)
var[usernameField,newPasswordField,oldPasswordField]=this._getFormFields(form,true);if(newPasswordField==null)
return;

if((this._isAutocompleteDisabled(form)||this._isAutocompleteDisabled(usernameField)||this._isAutocompleteDisabled(newPasswordField)||this._isAutocompleteDisabled(oldPasswordField))&&!gStoreWhenAutocompleteOff){log("(form submission ignored -- autocomplete=off found)");return;}
let mockUsername=usernameField?{name:usernameField.name,value:usernameField.value}:null;let mockPassword={name:newPasswordField.name,value:newPasswordField.value};let mockOldPassword=oldPasswordField?{name:oldPasswordField.name,value:oldPasswordField.value}:null;let messageManager=messageManagerFromWindow(win);messageManager.sendAsyncMessage("RemoteLogins:onFormSubmit",{hostname:hostname,formSubmitURL:formSubmitURL,usernameField:mockUsername,newPasswordField:mockPassword,oldPasswordField:mockOldPassword});},_fillForm:function(form,autofillForm,ignoreAutocomplete,clobberPassword,userTriggered,foundLogins){

var[usernameField,passwordField,ignored]=this._getFormFields(form,false);if(passwordField==null)
return[false,foundLogins];if(passwordField.disabled||passwordField.readOnly){log("not filling form, password field disabled or read-only");return[false,foundLogins];}


var maxUsernameLen=Number.MAX_VALUE;var maxPasswordLen=Number.MAX_VALUE;if(usernameField&&usernameField.maxLength>=0)
maxUsernameLen=usernameField.maxLength;if(passwordField.maxLength>=0)
maxPasswordLen=passwordField.maxLength;foundLogins=foundLogins.map(login=>{var formLogin=Cc["@mozilla.org/login-manager/loginInfo;1"].createInstance(Ci.nsILoginInfo);formLogin.init(login.hostname,login.formSubmitURL,login.httpRealm,login.username,login.password,login.usernameField,login.passwordField);return formLogin;});var logins=foundLogins.filter(function(l){var fit=(l.username.length<=maxUsernameLen&&l.password.length<=maxPasswordLen);if(!fit)
log("Ignored",l.username,"login: won't fit");return fit;},this);if(logins.length==0)
return[false,foundLogins];

var didntFillReason=null;
if(usernameField)
this._formFillService.markAsLoginManagerField(usernameField);if(passwordField.value&&!clobberPassword){didntFillReason="existingPassword";this._notifyFoundLogins(didntFillReason,usernameField,passwordField,foundLogins,null);return[false,foundLogins];}



var isFormDisabled=false;if(!ignoreAutocomplete&&(this._isAutocompleteDisabled(form)||this._isAutocompleteDisabled(usernameField)||this._isAutocompleteDisabled(passwordField))){isFormDisabled=true;log("form not filled, has autocomplete=off");}

var selectedLogin=null;if(usernameField&&(usernameField.value||usernameField.disabled||usernameField.readOnly)){
var username=usernameField.value.toLowerCase();let matchingLogins=logins.filter(function(l)
l.username.toLowerCase()==username);if(matchingLogins.length){ for(let l of matchingLogins){if(l.username==usernameField.value){selectedLogin=l;}} 
if(!selectedLogin){selectedLogin=matchingLogins[0];}}else{didntFillReason="existingUsername";log("Password not filled. None of the stored logins match the username already present.");}}else if(logins.length==1){selectedLogin=logins[0];}else{


let matchingLogins;if(usernameField)
matchingLogins=logins.filter(function(l)l.username);else
matchingLogins=logins.filter(function(l)!l.username);if(matchingLogins.length==1){selectedLogin=matchingLogins[0];}else{didntFillReason="multipleLogins";log("Multiple logins for form, so not filling any.");}}
var didFillForm=false;if(selectedLogin&&autofillForm&&!isFormDisabled){ if(usernameField){let disabledOrReadOnly=usernameField.disabled||usernameField.readOnly;

let userEnteredDifferentCase=userTriggered&&(usernameField.value!=selectedLogin.username&&usernameField.value.toLowerCase()==selectedLogin.username.toLowerCase());if(!disabledOrReadOnly&&!userEnteredDifferentCase){usernameField.setUserInput(selectedLogin.username);}}
passwordField.setUserInput(selectedLogin.password);didFillForm=true;}else if(selectedLogin&&!autofillForm){
didntFillReason="noAutofillForms";Services.obs.notifyObservers(form,"passwordmgr-found-form",didntFillReason);log("autofillForms=false but form can be filled; notified observers");}else if(selectedLogin&&isFormDisabled){
didntFillReason="autocompleteOff";Services.obs.notifyObservers(form,"passwordmgr-found-form",didntFillReason);log("autocomplete=off but form can be filled; notified observers");}
this._notifyFoundLogins(didntFillReason,usernameField,passwordField,foundLogins,selectedLogin);return[didFillForm,foundLogins];},_notifyFoundLogins:function(didntFillReason,usernameField,passwordField,foundLogins,selectedLogin){

let formInfo=Cc["@mozilla.org/hash-property-bag;1"].createInstance(Ci.nsIWritablePropertyBag2).QueryInterface(Ci.nsIWritablePropertyBag);formInfo.setPropertyAsACString("didntFillReason",didntFillReason);formInfo.setPropertyAsInterface("usernameField",usernameField);formInfo.setPropertyAsInterface("passwordField",passwordField);formInfo.setProperty("foundLogins",foundLogins.concat());formInfo.setPropertyAsInterface("selectedLogin",selectedLogin);Services.obs.notifyObservers(formInfo,"passwordmgr-found-logins",null);},};var LoginUtils={_getPasswordOrigin:function(uriString,allowJS){var realm="";try{var uri=Services.io.newURI(uriString,null,null);if(allowJS&&uri.scheme=="javascript")
return"javascript:"
realm=uri.scheme+"://"+uri.host;
var port=uri.port;if(port!=-1){var handler=Services.io.getProtocolHandler(uri.scheme);if(port!=handler.defaultPort)
realm+=":"+port;}}catch(e){log("Couldn't parse origin for",uriString);realm=null;}
return realm;},_getActionOrigin:function(form){var uriString=form.action;if(uriString=="")
uriString=form.baseURI; return this._getPasswordOrigin(uriString,true);},};function UserAutoCompleteResult(aSearchString,matchingLogins){function loginSort(a,b){var userA=a.username.toLowerCase();var userB=b.username.toLowerCase();if(userA<userB)
return-1;if(userB>userA)
return 1;return 0;};this.searchString=aSearchString;this.logins=matchingLogins.sort(loginSort);this.matchCount=matchingLogins.length;if(this.matchCount>0){this.searchResult=Ci.nsIAutoCompleteResult.RESULT_SUCCESS;this.defaultIndex=0;}}
UserAutoCompleteResult.prototype={QueryInterface:XPCOMUtils.generateQI([Ci.nsIAutoCompleteResult,Ci.nsISupportsWeakReference]), logins:null,
get wrappedJSObject(){return this;},searchString:null,searchResult:Ci.nsIAutoCompleteResult.RESULT_NOMATCH,defaultIndex:-1,errorDescription:"",matchCount:0,getValueAt:function(index){if(index<0||index>=this.logins.length)
throw"Index out of range.";return this.logins[index].username;},getLabelAt:function(index){return this.getValueAt(index);},getCommentAt:function(index){return"";},getStyleAt:function(index){return"";},getImageAt:function(index){return"";},getFinalCompleteValueAt:function(index){return this.getValueAt(index);},removeValueAt:function(index,removeFromDB){if(index<0||index>=this.logins.length)
throw"Index out of range.";var[removedLogin]=this.logins.splice(index,1);this.matchCount--;if(this.defaultIndex>this.logins.length)
this.defaultIndex--;if(removeFromDB){var pwmgr=Cc["@mozilla.org/login-manager;1"].getService(Ci.nsILoginManager);pwmgr.removeLogin(removedLogin);}}};