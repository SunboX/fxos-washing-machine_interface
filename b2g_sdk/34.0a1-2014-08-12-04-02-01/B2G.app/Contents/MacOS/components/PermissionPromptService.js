"use strict";let DEBUG=0;let debug;if(DEBUG){debug=function(s){dump("-*- PermissionPromptService: "+s+"\n");};}
else{debug=function(s){};}
const Cc=Components.classes;const Ci=Components.interfaces;const Cu=Components.utils;Cu.import("resource://gre/modules/XPCOMUtils.jsm");Cu.import("resource://gre/modules/Services.jsm");Cu.import("resource://gre/modules/PermissionsInstaller.jsm");const PERMISSIONPROMPTSERVICE_CONTRACTID="@mozilla.org/permission-prompt-service;1";const PERMISSIONPROMPTSERVICE_CID=Components.ID("{e5f953b3-a6ca-444e-a88d-cdc81383741c}");const permissionPromptService=Ci.nsIPermissionPromptService;var permissionManager=Cc["@mozilla.org/permissionmanager;1"].getService(Ci.nsIPermissionManager);var secMan=Cc["@mozilla.org/scriptsecuritymanager;1"].getService(Ci.nsIScriptSecurityManager);function makePrompt()
{return Cc["@mozilla.org/content-permission/prompt;1"].createInstance(Ci.nsIContentPermissionPrompt);}
function PermissionPromptService()
{debug("Constructor");}
PermissionPromptService.prototype={classID:PERMISSIONPROMPTSERVICE_CID,QueryInterface:XPCOMUtils.generateQI([permissionPromptService,Ci.nsIObserver]),classInfo:XPCOMUtils.generateCI({classID:PERMISSIONPROMPTSERVICE_CID,contractID:PERMISSIONPROMPTSERVICE_CONTRACTID,classDescription:"PermissionPromptService",interfaces:[permissionPromptService]}),getPermission:function PS_getPermission(aRequest)
{if(!(aRequest instanceof Ci.nsIContentPermissionRequest)){throw new Error("PermissionService.getPermission: "
+"2nd argument must be type 'nsIContentPermissionRequest'");}
let types=aRequest.types.QueryInterface(Ci.nsIArray);if(types.length!=1){aRequest.cancel();return;}
let reqType=types.queryElementAt(0,Ci.nsIContentPermissionType);let type=reqType.access!=="unused"?reqType.type+"-"+reqType.access:reqType.type;let perm=permissionManager.testExactPermissionFromPrincipal(aRequest.principal,type);switch(perm){case Ci.nsIPermissionManager.ALLOW_ACTION:aRequest.allow();break;case Ci.nsIPermissionManager.PROMPT_ACTION:makePrompt().prompt(aRequest);break;case Ci.nsIPermissionManager.DENY_ACTION:case Ci.nsIPermissionManager.UNKNOWN_ACTION:default:aRequest.cancel();break;}},};this.NSGetFactory=XPCOMUtils.generateNSGetFactory([PermissionPromptService]);