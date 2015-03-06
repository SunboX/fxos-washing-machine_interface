"use strict";const Cu=Components.utils;const Cc=Components.classes;const Ci=Components.interfaces;const Cr=Components.results;const SEC_ERROR_BASE=Ci.nsINSSErrorsService.NSS_SEC_ERROR_BASE;const SEC_ERROR_EXPIRED_CERTIFICATE=(SEC_ERROR_BASE+11);
function buildIDToTime(){let platformBuildID=Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo).platformBuildID;let platformBuildIDDate=new Date();platformBuildIDDate.setUTCFullYear(platformBuildID.substr(0,4),platformBuildID.substr(4,2)-1,platformBuildID.substr(6,2));platformBuildIDDate.setUTCHours(platformBuildID.substr(8,2),platformBuildID.substr(10,2),platformBuildID.substr(12,2));return platformBuildIDDate.getTime();}
const PLATFORM_BUILD_ID_TIME=buildIDToTime();this.EXPORTED_SYMBOLS=["DOMApplicationRegistry"];Cu.import("resource://gre/modules/XPCOMUtils.jsm");Cu.import("resource://gre/modules/Services.jsm");Cu.import("resource://gre/modules/FileUtils.jsm");Cu.import('resource://gre/modules/ActivitiesService.jsm');Cu.import("resource://gre/modules/AppsUtils.jsm");Cu.import("resource://gre/modules/AppDownloadManager.jsm");Cu.import("resource://gre/modules/osfile.jsm");Cu.import("resource://gre/modules/Task.jsm");Cu.import("resource://gre/modules/Promise.jsm");XPCOMUtils.defineLazyModuleGetter(this,"TrustedRootCertificate","resource://gre/modules/StoreTrustAnchor.jsm");XPCOMUtils.defineLazyModuleGetter(this,"PermissionsInstaller","resource://gre/modules/PermissionsInstaller.jsm");XPCOMUtils.defineLazyModuleGetter(this,"OfflineCacheInstaller","resource://gre/modules/OfflineCacheInstaller.jsm");XPCOMUtils.defineLazyModuleGetter(this,"SystemMessagePermissionsChecker","resource://gre/modules/SystemMessagePermissionsChecker.jsm");XPCOMUtils.defineLazyModuleGetter(this,"WebappOSUtils","resource://gre/modules/WebappOSUtils.jsm");XPCOMUtils.defineLazyModuleGetter(this,"NetUtil","resource://gre/modules/NetUtil.jsm");XPCOMUtils.defineLazyModuleGetter(this,"ScriptPreloader","resource://gre/modules/ScriptPreloader.jsm");let debug=Services.prefs.getBoolPref("dom.mozApps.debug")?(aMsg)=>dump("-*- Webapps.jsm : "+aMsg+"\n"):(aMsg)=>{};function getNSPRErrorCode(err){return-1*((err)&0xffff);}
function supportUseCurrentProfile(){return Services.prefs.getBoolPref("dom.webapps.useCurrentProfile");}
function supportSystemMessages(){return Services.prefs.getBoolPref("dom.sysmsg.enabled");}
const MIN_PROGRESS_EVENT_DELAY=1500;const WEBAPP_RUNTIME=Services.appinfo.ID=="webapprt@mozilla.org";const chromeWindowType=WEBAPP_RUNTIME?"webapprt:webapp":"navigator:browser";XPCOMUtils.defineLazyServiceGetter(this,"ppmm","@mozilla.org/parentprocessmessagemanager;1","nsIMessageBroadcaster");XPCOMUtils.defineLazyServiceGetter(this,"cpmm","@mozilla.org/childprocessmessagemanager;1","nsIMessageSender");XPCOMUtils.defineLazyGetter(this,"interAppCommService",function(){return Cc["@mozilla.org/inter-app-communication-service;1"].getService(Ci.nsIInterAppCommService);});XPCOMUtils.defineLazyServiceGetter(this,"dataStoreService","@mozilla.org/datastore-service;1","nsIDataStoreService");XPCOMUtils.defineLazyGetter(this,"msgmgr",function(){return Cc["@mozilla.org/system-message-internal;1"].getService(Ci.nsISystemMessagesInternal);});XPCOMUtils.defineLazyGetter(this,"updateSvc",function(){return Cc["@mozilla.org/offlinecacheupdate-service;1"].getService(Ci.nsIOfflineCacheUpdateService);});

const DIRECTORY_NAME=WEBAPP_RUNTIME?"WebappRegD":"ProfD";



const STORE_ID_PENDING_PREFIX="#unknownID#";this.DOMApplicationRegistry={get kPackaged()"packaged",get kHosted()"hosted",get kHostedAppcache()"hosted-appcache",appsFile:null,webapps:{},children:[],allAppsLaunchable:false,_updateHandlers:[],init:function(){this.messages=["Webapps:Install","Webapps:Uninstall","Webapps:GetSelf","Webapps:CheckInstalled","Webapps:GetInstalled","Webapps:GetNotInstalled","Webapps:Launch","Webapps:InstallPackage","Webapps:GetList","Webapps:RegisterForMessages","Webapps:UnregisterForMessages","Webapps:CancelDownload","Webapps:CheckForUpdate","Webapps:Download","Webapps:ApplyDownload","Webapps:Install:Return:Ack","Webapps:AddReceipt","Webapps:RemoveReceipt","Webapps:ReplaceReceipt","child-process-shutdown"];this.frameMessages=["Webapps:ClearBrowserData"];this.messages.forEach((function(msgName){ppmm.addMessageListener(msgName,this);}).bind(this));cpmm.addMessageListener("Activities:Register:OK",this);cpmm.addMessageListener("Activities:Register:KO",this);Services.obs.addObserver(this,"xpcom-shutdown",false);Services.obs.addObserver(this,"memory-pressure",false);AppDownloadManager.registerCancelFunction(this.cancelDownload.bind(this));this.appsFile=FileUtils.getFile(DIRECTORY_NAME,["webapps","webapps.json"],true).path;this.loadAndUpdateApps();},loadCurrentRegistry:function(){return AppsUtils.loadJSONAsync(this.appsFile).then((aData)=>{if(!aData){return;}
this.webapps=aData;let appDir=OS.Path.dirname(this.appsFile);for(let id in this.webapps){let app=this.webapps[id];if(!app){delete this.webapps[id];continue;}
app.id=id; if(app.localId===undefined){app.localId=this._nextLocalId();}
if(app.basePath===undefined){app.basePath=appDir;}
if(app.removable===undefined){app.removable=true;}
if(app.appStatus===undefined){app.appStatus=Ci.nsIPrincipal.APP_STATUS_INSTALLED;}
if(app.installerAppId===undefined){app.installerAppId=Ci.nsIScriptSecurityManager.NO_APP_ID;}
if(app.installerIsBrowser===undefined){app.installerIsBrowser=false;}

if(app.installState===undefined||app.installState==="updating"){app.installState="installed";} 
if(app.storeId===undefined){app.storeId="";}
if(app.storeVersion===undefined){app.storeVersion=0;}
if(app.role===undefined){app.role="";}

app.downloading=false;app.readyToApplyDownload=false;}});},_registryStarted:Promise.defer(),notifyAppsRegistryStart:function notifyAppsRegistryStart(){Services.obs.notifyObservers(this,"webapps-registry-start",null);this._registryStarted.resolve();},get registryStarted(){return this._registryStarted.promise;},_safeToClone:Promise.defer(),_registryReady:Promise.defer(),notifyAppsRegistryReady:function notifyAppsRegistryReady(){this._safeToClone.resolve();this._registryReady.resolve();Services.obs.notifyObservers(this,"webapps-registry-ready",null);this._saveApps();},get registryReady(){return this._registryReady.promise;},get safeToClone(){return this._safeToClone.promise;},sanitizeRedirects:function sanitizeRedirects(aSource){if(!aSource){return null;}
let res=[];for(let i=0;i<aSource.length;i++){let redirect=aSource[i];if(redirect.from&&redirect.to&&isAbsoluteURI(redirect.from)&&!isAbsoluteURI(redirect.to)){res.push(redirect);}}
return res.length>0?res:null;},registerAppsHandlers:Task.async(function*(aRunUpdate){this.notifyAppsRegistryStart();let ids=[];for(let id in this.webapps){ids.push({id:id});}
if(supportSystemMessages()){this._processManifestForIds(ids,aRunUpdate);}else{

 let results=yield this._readManifests(ids);results.forEach((aResult)=>{if(!aResult.manifest){
delete this.webapps[aResult.id];return;}
let app=this.webapps[aResult.id];app.csp=aResult.manifest.csp||"";app.role=aResult.manifest.role||"";if(app.appStatus>=Ci.nsIPrincipal.APP_STATUS_PRIVILEGED){app.redirects=this.sanitizeRedirects(aResult.redirects);}
if(app.origin.startsWith("app://")){app.kind=this.kPackaged;}else{app.kind=aResult.manifest.appcache_path?this.kHostedAppcache:this.kHosted;}});this.notifyAppsRegistryReady();}}),updateDataStoreForApp:Task.async(function*(aId){if(!this.webapps[aId]){return;} 
let results=yield this._readManifests([{id:aId}]);let app=this.webapps[aId];this.updateDataStore(app.localId,app.origin,app.manifestURL,results[0].manifest,app.appStatus);}),updatePermissionsForApp:function(aId,aIsPreinstalled,aIsSystemUpdate){if(!this.webapps[aId]){return;}

if(supportUseCurrentProfile()){this._readManifests([{id:aId}]).then((aResult)=>{let data=aResult[0];PermissionsInstaller.installPermissions({manifest:data.manifest,manifestURL:this.webapps[aId].manifestURL,origin:this.webapps[aId].origin,isPreinstalled:aIsPreinstalled,isSystemUpdate:aIsSystemUpdate},true,function(){debug("Error installing permissions for "+aId);});});}},updateOfflineCacheForApp:function(aId){let app=this.webapps[aId];this._readManifests([{id:aId}]).then((aResult)=>{let manifest=new ManifestHelper(aResult[0].manifest,app.origin,app.manifestURL);OfflineCacheInstaller.installCache({cachePath:app.cachePath,appId:aId,origin:Services.io.newURI(app.origin,null,null),localId:app.localId,appcache_path:manifest.fullAppcachePath()});});},installPreinstalledApp:function installPreinstalledApp(aId){},
removeIfHttpsDuplicate:function(aId){},


installSystemApps:function(){return Task.spawn(function(){let file;try{file=FileUtils.getFile("coreAppsDir",["webapps","webapps.json"],false);}catch(e){}
if(!file||!file.exists()){return;} 
let data=yield AppsUtils.loadJSONAsync(file.path);if(!data){return;}
for(let id in this.webapps){if(id in data||this.webapps[id].removable)
continue;let localId=this.webapps[id].localId;let permMgr=Cc["@mozilla.org/permissionmanager;1"].getService(Ci.nsIPermissionManager);permMgr.removePermissionsForApp(localId,false);Services.cookies.removeCookiesForApp(localId,false);this._clearPrivateData(localId,false);delete this.webapps[id];}
let appDir=FileUtils.getDir("coreAppsDir",["webapps"],false); for(let id in data){
if(!(id in this.webapps)){this.webapps[id]=data[id];this.webapps[id].basePath=appDir.path;this.webapps[id].id=id;this.webapps[id].localId=this._nextLocalId();if(this.webapps[id].removable===undefined){this.webapps[id].removable=false;}}else{

 this.webapps[id].updateTime=data[id].updateTime;this.webapps[id].lastUpdateCheck=data[id].updateTime;}}}.bind(this)).then(null,Cu.reportError);},loadAndUpdateApps:function(){return Task.spawn(function(){let runUpdate=AppsUtils.isFirstRun(Services.prefs);yield this.loadCurrentRegistry();if(runUpdate){for(let id in this.webapps){let isPreinstalled=this.installPreinstalledApp(id);this.removeIfHttpsDuplicate(id);if(!this.webapps[id]){continue;}
this.updateOfflineCacheForApp(id);this.updatePermissionsForApp(id,isPreinstalled,true);}

this._saveApps();}
for(let id in this.webapps){yield this.updateDataStoreForApp(id);}
yield this.registerAppsHandlers(runUpdate);}.bind(this)).then(null,Cu.reportError);},updateDataStore:function(aId,aOrigin,aManifestURL,aManifest){let uri=Services.io.newURI(aOrigin,null,null);let secMan=Cc["@mozilla.org/scriptsecuritymanager;1"].getService(Ci.nsIScriptSecurityManager);let principal=secMan.getAppCodebasePrincipal(uri,aId,false);if(!dataStoreService.checkPermission(principal)){return;}
if('datastores-owned'in aManifest){for(let name in aManifest['datastores-owned']){let readonly="access"in aManifest['datastores-owned'][name]?aManifest['datastores-owned'][name].access=='readonly':false;dataStoreService.installDataStore(aId,name,aOrigin,aManifestURL,readonly);}}
if('datastores-access'in aManifest){for(let name in aManifest['datastores-access']){let readonly=("readonly"in aManifest['datastores-access'][name])&&!aManifest['datastores-access'][name].readonly?false:true;dataStoreService.installAccessDataStore(aId,name,aOrigin,aManifestURL,readonly);}}},
_registerSystemMessagesForEntryPoint:function(aManifest,aApp,aEntryPoint){let root=aManifest;if(aEntryPoint&&aManifest.entry_points[aEntryPoint]){root=aManifest.entry_points[aEntryPoint];}
if(!root.messages||!Array.isArray(root.messages)||root.messages.length==0){return;}
let manifest=new ManifestHelper(aManifest,aApp.origin,aApp.manifestURL);let launchPathURI=Services.io.newURI(manifest.fullLaunchPath(aEntryPoint),null,null);let manifestURI=Services.io.newURI(aApp.manifestURL,null,null);root.messages.forEach(function registerPages(aMessage){let handlerPageURI=launchPathURI;let messageName;if(typeof(aMessage)==="object"&&Object.keys(aMessage).length===1){messageName=Object.keys(aMessage)[0];let handlerPath=aMessage[messageName];let fullHandlerPath;try{if(handlerPath&&handlerPath.trim()){fullHandlerPath=manifest.resolveURL(handlerPath);}else{throw new Error("Empty or blank handler path.");}}catch(e){debug("system message handler path ("+handlerPath+") is "+"invalid, skipping. Error is: "+e);return;}
handlerPageURI=Services.io.newURI(fullHandlerPath,null,null);}else{messageName=aMessage;}
if(SystemMessagePermissionsChecker.isSystemMessagePermittedToRegister(messageName,aApp.manifestURL,aManifest)){msgmgr.registerPage(messageName,handlerPageURI,manifestURI);}});},
_registerInterAppConnectionsForEntryPoint:function(aManifest,aApp,aEntryPoint){let root=aManifest;if(aEntryPoint&&aManifest.entry_points[aEntryPoint]){root=aManifest.entry_points[aEntryPoint];}
let connections=root.connections;if(!connections){return;}
if((typeof connections)!=="object"){debug("|connections| is not an object. Skipping: "+connections);return;}
let manifest=new ManifestHelper(aManifest,aApp.origin,aApp.manifestURL);let launchPathURI=Services.io.newURI(manifest.fullLaunchPath(aEntryPoint),null,null);let manifestURI=Services.io.newURI(aApp.manifestURL,null,null);for(let keyword in connections){let connection=connections[keyword];let fullHandlerPath;let handlerPath=connection.handler_path;if(handlerPath){try{fullHandlerPath=manifest.resolveURL(handlerPath);}catch(e){debug("Connection's handler path is invalid. Skipping: keyword: "+
keyword+" handler_path: "+handlerPath);continue;}}
let handlerPageURI=fullHandlerPath?Services.io.newURI(fullHandlerPath,null,null):launchPathURI;if(SystemMessagePermissionsChecker.isSystemMessagePermittedToRegister("connection",aApp.manifestURL,aManifest)){msgmgr.registerPage("connection",handlerPageURI,manifestURI);}
interAppCommService.registerConnection(keyword,handlerPageURI,manifestURI,connection.description,connection.rules);}},_registerSystemMessages:function(aManifest,aApp){this._registerSystemMessagesForEntryPoint(aManifest,aApp,null);if(!aManifest.entry_points){return;}
for(let entryPoint in aManifest.entry_points){this._registerSystemMessagesForEntryPoint(aManifest,aApp,entryPoint);}},_registerInterAppConnections:function(aManifest,aApp){this._registerInterAppConnectionsForEntryPoint(aManifest,aApp,null);if(!aManifest.entry_points){return;}
for(let entryPoint in aManifest.entry_points){this._registerInterAppConnectionsForEntryPoint(aManifest,aApp,entryPoint);}},
_createActivitiesToRegister:function(aManifest,aApp,aEntryPoint,aRunUpdate){let activitiesToRegister=[];let root=aManifest;if(aEntryPoint&&aManifest.entry_points[aEntryPoint]){root=aManifest.entry_points[aEntryPoint];}
if(!root||!root.activities){return activitiesToRegister;}
let manifest=new ManifestHelper(aManifest,aApp.origin,aApp.manifestURL);for(let activity in root.activities){let description=root.activities[activity];let href=description.href;if(!href){href=manifest.launch_path;}
try{href=manifest.resolveURL(href);}catch(e){debug("Activity href ("+href+") is invalid, skipping. "+"Error is: "+e);continue;}

let newDesc={};for(let prop in description){newDesc[prop]=description[prop];}
newDesc.href=href;debug('_createActivitiesToRegister: '+aApp.manifestURL+', activity '+
activity+', description.href is '+newDesc.href);if(aRunUpdate){activitiesToRegister.push({"manifest":aApp.manifestURL,"name":activity,"icon":manifest.iconURLForSize(128),"description":newDesc});}
let launchPathURI=Services.io.newURI(href,null,null);let manifestURI=Services.io.newURI(aApp.manifestURL,null,null);if(SystemMessagePermissionsChecker.isSystemMessagePermittedToRegister("activity",aApp.manifestURL,aManifest)){msgmgr.registerPage("activity",launchPathURI,manifestURI);}}
return activitiesToRegister;},
_registerActivitiesForApps:function(aAppsToRegister,aRunUpdate){let activitiesToRegister=[];aAppsToRegister.forEach(function(aApp){let manifest=aApp.manifest;let app=aApp.app;activitiesToRegister.push.apply(activitiesToRegister,this._createActivitiesToRegister(manifest,app,null,aRunUpdate));if(!manifest.entry_points){return;}
for(let entryPoint in manifest.entry_points){activitiesToRegister.push.apply(activitiesToRegister,this._createActivitiesToRegister(manifest,app,entryPoint,aRunUpdate));}},this);if(!aRunUpdate||activitiesToRegister.length==0){this.notifyAppsRegistryReady();return;}
cpmm.sendAsyncMessage("Activities:Register",activitiesToRegister);},
_registerActivities:function(aManifest,aApp,aRunUpdate){this._registerActivitiesForApps([{manifest:aManifest,app:aApp}],aRunUpdate);},
_createActivitiesToUnregister:function(aManifest,aApp,aEntryPoint){let activitiesToUnregister=[];let root=aManifest;if(aEntryPoint&&aManifest.entry_points[aEntryPoint]){root=aManifest.entry_points[aEntryPoint];}
if(!root.activities){return activitiesToUnregister;}
for(let activity in root.activities){let description=root.activities[activity];activitiesToUnregister.push({"manifest":aApp.manifestURL,"name":activity,"description":description});}
return activitiesToUnregister;},
_unregisterActivitiesForApps:function(aAppsToUnregister){let activitiesToUnregister=[];aAppsToUnregister.forEach(function(aApp){let manifest=aApp.manifest;let app=aApp.app;activitiesToUnregister.push.apply(activitiesToUnregister,this._createActivitiesToUnregister(manifest,app,null));if(!manifest.entry_points){return;}
for(let entryPoint in manifest.entry_points){activitiesToUnregister.push.apply(activitiesToUnregister,this._createActivitiesToUnregister(manifest,app,entryPoint));}},this);cpmm.sendAsyncMessage("Activities:Unregister",activitiesToUnregister);},
_unregisterActivities:function(aManifest,aApp){this._unregisterActivitiesForApps([{manifest:aManifest,app:aApp}]);},_processManifestForIds:function(aIds,aRunUpdate){this._readManifests(aIds).then((aResults)=>{let appsToRegister=[];aResults.forEach((aResult)=>{let app=this.webapps[aResult.id];let manifest=aResult.manifest;if(!manifest){
delete this.webapps[aResult.id];return;}
let localeManifest=new ManifestHelper(manifest,app.origin,app.manifestURL);app.name=manifest.name;app.csp=manifest.csp||"";app.role=localeManifest.role;if(app.appStatus>=Ci.nsIPrincipal.APP_STATUS_PRIVILEGED){app.redirects=this.sanitizeRedirects(manifest.redirects);}
if(app.origin.startsWith("app://")){app.kind=this.kPackaged;}else{app.kind=aResult.manifest.appcache_path?this.kHostedAppcache:this.kHosted;}
this._registerSystemMessages(manifest,app);this._registerInterAppConnections(manifest,app);appsToRegister.push({manifest:manifest,app:app});});this._safeToClone.resolve();this._registerActivitiesForApps(appsToRegister,aRunUpdate);});},observe:function(aSubject,aTopic,aData){if(aTopic=="xpcom-shutdown"){this.messages.forEach((function(msgName){ppmm.removeMessageListener(msgName,this);}).bind(this));Services.obs.removeObserver(this,"xpcom-shutdown");cpmm=null;ppmm=null;}else if(aTopic=="memory-pressure"){this._manifestCache={};}},addMessageListener:function(aMsgNames,aApp,aMm){aMsgNames.forEach(function(aMsgName){let man=aApp&&aApp.manifestURL;if(!(aMsgName in this.children)){this.children[aMsgName]=[];}
let mmFound=this.children[aMsgName].some(function(mmRef){if(mmRef.mm===aMm){mmRef.refCount++;return true;}
return false;});if(!mmFound){this.children[aMsgName].push({mm:aMm,refCount:1});}
if((aMsgName==='Webapps:FireEvent')||(aMsgName==='Webapps:UpdateState')){if(man){let app=this.getAppByManifestURL(aApp.manifestURL);if(app&&((aApp.installState!==app.installState)||(aApp.downloading!==app.downloading))){debug("Got a registration from an outdated app: "+
aApp.manifestURL);let aEvent={type:app.installState,app:app,manifestURL:app.manifestURL,manifest:app.manifest};aMm.sendAsyncMessage(aMsgName,aEvent);}}}},this);},removeMessageListener:function(aMsgNames,aMm){if(aMsgNames.length===1&&aMsgNames[0]==="Webapps:Internal:AllMessages"){for(let msgName in this.children){let msg=this.children[msgName];for(let mmI=msg.length-1;mmI>=0;mmI-=1){let mmRef=msg[mmI];if(mmRef.mm===aMm){msg.splice(mmI,1);}}
if(msg.length===0){delete this.children[msgName];}}
return;}
aMsgNames.forEach(function(aMsgName){if(!(aMsgName in this.children)){return;}
let removeIndex;this.children[aMsgName].some(function(mmRef,index){if(mmRef.mm===aMm){mmRef.refCount--;if(mmRef.refCount===0){removeIndex=index;}
return true;}
return false;});if(removeIndex){this.children[aMsgName].splice(removeIndex,1);}},this);},receiveMessage:function(aMessage){
Services.prefs.setBoolPref("dom.mozApps.used",true);if(["Webapps:GetNotInstalled","Webapps:ApplyDownload","Webapps:Uninstall"].indexOf(aMessage.name)!=-1){if(!aMessage.target.assertPermission("webapps-manage")){debug("mozApps message "+aMessage.name+" from a content process with no 'webapps-manage' privileges.");return null;}}
let msg=aMessage.data||{};let mm=aMessage.target;msg.mm=mm;let processedImmediately=true;

switch(aMessage.name){case"Activities:Register:KO":dump("Activities didn't register correctly!");case"Activities:Register:OK":

this.notifyAppsRegistryReady();break;case"Webapps:GetList":

return this.doGetList();case"child-process-shutdown":this.removeMessageListener(["Webapps:Internal:AllMessages"],mm);break;case"Webapps:RegisterForMessages":this.addMessageListener(msg.messages,msg.app,mm);break;case"Webapps:UnregisterForMessages":this.removeMessageListener(msg,mm);break;default:processedImmediately=false;}
if(processedImmediately){return;}

this.registryReady.then(()=>{switch(aMessage.name){case"Webapps:Install":{this.doInstall(msg,mm);break;}
case"Webapps:GetSelf":this.getSelf(msg,mm);break;case"Webapps:Uninstall":this.doUninstall(msg,mm);break;case"Webapps:Launch":this.doLaunch(msg,mm);break;case"Webapps:CheckInstalled":this.checkInstalled(msg,mm);break;case"Webapps:GetInstalled":this.getInstalled(msg,mm);break;case"Webapps:GetNotInstalled":this.getNotInstalled(msg,mm);break;case"Webapps:InstallPackage":{this.doInstallPackage(msg,mm);break;}
case"Webapps:Download":this.startDownload(msg.manifestURL);break;case"Webapps:CancelDownload":this.cancelDownload(msg.manifestURL);break;case"Webapps:CheckForUpdate":this.checkForUpdate(msg,mm);break;case"Webapps:ApplyDownload":this.applyDownload(msg.manifestURL);break;case"Webapps:Install:Return:Ack":this.onInstallSuccessAck(msg.manifestURL);break;case"Webapps:AddReceipt":this.addReceipt(msg,mm);break;case"Webapps:RemoveReceipt":this.removeReceipt(msg,mm);break;case"Webapps:ReplaceReceipt":this.replaceReceipt(msg,mm);break;}});},getAppInfo:function getAppInfo(aAppId){return AppsUtils.getAppInfo(this.webapps,aAppId);},






 broadcastMessage:function broadcastMessage(aMsgName,aContent){if(!(aMsgName in this.children)){return;}
this.children[aMsgName].forEach(function(mmRef){mmRef.mm.sendAsyncMessage(aMsgName,aContent);});},registerUpdateHandler:function(aHandler){this._updateHandlers.push(aHandler);},unregisterUpdateHandler:function(aHandler){let index=this._updateHandlers.indexOf(aHandler);if(index!=-1){this._updateHandlers.splice(index,1);}},notifyUpdateHandlers:function(aApp,aManifest,aZipPath){for(let updateHandler of this._updateHandlers){updateHandler(aApp,aManifest,aZipPath);}},_getAppDir:function(aId){return FileUtils.getDir(DIRECTORY_NAME,["webapps",aId],true,true);},_writeFile:function(aPath,aData){debug("Saving "+aPath);let deferred=Promise.defer();let file=Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);file.initWithPath(aPath); let ostream=FileUtils.openSafeFileOutputStream(file);let converter=Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);converter.charset="UTF-8";let istream=converter.convertToInputStream(aData);NetUtil.asyncCopy(istream,ostream,function(aResult){if(!Components.isSuccessCode(aResult)){deferred.reject()}else{deferred.resolve();}});return deferred.promise;},doGetList:function(){let tmp=[];let res={};let done=false;this.safeToClone.then(()=>{for(let id in this.webapps){tmp.push({id:id});}
this._readManifests(tmp).then(function(manifests){manifests.forEach((item)=>{res[item.id]=item.manifest;});done=true;});});let thread=Services.tm.currentThread;while(!done){thread.processNextEvent(true);}
return{webapps:this.webapps,manifests:res};},doLaunch:function(aData,aMm){this.launch(aData.manifestURL,aData.startPoint,aData.timestamp,function onsuccess(){aMm.sendAsyncMessage("Webapps:Launch:Return:OK",aData);},function onfailure(reason){aMm.sendAsyncMessage("Webapps:Launch:Return:KO",aData);});},launch:function launch(aManifestURL,aStartPoint,aTimeStamp,aOnSuccess,aOnFailure){let app=this.getAppByManifestURL(aManifestURL);if(!app){aOnFailure("NO_SUCH_APP");return;}

if(app.installState=="pending"){aOnFailure("PENDING_APP_NOT_LAUNCHABLE");return;}

let appClone=AppsUtils.cloneAppObject(app);appClone.startPoint=aStartPoint;appClone.timestamp=aTimeStamp;Services.obs.notifyObservers(null,"webapps-launch",JSON.stringify(appClone));aOnSuccess();},close:function close(aApp){debug("close");
let appClone=AppsUtils.cloneAppObject(aApp);Services.obs.notifyObservers(null,"webapps-close",JSON.stringify(appClone));},cancelDownload:function cancelDownload(aManifestURL,aError){debug("cancelDownload "+aManifestURL);let error=aError||"DOWNLOAD_CANCELED";let download=AppDownloadManager.get(aManifestURL);if(!download){debug("Could not find a download for "+aManifestURL);return;}
let app=this.webapps[download.appId];if(download.cacheUpdate){try{download.cacheUpdate.cancel();}catch(e){debug(e);}}else if(download.channel){try{download.channel.cancel(Cr.NS_BINDING_ABORTED);}catch(e){}}else{return;} 
app.isCanceling=true; app.downloading=false;this._saveApps().then(()=>{this.broadcastMessage("Webapps:UpdateState",{app:{progress:0,installState:download.previousState,downloading:false},error:error,id:app.id})
this.broadcastMessage("Webapps:FireEvent",{eventType:"downloaderror",manifestURL:app.manifestURL});});AppDownloadManager.remove(aManifestURL);},startDownload:Task.async(function*(aManifestURL){debug("startDownload for "+aManifestURL);let id=this._appIdForManifestURL(aManifestURL);let app=this.webapps[id];if(!app){debug("startDownload: No app found for "+aManifestURL);throw new Error("NO_SUCH_APP");}
if(app.downloading){debug("app is already downloading. Ignoring.");throw new Error("APP_IS_DOWNLOADING");}

if(!app.downloadAvailable){this.broadcastMessage("Webapps:UpdateState",{error:"NO_DOWNLOAD_AVAILABLE",id:app.id});this.broadcastMessage("Webapps:FireEvent",{eventType:"downloaderror",manifestURL:app.manifestURL});throw new Error("NO_DOWNLOAD_AVAILABLE");}

let isUpdate=(app.installState=="installed");

app.retryingDownload=!isUpdate;let file=FileUtils.getFile(DIRECTORY_NAME,["webapps",id,isUpdate?"staged-update.webapp":"update.webapp"],true);if(!file.exists()){
let results=yield this._readManifests([{id:id}]);let jsonManifest=results[0].manifest;let manifest=new ManifestHelper(jsonManifest,app.origin,app.manifestURL);if(manifest.appcache_path){debug("appcache found");this.startOfflineCacheDownload(manifest,app,null,isUpdate);}else{
debug("No appcache found, sending 'downloaded' for "+aManifestURL);app.downloadAvailable=false;yield this._saveApps();this.broadcastMessage("Webapps:UpdateState",{app:app,manifest:jsonManifest,id:app.id});this.broadcastMessage("Webapps:FireEvent",{eventType:"downloadsuccess",manifestURL:aManifestURL});}
return;}
let json=yield AppsUtils.loadJSONAsync(file.path);if(!json){debug("startDownload: No update manifest found at "+file.path+" "+
aManifestURL);throw new Error("MISSING_UPDATE_MANIFEST");}
let manifest=new ManifestHelper(json,app.origin,app.manifestURL);let newApp={manifestURL:aManifestURL,origin:app.origin,installOrigin:app.installOrigin,downloadSize:app.downloadSize};let newManifest,newId;try{[newId,newManifest]=yield this.downloadPackage(id,app,manifest,newApp,isUpdate);}catch(ex){this.revertDownloadPackage(id,app,newApp,isUpdate,ex);throw ex;}
 
let manFile=OS.Path.join(OS.Constants.Path.tmpDir,"webapps",newId,"manifest.webapp");yield this._writeFile(manFile,JSON.stringify(newManifest));app=this.webapps[id];app.downloading=false;app.downloadAvailable=false;app.readyToApplyDownload=true;app.updateTime=Date.now();yield this._saveApps();this.broadcastMessage("Webapps:UpdateState",{app:app,id:app.id});this.broadcastMessage("Webapps:FireEvent",{eventType:"downloadsuccess",manifestURL:aManifestURL});if(app.installState=="pending"){this.applyDownload(aManifestURL);}}),applyDownload:Task.async(function*(aManifestURL){debug("applyDownload for "+aManifestURL);let id=this._appIdForManifestURL(aManifestURL);let app=this.webapps[id];if(!app){throw new Error("NO_SUCH_APP");}
if(!app.readyToApplyDownload){throw new Error("NOT_READY_TO_APPLY_DOWNLOAD");}
let oldManifest=yield this.getManifestFor(aManifestURL); let tmpDir=FileUtils.getDir("TmpD",["webapps",id],true,true);let manFile=tmpDir.clone();manFile.append("manifest.webapp");let appFile=tmpDir.clone();appFile.append("application.zip");let dir=FileUtils.getDir(DIRECTORY_NAME,["webapps",id],true,true);appFile.moveTo(dir,"application.zip");manFile.moveTo(dir,"manifest.webapp");let staged=dir.clone();staged.append("staged-update.webapp");
if(staged.exists()){staged.moveTo(dir,"update.webapp");}
try{tmpDir.remove(true);}catch(e){}
if(id in this._manifestCache){delete this._manifestCache[id];}

let zipFile=dir.clone();zipFile.append("application.zip");Services.obs.notifyObservers(zipFile,"flush-cache-entry",null);let newManifest=yield this.getManifestFor(aManifestURL);app.downloading=false;app.downloadAvailable=false;app.downloadSize=0;app.installState="installed";app.readyToApplyDownload=false;if(app.staged){for(let prop in app.staged){app[prop]=app.staged[prop];}
delete app.staged;}
delete app.retryingDownload;yield ScriptPreloader.preload(app,newManifest);yield this._saveApps();this.updateAppHandlers(oldManifest,newManifest,app);let updateManifest=yield AppsUtils.loadJSONAsync(staged.path);let appObject=AppsUtils.cloneAppObject(app);appObject.updateManifest=updateManifest;this.notifyUpdateHandlers(appObject,newManifest,appFile.path);if(supportUseCurrentProfile()){PermissionsInstaller.installPermissions({manifest:newManifest,origin:app.origin,manifestURL:app.manifestURL},true);}
this.updateDataStore(this.webapps[id].localId,app.origin,app.manifestURL,newManifest);this.broadcastMessage("Webapps:UpdateState",{app:app,manifest:newManifest,id:app.id});this.broadcastMessage("Webapps:FireEvent",{eventType:"downloadapplied",manifestURL:app.manifestURL});}),startOfflineCacheDownload:function(aManifest,aApp,aProfileDir,aIsUpdate){if(aApp.kind!==this.kHostedAppcache){return;}

let appcacheURI=Services.io.newURI(aManifest.fullAppcachePath(),null,null);let docURI=Services.io.newURI(aManifest.fullLaunchPath(),null,null);

if(aIsUpdate){aApp.installState="updating";}

aApp.downloading=true;aApp.progress=0;DOMApplicationRegistry._saveApps().then(()=>{DOMApplicationRegistry.broadcastMessage("Webapps:UpdateState",{error:null,app:{downloading:true,installState:aApp.installState,progress:0},id:aApp.id});let cacheUpdate=updateSvc.scheduleAppUpdate(appcacheURI,docURI,aApp.localId,false,aProfileDir);
let download={cacheUpdate:cacheUpdate,appId:this._appIdForManifestURL(aApp.manifestURL),previousState:aIsUpdate?"installed":"pending"};AppDownloadManager.add(aApp.manifestURL,download);cacheUpdate.addObserver(new AppcacheObserver(aApp),false);});},computeManifestHash:function(aManifest){return AppsUtils.computeHash(JSON.stringify(aManifest));},updateAppHandlers:function(aOldManifest,aNewManifest,aApp){debug("updateAppHandlers: old="+aOldManifest+" new="+aNewManifest);this.notifyAppsRegistryStart();if(aApp.appStatus>=Ci.nsIPrincipal.APP_STATUS_PRIVILEGED){aApp.redirects=this.sanitizeRedirects(aNewManifest.redirects);}
if(supportSystemMessages()){if(aOldManifest){this._unregisterActivities(aOldManifest,aApp);}
this._registerSystemMessages(aNewManifest,aApp);this._registerActivities(aNewManifest,aApp,true);this._registerInterAppConnections(aNewManifest,aApp);}else{this.notifyAppsRegistryReady();}},checkForUpdate:function(aData,aMm){debug("checkForUpdate for "+aData.manifestURL);function sendError(aError){debug("checkForUpdate error "+aError);aData.error=aError;aMm.sendAsyncMessage("Webapps:CheckForUpdate:Return:KO",aData);}
let id=this._appIdForManifestURL(aData.manifestURL);let app=this.webapps[id];if(!app){sendError("NO_SUCH_APP");return;}
if(app.installState!=="installed"){sendError("PENDING_APP_NOT_UPDATABLE");return;}
if(app.downloading){sendError("APP_IS_DOWNLOADING");return;}
if(app.kind==this.kPackaged&&app.manifestURL.startsWith("app://")){sendError("NOT_UPDATABLE");return;}


let onlyCheckAppCache=false;if(onlyCheckAppCache){if(app.kind!==this.kHostedAppcache){sendError("NOT_UPDATABLE");return;}
this._readManifests([{id:id}]).then((aResult)=>{debug("Checking only appcache for "+aData.manifestURL);let manifest=aResult[0].manifest;
let updateObserver={observe:function(aSubject,aTopic,aObsData){debug("onlyCheckAppCache updateSvc.checkForUpdate return for "+
app.manifestURL+" - event is "+aTopic);if(aTopic=="offline-cache-update-available"){app.downloadAvailable=true;this._saveApps().then(()=>{this.broadcastMessage("Webapps:UpdateState",{app:app,id:app.id});this.broadcastMessage("Webapps:FireEvent",{eventType:"downloadavailable",manifestURL:app.manifestURL,requestID:aData.requestID});});}else{sendError("NOT_UPDATABLE");}}};let helper=new ManifestHelper(manifest,aData.origin,aData.manifestURL);debug("onlyCheckAppCache - launch updateSvc.checkForUpdate for "+
helper.fullAppcachePath());updateSvc.checkForUpdate(Services.io.newURI(helper.fullAppcachePath(),null,null),app.localId,false,updateObserver);});return;} 
function onload(xhr,oldManifest){debug("Got http status="+xhr.status+" for "+aData.manifestURL);let oldHash=app.manifestHash;let isPackage=app.kind==DOMApplicationRegistry.kPackaged;if(xhr.status==200){let manifest=xhr.response;if(manifest==null){sendError("MANIFEST_PARSE_ERROR");return;}
if(!AppsUtils.checkManifest(manifest,app)){sendError("INVALID_MANIFEST");return;}else if(!AppsUtils.checkInstallAllowed(manifest,app.installOrigin)){sendError("INSTALL_FROM_DENIED");return;}else{AppsUtils.ensureSameAppName(oldManifest,manifest,app);let hash=this.computeManifestHash(manifest);debug("Manifest hash = "+hash);if(isPackage){if(!app.staged){app.staged={};}
app.staged.manifestHash=hash;app.staged.etag=xhr.getResponseHeader("Etag");}else{app.manifestHash=hash;app.etag=xhr.getResponseHeader("Etag");}
app.lastCheckedUpdate=Date.now();if(isPackage){if(oldHash!=hash){this.updatePackagedApp(aData,id,app,manifest);}else{this._saveApps().then(()=>{let eventType=app.downloadAvailable?"downloadavailable":"downloadapplied";aMm.sendAsyncMessage("Webapps:UpdateState",{app:app,id:app.id});aMm.sendAsyncMessage("Webapps:FireEvent",{eventType:eventType,manifestURL:app.manifestURL,requestID:aData.requestID});});}}else{
this.updateHostedApp(aData,id,app,oldManifest,oldHash==hash?null:manifest);}}}else if(xhr.status==304){if(isPackage){app.lastCheckedUpdate=Date.now();this._saveApps().then(()=>{let eventType=app.downloadAvailable?"downloadavailable":"downloadapplied";aMm.sendAsyncMessage("Webapps:UpdateState",{app:app,id:app.id});aMm.sendAsyncMessage("Webapps:FireEvent",{eventType:eventType,manifestURL:app.manifestURL,requestID:aData.requestID});});}else{
this.updateHostedApp(aData,id,app,oldManifest,null);}}else{sendError("MANIFEST_URL_ERROR");}}
function doRequest(oldManifest,headers){headers=headers||[];let xhr=Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Ci.nsIXMLHttpRequest);xhr.open("GET",aData.manifestURL,true);xhr.channel.loadFlags|=Ci.nsIRequest.INHIBIT_CACHING;headers.forEach(function(aHeader){debug("Adding header: "+aHeader.name+": "+aHeader.value);xhr.setRequestHeader(aHeader.name,aHeader.value);});xhr.responseType="json";if(app.etag){debug("adding manifest etag:"+app.etag);xhr.setRequestHeader("If-None-Match",app.etag);}
xhr.channel.notificationCallbacks=this.createLoadContext(app.installerAppId,app.installerIsBrowser);xhr.addEventListener("load",onload.bind(this,xhr,oldManifest),false);xhr.addEventListener("error",(function(){sendError("NETWORK_ERROR");}).bind(this),false);debug("Checking manifest at "+aData.manifestURL);xhr.send(null);} 
this._readManifests([{id:id}]).then((aResult)=>{let extraHeaders=[];doRequest.call(this,aResult[0].manifest,extraHeaders);});},createLoadContext:function createLoadContext(aAppId,aIsBrowser){return{associatedWindow:null,topWindow:null,appId:aAppId,isInBrowserElement:aIsBrowser,usePrivateBrowsing:false,isContent:false,isAppOfType:function(appType){throw Cr.NS_ERROR_NOT_IMPLEMENTED;},QueryInterface:XPCOMUtils.generateQI([Ci.nsILoadContext,Ci.nsIInterfaceRequestor,Ci.nsISupports]),getInterface:function(iid){if(iid.equals(Ci.nsILoadContext))
return this;throw Cr.NS_ERROR_NO_INTERFACE;}}},updatePackagedApp:Task.async(function*(aData,aId,aApp,aNewManifest){debug("updatePackagedApp");let dir=this._getAppDir(aId).path;let manFile=OS.Path.join(dir,"staged-update.webapp");yield this._writeFile(manFile,JSON.stringify(aNewManifest));let manifest=new ManifestHelper(aNewManifest,aApp.origin,aApp.manifestURL);
aApp.downloadAvailable=true;aApp.downloadSize=manifest.size;aApp.updateManifest=aNewManifest;yield this._saveApps();this.broadcastMessage("Webapps:UpdateState",{app:aApp,id:aApp.id});this.broadcastMessage("Webapps:FireEvent",{eventType:"downloadavailable",manifestURL:aApp.manifestURL,requestID:aData.requestID});}),



updateHostedApp:Task.async(function*(aData,aId,aApp,aOldManifest,aNewManifest){debug("updateHostedApp "+aData.manifestURL);if(aId in this._manifestCache){delete this._manifestCache[aId];}
aApp.manifest=aNewManifest||aOldManifest;let manifest;if(aNewManifest){this.updateAppHandlers(aOldManifest,aNewManifest,aApp);this.notifyUpdateHandlers(AppsUtils.cloneAppObject(aApp),aNewManifest);let dir=this._getAppDir(aId).path;let manFile=OS.Path.join(dir,"manifest.webapp");yield this._writeFile(manFile,JSON.stringify(aNewManifest));manifest=new ManifestHelper(aNewManifest,aApp.origin,aApp.manifestURL);if(supportUseCurrentProfile()){PermissionsInstaller.installPermissions({manifest:aApp.manifest,origin:aApp.origin,manifestURL:aData.manifestURL},true);}
this.updateDataStore(this.webapps[aId].localId,aApp.origin,aApp.manifestURL,aApp.manifest);aApp.name=aNewManifest.name;aApp.csp=manifest.csp||"";aApp.role=manifest.role||"";aApp.updateTime=Date.now();}else{manifest=new ManifestHelper(aOldManifest,aApp.origin,aApp.manifestURL);}
this.webapps[aId]=aApp;yield this._saveApps();if(aApp.kind!==this.kHostedAppcache){this.broadcastMessage("Webapps:UpdateState",{app:aApp,manifest:aApp.manifest,id:aApp.id});this.broadcastMessage("Webapps:FireEvent",{eventType:"downloadapplied",manifestURL:aApp.manifestURL,requestID:aData.requestID});}else{
debug("updateHostedApp: updateSvc.checkForUpdate for "+
manifest.fullAppcachePath());let updateDeferred=Promise.defer();updateSvc.checkForUpdate(Services.io.newURI(manifest.fullAppcachePath(),null,null),aApp.localId,false,(aSubject,aTopic,aData)=>updateDeferred.resolve(aTopic));let topic=yield updateDeferred.promise;debug("updateHostedApp: updateSvc.checkForUpdate return for "+
aApp.manifestURL+" - event is "+topic);let eventType=topic=="offline-cache-update-available"?"downloadavailable":"downloadapplied";aApp.downloadAvailable=(eventType=="downloadavailable");yield this._saveApps();this.broadcastMessage("Webapps:UpdateState",{app:aApp,manifest:aApp.manifest,id:aApp.id});this.broadcastMessage("Webapps:FireEvent",{eventType:eventType,manifestURL:aApp.manifestURL,requestID:aData.requestID});}
delete aApp.manifest;}),
doInstall:function doInstall(aData,aMm){let app=aData.app;let sendError=function sendError(aError){aData.error=aError;aMm.sendAsyncMessage("Webapps:Install:Return:KO",aData);Cu.reportError("Error installing app from: "+app.installOrigin+": "+aError);}.bind(this);if(app.receipts.length>0){for(let receipt of app.receipts){let error=this.isReceipt(receipt);if(error){sendError(error);return;}}}

function checkAppStatus(aManifest){let manifestStatus=aManifest.type||"web";return manifestStatus==="web";}
let checkManifest=(function(){if(!app.manifest){sendError("MANIFEST_PARSE_ERROR");return false;}
for(let id in this.webapps){if(this.webapps[id].manifestURL==app.manifestURL&&this._isLaunchable(this.webapps[id])){sendError("REINSTALL_FORBIDDEN");return false;}}
if(!AppsUtils.checkManifest(app.manifest,app)){sendError("INVALID_MANIFEST");return false;}
if(!AppsUtils.checkInstallAllowed(app.manifest,app.installOrigin)){sendError("INSTALL_FROM_DENIED");return false;}
if(!checkAppStatus(app.manifest)){sendError("INVALID_SECURITY_LEVEL");return false;}
return true;}).bind(this);let installApp=(function(){app.manifestHash=this.computeManifestHash(app.manifest);
let prefName="dom.mozApps.auto_confirm_install";if(Services.prefs.prefHasUserValue(prefName)&&Services.prefs.getBoolPref(prefName)){this.confirmInstall(aData);}else{Services.obs.notifyObservers(aMm,"webapps-ask-install",JSON.stringify(aData));}}).bind(this);if(app.manifest){if(checkManifest()){installApp();}
return;}
let xhr=Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Ci.nsIXMLHttpRequest);xhr.open("GET",app.manifestURL,true);xhr.channel.loadFlags|=Ci.nsIRequest.INHIBIT_CACHING;xhr.channel.notificationCallbacks=this.createLoadContext(aData.appId,aData.isBrowser);xhr.responseType="json";xhr.addEventListener("load",(function(){if(xhr.status==200){if(!AppsUtils.checkManifestContentType(app.installOrigin,app.origin,xhr.getResponseHeader("content-type"))){sendError("INVALID_MANIFEST_CONTENT_TYPE");return;}
app.manifest=xhr.response;if(checkManifest()){app.etag=xhr.getResponseHeader("Etag");installApp();}}else{sendError("MANIFEST_URL_ERROR");}}).bind(this),false);xhr.addEventListener("error",(function(){sendError("NETWORK_ERROR");}).bind(this),false);xhr.send(null);},doInstallPackage:function doInstallPackage(aData,aMm){let app=aData.app;let sendError=function sendError(aError){aData.error=aError;aMm.sendAsyncMessage("Webapps:Install:Return:KO",aData);Cu.reportError("Error installing packaged app from: "+
app.installOrigin+": "+aError);}.bind(this);if(app.receipts.length>0){for(let receipt of app.receipts){let error=this.isReceipt(receipt);if(error){sendError(error);return;}}}
let checkUpdateManifest=(function(){let manifest=app.updateManifest;let id=this._appIdForManifestURL(app.manifestURL);if(id!==null&&this._isLaunchable(this.webapps[id])){sendError("REINSTALL_FORBIDDEN");return false;}
if(!(AppsUtils.checkManifest(manifest,app)&&manifest.package_path)){sendError("INVALID_MANIFEST");return false;}
if(!AppsUtils.checkInstallAllowed(manifest,app.installOrigin)){sendError("INSTALL_FROM_DENIED");return false;}
return true;}).bind(this);let installApp=(function(){app.manifestHash=this.computeManifestHash(app.updateManifest);
let prefName="dom.mozApps.auto_confirm_install";if(Services.prefs.prefHasUserValue(prefName)&&Services.prefs.getBoolPref(prefName)){this.confirmInstall(aData);}else{Services.obs.notifyObservers(aMm,"webapps-ask-install",JSON.stringify(aData));}}).bind(this);if(app.updateManifest){if(checkUpdateManifest()){installApp();}
return;}
let xhr=Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Ci.nsIXMLHttpRequest);xhr.open("GET",app.manifestURL,true);xhr.channel.loadFlags|=Ci.nsIRequest.INHIBIT_CACHING;xhr.channel.notificationCallbacks=this.createLoadContext(aData.appId,aData.isBrowser);xhr.responseType="json";xhr.addEventListener("load",(function(){if(xhr.status==200){if(!AppsUtils.checkManifestContentType(app.installOrigin,app.origin,xhr.getResponseHeader("content-type"))){sendError("INVALID_MANIFEST_CONTENT_TYPE");return;}
app.updateManifest=xhr.response;if(!app.updateManifest){sendError("MANIFEST_PARSE_ERROR");return;}
if(checkUpdateManifest()){app.etag=xhr.getResponseHeader("Etag");debug("at install package got app etag="+app.etag);installApp();}}
else{sendError("MANIFEST_URL_ERROR");}}).bind(this),false);xhr.addEventListener("error",(function(){sendError("NETWORK_ERROR");}).bind(this),false);xhr.send(null);},denyInstall:function(aData){let packageId=aData.app.packageId;if(packageId){let dir=FileUtils.getDir("TmpD",["webapps",packageId],true,true);try{dir.remove(true);}catch(e){}}
aData.mm.sendAsyncMessage("Webapps:Install:Return:KO",aData);},

queuedDownload:{},queuedPackageDownload:{},onInstallSuccessAck:Task.async(function*(aManifestURL,aDontNeedNetwork){if((Services.io.offline)&&!aDontNeedNetwork){let onlineWrapper={observe:function(aSubject,aTopic,aData){Services.obs.removeObserver(onlineWrapper,"network:offline-status-changed");DOMApplicationRegistry.onInstallSuccessAck(aManifestURL);}};Services.obs.addObserver(onlineWrapper,"network:offline-status-changed",false);return;}
let cacheDownload=this.queuedDownload[aManifestURL];if(cacheDownload){this.startOfflineCacheDownload(cacheDownload.manifest,cacheDownload.app,cacheDownload.profileDir);delete this.queuedDownload[aManifestURL];return;}
let packageDownload=this.queuedPackageDownload[aManifestURL];if(packageDownload){let manifest=packageDownload.manifest;let newApp=packageDownload.app;let installSuccessCallback=packageDownload.callback;delete this.queuedPackageDownload[aManifestURL];let id=this._appIdForManifestURL(newApp.manifestURL);let oldApp=this.webapps[id];let newManifest,newId;try{[newId,newManifest]=yield this.downloadPackage(id,oldApp,manifest,newApp,false);yield this._onDownloadPackage(newApp,installSuccessCallback,newId,newManifest);}catch(ex){this.revertDownloadPackage(id,oldApp,newApp,false,ex);}}}),_setupApp:function(aData,aId){let app=aData.app; app.removable=true;if(aData.isPackage){app.origin="app://"+aId;}
app.id=aId;app.installTime=Date.now();app.lastUpdateCheck=Date.now();return app;},_cloneApp:function(aData,aNewApp,aLocaleManifest,aManifest,aId,aLocalId){let appObject=AppsUtils.cloneAppObject(aNewApp);appObject.appStatus=aNewApp.appStatus||Ci.nsIPrincipal.APP_STATUS_INSTALLED;if(appObject.kind==this.kHostedAppcache){appObject.installState="pending";appObject.downloadAvailable=true;appObject.downloading=true;appObject.downloadSize=0;appObject.readyToApplyDownload=false;}else if(appObject.kind==this.kPackaged){appObject.installState="pending";appObject.downloadAvailable=true;appObject.downloading=true;appObject.downloadSize=aLocaleManifest.size;appObject.readyToApplyDownload=false;}else if(appObject.kind==this.kHosted){appObject.installState="installed";appObject.downloadAvailable=false;appObject.downloading=false;appObject.readyToApplyDownload=false;}else{debug("Unknown app kind: "+appObject.kind);throw Error("Unknown app kind: "+appObject.kind);}
appObject.localId=aLocalId;appObject.basePath=OS.Path.dirname(this.appsFile);appObject.name=aManifest.name;appObject.csp=aLocaleManifest.csp||"";appObject.role=aLocaleManifest.role;appObject.installerAppId=aData.appId;appObject.installerIsBrowser=aData.isBrowser;return appObject;},_writeManifestFile:function(aId,aIsPackage,aJsonManifest){debug("_writeManifestFile");let manifestName=aIsPackage?"update.webapp":"manifest.webapp";let dir=this._getAppDir(aId).path;let manFile=OS.Path.join(dir,manifestName);return this._writeFile(manFile,JSON.stringify(aJsonManifest));},addInstalledApp:Task.async(function*(aApp,aManifest,aUpdateManifest){if(this.getAppLocalIdByManifestURL(aApp.manifestURL)!=Ci.nsIScriptSecurityManager.NO_APP_ID){return;}
let app=AppsUtils.cloneAppObject(aApp);if(!AppsUtils.checkManifest(aManifest,app)||(aUpdateManifest&&!AppsUtils.checkManifest(aUpdateManifest,app))){return;}
app.name=aManifest.name;app.csp=aManifest.csp||"";app.appStatus=AppsUtils.getAppManifestStatus(aManifest);app.removable=true;let uri=Services.io.newURI(app.origin,null,null);if(uri.scheme=="app"){app.id=uri.host;}else{app.id=this.makeAppId();}
app.localId=this._nextLocalId();app.basePath=OS.Path.dirname(this.appsFile);app.progress=0.0;app.installState="installed";app.downloadAvailable=false;app.downloading=false;app.readyToApplyDownload=false;if(aUpdateManifest&&aUpdateManifest.size){app.downloadSize=aUpdateManifest.size;}
app.manifestHash=AppsUtils.computeHash(JSON.stringify(aUpdateManifest||aManifest));let zipFile=WebappOSUtils.getPackagePath(app);app.packageHash=yield this._computeFileHash(zipFile);app.role=aManifest.role||"";app.redirects=this.sanitizeRedirects(aManifest.redirects);this.webapps[app.id]=app; this._manifestCache[app.id]=app.manifest;this._writeManifestFile(app.id,false,aManifest);if(aUpdateManifest){this._writeManifestFile(app.id,true,aUpdateManifest);}
this._saveApps().then(()=>{this.broadcastMessage("Webapps:AddApp",{id:app.id,app:app,manifest:aManifest});});}),confirmInstall:Task.async(function*(aData,aProfileDir,aInstallSuccessCallback){debug("confirmInstall");let origin=Services.io.newURI(aData.app.origin,null,null);let id=this._appIdForManifestURL(aData.app.manifestURL);let manifestURL=origin.resolve(aData.app.manifestURL);let localId=this.getAppLocalIdByManifestURL(manifestURL);let isReinstall=false;if(id){isReinstall=true;let dir=this._getAppDir(id);try{dir.remove(true);}catch(e){}}else{id=this.makeAppId();localId=this._nextLocalId();}
let app=this._setupApp(aData,id);let jsonManifest=aData.isPackage?app.updateManifest:app.manifest;yield this._writeManifestFile(id,aData.isPackage,jsonManifest);debug("app.origin: "+app.origin);let manifest=new ManifestHelper(jsonManifest,app.origin,app.manifestURL);if(aData.isPackage){app.kind=this.kPackaged;}else{app.kind=manifest.appcache_path?this.kHostedAppcache:this.kHosted;}
let appObject=this._cloneApp(aData,app,manifest,jsonManifest,id,localId);this.webapps[id]=appObject;
if(!aData.isPackage){if(supportUseCurrentProfile()){PermissionsInstaller.installPermissions({origin:appObject.origin,manifestURL:appObject.manifestURL,manifest:jsonManifest},isReinstall,this.uninstall.bind(this,aData,aData.mm));}
this.updateDataStore(this.webapps[id].localId,this.webapps[id].origin,this.webapps[id].manifestURL,jsonManifest);}
for each(let prop in["installState","downloadAvailable","downloading","downloadSize","readyToApplyDownload"]){aData.app[prop]=appObject[prop];}
let dontNeedNetwork=false;if(appObject.kind==this.kHostedAppcache){this.queuedDownload[app.manifestURL]={manifest:manifest,app:appObject,profileDir:aProfileDir}}else if(appObject.kind==this.kPackaged){

if(aData.app.localInstallPath){dontNeedNetwork=true;jsonManifest.package_path="file://"+aData.app.localInstallPath;}

manifest=new ManifestHelper(jsonManifest,app.origin,app.manifestURL);this.queuedPackageDownload[app.manifestURL]={manifest:manifest,app:appObject,callback:aInstallSuccessCallback};}


yield this._saveApps();aData.isPackage?appObject.updateManifest=jsonManifest:appObject.manifest=jsonManifest;this.broadcastMessage("Webapps:AddApp",{id:id,app:appObject});if(!aData.isPackage){this.updateAppHandlers(null,app.manifest,app);if(aInstallSuccessCallback){try{yield aInstallSuccessCallback(app,app.manifest);}catch(e){

}}}
if(aData.isPackage&&aData.apkInstall&&!aData.requestID){

this.onInstallSuccessAck(app.manifestURL);}else{

this.broadcastMessage("Webapps:Install:Return:OK",aData);}
Services.obs.notifyObservers(null,"webapps-installed",JSON.stringify({manifestURL:app.manifestURL}));if(aData.forceSuccessAck){
this.onInstallSuccessAck(app.manifestURL,dontNeedNetwork);}}),_onDownloadPackage:Task.async(function*(aNewApp,aInstallSuccessCallback,aId,aManifest){debug("_onDownloadPackage");let app=this.webapps[aId];let zipFile=FileUtils.getFile("TmpD",["webapps",aId,"application.zip"],true);let dir=this._getAppDir(aId);zipFile.moveTo(dir,"application.zip");let tmpDir=FileUtils.getDir("TmpD",["webapps",aId],true,true);try{tmpDir.remove(true);}catch(e){} 
let manFile=OS.Path.join(dir.path,"manifest.webapp");yield this._writeFile(manFile,JSON.stringify(aManifest));app.installState="installed";app.downloading=false;app.downloadAvailable=false;yield this._saveApps();this.updateAppHandlers(null,aManifest,aNewApp);if(aId in this._manifestCache){delete this._manifestCache[aId];}
this.broadcastMessage("Webapps:AddApp",{id:aId,app:aNewApp,manifest:aManifest});Services.obs.notifyObservers(null,"webapps-installed",JSON.stringify({manifestURL:aNewApp.manifestURL}));if(supportUseCurrentProfile()){PermissionsInstaller.installPermissions({manifest:aManifest,origin:aNewApp.origin,manifestURL:aNewApp.manifestURL},true);}
this.updateDataStore(this.webapps[aId].localId,aNewApp.origin,aNewApp.manifestURL,aManifest);if(aInstallSuccessCallback){try{yield aInstallSuccessCallback(aNewApp,aManifest,zipFile.path);}catch(e){

}}
this.broadcastMessage("Webapps:UpdateState",{app:app,manifest:aManifest,manifestURL:aNewApp.manifestURL});yield ScriptPreloader.preload(aNewApp,aManifest);this.broadcastMessage("Webapps:FireEvent",{eventType:["downloadsuccess","downloadapplied"],manifestURL:aNewApp.manifestURL});}),_nextLocalId:function(){let id=Services.prefs.getIntPref("dom.mozApps.maxLocalId")+1;while(this.getManifestURLByLocalId(id)){id++;}
Services.prefs.setIntPref("dom.mozApps.maxLocalId",id);Services.prefs.savePrefFile(null);return id;},_appIdForManifestURL:function(aURI){for(let id in this.webapps){if(this.webapps[id].manifestURL==aURI)
return id;}
return null;},makeAppId:function(){let uuidGenerator=Cc["@mozilla.org/uuid-generator;1"].getService(Ci.nsIUUIDGenerator);return uuidGenerator.generateUUID().toString();},_saveApps:function(){return this._writeFile(this.appsFile,JSON.stringify(this.webapps,null,2));},_manifestCache:{},_readManifests:function(aData){let manifestCache=this._manifestCache;return Task.spawn(function*(){for(let elem of aData){let id=elem.id;if(!manifestCache[id]){let baseDir=this.webapps[id].basePath==this.getCoreAppsBasePath()?"coreAppsDir":DIRECTORY_NAME;let dir=FileUtils.getDir(baseDir,["webapps",id],false,true);let fileNames=["manifest.webapp","update.webapp","manifest.json"];for(let fileName of fileNames){manifestCache[id]=yield AppsUtils.loadJSONAsync(OS.Path.join(dir.path,fileName));if(manifestCache[id]){break;}}}
elem.manifest=manifestCache[id];}
return aData;}.bind(this)).then(null,Cu.reportError);},downloadPackage:Task.async(function*(aId,aOldApp,aManifest,aNewApp,aIsUpdate){yield this._ensureSufficientStorage(aNewApp);let fullPackagePath=aManifest.fullPackagePath();



let isLocalFileInstall=Services.io.extractScheme(fullPackagePath)==='file';debug("About to download "+fullPackagePath);let requestChannel=this._getRequestChannel(fullPackagePath,isLocalFileInstall,aOldApp,aNewApp);AppDownloadManager.add(aNewApp.manifestURL,{channel:requestChannel,appId:aId,previousState:aIsUpdate?"installed":"pending"});aOldApp.downloading=true;

aOldApp.installState=aIsUpdate?"updating":"pending"; aOldApp.progress=0;
yield DOMApplicationRegistry._saveApps();DOMApplicationRegistry.broadcastMessage("Webapps:UpdateState",{error:null,app:aOldApp,id:aId});let zipFile=yield this._getPackage(requestChannel,aId,aOldApp,aNewApp);AppDownloadManager.remove(aNewApp.manifestURL);let hash=yield this._computeFileHash(zipFile.path);let responseStatus=requestChannel.responseStatus;let oldPackage=(responseStatus==304||hash==aOldApp.packageHash);if(oldPackage){debug("package's etag or hash unchanged; sending 'applied' event");

this._sendAppliedEvent(aOldApp);throw new Error("PACKAGE_UNCHANGED");}
let newManifest=yield this._openAndReadPackage(zipFile,aOldApp,aNewApp,isLocalFileInstall,aIsUpdate,aManifest,requestChannel,hash);return[aOldApp.id,newManifest];}),_ensureSufficientStorage:function(aNewApp){let deferred=Promise.defer();let navigator=Services.wm.getMostRecentWindow(chromeWindowType).navigator;let deviceStorage=null;if(navigator.getDeviceStorage){deviceStorage=navigator.getDeviceStorage("apps");}
if(deviceStorage){let req=deviceStorage.freeSpace();req.onsuccess=req.onerror=e=>{let freeBytes=e.target.result;let sufficientStorage=this._checkDownloadSize(freeBytes,aNewApp);if(sufficientStorage){deferred.resolve();}else{deferred.reject("INSUFFICIENT_STORAGE");}}}else{debug("No deviceStorage");
let dir=FileUtils.getDir(DIRECTORY_NAME,["webapps"],true,true);try{let sufficientStorage=this._checkDownloadSize(dir.diskSpaceAvailable,aNewApp);if(sufficientStorage){deferred.resolve();}else{deferred.reject("INSUFFICIENT_STORAGE");}}catch(ex){

deferred.resolve();}}
return deferred.promise;},_checkDownloadSize:function(aFreeBytes,aNewApp){if(aFreeBytes){debug("Free storage: "+aFreeBytes+". Download size: "+
aNewApp.downloadSize);if(aFreeBytes<=aNewApp.downloadSize+AppDownloadManager.MIN_REMAINING_FREESPACE){return false;}}
return true;},_getRequestChannel:function(aFullPackagePath,aIsLocalFileInstall,aOldApp,aNewApp){let requestChannel;if(aIsLocalFileInstall){requestChannel=NetUtil.newChannel(aFullPackagePath).QueryInterface(Ci.nsIFileChannel);}else{requestChannel=NetUtil.newChannel(aFullPackagePath).QueryInterface(Ci.nsIHttpChannel);requestChannel.loadFlags|=Ci.nsIRequest.INHIBIT_CACHING;}
if(aOldApp.packageEtag&&!aIsLocalFileInstall){debug("Add If-None-Match header: "+aOldApp.packageEtag);requestChannel.setRequestHeader("If-None-Match",aOldApp.packageEtag,false);}
let lastProgressTime=0;requestChannel.notificationCallbacks={QueryInterface:function(aIID){if(aIID.equals(Ci.nsISupports)||aIID.equals(Ci.nsIProgressEventSink)||aIID.equals(Ci.nsILoadContext))
return this;throw Cr.NS_ERROR_NO_INTERFACE;},getInterface:function(aIID){return this.QueryInterface(aIID);},onProgress:(function(aRequest,aContext,aProgress,aProgressMax){aOldApp.progress=aProgress;let now=Date.now();if(now-lastProgressTime>MIN_PROGRESS_EVENT_DELAY){debug("onProgress: "+aProgress+"/"+aProgressMax);this._sendDownloadProgressEvent(aNewApp,aProgress);lastProgressTime=now;this._saveApps();}}).bind(this),onStatus:function(aRequest,aContext,aStatus,aStatusArg){}, appId:aOldApp.installerAppId,isInBrowserElement:aOldApp.installerIsBrowser,usePrivateBrowsing:false,isContent:false,associatedWindow:null,topWindow:null,isAppOfType:function(appType){throw Cr.NS_ERROR_NOT_IMPLEMENTED;}};return requestChannel;},_sendDownloadProgressEvent:function(aNewApp,aProgress){this.broadcastMessage("Webapps:UpdateState",{app:{progress:aProgress},id:aNewApp.id});this.broadcastMessage("Webapps:FireEvent",{eventType:"progress",manifestURL:aNewApp.manifestURL});},_getPackage:function(aRequestChannel,aId,aOldApp,aNewApp){let deferred=Promise.defer();let zipFile=FileUtils.getFile("TmpD",["webapps",aId,"application.zip"],true);let outputStream=Cc["@mozilla.org/network/file-output-stream;1"].createInstance(Ci.nsIFileOutputStream); outputStream.init(zipFile,0x02|0x08|0x20,parseInt("0664",8),0);let bufferedOutputStream=Cc['@mozilla.org/network/buffered-output-stream;1'].createInstance(Ci.nsIBufferedOutputStream);bufferedOutputStream.init(outputStream,1024);let listener=Cc["@mozilla.org/network/simple-stream-listener;1"].createInstance(Ci.nsISimpleStreamListener);listener.init(bufferedOutputStream,{onStartRequest:function(aRequest,aContext){},onStopRequest:function(aRequest,aContext,aStatusCode){bufferedOutputStream.close();outputStream.close();if(!Components.isSuccessCode(aStatusCode)){deferred.reject("NETWORK_ERROR");return;}

let responseStatus=aRequestChannel.responseStatus;if(responseStatus>=400&&responseStatus<=599){ aOldApp.downloadAvailable=false;deferred.reject("NETWORK_ERROR");return;}
deferred.resolve(zipFile);}});aRequestChannel.asyncOpen(listener,null); this._sendDownloadProgressEvent(aNewApp,0);return deferred.promise;},_computeFileHash:function(aFilePath){let deferred=Promise.defer();let file=Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);file.initWithPath(aFilePath);NetUtil.asyncFetch(file,function(inputStream,status){if(!Components.isSuccessCode(status)){debug("Error reading "+aFilePath+": "+e);deferred.reject();return;}
let hasher=Cc["@mozilla.org/security/hash;1"].createInstance(Ci.nsICryptoHash);hasher.init(hasher.MD5);const PR_UINT32_MAX=0xffffffff;hasher.updateFromStream(inputStream,PR_UINT32_MAX);function toHexString(charCode){return("0"+charCode.toString(16)).slice(-2);}
let data=hasher.finish(false);let hash=[toHexString(data.charCodeAt(i))for(i in data)].join("");debug("File hash computed: "+hash);deferred.resolve(hash);});return deferred.promise;},_sendAppliedEvent:function(aApp){aApp.downloading=false;aApp.downloadAvailable=false;aApp.downloadSize=0;aApp.installState="installed";aApp.readyToApplyDownload=false;if(aApp.staged&&aApp.staged.manifestHash){

 aApp.manifestHash=aApp.staged.manifestHash;aApp.etag=aApp.staged.etag||aApp.etag;aApp.staged={};try{let staged=this._getAppDir(aApp.id);staged.append("staged-update.webapp");staged.moveTo(staged.parent,"update.webapp");}catch(ex){}}
this._saveApps().then(()=>{this.broadcastMessage("Webapps:UpdateState",{app:aApp,id:aApp.id});this.broadcastMessage("Webapps:FireEvent",{manifestURL:aApp.manifestURL,eventType:["downloadsuccess","downloadapplied"]});});let file=FileUtils.getFile("TmpD",["webapps",aApp.id],false);if(file&&file.exists()){file.remove(true);}},_openAndReadPackage:function(aZipFile,aOldApp,aNewApp,aIsLocalFileInstall,aIsUpdate,aManifest,aRequestChannel,aHash){return Task.spawn((function*(){let zipReader,isSigned,newManifest;try{[zipReader,isSigned]=yield this._openPackage(aZipFile,aOldApp,aIsLocalFileInstall);newManifest=yield this._readPackage(aOldApp,aNewApp,aIsLocalFileInstall,aIsUpdate,aManifest,aRequestChannel,aHash,zipReader,isSigned);}catch(e){debug("package open/read error: "+e);

if(aOldApp.installState!=="pending"){aOldApp.downloadAvailable=false;}
if(typeof e=='object'){Cu.reportError("Error while reading package: "+e+"\n"+e.stack);throw"INVALID_PACKAGE";}else{throw e;}}finally{if(zipReader){zipReader.close();}}
return newManifest;}).bind(this));},_openPackage:function(aZipFile,aApp,aIsLocalFileInstall){return Task.spawn((function*(){let certDb;try{certDb=Cc["@mozilla.org/security/x509certdb;1"].getService(Ci.nsIX509CertDB);}catch(e){debug("nsIX509CertDB error: "+e); aApp.downloadAvailable=false;throw"CERTDB_ERROR";}
let[result,zipReader]=yield this._openSignedPackage(aApp.installOrigin,aApp.manifestURL,aZipFile,certDb);

let isLaterThanBuildTime=Date.now()>PLATFORM_BUILD_ID_TIME;let isSigned;if(Components.isSuccessCode(result)){isSigned=true;}else if(result==Cr.NS_ERROR_SIGNED_JAR_MODIFIED_ENTRY||result==Cr.NS_ERROR_SIGNED_JAR_UNSIGNED_ENTRY||result==Cr.NS_ERROR_SIGNED_JAR_ENTRY_MISSING){throw"APP_PACKAGE_CORRUPTED";}else if(result==Cr.NS_ERROR_FILE_CORRUPTED||result==Cr.NS_ERROR_SIGNED_JAR_ENTRY_TOO_LARGE||result==Cr.NS_ERROR_SIGNED_JAR_ENTRY_INVALID||result==Cr.NS_ERROR_SIGNED_JAR_MANIFEST_INVALID){throw"APP_PACKAGE_INVALID";}else if((!aIsLocalFileInstall||isLaterThanBuildTime)&&(result!=Cr.NS_ERROR_SIGNED_JAR_NOT_SIGNED)){throw"INVALID_SIGNATURE";}else{


isSigned=(aIsLocalFileInstall&&(getNSPRErrorCode(result)==SEC_ERROR_EXPIRED_CERTIFICATE));zipReader=Cc["@mozilla.org/libjar/zip-reader;1"].createInstance(Ci.nsIZipReader);zipReader.open(aZipFile);}
return[zipReader,isSigned];}).bind(this));},_openSignedPackage:function(aInstallOrigin,aManifestURL,aZipFile,aCertDb){let deferred=Promise.defer();let root=TrustedRootCertificate.index;let useReviewerCerts=false;try{useReviewerCerts=Services.prefs.getBoolPref("dom.mozApps.use_reviewer_certs");}catch(ex){}

if(useReviewerCerts){let manifestPath=Services.io.newURI(aManifestURL,null,null).path;switch(aInstallOrigin){case"https://marketplace.firefox.com":root=manifestPath.startsWith("/reviewers/")?Ci.nsIX509CertDB.AppMarketplaceProdReviewersRoot:Ci.nsIX509CertDB.AppMarketplaceProdPublicRoot;break;case"https://marketplace-dev.allizom.org":root=manifestPath.startsWith("/reviewers/")?Ci.nsIX509CertDB.AppMarketplaceDevReviewersRoot:Ci.nsIX509CertDB.AppMarketplaceDevPublicRoot;break;
case"https://marketplace.allizom.org":root=Ci.nsIX509CertDB.AppMarketplaceStageRoot;break;}}
aCertDb.openSignedAppFileAsync(root,aZipFile,function(aRv,aZipReader){deferred.resolve([aRv,aZipReader]);});return deferred.promise;},_readPackage:function(aOldApp,aNewApp,aIsLocalFileInstall,aIsUpdate,aManifest,aRequestChannel,aHash,aZipReader,aIsSigned){this._checkSignature(aNewApp,aIsSigned,aIsLocalFileInstall);if(!aZipReader.hasEntry("manifest.webapp")){throw"MISSING_MANIFEST";}
let istream=aZipReader.getInputStream("manifest.webapp");let converter=Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);converter.charset="UTF-8";let newManifest=JSON.parse(converter.ConvertToUnicode(NetUtil.readInputStreamToString(istream,istream.available())||""));if(!AppsUtils.checkManifest(newManifest,aOldApp)){throw"INVALID_MANIFEST";}



if(aIsUpdate){AppsUtils.ensureSameAppName(aManifest._manifest,newManifest,aOldApp);}
if(!AppsUtils.compareManifests(newManifest,aManifest._manifest)){throw"MANIFEST_MISMATCH";}
if(!AppsUtils.checkInstallAllowed(newManifest,aNewApp.installOrigin)){throw"INSTALL_FROM_DENIED";}
let maxStatus=aIsSigned||aIsLocalFileInstall?Ci.nsIPrincipal.APP_STATUS_PRIVILEGED:Ci.nsIPrincipal.APP_STATUS_INSTALLED;if(AppsUtils.getAppManifestStatus(newManifest)>maxStatus){throw"INVALID_SECURITY_LEVEL";}
aOldApp.appStatus=AppsUtils.getAppManifestStatus(newManifest);this._saveEtag(aIsUpdate,aOldApp,aRequestChannel,aHash,newManifest);this._checkOrigin(aIsSigned||aIsLocalFileInstall,aOldApp,newManifest,aIsUpdate);this._getIds(aIsSigned,aZipReader,converter,aNewApp,aOldApp,aIsUpdate);return newManifest;},_checkSignature:function(aApp,aIsSigned,aIsLocalFileInstall){












let signedAppOriginsStr=Services.prefs.getCharPref("dom.mozApps.signed_apps_installable_from");
let isSignedAppOrigin=(aIsSigned&&aIsLocalFileInstall)||signedAppOriginsStr.split(",").indexOf(aApp.installOrigin)>-1;if(!aIsSigned&&isSignedAppOrigin){throw"INVALID_SIGNATURE";}else if(aIsSigned&&!isSignedAppOrigin){

throw"INSTALL_FROM_DENIED";}},_saveEtag:function(aIsUpdate,aOldApp,aRequestChannel,aHash,aManifest){if(aIsUpdate){if(!aOldApp.staged){aOldApp.staged={};}
try{aOldApp.staged.packageEtag=aRequestChannel.getResponseHeader("Etag");}catch(e){}
aOldApp.staged.packageHash=aHash;aOldApp.staged.appStatus=AppsUtils.getAppManifestStatus(aManifest);}else{try{aOldApp.packageEtag=aRequestChannel.getResponseHeader("Etag");}catch(e){}
aOldApp.packageHash=aHash;aOldApp.appStatus=AppsUtils.getAppManifestStatus(aManifest);}},_checkOrigin:function(aIsSigned,aOldApp,aManifest,aIsUpdate){if(aIsSigned&&aOldApp.appStatus>=Ci.nsIPrincipal.APP_STATUS_PRIVILEGED&&aManifest.origin!==undefined){let uri;try{uri=Services.io.newURI(aManifest.origin,null,null);}catch(e){throw"INVALID_ORIGIN";}
if(uri.scheme!="app"){throw"INVALID_ORIGIN";}
if(aIsUpdate){if(uri.prePath!=aOldApp.origin){throw"INVALID_ORIGIN_CHANGE";}


}else{debug("Setting origin to "+uri.prePath+" for "+aOldApp.manifestURL);let newId=uri.prePath.substring(6); if(newId in this.webapps&&this._isLaunchable(this.webapps[newId])){throw"DUPLICATE_ORIGIN";}
aOldApp.origin=uri.prePath;let oldId=aOldApp.id;if(oldId==newId){

return;}
aOldApp.id=newId;this.webapps[newId]=aOldApp;delete this.webapps[oldId];[DIRECTORY_NAME,"TmpD"].forEach(function(aDir){let parent=FileUtils.getDir(aDir,["webapps"],true,true);let dir=FileUtils.getDir(aDir,["webapps",oldId],true,true);dir.moveTo(parent,newId);});this.broadcastMessage("Webapps:UpdateApp",{oldId:oldId,newId:newId,app:aOldApp});}}},_getIds:function(aIsSigned,aZipReader,aConverter,aNewApp,aOldApp,aIsUpdate){ if(aIsSigned){let idsStream;try{idsStream=aZipReader.getInputStream("META-INF/ids.json");}catch(e){throw aZipReader.hasEntry("META-INF/ids.json")?e:"MISSING_IDS_JSON";}
let ids=JSON.parse(aConverter.ConvertToUnicode(NetUtil.readInputStreamToString(idsStream,idsStream.available())||""));if((!ids.id)||!Number.isInteger(ids.version)||(ids.version<=0)){throw"INVALID_IDS_JSON";}
let storeId=aNewApp.installOrigin+"#"+ids.id;this._checkForStoreIdMatch(aIsUpdate,aOldApp,storeId,ids.version);aOldApp.storeId=storeId;aOldApp.storeVersion=ids.version;}},
_checkForStoreIdMatch:function(aIsUpdate,aNewApp,aStoreId,aStoreVersion){








let appId=this.getAppLocalIdByStoreId(aStoreId);let isInstalled=appId!=Ci.nsIScriptSecurityManager.NO_APP_ID;if(aIsUpdate){let isDifferent=aNewApp.localId!==appId;let isPending=aNewApp.storeId.indexOf(STORE_ID_PENDING_PREFIX)==0;if((!isInstalled&&!isPending)||(isInstalled&&isDifferent)){throw"WRONG_APP_STORE_ID";}
if(!isPending&&(aNewApp.storeVersion>=aStoreVersion)){throw"APP_STORE_VERSION_ROLLBACK";}}else if(isInstalled){throw"WRONG_APP_STORE_ID";}},revertDownloadPackage:function(aId,aOldApp,aNewApp,aIsUpdate,aError){debug("Error downloading package: "+aError);let dir=FileUtils.getDir("TmpD",["webapps",aId],true,true);try{dir.remove(true);}catch(e){}


if(aOldApp.isCanceling){delete aOldApp.isCanceling;return;}
let download=AppDownloadManager.get(aNewApp.manifestURL);aOldApp.downloading=false;


aOldApp.installState=download?download.previousState:aIsUpdate?"installed":"pending";if(aOldApp.staged){delete aOldApp.staged;}
this._saveApps().then(()=>{this.broadcastMessage("Webapps:UpdateState",{app:aOldApp,error:aError,id:aNewApp.id});this.broadcastMessage("Webapps:FireEvent",{eventType:"downloaderror",manifestURL:aNewApp.manifestURL});});AppDownloadManager.remove(aNewApp.manifestURL);},doUninstall:function(aData,aMm){this.uninstall(aData.manifestURL,function onsuccess(){aMm.sendAsyncMessage("Webapps:Uninstall:Return:OK",aData);},function onfailure(){aMm.sendAsyncMessage("Webapps:Uninstall:Return:KO",aData);});},uninstall:function(aManifestURL,aOnSuccess,aOnFailure){debug("uninstall "+aManifestURL);let app=this.getAppByManifestURL(aManifestURL);if(!app){aOnFailure("NO_SUCH_APP");return;}
let id=app.id;if(!app.removable){debug("Error: cannot uninstall a non-removable app.");aOnFailure("NON_REMOVABLE_APP");return;}

this.cancelDownload(app.manifestURL);if(id in this._manifestCache){delete this._manifestCache[id];}
this._clearPrivateData(app.localId,false);
let appClone=AppsUtils.cloneAppObject(app);Services.obs.notifyObservers(null,"webapps-uninstall",JSON.stringify(appClone));if(supportSystemMessages()){this._readManifests([{id:id}]).then((aResult)=>{this._unregisterActivities(aResult[0].manifest,app);});}
let dir=this._getAppDir(id);try{dir.remove(true);}catch(e){}
delete this.webapps[id];this._saveApps().then(()=>{this.broadcastMessage("Webapps:Uninstall:Broadcast:Return:OK",appClone);this.broadcastMessage("Webapps:RemoveApp",{id:id});try{if(aOnSuccess){aOnSuccess();}}catch(ex){Cu.reportError("DOMApplicationRegistry: Exception on app uninstall: "+
ex+"\n"+ex.stack);}});},getSelf:function(aData,aMm){aData.apps=[];if(aData.appId==Ci.nsIScriptSecurityManager.NO_APP_ID||aData.appId==Ci.nsIScriptSecurityManager.UNKNOWN_APP_ID){aMm.sendAsyncMessage("Webapps:GetSelf:Return:OK",aData);return;}
let tmp=[];for(let id in this.webapps){if(this.webapps[id].origin==aData.origin&&this.webapps[id].localId==aData.appId&&this._isLaunchable(this.webapps[id])){let app=AppsUtils.cloneAppObject(this.webapps[id]);aData.apps.push(app);tmp.push({id:id});break;}}
if(!aData.apps.length){aMm.sendAsyncMessage("Webapps:GetSelf:Return:OK",aData);return;}
this._readManifests(tmp).then((aResult)=>{for(let i=0;i<aResult.length;i++)
aData.apps[i].manifest=aResult[i].manifest;aMm.sendAsyncMessage("Webapps:GetSelf:Return:OK",aData);});},checkInstalled:function(aData,aMm){aData.app=null;let tmp=[];for(let appId in this.webapps){if(this.webapps[appId].manifestURL==aData.manifestURL&&this._isLaunchable(this.webapps[appId])){aData.app=AppsUtils.cloneAppObject(this.webapps[appId]);tmp.push({id:appId});break;}}
this._readManifests(tmp).then((aResult)=>{for(let i=0;i<aResult.length;i++){aData.app.manifest=aResult[i].manifest;break;}
aMm.sendAsyncMessage("Webapps:CheckInstalled:Return:OK",aData);});},getInstalled:function(aData,aMm){aData.apps=[];let tmp=[];for(let id in this.webapps){if(this.webapps[id].installOrigin==aData.origin&&this._isLaunchable(this.webapps[id])){aData.apps.push(AppsUtils.cloneAppObject(this.webapps[id]));tmp.push({id:id});}}
this._readManifests(tmp).then((aResult)=>{for(let i=0;i<aResult.length;i++)
aData.apps[i].manifest=aResult[i].manifest;aMm.sendAsyncMessage("Webapps:GetInstalled:Return:OK",aData);});},getNotInstalled:function(aData,aMm){aData.apps=[];let tmp=[];for(let id in this.webapps){if(!this._isLaunchable(this.webapps[id])){aData.apps.push(AppsUtils.cloneAppObject(this.webapps[id]));tmp.push({id:id});}}
this._readManifests(tmp).then((aResult)=>{for(let i=0;i<aResult.length;i++)
aData.apps[i].manifest=aResult[i].manifest;aMm.sendAsyncMessage("Webapps:GetNotInstalled:Return:OK",aData);});},getAll:function(aCallback){debug("getAll");let apps=[];let tmp=[];for(let id in this.webapps){let app=AppsUtils.cloneAppObject(this.webapps[id]);if(!this._isLaunchable(app))
continue;apps.push(app);tmp.push({id:id});}
this._readManifests(tmp).then((aResult)=>{for(let i=0;i<aResult.length;i++)
apps[i].manifest=aResult[i].manifest;aCallback(apps);});},isReceipt:function(data){try{const MAX_RECEIPT_SIZE=1048576;if(data.length>MAX_RECEIPT_SIZE){return"RECEIPT_TOO_BIG";}
 
let receiptParts=data.split('~');let jwtData=null;if(receiptParts.length==2){jwtData=receiptParts[1];}else{jwtData=receiptParts[0];}
let segments=jwtData.split('.');if(segments.length!=3){return"INVALID_SEGMENTS_NUMBER";}

let decodedReceipt=JSON.parse(atob(segments[1].replace(/-/g,'+').replace(/_/g,'/')));if(!decodedReceipt){return"INVALID_RECEIPT_ENCODING";} 
if(!decodedReceipt.typ){return"RECEIPT_TYPE_REQUIRED";}
if(!decodedReceipt.product){return"RECEIPT_PRODUCT_REQUIRED";}
if(!decodedReceipt.user){return"RECEIPT_USER_REQUIRED";}
if(!decodedReceipt.iss){return"RECEIPT_ISS_REQUIRED";}
if(!decodedReceipt.nbf){return"RECEIPT_NBF_REQUIRED";}
if(!decodedReceipt.iat){return"RECEIPT_IAT_REQUIRED";}
let allowedTypes=["purchase-receipt","developer-receipt","reviewer-receipt","test-receipt"];if(allowedTypes.indexOf(decodedReceipt.typ)<0){return"RECEIPT_TYPE_UNSUPPORTED";}}catch(e){return"RECEIPT_ERROR";}
return null;},addReceipt:function(aData,aMm){debug("addReceipt "+aData.manifestURL);let receipt=aData.receipt;if(!receipt){aData.error="INVALID_PARAMETERS";aMm.sendAsyncMessage("Webapps:AddReceipt:Return:KO",aData);return;}
let error=this.isReceipt(receipt);if(error){aData.error=error;aMm.sendAsyncMessage("Webapps:AddReceipt:Return:KO",aData);return;}
let id=this._appIdForManifestURL(aData.manifestURL);let app=this.webapps[id];if(!app.receipts){app.receipts=[];}else if(app.receipts.length>500){aData.error="TOO_MANY_RECEIPTS";aMm.sendAsyncMessage("Webapps:AddReceipt:Return:KO",aData);return;}
let index=app.receipts.indexOf(receipt);if(index>=0){aData.error="RECEIPT_ALREADY_EXISTS";aMm.sendAsyncMessage("Webapps:AddReceipt:Return:KO",aData);return;}
app.receipts.push(receipt);this._saveApps().then(()=>{aData.receipts=app.receipts;aMm.sendAsyncMessage("Webapps:AddReceipt:Return:OK",aData);});},removeReceipt:function(aData,aMm){debug("removeReceipt "+aData.manifestURL);let receipt=aData.receipt;if(!receipt){aData.error="INVALID_PARAMETERS";aMm.sendAsyncMessage("Webapps:RemoveReceipt:Return:KO",aData);return;}
let id=this._appIdForManifestURL(aData.manifestURL);let app=this.webapps[id];if(!app.receipts){aData.error="NO_SUCH_RECEIPT";aMm.sendAsyncMessage("Webapps:RemoveReceipt:Return:KO",aData);return;}
let index=app.receipts.indexOf(receipt);if(index==-1){aData.error="NO_SUCH_RECEIPT";aMm.sendAsyncMessage("Webapps:RemoveReceipt:Return:KO",aData);return;}
app.receipts.splice(index,1);this._saveApps().then(()=>{aData.receipts=app.receipts;aMm.sendAsyncMessage("Webapps:RemoveReceipt:Return:OK",aData);});},replaceReceipt:function(aData,aMm){debug("replaceReceipt "+aData.manifestURL);let oldReceipt=aData.oldReceipt;let newReceipt=aData.newReceipt;if(!oldReceipt||!newReceipt){aData.error="INVALID_PARAMETERS";aMm.sendAsyncMessage("Webapps:ReplaceReceipt:Return:KO",aData);return;}
let error=this.isReceipt(newReceipt);if(error){aData.error=error;aMm.sendAsyncMessage("Webapps:ReplaceReceipt:Return:KO",aData);return;}
let id=this._appIdForManifestURL(aData.manifestURL);let app=this.webapps[id];if(!app.receipts){aData.error="NO_SUCH_RECEIPT";aMm.sendAsyncMessage("Webapps:RemoveReceipt:Return:KO",aData);return;}
let oldIndex=app.receipts.indexOf(oldReceipt);if(oldIndex==-1){aData.error="NO_SUCH_RECEIPT";aMm.sendAsyncMessage("Webapps:ReplaceReceipt:Return:KO",aData);return;}
app.receipts[oldIndex]=newReceipt;this._saveApps().then(()=>{aData.receipts=app.receipts;aMm.sendAsyncMessage("Webapps:ReplaceReceipt:Return:OK",aData);});},getManifestFor:function(aManifestURL){let id=this._appIdForManifestURL(aManifestURL);let app=this.webapps[id];if(!id||(app.installState=="pending"&&!app.retryingDownload)){return Promise.resolve(null);}
return this._readManifests([{id:id}]).then((aResult)=>{return aResult[0].manifest;});},getAppByManifestURL:function(aManifestURL){return AppsUtils.getAppByManifestURL(this.webapps,aManifestURL);},getCSPByLocalId:function(aLocalId){debug("getCSPByLocalId:"+aLocalId);return AppsUtils.getCSPByLocalId(this.webapps,aLocalId);},getAppLocalIdByStoreId:function(aStoreId){debug("getAppLocalIdByStoreId:"+aStoreId);return AppsUtils.getAppLocalIdByStoreId(this.webapps,aStoreId);},getAppByLocalId:function(aLocalId){return AppsUtils.getAppByLocalId(this.webapps,aLocalId);},getManifestURLByLocalId:function(aLocalId){return AppsUtils.getManifestURLByLocalId(this.webapps,aLocalId);},getAppLocalIdByManifestURL:function(aManifestURL){return AppsUtils.getAppLocalIdByManifestURL(this.webapps,aManifestURL);},getCoreAppsBasePath:function(){return AppsUtils.getCoreAppsBasePath();},getWebAppsBasePath:function(){return OS.Path.dirname(this.appsFile);},_isLaunchable:function(aApp){if(this.allAppsLaunchable)
return true;return WebappOSUtils.isLaunchable(aApp);},_notifyCategoryAndObservers:function(subject,topic,data,msg){const serviceMarker="service,";let cm=Cc["@mozilla.org/categorymanager;1"].getService(Ci.nsICategoryManager);let enumerator=cm.enumerateCategory(topic);let observers=[];while(enumerator.hasMoreElements()){let entry=enumerator.getNext().QueryInterface(Ci.nsISupportsCString).data;let contractID=cm.getCategoryEntry(topic,entry);let factoryFunction;if(contractID.substring(0,serviceMarker.length)==serviceMarker){contractID=contractID.substring(serviceMarker.length);factoryFunction="getService";}
else{factoryFunction="createInstance";}
try{let handler=Cc[contractID][factoryFunction]();if(handler){let observer=handler.QueryInterface(Ci.nsIObserver);observers.push(observer);}}catch(e){}}
enumerator=Services.obs.enumerateObservers(topic);while(enumerator.hasMoreElements()){try{let observer=enumerator.getNext().QueryInterface(Ci.nsIObserver);if(observers.indexOf(observer)==-1){observers.push(observer);}}catch(e){}}
observers.forEach(function(observer){try{observer.observe(subject,topic,data);}catch(e){}});if(msg){ppmm.broadcastAsyncMessage("Webapps:ClearBrowserData:Return",msg);}},registerBrowserElementParentForApp:function(bep,appId){let mm=bep._mm;let listener=this.receiveAppMessage.bind(this,appId);this.frameMessages.forEach(function(msgName){mm.addMessageListener(msgName,listener);});},receiveAppMessage:function(appId,message){switch(message.name){case"Webapps:ClearBrowserData":this._clearPrivateData(appId,true,message.data);break;}},_clearPrivateData:function(appId,browserOnly,msg){let subject={appId:appId,browserOnly:browserOnly,QueryInterface:XPCOMUtils.generateQI([Ci.mozIApplicationClearPrivateDataParams])};this._notifyCategoryAndObservers(subject,"webapps-clear-data",null,msg);}};let AppcacheObserver=function(aApp){debug("Creating AppcacheObserver for "+aApp.origin+" - "+aApp.installState);this.app=aApp;this.startStatus=aApp.installState;this.lastProgressTime=0;this._sendProgressEvent();};AppcacheObserver.prototype={ _sendProgressEvent:function(){let app=this.app;DOMApplicationRegistry.broadcastMessage("Webapps:UpdateState",{app:app,id:app.id});DOMApplicationRegistry.broadcastMessage("Webapps:FireEvent",{eventType:"progress",manifestURL:app.manifestURL});},updateStateChanged:function appObs_Update(aUpdate,aState){let mustSave=false;let app=this.app;debug("Offline cache state change for "+app.origin+" : "+aState);var self=this;let setStatus=function appObs_setStatus(aStatus,aProgress){debug("Offlinecache setStatus to "+aStatus+" with progress "+
aProgress+" for "+app.origin);mustSave=(app.installState!=aStatus);app.installState=aStatus;app.progress=aProgress;if(aStatus!="installed"){self._sendProgressEvent();return;}
app.updateTime=Date.now();app.downloading=false;app.downloadAvailable=false;DOMApplicationRegistry.broadcastMessage("Webapps:UpdateState",{app:app,id:app.id});DOMApplicationRegistry.broadcastMessage("Webapps:FireEvent",{eventType:["downloadsuccess","downloadapplied"],manifestURL:app.manifestURL});}
let setError=function appObs_setError(aError){debug("Offlinecache setError to "+aError);app.downloading=false;mustSave=true;
if(app.isCanceling){delete app.isCanceling;return;}
DOMApplicationRegistry.broadcastMessage("Webapps:UpdateState",{app:app,error:aError,id:app.id});DOMApplicationRegistry.broadcastMessage("Webapps:FireEvent",{eventType:"downloaderror",manifestURL:app.manifestURL});}
switch(aState){case Ci.nsIOfflineCacheUpdateObserver.STATE_ERROR:aUpdate.removeObserver(this);AppDownloadManager.remove(app.manifestURL);setError("APP_CACHE_DOWNLOAD_ERROR");break;case Ci.nsIOfflineCacheUpdateObserver.STATE_NOUPDATE:case Ci.nsIOfflineCacheUpdateObserver.STATE_FINISHED:aUpdate.removeObserver(this);AppDownloadManager.remove(app.manifestURL);setStatus("installed",aUpdate.byteProgress);break;case Ci.nsIOfflineCacheUpdateObserver.STATE_DOWNLOADING:setStatus(this.startStatus,aUpdate.byteProgress);break;case Ci.nsIOfflineCacheUpdateObserver.STATE_ITEMSTARTED:case Ci.nsIOfflineCacheUpdateObserver.STATE_ITEMPROGRESS:let now=Date.now();if(now-this.lastProgressTime>MIN_PROGRESS_EVENT_DELAY){setStatus(this.startStatus,aUpdate.byteProgress);this.lastProgressTime=now;}
break;}
if(mustSave){DOMApplicationRegistry._saveApps();}},applicationCacheAvailable:function appObs_CacheAvail(aApplicationCache){}};DOMApplicationRegistry.init();