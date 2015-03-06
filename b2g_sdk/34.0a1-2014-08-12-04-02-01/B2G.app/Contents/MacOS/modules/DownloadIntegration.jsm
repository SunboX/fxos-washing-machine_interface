"use strict";this.EXPORTED_SYMBOLS=["DownloadIntegration",];const Cc=Components.classes;const Ci=Components.interfaces;const Cu=Components.utils;const Cr=Components.results;Cu.import("resource://gre/modules/XPCOMUtils.jsm");XPCOMUtils.defineLazyModuleGetter(this,"DeferredTask","resource://gre/modules/DeferredTask.jsm");XPCOMUtils.defineLazyModuleGetter(this,"Downloads","resource://gre/modules/Downloads.jsm");XPCOMUtils.defineLazyModuleGetter(this,"DownloadStore","resource://gre/modules/DownloadStore.jsm");XPCOMUtils.defineLazyModuleGetter(this,"DownloadImport","resource://gre/modules/DownloadImport.jsm");XPCOMUtils.defineLazyModuleGetter(this,"DownloadUIHelper","resource://gre/modules/DownloadUIHelper.jsm");XPCOMUtils.defineLazyModuleGetter(this,"FileUtils","resource://gre/modules/FileUtils.jsm");XPCOMUtils.defineLazyModuleGetter(this,"NetUtil","resource://gre/modules/NetUtil.jsm");XPCOMUtils.defineLazyModuleGetter(this,"OS","resource://gre/modules/osfile.jsm");XPCOMUtils.defineLazyModuleGetter(this,"Promise","resource://gre/modules/Promise.jsm");XPCOMUtils.defineLazyModuleGetter(this,"Services","resource://gre/modules/Services.jsm");XPCOMUtils.defineLazyModuleGetter(this,"Task","resource://gre/modules/Task.jsm");XPCOMUtils.defineLazyModuleGetter(this,"NetUtil","resource://gre/modules/NetUtil.jsm");XPCOMUtils.defineLazyServiceGetter(this,"gDownloadPlatform","@mozilla.org/toolkit/download-platform;1","mozIDownloadPlatform");XPCOMUtils.defineLazyServiceGetter(this,"gEnvironment","@mozilla.org/process/environment;1","nsIEnvironment");XPCOMUtils.defineLazyServiceGetter(this,"gMIMEService","@mozilla.org/mime;1","nsIMIMEService");XPCOMUtils.defineLazyServiceGetter(this,"gExternalProtocolService","@mozilla.org/uriloader/external-protocol-service;1","nsIExternalProtocolService");XPCOMUtils.defineLazyGetter(this,"gParentalControlsService",function(){if("@mozilla.org/parental-controls-service;1"in Cc){return Cc["@mozilla.org/parental-controls-service;1"].createInstance(Ci.nsIParentalControlsService);}
return null;});XPCOMUtils.defineLazyServiceGetter(this,"gApplicationReputationService","@mozilla.org/downloads/application-reputation-service;1",Ci.nsIApplicationReputationService);XPCOMUtils.defineLazyServiceGetter(this,"volumeService","@mozilla.org/telephony/volume-service;1","nsIVolumeService");const Timer=Components.Constructor("@mozilla.org/timer;1","nsITimer","initWithCallback");const kSaveDelayMs=1500;const kPrefImportedFromSqlite="browser.download.importedFromSqlite";const kObserverTopics=["quit-application-requested","offline-requested","last-pb-context-exiting","last-pb-context-exited","sleep_notification","suspend_process_notification","wake_notification","resume_process_notification","network:offline-about-to-go-offline","network:offline-status-changed","xpcom-will-shutdown",];this.DownloadIntegration={ _testMode:false,testPromptDownloads:0,dontLoadList:false,dontLoadObservers:false,dontCheckParentalControls:false,shouldBlockInTest:false,dontCheckApplicationReputation:true,shouldBlockInTestForApplicationReputation:false,dontOpenFileAndFolder:false,downloadDoneCalled:false,_deferTestOpenFile:null,_deferTestShowDir:null,_deferTestClearPrivateList:null,_store:null,get testMode()this._testMode,set testMode(mode){this._downloadsDirectory=null;return(this._testMode=mode);},initializePublicDownloadList:function(aList){return Task.spawn(function task_DI_initializePublicDownloadList(){if(this.dontLoadList){
new DownloadHistoryObserver(aList);return;}
if(this._store){throw new Error("initializePublicDownloadList may be called only once.");}
this._store=new DownloadStore(aList,OS.Path.join(OS.Constants.Path.profileDir,"downloads.json"));this._store.onsaveitem=this.shouldPersistDownload.bind(this);if(this._importedFromSqlite){try{yield this._store.load();}catch(ex){Cu.reportError(ex);}}else{let sqliteDBpath=OS.Path.join(OS.Constants.Path.profileDir,"downloads.sqlite");if(yield OS.File.exists(sqliteDBpath)){let sqliteImport=new DownloadImport(aList,sqliteDBpath);yield sqliteImport.import();let importCount=(yield aList.getAll()).length;if(importCount>0){try{yield this._store.save();}catch(ex){}}
OS.File.remove(sqliteDBpath).then(null,Cu.reportError);}
Services.prefs.setBoolPref(kPrefImportedFromSqlite,true);
OS.File.remove(OS.Path.join(OS.Constants.Path.profileDir,"downloads.rdf"));}






yield new DownloadAutoSaveView(aList,this._store).initialize();new DownloadHistoryObserver(aList);}.bind(this));},shouldPersistDownload:function(aDownload)
{


let maxTime=Date.now()-
Services.prefs.getIntPref("dom.downloads.max_retention_days")*24*60*60*1000;return(aDownload.startTime>maxTime)||aDownload.hasPartialData||!aDownload.stopped;},getSystemDownloadsDirectory:function DI_getSystemDownloadsDirectory(){return Task.spawn(function(){if(this._downloadsDirectory){

yield undefined;throw new Task.Result(this._downloadsDirectory);}
let directoryPath=null;directoryPath=this._getDirectory("DfltDwnld");this._downloadsDirectory=directoryPath;throw new Task.Result(this._downloadsDirectory);}.bind(this));},_downloadsDirectory:null,getPreferredDownloadsDirectory:function DI_getPreferredDownloadsDirectory(){return Task.spawn(function(){let directoryPath=null;let prefValue=1;try{prefValue=Services.prefs.getIntPref("browser.download.folderList");}catch(e){}
switch(prefValue){case 0: directoryPath=this._getDirectory("Desk");break;case 1: directoryPath=yield this.getSystemDownloadsDirectory();break;case 2: try{let directory=Services.prefs.getComplexValue("browser.download.dir",Ci.nsIFile);directoryPath=directory.path;yield OS.File.makeDir(directoryPath,{ignoreExisting:true});}catch(ex){directoryPath=yield this.getSystemDownloadsDirectory();}
break;default:directoryPath=yield this.getSystemDownloadsDirectory();}
throw new Task.Result(directoryPath);}.bind(this));},getTemporaryDownloadsDirectory:function DI_getTemporaryDownloadsDirectory(){return Task.spawn(function(){let directoryPath=null;directoryPath=yield this.getPreferredDownloadsDirectory();throw new Task.Result(directoryPath);}.bind(this));},shouldBlockForParentalControls:function DI_shouldBlockForParentalControls(aDownload){if(this.dontCheckParentalControls){return Promise.resolve(this.shouldBlockInTest);}
let isEnabled=gParentalControlsService&&gParentalControlsService.parentalControlsEnabled;let shouldBlock=isEnabled&&gParentalControlsService.blockFileDownloadsEnabled;if(isEnabled&&gParentalControlsService.loggingEnabled){gParentalControlsService.log(gParentalControlsService.ePCLog_FileDownload,shouldBlock,NetUtil.newURI(aDownload.source.url),null);}
return Promise.resolve(shouldBlock);},shouldBlockForReputationCheck:function(aDownload){if(this.dontCheckApplicationReputation){return Promise.resolve(this.shouldBlockInTestForApplicationReputation);}
let hash;let sigInfo;let channelRedirects;try{hash=aDownload.saver.getSha256Hash();sigInfo=aDownload.saver.getSignatureInfo();channelRedirects=aDownload.saver.getRedirects();}catch(ex){return Promise.resolve(false);}
if(!hash||!sigInfo){return Promise.resolve(false);}
let deferred=Promise.defer();let aReferrer=null;if(aDownload.source.referrer){aReferrer:NetUtil.newURI(aDownload.source.referrer);}
gApplicationReputationService.queryReputation({sourceURI:NetUtil.newURI(aDownload.source.url),referrerURI:aReferrer,fileSize:aDownload.currentBytes,sha256Hash:hash,suggestedFileName:OS.Path.basename(aDownload.target.path),signatureInfo:sigInfo,redirects:channelRedirects},function onComplete(aShouldBlock,aRv){deferred.resolve(aShouldBlock);});return deferred.promise;},downloadDone:function(aDownload){return Task.spawn(function(){
try{yield OS.File.setPermissions(aDownload.target.path,{unixMode:0o666});}catch(ex){
Cu.reportError(ex);}
gDownloadPlatform.downloadDone(NetUtil.newURI(aDownload.source.url),new FileUtils.File(aDownload.target.path),aDownload.contentType,aDownload.source.isPrivate);this.downloadDoneCalled=true;}.bind(this));},launchDownload:function(aDownload){let deferred=Task.spawn(function DI_launchDownload_task(){let file=new FileUtils.File(aDownload.target.path);




if(file.isExecutable()&&!this.dontOpenFileAndFolder){

let shouldLaunch=yield DownloadUIHelper.getPrompter().confirmLaunchExecutable(file.path);if(!shouldLaunch){return;}}


let fileExtension=null,mimeInfo=null;let match=file.leafName.match(/\.([^.]+)$/);if(match){fileExtension=match[1];}
try{

mimeInfo=gMIMEService.getFromTypeAndExtension(aDownload.contentType,fileExtension);}catch(e){}
if(aDownload.launcherPath){if(!mimeInfo){

throw new Error("Unable to create nsIMIMEInfo to launch a custom application");} 
let localHandlerApp=Cc["@mozilla.org/uriloader/local-handler-app;1"].createInstance(Ci.nsILocalHandlerApp);localHandlerApp.executable=new FileUtils.File(aDownload.launcherPath);mimeInfo.preferredApplicationHandler=localHandlerApp;mimeInfo.preferredAction=Ci.nsIMIMEInfo.useHelperApp;if(this.dontOpenFileAndFolder){throw new Task.Result(mimeInfo);}
mimeInfo.launchWithFile(file);return;}

if(this.dontOpenFileAndFolder){throw new Task.Result(null);}
 
if(mimeInfo){mimeInfo.preferredAction=Ci.nsIMIMEInfo.useSystemDefault;try{mimeInfo.launchWithFile(file);return;}catch(ex){}}
try{file.launch();return;}catch(ex){}

gExternalProtocolService.loadUrl(NetUtil.newURI(file));yield undefined;}.bind(this));if(this.dontOpenFileAndFolder){deferred.then((value)=>{this._deferTestOpenFile.resolve(value);},(error)=>{this._deferTestOpenFile.reject(error);});}
return deferred;},showContainingDirectory:function(aFilePath){let deferred=Task.spawn(function DI_showContainingDirectory_task(){let file=new FileUtils.File(aFilePath);if(this.dontOpenFileAndFolder){return;}
try{file.reveal();return;}catch(ex){}

let parent=file.parent;if(!parent){throw new Error("Unexpected reference to a top-level directory instead of a file");}
try{parent.launch();return;}catch(ex){}

gExternalProtocolService.loadUrl(NetUtil.newURI(parent));yield undefined;}.bind(this));if(this.dontOpenFileAndFolder){deferred.then((value)=>{this._deferTestShowDir.resolve("success");},(error)=>{

this._deferTestShowDir.promise.then(null,function(){});this._deferTestShowDir.reject(error);});}
return deferred;},_createDownloadsDirectory:function DI_createDownloadsDirectory(aName){

let directoryPath=OS.Path.join(this._getDirectory(aName),DownloadUIHelper.strings.downloadsFolder);return OS.File.makeDir(directoryPath,{ignoreExisting:true}).then(function(){return directoryPath;});},_getDirectory:function DI_getDirectory(aName){return Services.dirsvc.get(this.testMode?"TmpD":aName,Ci.nsIFile).path;},addListObservers:function DI_addListObservers(aList,aIsPrivate){if(this.dontLoadObservers){return Promise.resolve();}
DownloadObserver.registerView(aList,aIsPrivate);if(!DownloadObserver.observersAdded){DownloadObserver.observersAdded=true;for(let topic of kObserverTopics){Services.obs.addObserver(DownloadObserver,topic,false);}}
return Promise.resolve();},get _importedFromSqlite(){try{return Services.prefs.getBoolPref(kPrefImportedFromSqlite);}catch(ex){return false;}},};this.DownloadObserver={observersAdded:false,_wakeTimer:null,_publicInProgressDownloads:new Set(),_privateInProgressDownloads:new Set(),_canceledOfflineDownloads:new Set(),registerView:function DO_registerView(aList,aIsPrivate){let downloadsSet=aIsPrivate?this._privateInProgressDownloads:this._publicInProgressDownloads;let downloadsView={onDownloadAdded:aDownload=>{if(!aDownload.stopped){downloadsSet.add(aDownload);}},onDownloadChanged:aDownload=>{if(aDownload.stopped){downloadsSet.delete(aDownload);}else{downloadsSet.add(aDownload);}},onDownloadRemoved:aDownload=>{downloadsSet.delete(aDownload);this._canceledOfflineDownloads.delete(aDownload);}};aList.addView(downloadsView).then(null,Cu.reportError);},_confirmCancelDownloads:function DO_confirmCancelDownload(aCancel,aDownloadsCount,aPrompter,aPromptType){if((aCancel instanceof Ci.nsISupportsPRBool)&&aCancel.data){return;} 
if(DownloadIntegration.testMode){DownloadIntegration.testPromptDownloads=aDownloadsCount;return;}
aCancel.data=aPrompter.confirmCancelDownloads(aDownloadsCount,aPromptType);},_resumeOfflineDownloads:function DO_resumeOfflineDownloads(){this._wakeTimer=null;for(let download of this._canceledOfflineDownloads){download.start();}}, observe:function DO_observe(aSubject,aTopic,aData){let downloadsCount;let p=DownloadUIHelper.getPrompter();switch(aTopic){case"quit-application-requested":downloadsCount=this._publicInProgressDownloads.size+
this._privateInProgressDownloads.size;this._confirmCancelDownloads(aSubject,downloadsCount,p,p.ON_QUIT);break;case"offline-requested":downloadsCount=this._publicInProgressDownloads.size+
this._privateInProgressDownloads.size;this._confirmCancelDownloads(aSubject,downloadsCount,p,p.ON_OFFLINE);break;case"last-pb-context-exiting":downloadsCount=this._privateInProgressDownloads.size;this._confirmCancelDownloads(aSubject,downloadsCount,p,p.ON_LEAVE_PRIVATE_BROWSING);break;case"last-pb-context-exited":let deferred=Task.spawn(function(){let list=yield Downloads.getList(Downloads.PRIVATE);let downloads=yield list.getAll();for(let download of downloads){list.remove(download).then(null,Cu.reportError);download.finalize(true).then(null,Cu.reportError);}}); if(DownloadIntegration.testMode){deferred.then((value)=>{DownloadIntegration._deferTestClearPrivateList.resolve("success");},(error)=>{DownloadIntegration._deferTestClearPrivateList.reject(error);});}
break;case"sleep_notification":case"suspend_process_notification":case"network:offline-about-to-go-offline":for(let download of this._publicInProgressDownloads){download.cancel();this._canceledOfflineDownloads.add(download);}
for(let download of this._privateInProgressDownloads){download.cancel();this._canceledOfflineDownloads.add(download);}
break;case"wake_notification":case"resume_process_notification":let wakeDelay=10000;try{wakeDelay=Services.prefs.getIntPref("browser.download.manager.resumeOnWakeDelay");}catch(e){}
if(wakeDelay>=0){this._wakeTimer=new Timer(this._resumeOfflineDownloads.bind(this),wakeDelay,Ci.nsITimer.TYPE_ONE_SHOT);}
break;case"network:offline-status-changed":if(aData=="online"){this._resumeOfflineDownloads();}
break;




case"xpcom-will-shutdown":for(let topic of kObserverTopics){Services.obs.removeObserver(this,topic);}
break;}}, QueryInterface:XPCOMUtils.generateQI([Ci.nsIObserver])};
this.DownloadHistoryObserver=function(aList){}
this.DownloadAutoSaveView=function(aList,aStore)
{this._list=aList;this._store=aStore;this._downloadsMap=new Map();this._writer=new DeferredTask(()=>this._store.save(),kSaveDelayMs);}
this.DownloadAutoSaveView.prototype={_list:null,_store:null,_initialized:false,initialize:function()
{
return this._list.addView(this).then(()=>this._initialized=true);},_downloadsMap:null,_writer:null,saveSoon:function()
{this._writer.arm();}, onDownloadAdded:function(aDownload)
{if(DownloadIntegration.shouldPersistDownload(aDownload)){this._downloadsMap.set(aDownload,aDownload.getSerializationHash());if(this._initialized){this.saveSoon();}}},onDownloadChanged:function(aDownload)
{if(!DownloadIntegration.shouldPersistDownload(aDownload)){if(this._downloadsMap.has(aDownload)){this._downloadsMap.delete(aDownload);this.saveSoon();}
return;}
let hash=aDownload.getSerializationHash();if(this._downloadsMap.get(aDownload)!=hash){this._downloadsMap.set(aDownload,hash);this.saveSoon();}},onDownloadRemoved:function(aDownload)
{if(this._downloadsMap.has(aDownload)){this._downloadsMap.delete(aDownload);this.saveSoon();}},};