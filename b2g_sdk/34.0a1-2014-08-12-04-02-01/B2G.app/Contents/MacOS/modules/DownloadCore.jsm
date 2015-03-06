"use strict";this.EXPORTED_SYMBOLS=["Download","DownloadSource","DownloadTarget","DownloadError","DownloadSaver","DownloadCopySaver","DownloadLegacySaver",];const Cc=Components.classes;const Ci=Components.interfaces;const Cu=Components.utils;const Cr=Components.results;Cu.import("resource://gre/modules/XPCOMUtils.jsm");XPCOMUtils.defineLazyModuleGetter(this,"DownloadIntegration","resource://gre/modules/DownloadIntegration.jsm");XPCOMUtils.defineLazyModuleGetter(this,"FileUtils","resource://gre/modules/FileUtils.jsm");XPCOMUtils.defineLazyModuleGetter(this,"NetUtil","resource://gre/modules/NetUtil.jsm");XPCOMUtils.defineLazyModuleGetter(this,"OS","resource://gre/modules/osfile.jsm")
XPCOMUtils.defineLazyModuleGetter(this,"Promise","resource://gre/modules/Promise.jsm");XPCOMUtils.defineLazyModuleGetter(this,"Services","resource://gre/modules/Services.jsm");XPCOMUtils.defineLazyModuleGetter(this,"Task","resource://gre/modules/Task.jsm");XPCOMUtils.defineLazyServiceGetter(this,"gDownloadHistory","@mozilla.org/browser/download-history;1",Ci.nsIDownloadHistory);XPCOMUtils.defineLazyServiceGetter(this,"gExternalAppLauncher","@mozilla.org/uriloader/external-helper-app-service;1",Ci.nsPIExternalAppLauncher);XPCOMUtils.defineLazyServiceGetter(this,"gExternalHelperAppService","@mozilla.org/uriloader/external-helper-app-service;1",Ci.nsIExternalHelperAppService);const BackgroundFileSaverStreamListener=Components.Constructor("@mozilla.org/network/background-file-saver;1?mode=streamlistener","nsIBackgroundFileSaver");function isString(aValue){return(typeof aValue=="string")||(typeof aValue=="object"&&"charAt"in aValue);}
function serializeUnknownProperties(aObject,aSerializable)
{if(aObject._unknownProperties){for(let property in aObject._unknownProperties){aSerializable[property]=aObject._unknownProperties[property];}}}
function deserializeUnknownProperties(aObject,aSerializable,aFilterFn)
{for(let property in aSerializable){if(aFilterFn(property)){if(!aObject._unknownProperties){aObject._unknownProperties={};}
aObject._unknownProperties[property]=aSerializable[property];}}}
const kProgressUpdateIntervalMs=400;this.Download=function()
{this._deferSucceeded=Promise.defer();}
this.Download.prototype={source:null,target:null,saver:null,stopped:true,succeeded:false,canceled:false,error:null,startTime:null,hasProgress:false,progress:0,totalBytes:0,currentBytes:0,speed:0,hasPartialData:false,onchange:null,launchWhenSucceeded:false,contentType:null,launcherPath:null,_notifyChange:function D_notifyChange(){try{if(this.onchange){this.onchange();}}catch(ex){Cu.reportError(ex);}},_currentAttempt:null,start:function D_start()
{if(this.succeeded){return Promise.resolve();}


if(this._currentAttempt){return this._currentAttempt;}

if(this._finalized){return Promise.reject(new DownloadError({message:"Cannot start after finalization."}));}
this.stopped=false;this.canceled=false;this.error=null;this.hasProgress=false;this.progress=0;this.totalBytes=0;this.currentBytes=0;this.startTime=new Date();
let deferAttempt=Promise.defer();let currentAttempt=deferAttempt.promise;this._currentAttempt=currentAttempt;this._lastProgressTimeMs=0;

function DS_setProgressBytes(aCurrentBytes,aTotalBytes,aHasPartialData)
{if(this._currentAttempt==currentAttempt){this._setBytes(aCurrentBytes,aTotalBytes,aHasPartialData);}}



function DS_setProperties(aOptions)
{if(this._currentAttempt!=currentAttempt){return;}
let changeMade=false;if("contentType"in aOptions&&this.contentType!=aOptions.contentType){this.contentType=aOptions.contentType;changeMade=true;}
if(changeMade){this._notifyChange();}}

deferAttempt.resolve(Task.spawn(function task_D_start(){if(this._promiseCanceled){yield this._promiseCanceled;}
if(this._promiseRemovePartialData){try{yield this._promiseRemovePartialData;}catch(ex){
}}

if(this.succeeded){return;}
try{if(yield DownloadIntegration.shouldBlockForParentalControls(this)){throw new DownloadError({becauseBlockedByParentalControls:true});}


if(this._promiseCanceled){throw undefined;}
this._saverExecuting=true;yield this.saver.execute(DS_setProgressBytes.bind(this),DS_setProperties.bind(this));

if((yield DownloadIntegration.shouldBlockForReputationCheck(this))||this._promiseCanceled){try{yield OS.File.remove(this.target.path);}catch(ex){Cu.reportError(ex);}

throw new DownloadError({becauseBlockedByReputationCheck:true});}
this.progress=100;this.succeeded=true;this.hasPartialData=false;}catch(ex){

if(this._promiseCanceled){throw new DownloadError({message:"Download canceled."});}




if(this._blockedByParentalControls){ex=new DownloadError({becauseBlockedByParentalControls:true});}

if(this._currentAttempt==currentAttempt||!this._currentAttempt){this.error=ex;}
throw ex;}finally{this._saverExecuting=false;this._promiseCanceled=null;if(this._currentAttempt==currentAttempt||!this._currentAttempt){this._currentAttempt=null;this.stopped=true;this.speed=0;this._notifyChange();if(this.succeeded){yield DownloadIntegration.downloadDone(this);this._deferSucceeded.resolve();if(this.launchWhenSucceeded){this.launch().then(null,Cu.reportError);
if(this.source.isPrivate){gExternalAppLauncher.deleteTemporaryPrivateFileWhenPossible(new FileUtils.File(this.target.path));}else if(Services.prefs.getBoolPref("browser.helperApps.deleteTempFileOnExit")){gExternalAppLauncher.deleteTemporaryFileOnExit(new FileUtils.File(this.target.path));}}}}}}.bind(this)));this._notifyChange();return currentAttempt;},launch:function(){if(!this.succeeded){return Promise.reject(new Error("launch can only be called if the download succeeded"));}
return DownloadIntegration.launchDownload(this);},showContainingDirectory:function D_showContainingDirectory(){return DownloadIntegration.showContainingDirectory(this.target.path);},_promiseCanceled:null,_saverExecuting:false,cancel:function D_cancel()
{if(this.stopped){return Promise.resolve();}
if(!this._promiseCanceled){let deferCanceled=Promise.defer();this._currentAttempt.then(function()deferCanceled.resolve(),function()deferCanceled.resolve());this._promiseCanceled=deferCanceled.promise;this._currentAttempt=null;this.canceled=true;this._notifyChange();

if(this._saverExecuting){this.saver.cancel();}}
return this._promiseCanceled;},tryToKeepPartialData:false,_promiseRemovePartialData:null,removePartialData:function()
{if(!this.canceled&&!this.error){return Promise.resolve();}
let promiseRemovePartialData=this._promiseRemovePartialData;if(!promiseRemovePartialData){let deferRemovePartialData=Promise.defer();promiseRemovePartialData=deferRemovePartialData.promise;this._promiseRemovePartialData=promiseRemovePartialData;deferRemovePartialData.resolve(Task.spawn(function task_D_removePartialData(){try{if(this._promiseCanceled){yield this._promiseCanceled;}
yield this.saver.removePartialData();if(this.currentBytes!=0||this.hasPartialData){this.currentBytes=0;this.hasPartialData=false;this._notifyChange();}}finally{this._promiseRemovePartialData=null;}}.bind(this)));}
return promiseRemovePartialData;},_deferSucceeded:null,whenSucceeded:function D_whenSucceeded()
{return this._deferSucceeded.promise;},refresh:function()
{return Task.spawn(function(){if(!this.stopped||this._finalized){return;}
if(this.hasPartialData&&this.target.partFilePath){let stat=yield OS.File.stat(this.target.partFilePath);if(!this.stopped||this._finalized){return;}
this.currentBytes=stat.size;if(this.totalBytes>0){this.hasProgress=true;this.progress=Math.floor(this.currentBytes/this.totalBytes*100);}
this._notifyChange();}}.bind(this)).then(null,Cu.reportError);},_finalized:false,finalize:function(aRemovePartialData)
{this._finalized=true;if(aRemovePartialData){

this.cancel();return this.removePartialData();}else{return this.cancel();}},_lastProgressTimeMs:0,_setBytes:function D_setBytes(aCurrentBytes,aTotalBytes,aHasPartialData){let changeMade=(this.hasPartialData!=aHasPartialData);this.hasPartialData=aHasPartialData;
if(aTotalBytes!=-1&&(!this.hasProgress||this.totalBytes!=aTotalBytes)){this.hasProgress=true;this.totalBytes=aTotalBytes;changeMade=true;}

let currentTimeMs=Date.now();let intervalMs=currentTimeMs-this._lastProgressTimeMs;if(intervalMs>=kProgressUpdateIntervalMs){if(this._lastProgressTimeMs!=0){let rawSpeed=(aCurrentBytes-this.currentBytes)/intervalMs*1000;if(this.speed==0){
this.speed=rawSpeed;}else{this.speed=rawSpeed*0.1+this.speed*0.9;}}



if(aCurrentBytes>0){this._lastProgressTimeMs=currentTimeMs;this.currentBytes=aCurrentBytes;if(this.totalBytes>0){this.progress=Math.floor(this.currentBytes/this.totalBytes*100);}
changeMade=true;}}
if(changeMade){this._notifyChange();}},toSerializable:function()
{let serializable={source:this.source.toSerializable(),target:this.target.toSerializable(),};


let saver=this.saver.toSerializable();if(saver!=="copy"){serializable.saver=saver;}
if(this.error&&("message"in this.error)){serializable.error={message:this.error.message};}
if(this.startTime){serializable.startTime=this.startTime.toJSON();}
for(let property of kSerializableDownloadProperties){if(property!="error"&&property!="startTime"&&this[property]){serializable[property]=this[property];}}
serializeUnknownProperties(this,serializable);return serializable;},getSerializationHash:function()
{

return this.stopped+","+this.totalBytes+","+this.hasPartialData+","+this.contentType;},};const kSerializableDownloadProperties=["succeeded","canceled","error","totalBytes","hasPartialData","tryToKeepPartialData","launcherPath","launchWhenSucceeded","contentType",];Download.fromSerializable=function(aSerializable){let download=new Download();if(aSerializable.source instanceof DownloadSource){download.source=aSerializable.source;}else{download.source=DownloadSource.fromSerializable(aSerializable.source);}
if(aSerializable.target instanceof DownloadTarget){download.target=aSerializable.target;}else{download.target=DownloadTarget.fromSerializable(aSerializable.target);}
if("saver"in aSerializable){download.saver=DownloadSaver.fromSerializable(aSerializable.saver);}else{download.saver=DownloadSaver.fromSerializable("copy");}
download.saver.download=download;if("startTime"in aSerializable){let time=aSerializable.startTime.getTime?aSerializable.startTime.getTime():aSerializable.startTime;download.startTime=new Date(time);}
for(let property of kSerializableDownloadProperties){if(property in aSerializable){download[property]=aSerializable[property];}}
deserializeUnknownProperties(download,aSerializable,property=>kSerializableDownloadProperties.indexOf(property)==-1&&property!="startTime"&&property!="source"&&property!="target"&&property!="saver");return download;};this.DownloadSource=function(){}
this.DownloadSource.prototype={url:null,isPrivate:false,referrer:null,toSerializable:function()
{if(!this.isPrivate&&!this.referrer&&!this._unknownProperties){return this.url;}
let serializable={url:this.url};if(this.isPrivate){serializable.isPrivate=true;}
if(this.referrer){serializable.referrer=this.referrer;}
serializeUnknownProperties(this,serializable);return serializable;},};this.DownloadSource.fromSerializable=function(aSerializable){let source=new DownloadSource();if(isString(aSerializable)){source.url=aSerializable.toString();}else if(aSerializable instanceof Ci.nsIURI){source.url=aSerializable.spec;}else{source.url=aSerializable.url.toString();if("isPrivate"in aSerializable){source.isPrivate=aSerializable.isPrivate;}
if("referrer"in aSerializable){source.referrer=aSerializable.referrer;}
deserializeUnknownProperties(source,aSerializable,property=>property!="url"&&property!="isPrivate"&&property!="referrer");}
return source;};this.DownloadTarget=function(){}
this.DownloadTarget.prototype={path:null,partFilePath:null,toSerializable:function()
{if(!this.partFilePath&&!this._unknownProperties){return this.path;}
let serializable={path:this.path,partFilePath:this.partFilePath};serializeUnknownProperties(this,serializable);return serializable;},};this.DownloadTarget.fromSerializable=function(aSerializable){let target=new DownloadTarget();if(isString(aSerializable)){target.path=aSerializable.toString();}else if(aSerializable instanceof Ci.nsIFile){target.path=aSerializable.path;}else{
target.path=aSerializable.path.toString();if("partFilePath"in aSerializable){target.partFilePath=aSerializable.partFilePath;}
deserializeUnknownProperties(target,aSerializable,property=>property!="path"&&property!="partFilePath");}
return target;};this.DownloadError=function(aProperties)
{const NS_ERROR_MODULE_BASE_OFFSET=0x45;const NS_ERROR_MODULE_NETWORK=6;const NS_ERROR_MODULE_FILES=13;this.name="DownloadError";this.result=aProperties.result||Cr.NS_ERROR_FAILURE;if(aProperties.message){this.message=aProperties.message;}else if(aProperties.becauseBlocked||aProperties.becauseBlockedByParentalControls||aProperties.becauseBlockedByReputationCheck){this.message="Download blocked.";}else{let exception=new Components.Exception("",this.result);this.message=exception.toString();}
if(aProperties.inferCause){let module=((this.result&0x7FFF0000)>>16)-
NS_ERROR_MODULE_BASE_OFFSET;this.becauseSourceFailed=(module==NS_ERROR_MODULE_NETWORK);this.becauseTargetFailed=(module==NS_ERROR_MODULE_FILES);}
else{if(aProperties.becauseSourceFailed){this.becauseSourceFailed=true;}
if(aProperties.becauseTargetFailed){this.becauseTargetFailed=true;}}
if(aProperties.becauseBlockedByParentalControls){this.becauseBlocked=true;this.becauseBlockedByParentalControls=true;}else if(aProperties.becauseBlockedByReputationCheck){this.becauseBlocked=true;this.becauseBlockedByReputationCheck=true;}else if(aProperties.becauseBlocked){this.becauseBlocked=true;}
this.stack=new Error().stack;}
this.DownloadError.prototype={__proto__:Error.prototype,result:false,becauseSourceFailed:false,becauseTargetFailed:false,becauseBlocked:false,becauseBlockedByParentalControls:false,becauseBlockedByReputationCheck:false,};this.DownloadSaver=function(){}
this.DownloadSaver.prototype={download:null,execute:function DS_execute(aSetProgressBytesFn,aSetPropertiesFn)
{throw new Error("Not implemented.");},cancel:function DS_cancel()
{throw new Error("Not implemented.");},removePartialData:function DS_removePartialData()
{return Promise.resolve();},addToHistory:function()
{if(this.download.source.isPrivate){return;}
let sourceUri=NetUtil.newURI(this.download.source.url);let referrer=this.download.source.referrer;let referrerUri=referrer?NetUtil.newURI(referrer):null;let targetUri=NetUtil.newURI(new FileUtils.File(this.download.target.path));let startPRTime=this.download.startTime.getTime()*1000;try{gDownloadHistory.addDownload(sourceUri,referrerUri,startPRTime,targetUri);}
catch(ex if ex instanceof Components.Exception&&ex.result==Cr.NS_ERROR_NOT_AVAILABLE){

}},toSerializable:function()
{throw new Error("Not implemented.");},getSha256Hash:function()
{throw new Error("Not implemented.");},getSignatureInfo:function()
{throw new Error("Not implemented.");},};this.DownloadSaver.fromSerializable=function(aSerializable){let serializable=isString(aSerializable)?{type:aSerializable}:aSerializable;let saver;switch(serializable.type){case"copy":saver=DownloadCopySaver.fromSerializable(serializable);break;case"legacy":saver=DownloadLegacySaver.fromSerializable(serializable);break;default:throw new Error("Unrecoginzed download saver type.");}
return saver;};this.DownloadCopySaver=function(){}
this.DownloadCopySaver.prototype={__proto__:DownloadSaver.prototype,_backgroundFileSaver:null,_canceled:false,_sha256Hash:null,_signatureInfo:null,_redirects:null,alreadyAddedToHistory:false,entityID:null,execute:function DCS_execute(aSetProgressBytesFn,aSetPropertiesFn)
{let copySaver=this;this._canceled=false;let download=this.download;let targetPath=download.target.path;let partFilePath=download.target.partFilePath;let keepPartialData=download.tryToKeepPartialData;return Task.spawn(function task_DCS_execute(){



if(!this.alreadyAddedToHistory){this.addToHistory();this.alreadyAddedToHistory=true;}




try{let file=yield OS.File.open(targetPath,{write:true});yield file.close();}catch(ex if ex instanceof OS.File.Error){

let error=new DownloadError({message:ex.toString()});error.becauseTargetFailed=true;throw error;}
try{let deferSaveComplete=Promise.defer();if(this._canceled){
throw new DownloadError({message:"Saver canceled."});}
let backgroundFileSaver=new BackgroundFileSaverStreamListener();try{
backgroundFileSaver.observer={onTargetChange:function(){},onSaveComplete:(aSaver,aStatus)=>{if(Components.isSuccessCode(aStatus)){this._sha256Hash=aSaver.sha256Hash;this._signatureInfo=aSaver.signatureInfo;this._redirects=aSaver.redirects;deferSaveComplete.resolve();}else{
let properties={result:aStatus,inferCause:true};deferSaveComplete.reject(new DownloadError(properties));}
backgroundFileSaver.observer=null;this._backgroundFileSaver=null;},};
let channel=NetUtil.newChannel(NetUtil.newURI(download.source.url));if(channel instanceof Ci.nsIPrivateBrowsingChannel){channel.setPrivate(download.source.isPrivate);}
if(channel instanceof Ci.nsIHttpChannel&&download.source.referrer){channel.referrer=NetUtil.newURI(download.source.referrer);}

let resumeAttempted=false;let resumeFromBytes=0;if(channel instanceof Ci.nsIResumableChannel&&this.entityID&&partFilePath&&keepPartialData){try{let stat=yield OS.File.stat(partFilePath);channel.resumeAt(stat.size,this.entityID);resumeAttempted=true;resumeFromBytes=stat.size;}catch(ex if ex instanceof OS.File.Error&&ex.becauseNoSuchFile){}}
channel.notificationCallbacks={QueryInterface:XPCOMUtils.generateQI([Ci.nsIInterfaceRequestor]),getInterface:XPCOMUtils.generateQI([Ci.nsIProgressEventSink]),onProgress:function DCSE_onProgress(aRequest,aContext,aProgress,aProgressMax)
{let currentBytes=resumeFromBytes+aProgress;let totalBytes=aProgressMax==-1?-1:(resumeFromBytes+
aProgressMax);aSetProgressBytesFn(currentBytes,totalBytes,aProgress>0&&partFilePath&&keepPartialData);},onStatus:function(){},};backgroundFileSaver.QueryInterface(Ci.nsIStreamListener);channel.asyncOpen({onStartRequest:function(aRequest,aContext){backgroundFileSaver.onStartRequest(aRequest,aContext);
if(aRequest instanceof Ci.nsIHttpChannel&&aRequest.responseStatus==450){
this.download._blockedByParentalControls=true;aRequest.cancel(Cr.NS_BINDING_ABORTED);return;}
aSetPropertiesFn({contentType:channel.contentType});
if(channel.contentLength>=0){aSetProgressBytesFn(0,channel.contentLength);}


if(channel instanceof Ci.nsIEncodedChannel&&channel.contentEncodings){let uri=channel.URI;if(uri instanceof Ci.nsIURL&&uri.fileExtension){let encoding=channel.contentEncodings.getNext();if(encoding){channel.applyConversion=gExternalHelperAppService.applyDecodingForExtension(uri.fileExtension,encoding);}}}
if(keepPartialData){
if(aRequest instanceof Ci.nsIResumableChannel){try{this.entityID=aRequest.entityID;}catch(ex if ex instanceof Components.Exception&&ex.result==Cr.NS_ERROR_NOT_RESUMABLE){keepPartialData=false;}}else{keepPartialData=false;}}

backgroundFileSaver.enableSha256();backgroundFileSaver.enableSignatureInfo();if(partFilePath){if(resumeAttempted){ backgroundFileSaver.enableAppend();}
backgroundFileSaver.setTarget(new FileUtils.File(partFilePath),keepPartialData);}else{backgroundFileSaver.setTarget(new FileUtils.File(targetPath),false);}}.bind(copySaver),onStopRequest:function(aRequest,aContext,aStatusCode){try{backgroundFileSaver.onStopRequest(aRequest,aContext,aStatusCode);}finally{

if(Components.isSuccessCode(aStatusCode)){if(partFilePath){backgroundFileSaver.setTarget(new FileUtils.File(targetPath),false);}
backgroundFileSaver.finish(Cr.NS_OK);}}}.bind(copySaver),onDataAvailable:function(aRequest,aContext,aInputStream,aOffset,aCount){backgroundFileSaver.onDataAvailable(aRequest,aContext,aInputStream,aOffset,aCount);}.bind(copySaver),},null);

if(this._canceled){throw new DownloadError({message:"Saver canceled."});}
this._backgroundFileSaver=backgroundFileSaver;}catch(ex){
backgroundFileSaver.finish(Cr.NS_ERROR_FAILURE);throw ex;}

yield deferSaveComplete.promise;}catch(ex){

try{yield OS.File.remove(targetPath);}catch(e2){


if(!(e2 instanceof OS.File.Error&&(e2.becauseNoSuchFile||e2.becauseAccessDenied))){Cu.reportError(e2);}}
throw ex;}}.bind(this));},cancel:function DCS_cancel()
{this._canceled=true;if(this._backgroundFileSaver){this._backgroundFileSaver.finish(Cr.NS_ERROR_FAILURE);this._backgroundFileSaver=null;}},removePartialData:function()
{return Task.spawn(function task_DCS_removePartialData(){if(this.download.target.partFilePath){try{yield OS.File.remove(this.download.target.partFilePath);}catch(ex if ex instanceof OS.File.Error&&ex.becauseNoSuchFile){}}}.bind(this));},toSerializable:function()
{if(!this.entityID&&!this._unknownProperties){return"copy";}
let serializable={type:"copy",entityID:this.entityID};serializeUnknownProperties(this,serializable);return serializable;},getSha256Hash:function()
{return this._sha256Hash;},getSignatureInfo:function()
{return this._signatureInfo;},getRedirects:function()
{return this._redirects;}};this.DownloadCopySaver.fromSerializable=function(aSerializable){let saver=new DownloadCopySaver();if("entityID"in aSerializable){saver.entityID=aSerializable.entityID;}
deserializeUnknownProperties(saver,aSerializable,property=>property!="entityID"&&property!="type");return saver;};this.DownloadLegacySaver=function()
{this.deferExecuted=Promise.defer();this.deferCanceled=Promise.defer();}
this.DownloadLegacySaver.prototype={__proto__:DownloadSaver.prototype,_sha256Hash:null,_signatureInfo:null,_redirects:null,request:null,deferExecuted:null,deferCanceled:null,setProgressBytesFn:null,onProgressBytes:function DLS_onProgressBytes(aCurrentBytes,aTotalBytes)
{if(!this.setProgressBytesFn){return;}
let hasPartFile=!!this.download.target.partFilePath;this.progressWasNotified=true;this.setProgressBytesFn(aCurrentBytes,aTotalBytes,aCurrentBytes>0&&hasPartFile);},progressWasNotified:false,onTransferStarted:function(aRequest,aAlreadyAddedToHistory)
{if(this.download.tryToKeepPartialData&&aRequest instanceof Ci.nsIResumableChannel){try{this.entityID=aRequest.entityID;}catch(ex if ex instanceof Components.Exception&&ex.result==Cr.NS_ERROR_NOT_RESUMABLE){}}
if(aRequest instanceof Ci.nsIHttpChannel&&aRequest.referrer){this.download.source.referrer=aRequest.referrer.spec;}
if(!aAlreadyAddedToHistory){this.addToHistory();}},onTransferFinished:function DLS_onTransferFinished(aRequest,aStatus)
{this.request=aRequest;if(Components.isSuccessCode(aStatus)){this.deferExecuted.resolve();}else{
let properties={result:aStatus,inferCause:true};this.deferExecuted.reject(new DownloadError(properties));}},firstExecutionFinished:false,copySaver:null,entityID:null,execute:function DLS_execute(aSetProgressBytesFn)
{
if(this.firstExecutionFinished){if(!this.copySaver){this.copySaver=new DownloadCopySaver();this.copySaver.download=this.download;this.copySaver.entityID=this.entityID;this.copySaver.alreadyAddedToHistory=true;}
return this.copySaver.execute.apply(this.copySaver,arguments);}
this.setProgressBytesFn=aSetProgressBytesFn;return Task.spawn(function task_DLS_execute(){try{yield this.deferExecuted.promise;

if(!this.progressWasNotified&&this.request instanceof Ci.nsIChannel&&this.request.contentLength>=0){aSetProgressBytesFn(0,this.request.contentLength);}



if(this.download.target.partFilePath){yield OS.File.move(this.download.target.partFilePath,this.download.target.path);}else{

try{let file=yield OS.File.open(this.download.target.path,{create:true});yield file.close();}catch(ex if ex instanceof OS.File.Error&&ex.becauseExists){}}}catch(ex){
try{yield OS.File.remove(this.download.target.path);}catch(e2){


if(!(e2 instanceof OS.File.Error&&(e2.becauseNoSuchFile||e2.becauseAccessDenied))){Cu.reportError(e2);}}

this.deferCanceled.resolve();throw ex;}finally{

this.request=null;this.deferCanceled=null;this.firstExecutionFinished=true;}}.bind(this));},cancel:function DLS_cancel()
{if(this.copySaver){return this.copySaver.cancel.apply(this.copySaver,arguments);}

if(this.deferCanceled){this.deferCanceled.resolve();}},removePartialData:function()
{

return DownloadCopySaver.prototype.removePartialData.call(this);},toSerializable:function()
{

return DownloadCopySaver.prototype.toSerializable.call(this);},getSha256Hash:function()
{if(this.copySaver){return this.copySaver.getSha256Hash();}
return this._sha256Hash;},setSha256Hash:function(hash)
{this._sha256Hash=hash;},getSignatureInfo:function()
{if(this.copySaver){return this.copySaver.getSignatureInfo();}
return this._signatureInfo;},setSignatureInfo:function(signatureInfo)
{this._signatureInfo=signatureInfo;},getRedirects:function()
{if(this.copySaver){return this.copySaver.getRedirects();}
return this._redirects;},setRedirects:function(redirects)
{this._redirects=redirects;},};this.DownloadLegacySaver.fromSerializable=function(){return new DownloadLegacySaver();};