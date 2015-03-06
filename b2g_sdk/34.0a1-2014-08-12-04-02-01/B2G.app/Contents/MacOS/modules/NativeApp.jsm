this.EXPORTED_SYMBOLS=["NativeApp"];const Cc=Components.classes;const Ci=Components.interfaces;const Cu=Components.utils;const Cr=Components.results;Cu.import("resource://gre/modules/Services.jsm");Cu.import("resource://gre/modules/FileUtils.jsm");Cu.import("resource://gre/modules/NetUtil.jsm");Cu.import("resource://gre/modules/osfile.jsm");Cu.import("resource://gre/modules/WebappOSUtils.jsm");Cu.import("resource://gre/modules/AppsUtils.jsm");Cu.import("resource://gre/modules/Task.jsm");Cu.import("resource://gre/modules/Promise.jsm");const DEFAULT_ICON_URL="chrome://global/skin/icons/webapps-64.png";const ERR_NOT_INSTALLED="The application isn't installed";const ERR_UPDATES_UNSUPPORTED_OLD_NAMING_SCHEME="Updates for apps installed with the old naming scheme unsupported";const PERMS_DIRECTORY=OS.Constants.libc.S_IRWXU|OS.Constants.libc.S_IRGRP|OS.Constants.libc.S_IXGRP|OS.Constants.libc.S_IROTH|OS.Constants.libc.S_IXOTH;const PERMS_FILE=OS.Constants.libc.S_IRUSR|OS.Constants.libc.S_IWUSR|OS.Constants.libc.S_IRGRP|OS.Constants.libc.S_IROTH;const DESKTOP_DIR=OS.Constants.Path.desktopDir;const HOME_DIR=OS.Constants.Path.homeDir;const TMP_DIR=OS.Constants.Path.tmpDir;function CommonNativeApp(aApp,aManifest,aCategories,aRegistryDir){
aApp.name=aManifest.name;this.uniqueName=WebappOSUtils.getUniqueName(aApp);let localeManifest=new ManifestHelper(aManifest,aApp.origin,aApp.manifestURL);this.appLocalizedName=localeManifest.name;this.appNameAsFilename=stripStringForFilename(aApp.name);if(aApp.updateManifest){this.isPackaged=true;}
this.categories=aCategories.slice(0);this.registryDir=aRegistryDir||OS.Constants.Path.profileDir;this._dryRun=false;try{if(Services.prefs.getBoolPref("browser.mozApps.installer.dry_run")){this._dryRun=true;}}catch(ex){}}
CommonNativeApp.prototype={uniqueName:null,appLocalizedName:null,appNameAsFilename:null,iconURI:null,developerName:null,shortDescription:null,categories:null,webappJson:null,runtimeFolder:null,manifest:null,registryDir:null,_setData:function(aApp,aManifest){let manifest=new ManifestHelper(aManifest,aApp.origin,aApp.manifestURL);let origin=Services.io.newURI(aApp.origin,null,null);this.iconURI=Services.io.newURI(manifest.biggestIconURL||DEFAULT_ICON_URL,null,null);if(manifest.developer){if(manifest.developer.name){let devName=manifest.developer.name.substr(0,128);if(devName){this.developerName=devName;}}
if(manifest.developer.url){this.developerUrl=manifest.developer.url;}}
if(manifest.description){let firstLine=manifest.description.split("\n")[0];let shortDesc=firstLine.length<=256?firstLine:firstLine.substr(0,253)+"…";this.shortDescription=shortDesc;}else{this.shortDescription=this.appLocalizedName;}
if(manifest.version){this.version=manifest.version;}
this.webappJson={
"registryDir":this.registryDir,"app":{"manifest":aManifest,"origin":aApp.origin,"manifestURL":aApp.manifestURL,"installOrigin":aApp.installOrigin,"categories":this.categories,"receipts":aApp.receipts,"installTime":aApp.installTime,}};if(aApp.etag){this.webappJson.app.etag=aApp.etag;}
if(aApp.packageEtag){this.webappJson.app.packageEtag=aApp.packageEtag;}
if(aApp.updateManifest){this.webappJson.app.updateManifest=aApp.updateManifest;}
this.runtimeFolder=OS.Constants.Path.libDir;},_getIcon:function(aTmpDir){try{

if(this.iconURI.scheme=="app"){let zipUrl=OS.Path.toFileURI(OS.Path.join(aTmpDir,this.zipFile));let filePath=this.iconURI.QueryInterface(Ci.nsIURL).filePath;this.iconURI=Services.io.newURI("jar:"+zipUrl+"!"+filePath,null,null);}
let[mimeType,icon]=yield downloadIcon(this.iconURI);yield this._processIcon(mimeType,icon,aTmpDir);}
catch(e){Cu.reportError("Failure retrieving icon: "+e);let iconURI=Services.io.newURI(DEFAULT_ICON_URL,null,null);let[mimeType,icon]=yield downloadIcon(iconURI);yield this._processIcon(mimeType,icon,aTmpDir);
this.iconURI=iconURI;}},createProfile:function(){if(this._dryRun){return null;}
let profSvc=Cc["@mozilla.org/toolkit/profile-service;1"].getService(Ci.nsIToolkitProfileService);try{let appProfile=profSvc.createDefaultProfileForApp(this.uniqueName,null,null);return appProfile.localDir;}catch(ex if ex.result==Cr.NS_ERROR_ALREADY_INITIALIZED){return null;}},};const USER_LIB_DIR=OS.Constants.Path.macUserLibDir;const LOCAL_APP_DIR=OS.Constants.Path.macLocalApplicationsDir;function NativeApp(aApp,aManifest,aCategories,aRegistryDir){CommonNativeApp.call(this,aApp,aManifest,aCategories,aRegistryDir); this.appProfileDir=OS.Path.join(USER_LIB_DIR,"Application Support",this.uniqueName);this.configJson="webapp.json";this.contentsDir="Contents";this.macOSDir=OS.Path.join(this.contentsDir,"MacOS");this.resourcesDir=OS.Path.join(this.contentsDir,"Resources");this.iconFile=OS.Path.join(this.resourcesDir,"appicon.icns");this.zipFile=OS.Path.join(this.resourcesDir,"application.zip");}
NativeApp.prototype={__proto__:CommonNativeApp.prototype,_rootInstallDir:LOCAL_APP_DIR,install:Task.async(function*(aApp,aManifest,aZipPath){if(this._dryRun){return;}
if(WebappOSUtils.getInstallPath(aApp)){return yield this.prepareUpdate(aApp,aManifest,aZipPath);}
this._setData(aApp,aManifest);let localAppDir=getFile(this._rootInstallDir);if(!localAppDir.isWritable()){throw("Not enough privileges to install apps");}
let destinationName=yield getAvailableFileName([this._rootInstallDir],this.appNameAsFilename,".app");let installDir=OS.Path.join(this._rootInstallDir,destinationName);let dir=getFile(TMP_DIR,this.appNameAsFilename+".app");dir.createUnique(Ci.nsIFile.DIRECTORY_TYPE,PERMS_DIRECTORY);let tmpDir=dir.path;try{yield this._createDirectoryStructure(tmpDir);this._copyPrebuiltFiles(tmpDir);yield this._createConfigFiles(tmpDir);if(aZipPath){yield OS.File.move(aZipPath,OS.Path.join(tmpDir,this.zipFile));}
yield this._getIcon(tmpDir);}catch(ex){yield OS.File.removeDir(tmpDir,{ignoreAbsent:true});throw ex;}
this._removeInstallation(true,installDir);try{ yield this._applyTempInstallation(tmpDir,installDir);}catch(ex){this._removeInstallation(false,installDir);yield OS.File.removeDir(tmpDir,{ignoreAbsent:true});throw ex;}}),prepareUpdate:Task.async(function*(aApp,aManifest,aZipPath){if(this._dryRun){return;}
this._setData(aApp,aManifest);let[oldUniqueName,installDir]=WebappOSUtils.getLaunchTarget(aApp);if(!installDir){throw ERR_NOT_INSTALLED;}
if(this.uniqueName!=oldUniqueName){
throw ERR_UPDATES_UNSUPPORTED_OLD_NAMING_SCHEME;}
let updateDir=OS.Path.join(installDir,"update");yield OS.File.removeDir(updateDir,{ignoreAbsent:true});yield OS.File.makeDir(updateDir);try{yield this._createDirectoryStructure(updateDir);this._copyPrebuiltFiles(updateDir);yield this._createConfigFiles(updateDir);if(aZipPath){yield OS.File.move(aZipPath,OS.Path.join(updateDir,this.zipFile));}
yield this._getIcon(updateDir);}catch(ex){yield OS.File.removeDir(updateDir,{ignoreAbsent:true});throw ex;}}),applyUpdate:Task.async(function*(aApp){if(this._dryRun){return;}
let installDir=WebappOSUtils.getInstallPath(aApp);let updateDir=OS.Path.join(installDir,"update");let backupDir=yield this._backupInstallation(installDir);try{ yield this._applyTempInstallation(updateDir,installDir);}catch(ex){yield this._restoreInstallation(backupDir,installDir);throw ex;}finally{yield OS.File.removeDir(backupDir,{ignoreAbsent:true});yield OS.File.removeDir(updateDir,{ignoreAbsent:true});}}),_applyTempInstallation:Task.async(function*(aTmpDir,aInstallDir){yield OS.File.move(OS.Path.join(aTmpDir,this.configJson),OS.Path.join(this.appProfileDir,this.configJson));yield moveDirectory(aTmpDir,aInstallDir);}),_removeInstallation:function(keepProfile,aInstallDir){let filesToRemove=[aInstallDir];if(!keepProfile){filesToRemove.push(this.appProfileDir);}
removeFiles(filesToRemove);},_backupInstallation:Task.async(function*(aInstallDir){let backupDir=OS.Path.join(aInstallDir,"backup");yield OS.File.removeDir(backupDir,{ignoreAbsent:true});yield OS.File.makeDir(backupDir);yield moveDirectory(OS.Path.join(aInstallDir,this.contentsDir),backupDir);yield OS.File.move(OS.Path.join(this.appProfileDir,this.configJson),OS.Path.join(backupDir,this.configJson));return backupDir;}),_restoreInstallation:Task.async(function*(aBackupDir,aInstallDir){yield OS.File.move(OS.Path.join(aBackupDir,this.configJson),OS.Path.join(this.appProfileDir,this.configJson));yield moveDirectory(aBackupDir,OS.Path.join(aInstallDir,this.contentsDir));}),_createDirectoryStructure:Task.async(function*(aDir){yield OS.File.makeDir(this.appProfileDir,{unixMode:PERMS_DIRECTORY,ignoreExisting:true});yield OS.File.makeDir(OS.Path.join(aDir,this.contentsDir),{unixMode:PERMS_DIRECTORY,ignoreExisting:true});yield OS.File.makeDir(OS.Path.join(aDir,this.macOSDir),{unixMode:PERMS_DIRECTORY,ignoreExisting:true});yield OS.File.makeDir(OS.Path.join(aDir,this.resourcesDir),{unixMode:PERMS_DIRECTORY,ignoreExisting:true});}),_copyPrebuiltFiles:function(aDir){let destDir=getFile(aDir,this.macOSDir);let stub=getFile(this.runtimeFolder,"webapprt-stub");stub.copyTo(destDir,"webapprt");},_createConfigFiles:function(aDir){ yield writeToFile(OS.Path.join(aDir,this.configJson),JSON.stringify(this.webappJson)); let applicationINI=getFile(aDir,this.macOSDir,"webapp.ini");let writer=Cc["@mozilla.org/xpcom/ini-processor-factory;1"].getService(Ci.nsIINIParserFactory).createINIParser(applicationINI).QueryInterface(Ci.nsIINIParserWriter);writer.setString("Webapp","Name",this.appLocalizedName);writer.setString("Webapp","Profile",this.uniqueName);writer.writeFile();applicationINI.permissions=PERMS_FILE; let infoPListContent='<?xml version="1.0" encoding="UTF-8"?>\n\
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n\
<plist version="1.0">\n\
  <dict>\n\
    <key>CFBundleDevelopmentRegion</key>\n\
    <string>English</string>\n\
    <key>CFBundleDisplayName</key>\n\
    <string>'+escapeXML(this.appLocalizedName)+'</string>\n\
    <key>CFBundleExecutable</key>\n\
    <string>webapprt</string>\n\
    <key>CFBundleIconFile</key>\n\
    <string>appicon</string>\n\
    <key>CFBundleIdentifier</key>\n\
    <string>'+escapeXML(this.uniqueName)+'</string>\n\
    <key>CFBundleInfoDictionaryVersion</key>\n\
    <string>6.0</string>\n\
    <key>CFBundleName</key>\n\
    <string>'+escapeXML(this.appLocalizedName)+'</string>\n\
    <key>CFBundlePackageType</key>\n\
    <string>APPL</string>\n\
    <key>CFBundleVersion</key>\n\
    <string>0</string>\n\
    <key>NSHighResolutionCapable</key>\n\
    <true/>\n\
    <key>NSPrincipalClass</key>\n\
    <string>GeckoNSApplication</string>\n\
    <key>FirefoxBinary</key>\n\
    <string>org.mozilla.b2g</string>\n\
  </dict>\n\
</plist>';yield writeToFile(OS.Path.join(aDir,this.contentsDir,"Info.plist"),infoPListContent);},_processIcon:function(aMimeType,aIcon,aDir){let deferred=Promise.defer();let tmpIconPath=OS.Path.join(aDir,this.iconFile);function conversionDone(aSubject,aTopic){if(aTopic!="process-finished"){deferred.reject("Failure converting icon, exit code: "+aSubject.exitValue);return;}

OS.File.exists(tmpIconPath).then((aExists)=>{if(aExists){deferred.resolve();}else{deferred.reject("Failure converting icon, unrecognized image format");}});}
let process=Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess);let sipsFile=getFile("/usr/bin/sips");process.init(sipsFile);process.runAsync(["-s","format","icns",aIcon.path,"--out",tmpIconPath,"-z","128","128"],9,conversionDone);return deferred.promise;}}
function writeToFile(aPath,aData){return Task.spawn(function(){let data=new TextEncoder().encode(aData);let file;try{file=yield OS.File.open(aPath,{truncate:true,write:true},{unixMode:PERMS_FILE});yield file.write(data);}finally{yield file.close();}});}
function stripStringForFilename(aPossiblyBadFilenameString){let stripFrontRE=new RegExp("^\\W*","gi");let stripBackRE=new RegExp("\\s*$","gi"); let filenameRE=new RegExp("[<>:\"/\\\\|\\?\\*]","gi");let stripped=aPossiblyBadFilenameString.replace(stripFrontRE,"");stripped=stripped.replace(stripBackRE,"");stripped=stripped.replace(filenameRE,"");if(stripped==""){stripped="webapp";}
return stripped;}
function getAvailableFileName(aPathSet,aName,aExtension){return Task.spawn(function*(){let name=aName+aExtension;function checkUnique(aName){return Task.spawn(function*(){for(let path of aPathSet){if(yield OS.File.exists(OS.Path.join(path,aName))){return false;}}
return true;});}
if(yield checkUnique(name)){return name;}

for(let i=2;i<100;i++){name=aName+" ("+i+")"+aExtension;if(yield checkUnique(name)){return name;}}
throw"No available filename";});}
function removeFiles(aPaths){for(let path of aPaths){let file=getFile(path);try{if(file.exists()){file.followLinks=false;file.remove(true);}}catch(ex){}}}
function moveDirectory(srcPath,destPath){let srcDir=getFile(srcPath);let destDir=getFile(destPath);let entries=srcDir.directoryEntries;let array=[];while(entries.hasMoreElements()){let entry=entries.getNext().QueryInterface(Ci.nsIFile);if(entry.isDirectory()){yield moveDirectory(entry.path,OS.Path.join(destPath,entry.leafName));}else{entry.moveTo(destDir,entry.leafName);}}
yield OS.File.removeEmptyDir(srcPath);}
function escapeXML(aStr){return aStr.toString().replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&apos;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
function getFile(){let file=Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);file.initWithPath(OS.Path.join.apply(OS.Path,arguments));return file;}
function downloadIcon(aIconURI){let deferred=Promise.defer();let mimeService=Cc["@mozilla.org/mime;1"].getService(Ci.nsIMIMEService);let mimeType;try{let tIndex=aIconURI.path.indexOf(";");if("data"==aIconURI.scheme&&tIndex!=-1){mimeType=aIconURI.path.substring(0,tIndex);}else{mimeType=mimeService.getTypeFromURI(aIconURI);}}catch(e){deferred.reject("Failed to determine icon MIME type: "+e);return deferred.promise;}
function onIconDownloaded(aStatusCode,aIcon){if(Components.isSuccessCode(aStatusCode)){deferred.resolve([mimeType,aIcon]);}else{deferred.reject("Failure downloading icon: "+aStatusCode);}}
try{let downloadObserver={onDownloadComplete:function(downloader,request,cx,aStatus,file){onIconDownloaded(aStatus,file);}};let tmpIcon=Services.dirsvc.get("TmpD",Ci.nsIFile);tmpIcon.append("tmpicon."+mimeService.getPrimaryExtension(mimeType,""));tmpIcon.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE,parseInt("666",8));let listener=Cc["@mozilla.org/network/downloader;1"].createInstance(Ci.nsIDownloader);listener.init(downloadObserver,tmpIcon);let channel=NetUtil.newChannel(aIconURI);let{BadCertHandler}=Cu.import("resource://gre/modules/CertUtils.jsm",{});channel.notificationCallbacks=new BadCertHandler(true);channel.asyncOpen(listener,null);}catch(e){deferred.reject("Failure initiating download of icon: "+e);}
return deferred.promise;}