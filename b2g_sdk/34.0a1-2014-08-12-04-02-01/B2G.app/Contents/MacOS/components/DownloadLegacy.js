"use strict";const Cc=Components.classes;const Ci=Components.interfaces;const Cu=Components.utils;const Cr=Components.results;Cu.import("resource://gre/modules/XPCOMUtils.jsm");XPCOMUtils.defineLazyModuleGetter(this,"Downloads","resource://gre/modules/Downloads.jsm");XPCOMUtils.defineLazyModuleGetter(this,"Promise","resource://gre/modules/Promise.jsm");function DownloadLegacyTransfer()
{this._deferDownload=Promise.defer();}
DownloadLegacyTransfer.prototype={classID:Components.ID("{1b4c85df-cbdd-4bb6-b04e-613caece083c}"), QueryInterface:XPCOMUtils.generateQI([Ci.nsIWebProgressListener,Ci.nsIWebProgressListener2,Ci.nsITransfer]), onStateChange:function DLT_onStateChange(aWebProgress,aRequest,aStateFlags,aStatus)
{if(!Components.isSuccessCode(aStatus)){this._componentFailed=true;}
if((aStateFlags&Ci.nsIWebProgressListener.STATE_START)&&(aStateFlags&Ci.nsIWebProgressListener.STATE_IS_NETWORK)){
let blockedByParentalControls=aRequest instanceof Ci.nsIHttpChannel&&aRequest.responseStatus==450;if(blockedByParentalControls){aRequest.cancel(Cr.NS_BINDING_ABORTED);}

this._deferDownload.promise.then(download=>{

if(blockedByParentalControls){download._blockedByParentalControls=true;}
download.saver.onTransferStarted(aRequest,this._cancelable instanceof Ci.nsIHelperAppLauncher);



return download.saver.deferCanceled.promise.then(()=>{if(this._cancelable&&!this._componentFailed){this._cancelable.cancel(Cr.NS_ERROR_ABORT);if(this._cancelable instanceof Ci.nsIWebBrowserPersist){download.saver.onTransferFinished(aRequest,Cr.NS_ERROR_ABORT);this._cancelable=null;}}});}).then(null,Cu.reportError);}else if((aStateFlags&Ci.nsIWebProgressListener.STATE_STOP)&&(aStateFlags&Ci.nsIWebProgressListener.STATE_IS_NETWORK)){
this._deferDownload.promise.then(download=>{
if(Components.isSuccessCode(aStatus)){download.saver.setSha256Hash(this._sha256Hash);download.saver.setSignatureInfo(this._signatureInfo);download.saver.setRedirects(this._redirects);}
download.saver.onTransferFinished(aRequest,aStatus);}).then(null,Cu.reportError);this._cancelable=null;}},onProgressChange:function DLT_onProgressChange(aWebProgress,aRequest,aCurSelfProgress,aMaxSelfProgress,aCurTotalProgress,aMaxTotalProgress)
{this.onProgressChange64(aWebProgress,aRequest,aCurSelfProgress,aMaxSelfProgress,aCurTotalProgress,aMaxTotalProgress);},onLocationChange:function(){},onStatusChange:function DLT_onStatusChange(aWebProgress,aRequest,aStatus,aMessage)
{

if(!Components.isSuccessCode(aStatus)){this._componentFailed=true;this._deferDownload.promise.then(function DLT_OSC_onDownload(aDownload){aDownload.saver.onTransferFinished(aRequest,aStatus);}).then(null,Cu.reportError);}},onSecurityChange:function(){}, onProgressChange64:function DLT_onProgressChange64(aWebProgress,aRequest,aCurSelfProgress,aMaxSelfProgress,aCurTotalProgress,aMaxTotalProgress)
{this._deferDownload.promise.then(function DLT_OPC64_onDownload(aDownload){aDownload.saver.onProgressBytes(aCurTotalProgress,aMaxTotalProgress);}).then(null,Cu.reportError);},onRefreshAttempted:function DLT_onRefreshAttempted(aWebProgress,aRefreshURI,aMillis,aSameURI)
{return true;}, init:function DLT_init(aSource,aTarget,aDisplayName,aMIMEInfo,aStartTime,aTempFile,aCancelable,aIsPrivate)
{this._cancelable=aCancelable;let launchWhenSucceeded=false,contentType=null,launcherPath=null;if(aMIMEInfo instanceof Ci.nsIMIMEInfo){launchWhenSucceeded=aMIMEInfo.preferredAction!=Ci.nsIMIMEInfo.saveToDisk;contentType=aMIMEInfo.type;let appHandler=aMIMEInfo.preferredApplicationHandler;if(aMIMEInfo.preferredAction==Ci.nsIMIMEInfo.useHelperApp&&appHandler instanceof Ci.nsILocalHandlerApp){launcherPath=appHandler.executable.path;}}


Downloads.createDownload({source:{url:aSource.spec,isPrivate:aIsPrivate},target:{path:aTarget.QueryInterface(Ci.nsIFileURL).file.path,partFilePath:aTempFile&&aTempFile.path},saver:"legacy",launchWhenSucceeded:launchWhenSucceeded,contentType:contentType,launcherPath:launcherPath}).then(function DLT_I_onDownload(aDownload){if(aTempFile){aDownload.tryToKeepPartialData=true;}
aDownload.start().then(null,()=>{});this._deferDownload.resolve(aDownload);return Downloads.getList(Downloads.ALL).then(list=>list.add(aDownload));}.bind(this)).then(null,Cu.reportError);},setSha256Hash:function(hash)
{this._sha256Hash=hash;},setSignatureInfo:function(signatureInfo)
{this._signatureInfo=signatureInfo;},setRedirects:function(redirects)
{this._redirects=redirects;},_deferDownload:null,_cancelable:null,_componentFailed:false,_sha256Hash:null,_signatureInfo:null,};this.NSGetFactory=XPCOMUtils.generateNSGetFactory([DownloadLegacyTransfer]);