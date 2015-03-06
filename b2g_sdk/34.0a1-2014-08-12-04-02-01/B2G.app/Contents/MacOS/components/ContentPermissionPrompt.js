"use strict"
function debug(str){}
const Ci=Components.interfaces;const Cr=Components.results;const Cu=Components.utils;const Cc=Components.classes;const PROMPT_FOR_UNKNOWN=["audio-capture","desktop-notification","geolocation","video-capture"];
const PERMISSION_NO_SESSION=["audio-capture","video-capture"];const ALLOW_MULTIPLE_REQUESTS=["audio-capture","video-capture"];Cu.import("resource://gre/modules/XPCOMUtils.jsm");Cu.import("resource://gre/modules/Services.jsm");Cu.import("resource://gre/modules/Webapps.jsm");Cu.import("resource://gre/modules/AppsUtils.jsm");Cu.import("resource://gre/modules/PermissionsInstaller.jsm");Cu.import("resource://gre/modules/PermissionsTable.jsm");var permissionManager=Cc["@mozilla.org/permissionmanager;1"].getService(Ci.nsIPermissionManager);var secMan=Cc["@mozilla.org/scriptsecuritymanager;1"].getService(Ci.nsIScriptSecurityManager);let permissionSpecificChecker={};XPCOMUtils.defineLazyServiceGetter(this,"AudioManager","@mozilla.org/telephony/audiomanager;1","nsIAudioManager");XPCOMUtils.defineLazyModuleGetter(this,"SystemAppProxy","resource://gre/modules/SystemAppProxy.jsm");function shouldPrompt(aPerm,aAction){return((aAction==Ci.nsIPermissionManager.PROMPT_ACTION)||(aAction==Ci.nsIPermissionManager.UNKNOWN_ACTION&&PROMPT_FOR_UNKNOWN.indexOf(aPerm)>=0));}
function buildDefaultChoices(aTypesInfo){let choices;for(let type of aTypesInfo){if(type.options.length>0){if(!choices){choices={};}
choices[type.access]=type.options[0];}}
return choices;}
function rememberPermission(aTypesInfo,aPrincipal,aSession)
{function convertPermToAllow(aPerm,aPrincipal)
{let type=permissionManager.testExactPermissionFromPrincipal(aPrincipal,aPerm);if(shouldPrompt(aPerm,type)){debug("add "+aPerm+" to permission manager with ALLOW_ACTION");if(!aSession){permissionManager.addFromPrincipal(aPrincipal,aPerm,Ci.nsIPermissionManager.ALLOW_ACTION);}else if(PERMISSION_NO_SESSION.indexOf(aPerm)<0){permissionManager.addFromPrincipal(aPrincipal,aPerm,Ci.nsIPermissionManager.ALLOW_ACTION,Ci.nsIPermissionManager.EXPIRE_SESSION,0);}}}
for(let i in aTypesInfo){
 let perm=aTypesInfo[i].permission;let access=PermissionsTable[perm].access;if(access){for(let idx in access){convertPermToAllow(perm+"-"+access[idx],aPrincipal);}}else{convertPermToAllow(perm,aPrincipal);}}}
function ContentPermissionPrompt(){}
ContentPermissionPrompt.prototype={handleExistingPermission:function handleExistingPermission(request,typesInfo){typesInfo.forEach(function(type){type.action=Services.perms.testExactPermissionFromPrincipal(request.principal,type.access);if(shouldPrompt(type.access,type.action)){type.action=Ci.nsIPermissionManager.PROMPT_ACTION;}});let checkAllowPermission=function(type){if(type.action==Ci.nsIPermissionManager.ALLOW_ACTION&&type.options.length<=1){return true;}
return false;}
if(typesInfo.every(checkAllowPermission)){debug("all permission requests are allowed");request.allow(buildDefaultChoices(typesInfo));return true;}
let checkDenyPermission=function(type){if(type.action==Ci.nsIPermissionManager.DENY_ACTION||type.action==Ci.nsIPermissionManager.UNKNOWN_ACTION){return true;}
return false;}
if(typesInfo.every(checkDenyPermission)){debug("all permission requests are denied");request.cancel();return true;}
return false;}, checkMultipleRequest:function checkMultipleRequest(typesInfo){if(typesInfo.length==1){return true;}else if(typesInfo.length>1){let checkIfAllowMultiRequest=function(type){return(ALLOW_MULTIPLE_REQUESTS.indexOf(type.access)!==-1);}
if(typesInfo.every(checkIfAllowMultiRequest)){debug("legal multiple requests");return true;}}
return false;},handledByApp:function handledByApp(request,typesInfo){if(request.principal.appId==Ci.nsIScriptSecurityManager.NO_APP_ID||request.principal.appId==Ci.nsIScriptSecurityManager.UNKNOWN_APP_ID){ request.cancel();return true;}
let appsService=Cc["@mozilla.org/AppsService;1"].getService(Ci.nsIAppsService);let app=appsService.getAppByLocalId(request.principal.appId);
let notDenyAppPrincipal=function(type){let url=Services.io.newURI(app.origin,null,null);let principal=secMan.getAppCodebasePrincipal(url,request.principal.appId,false);let result=Services.perms.testExactPermissionFromPrincipal(principal,type.access);if(result==Ci.nsIPermissionManager.ALLOW_ACTION||result==Ci.nsIPermissionManager.PROMPT_ACTION){type.deny=false;}
return!type.deny;} 
if(!typesInfo.every(notDenyAppPrincipal)){request.cancel();return true;}
return false;},handledByPermissionType:function handledByPermissionType(request,typesInfo){for(let i in typesInfo){if(permissionSpecificChecker.hasOwnProperty(typesInfo[i].permission)&&permissionSpecificChecker[typesInfo[i].permission](request)){return true;}}
return false;},prompt:function(request){let typesInfo=[];let perms=request.types.QueryInterface(Ci.nsIArray);for(let idx=0;idx<perms.length;idx++){let perm=perms.queryElementAt(idx,Ci.nsIContentPermissionType);let tmp={permission:perm.type,access:(perm.access&&perm.access!=="unused")?perm.type+"-"+perm.access:perm.type,options:[],deny:true,action:Ci.nsIPermissionManager.UNKNOWN_ACTION};let options=perm.options.QueryInterface(Ci.nsIArray);for(let i=0;i<options.length;i++){let option=options.queryElementAt(i,Ci.nsISupportsString).data;tmp.options.push(option);}
typesInfo.push(tmp);}
if(secMan.isSystemPrincipal(request.principal)){request.allow(buildDefaultChoices(typesInfo));return;}
if(typesInfo.length==0){request.cancel();return;}
if(!this.checkMultipleRequest(typesInfo)){request.cancel();return;}
if(this.handledByApp(request,typesInfo)||this.handledByPermissionType(request,typesInfo)){return;} 
if(this.handleExistingPermission(request,typesInfo)){return;}
typesInfo=typesInfo.filter(function(type){return!type.deny&&(type.action==Ci.nsIPermissionManager.PROMPT_ACTION||type.options.length>0);});let frame=request.element;if(!frame){this.delegatePrompt(request,typesInfo);return;}
frame=frame.wrappedJSObject;var cancelRequest=function(){frame.removeEventListener("mozbrowservisibilitychange",onVisibilityChange);request.cancel();}
var self=this;var onVisibilityChange=function(evt){if(evt.detail.visible===true)
return;self.cancelPrompt(request,typesInfo);cancelRequest();}
 
let domRequest=frame.getVisible();domRequest.onsuccess=function gv_success(evt){if(!evt.target.result){cancelRequest();return;}

frame.addEventListener("mozbrowservisibilitychange",onVisibilityChange);self.delegatePrompt(request,typesInfo,function onCallback(){frame.removeEventListener("mozbrowservisibilitychange",onVisibilityChange);});};domRequest.onerror=function gv_error(){cancelRequest();}},cancelPrompt:function(request,typesInfo){this.sendToBrowserWindow("cancel-permission-prompt",request,typesInfo);},delegatePrompt:function(request,typesInfo,callback){this.sendToBrowserWindow("permission-prompt",request,typesInfo,function(type,remember,choices){if(type=="permission-allow"){rememberPermission(typesInfo,request.principal,!remember);if(callback){callback();}
request.allow(choices);return;}
let addDenyPermission=function(type){debug("add "+type.permission+" to permission manager with DENY_ACTION");if(remember){Services.perms.addFromPrincipal(request.principal,type.access,Ci.nsIPermissionManager.DENY_ACTION);}else if(PERMISSION_NO_SESSION.indexOf(type.access)<0){Services.perms.addFromPrincipal(request.principal,type.access,Ci.nsIPermissionManager.DENY_ACTION,Ci.nsIPermissionManager.EXPIRE_SESSION,0);}}
try{
typesInfo.forEach(addDenyPermission);}catch(e){}
if(callback){callback();}
try{request.cancel();}catch(e){}});},sendToBrowserWindow:function(type,request,typesInfo,callback){let requestId=Cc["@mozilla.org/uuid-generator;1"].getService(Ci.nsIUUIDGenerator).generateUUID().toString();if(callback){SystemAppProxy.addEventListener("mozContentEvent",function contentEvent(evt){let detail=evt.detail;if(detail.id!=requestId)
return;SystemAppProxy.removeEventListener("mozContentEvent",contentEvent);callback(detail.type,detail.remember,detail.choices);})}
let principal=request.principal;let isApp=principal.appStatus!=Ci.nsIPrincipal.APP_STATUS_NOT_INSTALLED;let remember=(principal.appStatus==Ci.nsIPrincipal.APP_STATUS_PRIVILEGED||principal.appStatus==Ci.nsIPrincipal.APP_STATUS_CERTIFIED)?true:request.remember;let isGranted=typesInfo.every(function(type){return type.action==Ci.nsIPermissionManager.ALLOW_ACTION;});let permissions={};for(let i in typesInfo){debug("prompt "+typesInfo[i].permission);permissions[typesInfo[i].permission]=typesInfo[i].options;}
let details={type:type,permissions:permissions,id:requestId,origin:principal.origin,isApp:isApp,remember:remember,isGranted:isGranted,};if(isApp){details.manifestURL=DOMApplicationRegistry.getManifestURLByLocalId(principal.appId);}





let targetElement=request.element;let targetWindow=request.window||targetElement.ownerDocument.defaultView;while(targetWindow.realFrameElement){targetElement=targetWindow.realFrameElement;targetWindow=targetElement.ownerDocument.defaultView;}
SystemAppProxy.dispatchEvent(details,targetElement);},classID:Components.ID("{8c719f03-afe0-4aac-91ff-6c215895d467}"),QueryInterface:XPCOMUtils.generateQI([Ci.nsIContentPermissionPrompt])};(function(){permissionSpecificChecker["audio-capture"]=function(request){if(AudioManager.phoneState===Ci.nsIAudioManager.PHONE_STATE_IN_CALL){request.cancel();return true;}else{return false;}};})();this.NSGetFactory=XPCOMUtils.generateNSGetFactory([ContentPermissionPrompt]);