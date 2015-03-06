"use strict";module.metadata={"stability":"unstable"};const{Cc,Ci,CC}=require("chrome");const{uri:ADDON_URI}=require("../self");const loginManager=Cc["@mozilla.org/login-manager;1"].getService(Ci.nsILoginManager);const{URL:parseURL}=require("../url");const LoginInfo=CC("@mozilla.org/login-manager/loginInfo;1","nsILoginInfo","init");function filterMatchingLogins(loginInfo)
Object.keys(this).every(function(key)loginInfo[key]===this[key],this);function normalizeURL(url){let{scheme,host,port}=parseURL(url);

return scheme==="http"||scheme==="https"||scheme==="ftp"?scheme+"://"+(host||"")+(port?":"+port:""):url}
function Login(options){let login=Object.create(Login.prototype);Object.keys(options||{}).forEach(function(key){if(key==='url')
login.hostname=normalizeURL(options.url);else if(key==='formSubmitURL')
login.formSubmitURL=options.formSubmitURL?normalizeURL(options.formSubmitURL):null;else if(key==='realm')
login.httpRealm=options.realm;else
login[key]=options[key];});return login;}
Login.prototype.toJSON=function toJSON(){return{url:this.hostname||ADDON_URI,realm:this.httpRealm||null,formSubmitURL:this.formSubmitURL||null,username:this.username||null,password:this.password||null,usernameField:this.usernameField||'',passwordField:this.passwordField||'',}};Login.prototype.toLoginInfo=function toLoginInfo(){let{url,realm,formSubmitURL,username,password,usernameField,passwordField}=this.toJSON();return new LoginInfo(url,formSubmitURL,realm,username,password,usernameField,passwordField);};function loginToJSON(value)Login(value).toJSON()
exports.search=function search(options){return loginManager.getAllLogins().filter(filterMatchingLogins,Login(options)).map(loginToJSON);};exports.store=function store(options){loginManager.addLogin(Login(options).toLoginInfo());};exports.remove=function remove(options){loginManager.removeLogin(Login(options).toLoginInfo());};