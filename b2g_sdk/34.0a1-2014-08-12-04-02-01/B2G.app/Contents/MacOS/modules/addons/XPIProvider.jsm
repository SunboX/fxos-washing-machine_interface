"use strict";const Cc=Components.classes;const Ci=Components.interfaces;const Cr=Components.results;const Cu=Components.utils;this.EXPORTED_SYMBOLS=["XPIProvider"];Components.utils.import("resource://gre/modules/Services.jsm");Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");Components.utils.import("resource://gre/modules/AddonManager.jsm");XPCOMUtils.defineLazyModuleGetter(this,"AddonRepository","resource://gre/modules/addons/AddonRepository.jsm");XPCOMUtils.defineLazyModuleGetter(this,"ChromeManifestParser","resource://gre/modules/ChromeManifestParser.jsm");XPCOMUtils.defineLazyModuleGetter(this,"LightweightThemeManager","resource://gre/modules/LightweightThemeManager.jsm");XPCOMUtils.defineLazyModuleGetter(this,"FileUtils","resource://gre/modules/FileUtils.jsm");XPCOMUtils.defineLazyModuleGetter(this,"ZipUtils","resource://gre/modules/ZipUtils.jsm");XPCOMUtils.defineLazyModuleGetter(this,"NetUtil","resource://gre/modules/NetUtil.jsm");XPCOMUtils.defineLazyModuleGetter(this,"PermissionsUtils","resource://gre/modules/PermissionsUtils.jsm");XPCOMUtils.defineLazyModuleGetter(this,"Promise","resource://gre/modules/Promise.jsm");XPCOMUtils.defineLazyModuleGetter(this,"Task","resource://gre/modules/Task.jsm");XPCOMUtils.defineLazyModuleGetter(this,"OS","resource://gre/modules/osfile.jsm");XPCOMUtils.defineLazyModuleGetter(this,"BrowserToolboxProcess","resource:///modules/devtools/ToolboxProcess.jsm");XPCOMUtils.defineLazyModuleGetter(this,"ConsoleAPI","resource://gre/modules/devtools/Console.jsm");XPCOMUtils.defineLazyServiceGetter(this,"Blocklist","@mozilla.org/extensions/blocklist;1",Ci.nsIBlocklistService);XPCOMUtils.defineLazyServiceGetter(this,"ChromeRegistry","@mozilla.org/chrome/chrome-registry;1","nsIChromeRegistry");XPCOMUtils.defineLazyServiceGetter(this,"ResProtocolHandler","@mozilla.org/network/protocol;1?name=resource","nsIResProtocolHandler");const nsIFile=Components.Constructor("@mozilla.org/file/local;1","nsIFile","initWithPath");const PREF_DB_SCHEMA="extensions.databaseSchema";const PREF_INSTALL_CACHE="extensions.installCache";const PREF_BOOTSTRAP_ADDONS="extensions.bootstrappedAddons";const PREF_PENDING_OPERATIONS="extensions.pendingOperations";const PREF_MATCH_OS_LOCALE="intl.locale.matchOS";const PREF_SELECTED_LOCALE="general.useragent.locale";const PREF_EM_DSS_ENABLED="extensions.dss.enabled";const PREF_DSS_SWITCHPENDING="extensions.dss.switchPending";const PREF_DSS_SKIN_TO_SELECT="extensions.lastSelectedSkin";const PREF_GENERAL_SKINS_SELECTEDSKIN="general.skins.selectedSkin";const PREF_EM_UPDATE_URL="extensions.update.url";const PREF_EM_UPDATE_BACKGROUND_URL="extensions.update.background.url";const PREF_EM_ENABLED_ADDONS="extensions.enabledAddons";const PREF_EM_EXTENSION_FORMAT="extensions.";const PREF_EM_ENABLED_SCOPES="extensions.enabledScopes";const PREF_EM_AUTO_DISABLED_SCOPES="extensions.autoDisableScopes";const PREF_EM_SHOW_MISMATCH_UI="extensions.showMismatchUI";const PREF_XPI_ENABLED="xpinstall.enabled";const PREF_XPI_WHITELIST_REQUIRED="xpinstall.whitelist.required";const PREF_XPI_DIRECT_WHITELISTED="xpinstall.whitelist.directRequest";const PREF_XPI_FILE_WHITELISTED="xpinstall.whitelist.fileRequest";const PREF_XPI_PERMISSIONS_BRANCH="xpinstall.";const PREF_XPI_UNPACK="extensions.alwaysUnpack";const PREF_INSTALL_REQUIREBUILTINCERTS="extensions.install.requireBuiltInCerts";const PREF_INSTALL_DISTRO_ADDONS="extensions.installDistroAddons";const PREF_BRANCH_INSTALLED_ADDON="extensions.installedDistroAddon.";const PREF_SHOWN_SELECTION_UI="extensions.shownSelectionUI";const PREF_EM_MIN_COMPAT_APP_VERSION="extensions.minCompatibleAppVersion";const PREF_EM_MIN_COMPAT_PLATFORM_VERSION="extensions.minCompatiblePlatformVersion";const PREF_CHECKCOMAT_THEMEOVERRIDE="extensions.checkCompatibility.temporaryThemeOverride_minAppVersion";const URI_EXTENSION_SELECT_DIALOG="chrome://mozapps/content/extensions/selectAddons.xul";const URI_EXTENSION_UPDATE_DIALOG="chrome://mozapps/content/extensions/update.xul";const URI_EXTENSION_STRINGS="chrome://mozapps/locale/extensions/extensions.properties";const STRING_TYPE_NAME="type.%ID%.name";const DIR_EXTENSIONS="extensions";const DIR_STAGE="staged";const DIR_XPI_STAGE="staged-xpis";const DIR_TRASH="trash";const FILE_DATABASE="extensions.json";const FILE_OLD_CACHE="extensions.cache";const FILE_INSTALL_MANIFEST="install.rdf";const FILE_XPI_ADDONS_LIST="extensions.ini";const KEY_PROFILEDIR="ProfD";const KEY_APPDIR="XCurProcD";const KEY_TEMPDIR="TmpD";const KEY_APP_DISTRIBUTION="XREAppDist";const KEY_APP_PROFILE="app-profile";const KEY_APP_GLOBAL="app-global";const KEY_APP_SYSTEM_LOCAL="app-system-local";const KEY_APP_SYSTEM_SHARE="app-system-share";const KEY_APP_SYSTEM_USER="app-system-user";const NOTIFICATION_FLUSH_PERMISSIONS="flush-pending-permissions";const XPI_PERMISSION="install";const RDFURI_INSTALL_MANIFEST_ROOT="urn:mozilla:install-manifest";const PREFIX_NS_EM="http://www.mozilla.org/2004/em-rdf#";const TOOLKIT_ID="toolkit@mozilla.org";const DB_SCHEMA=16;const NOTIFICATION_TOOLBOXPROCESS_LOADED="ToolboxProcessLoaded";const PROP_METADATA=["id","version","type","internalName","updateURL","updateKey","optionsURL","optionsType","aboutURL","iconURL","icon64URL"];const PROP_LOCALE_SINGLE=["name","description","creator","homepageURL"];const PROP_LOCALE_MULTI=["developers","translators","contributors"];const PROP_TARGETAPP=["id","minVersion","maxVersion"];

const DB_MIGRATE_METADATA=["installDate","userDisabled","softDisabled","sourceURI","applyBackgroundUpdates","releaseNotesURI","foreignInstall","syncGUID"];const PENDING_INSTALL_METADATA=["syncGUID","targetApplications","userDisabled","softDisabled","existingAddonID","sourceURI","releaseNotesURI","installDate","updateDate","applyBackgroundUpdates","compatibilityOverrides"];
const STATIC_BLOCKLIST_PATTERNS=[{creator:"Mozilla Corp.",level:Blocklist.STATE_BLOCKED,blockID:"i162"},{creator:"Mozilla.org",level:Blocklist.STATE_BLOCKED,blockID:"i162"}];const BOOTSTRAP_REASONS={APP_STARTUP:1,APP_SHUTDOWN:2,ADDON_ENABLE:3,ADDON_DISABLE:4,ADDON_INSTALL:5,ADDON_UNINSTALL:6,ADDON_UPGRADE:7,ADDON_DOWNGRADE:8};const TYPES={extension:2,theme:4,locale:8,multipackage:32,dictionary:64,experiment:128,};const RESTARTLESS_TYPES=new Set(["dictionary","experiment","locale",]);
const XPI_STARTING="XPIStarting";const XPI_BEFORE_UI_STARTUP="BeforeFinalUIStartup";const XPI_AFTER_UI_STARTUP="AfterFinalUIStartup";const COMPATIBLE_BY_DEFAULT_TYPES={extension:true,dictionary:true};const MSG_JAR_FLUSH="AddonJarFlush";var gGlobalScope=this;var gIDTest=/^(\{[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}|[a-z0-9-\._]*\@[a-z0-9-\._]+)$/i;Cu.import("resource://gre/modules/Log.jsm");const LOGGER_ID="addons.xpi";
let logger=Log.repository.getLogger(LOGGER_ID);const LAZY_OBJECTS=["XPIDatabase"];var gLazyObjectsLoaded=false;function loadLazyObjects(){let scope={};scope.AddonInternal=AddonInternal;scope.XPIProvider=XPIProvider;Services.scriptloader.loadSubScript("resource://gre/modules/addons/XPIProviderUtils.js",scope);for(let name of LAZY_OBJECTS){delete gGlobalScope[name];gGlobalScope[name]=scope[name];}
gLazyObjectsLoaded=true;return scope;}
for(let name of LAZY_OBJECTS){Object.defineProperty(gGlobalScope,name,{get:function lazyObjectGetter(){let objs=loadLazyObjects();return objs[name];},configurable:true});}
function findMatchingStaticBlocklistItem(aAddon){for(let item of STATIC_BLOCKLIST_PATTERNS){if("creator"in item&&typeof item.creator=="string"){if((aAddon.defaultLocale&&aAddon.defaultLocale.creator==item.creator)||(aAddon.selectedLocale&&aAddon.selectedLocale.creator==item.creator)){return item;}}}
return null;}
function setFilePermissions(aFile,aPermissions){try{aFile.permissions=aPermissions;}
catch(e){logger.warn("Failed to set permissions "+aPermissions.toString(8)+" on "+
aFile.path,e);}}
function SafeInstallOperation(){this._installedFiles=[];this._createdDirs=[];}
SafeInstallOperation.prototype={_installedFiles:null,_createdDirs:null,_installFile:function SIO_installFile(aFile,aTargetDirectory,aCopy){let oldFile=aCopy?null:aFile.clone();let newFile=aFile.clone();try{if(aCopy)
newFile.copyTo(aTargetDirectory,null);else
newFile.moveTo(aTargetDirectory,null);}
catch(e){logger.error("Failed to "+(aCopy?"copy":"move")+" file "+aFile.path+" to "+aTargetDirectory.path,e);throw e;}
this._installedFiles.push({oldFile:oldFile,newFile:newFile});},_installDirectory:function SIO_installDirectory(aDirectory,aTargetDirectory,aCopy){let newDir=aTargetDirectory.clone();newDir.append(aDirectory.leafName);try{newDir.create(Ci.nsIFile.DIRECTORY_TYPE,FileUtils.PERMS_DIRECTORY);}
catch(e){logger.error("Failed to create directory "+newDir.path,e);throw e;}
this._createdDirs.push(newDir);


let entries=getDirectoryEntries(aDirectory,true);entries.forEach(function(aEntry){try{this._installDirEntry(aEntry,newDir,aCopy);}
catch(e){logger.error("Failed to "+(aCopy?"copy":"move")+" entry "+
aEntry.path,e);throw e;}},this); if(aCopy)
return;
 try{setFilePermissions(aDirectory,FileUtils.PERMS_DIRECTORY);aDirectory.remove(false);}
catch(e){logger.error("Failed to remove directory "+aDirectory.path,e);throw e;}
 
this._installedFiles.push({oldFile:aDirectory,newFile:newDir});},_installDirEntry:function SIO_installDirEntry(aDirEntry,aTargetDirectory,aCopy){let isDir=null;try{isDir=aDirEntry.isDirectory();}
catch(e){

if(e.result==Cr.NS_ERROR_FILE_TARGET_DOES_NOT_EXIST)
return;logger.error("Failure "+(aCopy?"copying":"moving")+" "+aDirEntry.path+" to "+aTargetDirectory.path);throw e;}
try{if(isDir)
this._installDirectory(aDirEntry,aTargetDirectory,aCopy);else
this._installFile(aDirEntry,aTargetDirectory,aCopy);}
catch(e){logger.error("Failure "+(aCopy?"copying":"moving")+" "+aDirEntry.path+" to "+aTargetDirectory.path);throw e;}},moveUnder:function SIO_move(aFile,aTargetDirectory){try{this._installDirEntry(aFile,aTargetDirectory,false);}
catch(e){this.rollback();throw e;}},moveTo:function(aOldLocation,aNewLocation){try{let oldFile=aOldLocation.clone(),newFile=aNewLocation.clone();oldFile.moveTo(newFile.parent,newFile.leafName);this._installedFiles.push({oldFile:oldFile,newFile:newFile,isMoveTo:true});}
catch(e){this.rollback();throw e;}},copy:function SIO_copy(aFile,aTargetDirectory){try{this._installDirEntry(aFile,aTargetDirectory,true);}
catch(e){this.rollback();throw e;}},rollback:function SIO_rollback(){while(this._installedFiles.length>0){let move=this._installedFiles.pop();if(move.isMoveTo){move.newFile.moveTo(oldDir.parent,oldDir.leafName);}
else if(move.newFile.isDirectory()){let oldDir=move.oldFile.parent.clone();oldDir.append(move.oldFile.leafName);oldDir.create(Ci.nsIFile.DIRECTORY_TYPE,FileUtils.PERMS_DIRECTORY);}
else if(!move.oldFile){ move.newFile.remove(true);}
else{move.newFile.moveTo(move.oldFile.parent,null);}}
while(this._createdDirs.length>0)
recursiveRemove(this._createdDirs.pop());}};function getLocale(){if(Prefs.getBoolPref(PREF_MATCH_OS_LOCALE,false))
return Services.locale.getLocaleComponentForUserAgent();let locale=Prefs.getComplexValue(PREF_SELECTED_LOCALE,Ci.nsIPrefLocalizedString);if(locale)
return locale;return Prefs.getCharPref(PREF_SELECTED_LOCALE,"en-US");}
function findClosestLocale(aLocales){let appLocale=getLocale(); var bestmatch=null; var bestmatchcount=0; var bestpartcount=0;var matchLocales=[appLocale.toLowerCase()];if(matchLocales[0].substring(0,3)!="en-")
matchLocales.push("en-us");for each(var locale in matchLocales){var lparts=locale.split("-");for each(var localized in aLocales){for each(let found in localized.locales){found=found.toLowerCase(); if(locale==found)
return localized;var fparts=found.split("-");if(bestmatch&&fparts.length<bestmatchcount)
continue; var maxmatchcount=Math.min(fparts.length,lparts.length);var matchcount=0;while(matchcount<maxmatchcount&&fparts[matchcount]==lparts[matchcount])
matchcount++;if(matchcount>bestmatchcount||(matchcount==bestmatchcount&&fparts.length<bestpartcount)){bestmatch=localized;bestmatchcount=matchcount;bestpartcount=fparts.length;}}} 
if(bestmatch)
return bestmatch;}
return null;}
function applyBlocklistChanges(aOldAddon,aNewAddon,aOldAppVersion,aOldPlatformVersion){ aNewAddon.userDisabled=aOldAddon.userDisabled;aNewAddon.softDisabled=aOldAddon.softDisabled;let oldBlocklistState=Blocklist.getAddonBlocklistState(createWrapper(aOldAddon),aOldAppVersion,aOldPlatformVersion);let newBlocklistState=Blocklist.getAddonBlocklistState(createWrapper(aNewAddon));
 if(newBlocklistState==oldBlocklistState)
return;if(newBlocklistState==Blocklist.STATE_SOFTBLOCKED){if(aNewAddon.type!="theme"){
 aNewAddon.softDisabled=!aNewAddon.userDisabled;}
else{ aNewAddon.userDisabled=true;}}
else{ aNewAddon.softDisabled=false;}}
function isUsableAddon(aAddon){ if(aAddon.type=="theme"&&aAddon.internalName==XPIProvider.defaultSkin)
return true;if(aAddon.blocklistState==Blocklist.STATE_BLOCKED)
return false;if(AddonManager.checkUpdateSecurity&&!aAddon.providesUpdatesSecurely)
return false;if(!aAddon.isPlatformCompatible)
return false;if(AddonManager.checkCompatibility){if(!aAddon.isCompatible)
return false;}
else{let app=aAddon.matchingTargetApplication;if(!app)
return false;

if(aAddon.type=="theme"&&app.id==Services.appinfo.ID){try{let minCompatVersion=Services.prefs.getCharPref(PREF_CHECKCOMAT_THEMEOVERRIDE);if(minCompatVersion&&Services.vc.compare(minCompatVersion,app.maxVersion)>0){return false;}}catch(e){}}}
return true;}
function isAddonDisabled(aAddon){return aAddon.appDisabled||aAddon.softDisabled||aAddon.userDisabled;}
XPCOMUtils.defineLazyServiceGetter(this,"gRDF","@mozilla.org/rdf/rdf-service;1",Ci.nsIRDFService);function EM_R(aProperty){return gRDF.GetResource(PREFIX_NS_EM+aProperty);}
function createAddonDetails(id,aAddon){return{id:id||aAddon.id,type:aAddon.type,version:aAddon.version};}
function getRDFValue(aLiteral){if(aLiteral instanceof Ci.nsIRDFLiteral)
return aLiteral.Value;if(aLiteral instanceof Ci.nsIRDFResource)
return aLiteral.Value;if(aLiteral instanceof Ci.nsIRDFInt)
return aLiteral.Value;return null;}
function getRDFProperty(aDs,aResource,aProperty){return getRDFValue(aDs.GetTarget(aResource,EM_R(aProperty),true));}
function loadManifestFromRDF(aUri,aStream){function getPropertyArray(aDs,aSource,aProperty){let values=[];let targets=aDs.GetTargets(aSource,EM_R(aProperty),true);while(targets.hasMoreElements())
values.push(getRDFValue(targets.getNext()));return values;}
function readLocale(aDs,aSource,isDefault,aSeenLocales){let locale={};if(!isDefault){locale.locales=[];let targets=ds.GetTargets(aSource,EM_R("locale"),true);while(targets.hasMoreElements()){let localeName=getRDFValue(targets.getNext());if(!localeName){logger.warn("Ignoring empty locale in localized properties");continue;}
if(aSeenLocales.indexOf(localeName)!=-1){logger.warn("Ignoring duplicate locale in localized properties");continue;}
aSeenLocales.push(localeName);locale.locales.push(localeName);}
if(locale.locales.length==0){logger.warn("Ignoring localized properties with no listed locales");return null;}}
PROP_LOCALE_SINGLE.forEach(function(aProp){locale[aProp]=getRDFProperty(aDs,aSource,aProp);});PROP_LOCALE_MULTI.forEach(function(aProp){ let props=getPropertyArray(aDs,aSource,aProp.substring(0,aProp.length-1));if(props.length>0)
locale[aProp]=props;});return locale;}
let rdfParser=Cc["@mozilla.org/rdf/xml-parser;1"].createInstance(Ci.nsIRDFXMLParser)
let ds=Cc["@mozilla.org/rdf/datasource;1?name=in-memory-datasource"].createInstance(Ci.nsIRDFDataSource);let listener=rdfParser.parseAsync(ds,aUri);let channel=Cc["@mozilla.org/network/input-stream-channel;1"].createInstance(Ci.nsIInputStreamChannel);channel.setURI(aUri);channel.contentStream=aStream;channel.QueryInterface(Ci.nsIChannel);channel.contentType="text/xml";listener.onStartRequest(channel,null);try{let pos=0;let count=aStream.available();while(count>0){listener.onDataAvailable(channel,null,aStream,pos,count);pos+=count;count=aStream.available();}
listener.onStopRequest(channel,null,Components.results.NS_OK);}
catch(e){listener.onStopRequest(channel,null,e.result);throw e;}
let root=gRDF.GetResource(RDFURI_INSTALL_MANIFEST_ROOT);let addon=new AddonInternal();PROP_METADATA.forEach(function(aProp){addon[aProp]=getRDFProperty(ds,root,aProp);});addon.unpack=getRDFProperty(ds,root,"unpack")=="true";if(!addon.type){addon.type=addon.internalName?"theme":"extension";}
else{let type=addon.type;addon.type=null;for(let name in TYPES){if(TYPES[name]==type){addon.type=name;break;}}}
if(!(addon.type in TYPES))
throw new Error("Install manifest specifies unknown type: "+addon.type);if(addon.type!="multipackage"){if(!addon.id)
throw new Error("No ID in install manifest");if(!gIDTest.test(addon.id))
throw new Error("Illegal add-on ID "+addon.id);if(!addon.version)
throw new Error("No version in install manifest");}
addon.strictCompatibility=!(addon.type in COMPATIBLE_BY_DEFAULT_TYPES)||getRDFProperty(ds,root,"strictCompatibility")=="true";if(addon.type=="extension"){addon.bootstrap=getRDFProperty(ds,root,"bootstrap")=="true";addon.multiprocessCompatible=getRDFProperty(ds,root,"multiprocessCompatible")=="true";if(addon.optionsType&&addon.optionsType!=AddonManager.OPTIONS_TYPE_DIALOG&&addon.optionsType!=AddonManager.OPTIONS_TYPE_INLINE&&addon.optionsType!=AddonManager.OPTIONS_TYPE_TAB&&addon.optionsType!=AddonManager.OPTIONS_TYPE_INLINE_INFO){throw new Error("Install manifest specifies unknown type: "+addon.optionsType);}}
else{if(RESTARTLESS_TYPES.has(addon.type)){addon.bootstrap=true;}
 
addon.optionsURL=null;addon.optionsType=null;addon.aboutURL=null;if(addon.type=="theme"){if(!addon.internalName)
throw new Error("Themes must include an internalName property");addon.skinnable=getRDFProperty(ds,root,"skinnable")=="true";}}
addon.defaultLocale=readLocale(ds,root,true);let seenLocales=[];addon.locales=[];let targets=ds.GetTargets(root,EM_R("localized"),true);while(targets.hasMoreElements()){let target=targets.getNext().QueryInterface(Ci.nsIRDFResource);let locale=readLocale(ds,target,false,seenLocales);if(locale)
addon.locales.push(locale);}
let seenApplications=[];addon.targetApplications=[];targets=ds.GetTargets(root,EM_R("targetApplication"),true);while(targets.hasMoreElements()){let target=targets.getNext().QueryInterface(Ci.nsIRDFResource);let targetAppInfo={};PROP_TARGETAPP.forEach(function(aProp){targetAppInfo[aProp]=getRDFProperty(ds,target,aProp);});if(!targetAppInfo.id||!targetAppInfo.minVersion||!targetAppInfo.maxVersion){logger.warn("Ignoring invalid targetApplication entry in install manifest");continue;}
if(seenApplications.indexOf(targetAppInfo.id)!=-1){logger.warn("Ignoring duplicate targetApplication entry for "+targetAppInfo.id+" in install manifest");continue;}
seenApplications.push(targetAppInfo.id);addon.targetApplications.push(targetAppInfo);}

let targetPlatforms=getPropertyArray(ds,root,"targetPlatform");addon.targetPlatforms=[];targetPlatforms.forEach(function(aPlatform){let platform={os:null,abi:null};let pos=aPlatform.indexOf("_");if(pos!=-1){platform.os=aPlatform.substring(0,pos);platform.abi=aPlatform.substring(pos+1);}
else{platform.os=aPlatform;}
addon.targetPlatforms.push(platform);});

if(addon.type=="theme"){addon.userDisabled=!!LightweightThemeManager.currentTheme||addon.internalName!=XPIProvider.selectedSkin;}

else if(addon.type=="experiment"){addon.userDisabled=true;}
else{addon.userDisabled=false;addon.softDisabled=addon.blocklistState==Blocklist.STATE_SOFTBLOCKED;}
addon.applyBackgroundUpdates=AddonManager.AUTOUPDATE_DEFAULT;
if(addon.type=="experiment"){addon.applyBackgroundUpdates=AddonManager.AUTOUPDATE_DISABLE;addon.updateURL=null;addon.updateKey=null;addon.targetApplications=[];addon.targetPlatforms=[];}
let storage=Services.storage;let rng=Cc["@mozilla.org/security/random-generator;1"].createInstance(Ci.nsIRandomGenerator);let bytes=rng.generateRandomBytes(9);let byte_string=[String.fromCharCode(byte)for each(byte in bytes)].join(""); addon.syncGUID=btoa(byte_string).replace(/\+/g,'-').replace(/\//g,'_');return addon;}
function loadManifestFromDir(aDir){function getFileSize(aFile){if(aFile.isSymlink())
return 0;if(!aFile.isDirectory())
return aFile.fileSize;let size=0;let entries=aFile.directoryEntries.QueryInterface(Ci.nsIDirectoryEnumerator);let entry;while((entry=entries.nextFile))
size+=getFileSize(entry);entries.close();return size;}
let file=aDir.clone();file.append(FILE_INSTALL_MANIFEST);if(!file.exists()||!file.isFile())
throw new Error("Directory "+aDir.path+" does not contain a valid "+"install manifest");let fis=Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);fis.init(file,-1,-1,false);let bis=Cc["@mozilla.org/network/buffered-input-stream;1"].createInstance(Ci.nsIBufferedInputStream);bis.init(fis,4096);try{let addon=loadManifestFromRDF(Services.io.newFileURI(file),bis);addon._sourceBundle=aDir.clone();addon.size=getFileSize(aDir);file=aDir.clone();file.append("chrome.manifest");let chromeManifest=ChromeManifestParser.parseSync(Services.io.newFileURI(file));addon.hasBinaryComponents=ChromeManifestParser.hasType(chromeManifest,"binary-component");addon.appDisabled=!isUsableAddon(addon);return addon;}
finally{bis.close();fis.close();}}
function loadManifestFromZipReader(aZipReader){let zis=aZipReader.getInputStream(FILE_INSTALL_MANIFEST);let bis=Cc["@mozilla.org/network/buffered-input-stream;1"].createInstance(Ci.nsIBufferedInputStream);bis.init(zis,4096);try{let uri=buildJarURI(aZipReader.file,FILE_INSTALL_MANIFEST);let addon=loadManifestFromRDF(uri,bis);addon._sourceBundle=aZipReader.file;addon.size=0;let entries=aZipReader.findEntries(null);while(entries.hasMore())
addon.size+=aZipReader.getEntry(entries.getNext()).realSize;if(addon.unpack){uri=buildJarURI(aZipReader.file,"chrome.manifest");let chromeManifest=ChromeManifestParser.parseSync(uri);addon.hasBinaryComponents=ChromeManifestParser.hasType(chromeManifest,"binary-component");}else{addon.hasBinaryComponents=false;}
addon.appDisabled=!isUsableAddon(addon);return addon;}
finally{bis.close();zis.close();}}
function loadManifestFromZipFile(aXPIFile){let zipReader=Cc["@mozilla.org/libjar/zip-reader;1"].createInstance(Ci.nsIZipReader);try{zipReader.open(aXPIFile);return loadManifestFromZipReader(zipReader);}
finally{zipReader.close();}}
function loadManifestFromFile(aFile){if(aFile.isFile())
return loadManifestFromZipFile(aFile);else
return loadManifestFromDir(aFile);}
function getURIForResourceInFile(aFile,aPath){if(aFile.isDirectory()){let resource=aFile.clone();if(aPath){aPath.split("/").forEach(function(aPart){resource.append(aPart);});}
return NetUtil.newURI(resource);}
return buildJarURI(aFile,aPath);}
function buildJarURI(aJarfile,aPath){let uri=Services.io.newFileURI(aJarfile);uri="jar:"+uri.spec+"!/"+aPath;return NetUtil.newURI(uri);}
function flushJarCache(aJarFile){Services.obs.notifyObservers(aJarFile,"flush-cache-entry",null);Cc["@mozilla.org/globalmessagemanager;1"].getService(Ci.nsIMessageBroadcaster).broadcastAsyncMessage(MSG_JAR_FLUSH,aJarFile.path);}
function flushStartupCache(){Services.obs.notifyObservers(null,"startupcache-invalidate",null);}
function getTemporaryFile(){let file=FileUtils.getDir(KEY_TEMPDIR,[]);let random=Math.random().toString(36).replace(/0./,'').substr(-3);file.append("tmp-"+random+".xpi");file.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE,FileUtils.PERMS_FILE);return file;}
function verifyZipSigning(aZip,aPrincipal){var count=0;var entries=aZip.findEntries(null);while(entries.hasMore()){var entry=entries.getNext();if(entry.substr(0,9)=="META-INF/")
continue;if(entry.substr(-1)=="/")
continue;count++;var entryPrincipal=aZip.getCertificatePrincipal(entry);if(!entryPrincipal||!aPrincipal.equals(entryPrincipal))
return false;}
return aZip.manifestEntriesCount==count;}
function escapeAddonURI(aAddon,aUri,aUpdateType,aAppVersion)
{let uri=AddonManager.escapeAddonURI(aAddon,aUri,aAppVersion); if(aUpdateType)
uri=uri.replace(/%UPDATE_TYPE%/g,aUpdateType);

 let app=aAddon.matchingTargetApplication;if(app)
var maxVersion=app.maxVersion;else
maxVersion="";uri=uri.replace(/%ITEM_MAXAPPVERSION%/g,maxVersion);let compatMode="normal";if(!AddonManager.checkCompatibility)
compatMode="ignore";else if(AddonManager.strictCompatibility)
compatMode="strict";uri=uri.replace(/%COMPATIBILITY_MODE%/g,compatMode);return uri;}
function removeAsync(aFile){return Task.spawn(function(){let info=null;try{info=yield OS.File.stat(aFile.path);if(info.isDir)
yield OS.File.removeDir(aFile.path);else
yield OS.File.remove(aFile.path);}
catch(e if e instanceof OS.File.Error&&e.becauseNoSuchFile){ return;}});}
function recursiveRemove(aFile){let isDir=null;try{isDir=aFile.isDirectory();}
catch(e){

if(e.result==Cr.NS_ERROR_FILE_TARGET_DOES_NOT_EXIST)
return;if(e.result==Cr.NS_ERROR_FILE_NOT_FOUND)
return;throw e;}
setFilePermissions(aFile,isDir?FileUtils.PERMS_DIRECTORY:FileUtils.PERMS_FILE);try{aFile.remove(true);return;}
catch(e){if(!aFile.isDirectory()){logger.error("Failed to remove file "+aFile.path,e);throw e;}}



let entries=getDirectoryEntries(aFile,true);entries.forEach(recursiveRemove);try{aFile.remove(true);}
catch(e){logger.error("Failed to remove empty directory "+aFile.path,e);throw e;}}
function recursiveLastModifiedTime(aFile){try{let modTime=aFile.lastModifiedTime;let fileName=aFile.leafName;if(aFile.isFile())
return[fileName,modTime,1];if(aFile.isDirectory()){let entries=aFile.directoryEntries.QueryInterface(Ci.nsIDirectoryEnumerator);let entry;let totalItems=1;while((entry=entries.nextFile)){let[subName,subTime,items]=recursiveLastModifiedTime(entry);totalItems+=items;if(subTime>modTime){modTime=subTime;fileName=subName;}}
entries.close();return[fileName,modTime,totalItems];}}
catch(e){logger.warn("Problem getting last modified time for "+aFile.path,e);}
return["",0,0];}
function getDirectoryEntries(aDir,aSortEntries){let dirEnum;try{dirEnum=aDir.directoryEntries.QueryInterface(Ci.nsIDirectoryEnumerator);let entries=[];while(dirEnum.hasMoreElements())
entries.push(dirEnum.nextFile);if(aSortEntries){entries.sort(function sortDirEntries(a,b){return a.path>b.path?-1:1;});}
return entries}
catch(e){logger.warn("Can't iterate directory "+aDir.path,e);return[];}
finally{if(dirEnum){dirEnum.close();}}}
var Prefs={getDefaultCharPref:function Prefs_getDefaultCharPref(aName,aDefaultValue){try{return Services.prefs.getDefaultBranch("").getCharPref(aName);}
catch(e){}
return aDefaultValue;},getCharPref:function Prefs_getCharPref(aName,aDefaultValue){try{return Services.prefs.getCharPref(aName);}
catch(e){}
return aDefaultValue;},getComplexValue:function Prefs_getComplexValue(aName,aType,aDefaultValue){try{return Services.prefs.getComplexValue(aName,aType).data;}
catch(e){}
return aDefaultValue;},getBoolPref:function Prefs_getBoolPref(aName,aDefaultValue){try{return Services.prefs.getBoolPref(aName);}
catch(e){}
return aDefaultValue;},getIntPref:function Prefs_getIntPref(aName,defaultValue){try{return Services.prefs.getIntPref(aName);}
catch(e){}
return defaultValue;},clearUserPref:function Prefs_clearUserPref(aName){if(Services.prefs.prefHasUserValue(aName))
Services.prefs.clearUserPref(aName);}}

function directoryStateDiffers(aState,aCache)
{ function addonsMismatch(aNew,aOld){for(let[id,val]of aNew){if(!id in aOld)
return true;if(val.descriptor!=aOld[id].descriptor||val.mtime!=aOld[id].mtime)
return true;delete aOld[id];} 
for(let id in aOld)
return true;return false;}
if(!aCache)
return true;try{let old=JSON.parse(aCache);if(aState.length!=old.length)
return true;for(let i=0;i<aState.length;i++){
 if(aState[i].name!=old[i].name)
return true;if(addonsMismatch(aState[i].addons,old[i].addons))
return true;}}
catch(e){return true;}
return false;}
function makeSafe(aFunction){return function(...aArgs){try{return aFunction(...aArgs);}
catch(ex){logger.warn("XPIProvider callback failed",ex);}
return undefined;}}
function recordAddonTelemetry(aAddon){let loc=aAddon.defaultLocale;if(loc){if(loc.name)
XPIProvider.setTelemetry(aAddon.id,"name",loc.name);if(loc.creator)
XPIProvider.setTelemetry(aAddon.id,"creator",loc.creator);}}
this.XPIProvider={ installLocations:null, installLocationsByName:null, installs:null, defaultSkin:"classic/1.0", currentSkin:null,

 selectedSkin:null, minCompatibleAppVersion:null, minCompatiblePlatformVersion:null, bootstrappedAddons:{}, bootstrapScopes:{}, extensionsActive:false, installStates:[],
 allAppGlobal:true, enabledAddons:null, runPhase:XPI_STARTING,
_mostRecentlyModifiedFile:{}, _telemetryDetails:{},_enabledExperiments:null, _addonFileMap:new Map(), _toolboxProcessLoaded:false,setTelemetry:function XPI_setTelemetry(aId,aName,aValue){if(!this._telemetryDetails[aId])
this._telemetryDetails[aId]={};this._telemetryDetails[aId][aName]=aValue;},_inProgress:[],doing:function XPI_doing(aCancellable){this._inProgress.push(aCancellable);},done:function XPI_done(aCancellable){let i=this._inProgress.indexOf(aCancellable);if(i!=-1){this._inProgress.splice(i,1);return true;}
return false;},cancelAll:function XPI_cancelAll(){ while(this._inProgress.length>0){let c=this._inProgress.shift();try{c.cancel();}
catch(e){logger.warn("Cancel failed",e);}}},_addURIMapping:function XPI__addURIMapping(aID,aFile){logger.info("Mapping "+aID+" to "+aFile.path);this._addonFileMap.set(aID,aFile.path);let service=Cc["@mozilla.org/addon-path-service;1"].getService(Ci.amIAddonPathService);service.insertPath(aFile.path,aID);},_resolveURIToFile:function XPI__resolveURIToFile(aURI){switch(aURI.scheme){case"jar":case"file":if(aURI instanceof Ci.nsIJARURI){return this._resolveURIToFile(aURI.JARFile);}
return aURI;case"chrome":aURI=ChromeRegistry.convertChromeURL(aURI);return this._resolveURIToFile(aURI);case"resource":aURI=Services.io.newURI(ResProtocolHandler.resolveURI(aURI),null,null);return this._resolveURIToFile(aURI);case"view-source":aURI=Services.io.newURI(aURI.path,null,null);return this._resolveURIToFile(aURI);case"about":if(aURI.spec=="about:blank"){ return null;}
let chan;try{chan=Services.io.newChannelFromURI(aURI);}
catch(ex){return null;} 
if(chan.URI.equals(aURI)){return null;}


return this._resolveURIToFile(chan.URI.clone());default:return null;}},startup:function XPI_startup(aAppChanged,aOldAppVersion,aOldPlatformVersion){function addDirectoryInstallLocation(aName,aKey,aPaths,aScope,aLocked){try{var dir=FileUtils.getDir(aKey,aPaths);}
catch(e){ logger.debug("Skipping unavailable install location "+aName);return;}
try{var location=new DirectoryInstallLocation(aName,dir,aScope,aLocked);}
catch(e){logger.warn("Failed to add directory install location "+aName,e);return;}
XPIProvider.installLocations.push(location);XPIProvider.installLocationsByName[location.name]=location;}
function addRegistryInstallLocation(aName,aRootkey,aScope){try{var location=new WinRegInstallLocation(aName,aRootkey,aScope);}
catch(e){logger.warn("Failed to add registry install location "+aName,e);return;}
XPIProvider.installLocations.push(location);XPIProvider.installLocationsByName[location.name]=location;}
try{AddonManagerPrivate.recordTimestamp("XPI_startup_begin");logger.debug("startup");this.runPhase=XPI_STARTING;this.installs=[];this.installLocations=[];this.installLocationsByName={}; this._shutdownError=null; this._telemetryDetails={};this._enabledExperiments=new Set(); AddonManagerPrivate.setTelemetryDetails("XPI",this._telemetryDetails);let hasRegistry=("nsIWindowsRegKey"in Ci);let enabledScopes=Prefs.getIntPref(PREF_EM_ENABLED_SCOPES,AddonManager.SCOPE_ALL); if(enabledScopes&AddonManager.SCOPE_SYSTEM){if(hasRegistry){addRegistryInstallLocation("winreg-app-global",Ci.nsIWindowsRegKey.ROOT_KEY_LOCAL_MACHINE,AddonManager.SCOPE_SYSTEM);}
addDirectoryInstallLocation(KEY_APP_SYSTEM_LOCAL,"XRESysLExtPD",[Services.appinfo.ID],AddonManager.SCOPE_SYSTEM,true);addDirectoryInstallLocation(KEY_APP_SYSTEM_SHARE,"XRESysSExtPD",[Services.appinfo.ID],AddonManager.SCOPE_SYSTEM,true);}
if(enabledScopes&AddonManager.SCOPE_APPLICATION){addDirectoryInstallLocation(KEY_APP_GLOBAL,KEY_APPDIR,[DIR_EXTENSIONS],AddonManager.SCOPE_APPLICATION,true);}
if(enabledScopes&AddonManager.SCOPE_USER){if(hasRegistry){addRegistryInstallLocation("winreg-app-user",Ci.nsIWindowsRegKey.ROOT_KEY_CURRENT_USER,AddonManager.SCOPE_USER);}
addDirectoryInstallLocation(KEY_APP_SYSTEM_USER,"XREUSysExt",[Services.appinfo.ID],AddonManager.SCOPE_USER,true);} 
addDirectoryInstallLocation(KEY_APP_PROFILE,KEY_PROFILEDIR,[DIR_EXTENSIONS],AddonManager.SCOPE_PROFILE,false);this.defaultSkin=Prefs.getDefaultCharPref(PREF_GENERAL_SKINS_SELECTEDSKIN,"classic/1.0");this.currentSkin=Prefs.getCharPref(PREF_GENERAL_SKINS_SELECTEDSKIN,this.defaultSkin);this.selectedSkin=this.currentSkin;this.applyThemeChange();this.minCompatibleAppVersion=Prefs.getCharPref(PREF_EM_MIN_COMPAT_APP_VERSION,null);this.minCompatiblePlatformVersion=Prefs.getCharPref(PREF_EM_MIN_COMPAT_PLATFORM_VERSION,null);this.enabledAddons="";Services.prefs.addObserver(PREF_EM_MIN_COMPAT_APP_VERSION,this,false);Services.prefs.addObserver(PREF_EM_MIN_COMPAT_PLATFORM_VERSION,this,false);Services.obs.addObserver(this,NOTIFICATION_FLUSH_PERMISSIONS,false);if(Cu.isModuleLoaded("resource:///modules/devtools/ToolboxProcess.jsm")){
 this._toolboxProcessLoaded=true;BrowserToolboxProcess.on("connectionchange",this.onDebugConnectionChange.bind(this));}
else{ Services.obs.addObserver(this,NOTIFICATION_TOOLBOXPROCESS_LOADED,false);}
let flushCaches=this.checkForChanges(aAppChanged,aOldAppVersion,aOldPlatformVersion); this.applyThemeChange();if(aAppChanged===undefined){ Services.prefs.setBoolPref(PREF_SHOWN_SELECTION_UI,true);}
else if(aAppChanged&&!this.allAppGlobal&&Prefs.getBoolPref(PREF_EM_SHOW_MISMATCH_UI,true)){if(!Prefs.getBoolPref(PREF_SHOWN_SELECTION_UI,false)){ Services.startup.interrupted=true;var features="chrome,centerscreen,dialog,titlebar,modal";Services.ww.openWindow(null,URI_EXTENSION_SELECT_DIALOG,"",features,null);Services.prefs.setBoolPref(PREF_SHOWN_SELECTION_UI,true); Services.prefs.setBoolPref(PREF_PENDING_OPERATIONS,!XPIDatabase.writeAddonsList());}
else{let addonsToUpdate=this.shouldForceUpdateCheck(aAppChanged);if(addonsToUpdate){this.showUpgradeUI(addonsToUpdate);flushCaches=true;}}}
if(flushCaches){flushStartupCache();


 Services.obs.notifyObservers(null,"chrome-flush-skin-caches",null);Services.obs.notifyObservers(null,"chrome-flush-caches",null);}
this.enabledAddons=Prefs.getCharPref(PREF_EM_ENABLED_ADDONS,"");if("nsICrashReporter"in Ci&&Services.appinfo instanceof Ci.nsICrashReporter){try{Services.appinfo.annotateCrashReport("Theme",this.currentSkin);}catch(e){}
try{Services.appinfo.annotateCrashReport("EMCheckCompatibility",AddonManager.checkCompatibility);}catch(e){}
this.addAddonsToCrashReporter();}
try{AddonManagerPrivate.recordTimestamp("XPI_bootstrap_addons_begin");for(let id in this.bootstrappedAddons){try{let file=Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);file.persistentDescriptor=this.bootstrappedAddons[id].descriptor;let reason=BOOTSTRAP_REASONS.APP_STARTUP;
 if(AddonManager.getStartupChanges(AddonManager.STARTUP_CHANGE_INSTALLED).indexOf(id)!==-1)
reason=BOOTSTRAP_REASONS.ADDON_INSTALL;this.callBootstrapMethod(createAddonDetails(id,this.bootstrappedAddons[id]),file,"startup",reason);}
catch(e){logger.error("Failed to load bootstrap addon "+id+" from "+
this.bootstrappedAddons[id].descriptor,e);}}
AddonManagerPrivate.recordTimestamp("XPI_bootstrap_addons_end");}
catch(e){logger.error("bootstrap startup failed",e);AddonManagerPrivate.recordException("XPI-BOOTSTRAP","startup failed",e);}
 
Services.obs.addObserver({observe:function shutdownObserver(aSubject,aTopic,aData){for(let id in XPIProvider.bootstrappedAddons){let file=Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);file.persistentDescriptor=XPIProvider.bootstrappedAddons[id].descriptor;let addon=createAddonDetails(id,XPIProvider.bootstrappedAddons[id]);XPIProvider.callBootstrapMethod(addon,file,"shutdown",BOOTSTRAP_REASONS.APP_SHUTDOWN);}
Services.obs.removeObserver(this,"quit-application-granted");}},"quit-application-granted",false); Services.obs.addObserver({observe:function uiStartupObserver(aSubject,aTopic,aData){AddonManagerPrivate.recordTimestamp("XPI_finalUIStartup");XPIProvider.runPhase=XPI_AFTER_UI_STARTUP;Services.obs.removeObserver(this,"final-ui-startup");}},"final-ui-startup",false);AddonManagerPrivate.recordTimestamp("XPI_startup_end");this.extensionsActive=true;this.runPhase=XPI_BEFORE_UI_STARTUP;}
catch(e){logger.error("startup failed",e);AddonManagerPrivate.recordException("XPI","startup failed",e);}},shutdown:function XPI_shutdown(){logger.debug("shutdown"); this.cancelAll();this.bootstrappedAddons={};this.bootstrapScopes={};this.enabledAddons=null;this.allAppGlobal=true;
 if(Prefs.getBoolPref(PREF_PENDING_OPERATIONS,false)){XPIDatabase.updateActiveAddons();Services.prefs.setBoolPref(PREF_PENDING_OPERATIONS,!XPIDatabase.writeAddonsList());}
this.installs=null;this.installLocations=null;this.installLocationsByName=null; this.extensionsActive=false;this._addonFileMap.clear();if(gLazyObjectsLoaded){let done=XPIDatabase.shutdown();done.then(ret=>{logger.debug("Notifying XPI shutdown observers");Services.obs.notifyObservers(null,"xpi-provider-shutdown",null);},err=>{logger.debug("Notifying XPI shutdown observers");this._shutdownError=err;Services.obs.notifyObservers(null,"xpi-provider-shutdown",err);});return done;}
else{logger.debug("Notifying XPI shutdown observers");Services.obs.notifyObservers(null,"xpi-provider-shutdown",null);}},applyThemeChange:function XPI_applyThemeChange(){if(!Prefs.getBoolPref(PREF_DSS_SWITCHPENDING,false))
return; try{this.selectedSkin=Prefs.getCharPref(PREF_DSS_SKIN_TO_SELECT);Services.prefs.setCharPref(PREF_GENERAL_SKINS_SELECTEDSKIN,this.selectedSkin);Services.prefs.clearUserPref(PREF_DSS_SKIN_TO_SELECT);logger.debug("Changed skin to "+this.selectedSkin);this.currentSkin=this.selectedSkin;}
catch(e){logger.error("Error applying theme change",e);}
Services.prefs.clearUserPref(PREF_DSS_SWITCHPENDING);},shouldForceUpdateCheck:function XPI_shouldForceUpdateCheck(aAppChanged){AddonManagerPrivate.recordSimpleMeasure("XPIDB_metadata_age",AddonRepository.metadataAge());let startupChanges=AddonManager.getStartupChanges(AddonManager.STARTUP_CHANGE_DISABLED);logger.debug("shouldForceUpdateCheck startupChanges: "+startupChanges.toSource());AddonManagerPrivate.recordSimpleMeasure("XPIDB_startup_disabled",startupChanges.length);let forceUpdate=[];if(startupChanges.length>0){let addons=XPIDatabase.getAddons();for(let addon of addons){if((startupChanges.indexOf(addon.id)!=-1)&&(addon.permissions()&AddonManager.PERM_CAN_UPGRADE)){logger.debug("shouldForceUpdateCheck: can upgrade disabled add-on "+addon.id);forceUpdate.push(addon.id);}}}
if(AddonRepository.isMetadataStale()){logger.debug("shouldForceUpdateCheck: metadata is stale");return forceUpdate;}
if(forceUpdate.length>0){return forceUpdate;}
return false;},showUpgradeUI:function XPI_showUpgradeUI(aAddonIDs){logger.debug("XPI_showUpgradeUI: "+aAddonIDs.toSource()); Services.startup.interrupted=true;var variant=Cc["@mozilla.org/variant;1"].createInstance(Ci.nsIWritableVariant);variant.setFromVariant(aAddonIDs);var features="chrome,centerscreen,dialog,titlebar,modal";var ww=Cc["@mozilla.org/embedcomp/window-watcher;1"].getService(Ci.nsIWindowWatcher);ww.openWindow(null,URI_EXTENSION_UPDATE_DIALOG,"",features,variant); Services.prefs.setBoolPref(PREF_PENDING_OPERATIONS,!XPIDatabase.writeAddonsList());},persistBootstrappedAddons:function XPI_persistBootstrappedAddons(){let filtered={};for(let id in this.bootstrappedAddons){let entry=this.bootstrappedAddons[id];if(entry.type=="experiment"){continue;}
filtered[id]=entry;}
Services.prefs.setCharPref(PREF_BOOTSTRAP_ADDONS,JSON.stringify(filtered));},addAddonsToCrashReporter:function XPI_addAddonsToCrashReporter(){if(!("nsICrashReporter"in Ci)||!(Services.appinfo instanceof Ci.nsICrashReporter))
return;
 if(Services.appinfo.inSafeMode)
return;let data=this.enabledAddons;for(let id in this.bootstrappedAddons){data+=(data?",":"")+encodeURIComponent(id)+":"+
encodeURIComponent(this.bootstrappedAddons[id].version);}
try{Services.appinfo.annotateCrashReport("Add-ons",data);}
catch(e){}
Cu.import("resource://gre/modules/TelemetryPing.jsm",{}).TelemetryPing.setAddOns(data);},getAddonStates:function XPI_getAddonStates(aLocation){let addonStates={};for(let file of aLocation.addonLocations){let scanStarted=Date.now();let id=aLocation.getIDForLocation(file);let unpacked=0;let[modFile,modTime,items]=recursiveLastModifiedTime(file);addonStates[id]={descriptor:file.persistentDescriptor,mtime:modTime};try{ file.append(FILE_INSTALL_MANIFEST);let rdfTime=file.lastModifiedTime;addonStates[id].rdfTime=rdfTime;unpacked=1;}
catch(e){}
this._mostRecentlyModifiedFile[id]=modFile;this.setTelemetry(id,"unpacked",unpacked);this.setTelemetry(id,"location",aLocation.name);this.setTelemetry(id,"scan_MS",Date.now()-scanStarted);this.setTelemetry(id,"scan_items",items);}
return addonStates;},getInstallLocationStates:function XPI_getInstallLocationStates(){let states=[];this.installLocations.forEach(function(aLocation){let addons=aLocation.addonLocations;if(addons.length==0)
return;let locationState={name:aLocation.name,addons:this.getAddonStates(aLocation)};states.push(locationState);},this);return states;},processPendingFileChanges:function XPI_processPendingFileChanges(aManifests){let changed=false;this.installLocations.forEach(function(aLocation){aManifests[aLocation.name]={}; if(aLocation.locked)
return;let stagedXPIDir=aLocation.getXPIStagingDir();let stagingDir=aLocation.getStagingDir();if(stagedXPIDir.exists()&&stagedXPIDir.isDirectory()){let entries=stagedXPIDir.directoryEntries.QueryInterface(Ci.nsIDirectoryEnumerator);while(entries.hasMoreElements()){let stageDirEntry=entries.nextFile;if(!stageDirEntry.isDirectory()){logger.warn("Ignoring file in XPI staging directory: "+stageDirEntry.path);continue;} 
let stagedXPI=null;var xpiEntries=stageDirEntry.directoryEntries.QueryInterface(Ci.nsIDirectoryEnumerator);while(xpiEntries.hasMoreElements()){let file=xpiEntries.nextFile;if(file.isDirectory())
continue;let extension=file.leafName;extension=extension.substring(extension.length-4);if(extension!=".xpi"&&extension!=".jar")
continue;stagedXPI=file;}
xpiEntries.close();if(!stagedXPI)
continue;let addon=null;try{addon=loadManifestFromZipFile(stagedXPI);}
catch(e){logger.error("Unable to read add-on manifest from "+stagedXPI.path,e);continue;}
logger.debug("Migrating staged install of "+addon.id+" in "+aLocation.name);if(addon.unpack||Prefs.getBoolPref(PREF_XPI_UNPACK,false)){let targetDir=stagingDir.clone();targetDir.append(addon.id);try{targetDir.create(Ci.nsIFile.DIRECTORY_TYPE,FileUtils.PERMS_DIRECTORY);}
catch(e){logger.error("Failed to create staging directory for add-on "+addon.id,e);continue;}
try{ZipUtils.extractFiles(stagedXPI,targetDir);}
catch(e){logger.error("Failed to extract staged XPI for add-on "+addon.id+" in "+
aLocation.name,e);}}
else{try{stagedXPI.moveTo(stagingDir,addon.id+".xpi");}
catch(e){logger.error("Failed to move staged XPI for add-on "+addon.id+" in "+
aLocation.name,e);}}}
entries.close();}
if(stagedXPIDir.exists()){try{recursiveRemove(stagedXPIDir);}
catch(e){logger.debug("Error removing XPI staging dir "+stagedXPIDir.path,e);}}
try{if(!stagingDir||!stagingDir.exists()||!stagingDir.isDirectory())
return;}
catch(e){logger.warn("Failed to find staging directory",e);return;}
let seenFiles=[];


let stagingDirEntries=getDirectoryEntries(stagingDir,true);for(let stageDirEntry of stagingDirEntries){let id=stageDirEntry.leafName;let isDir;try{isDir=stageDirEntry.isDirectory();}
catch(e if e.result==Cr.NS_ERROR_FILE_TARGET_DOES_NOT_EXIST){

continue;}
if(!isDir){if(id.substring(id.length-4).toLowerCase()==".xpi"){id=id.substring(0,id.length-4);}
else{if(id.substring(id.length-5).toLowerCase()!=".json"){logger.warn("Ignoring file: "+stageDirEntry.path);seenFiles.push(stageDirEntry.leafName);}
continue;}}
if(!gIDTest.test(id)){logger.warn("Ignoring directory whose name is not a valid add-on ID: "+
stageDirEntry.path);seenFiles.push(stageDirEntry.leafName);continue;}
changed=true;if(isDir){let manifest=stageDirEntry.clone();manifest.append(FILE_INSTALL_MANIFEST);
if(!manifest.exists()){logger.debug("Processing uninstall of "+id+" in "+aLocation.name);try{aLocation.uninstallAddon(id);seenFiles.push(stageDirEntry.leafName);}
catch(e){logger.error("Failed to uninstall add-on "+id+" in "+aLocation.name,e);} 
continue;}}
aManifests[aLocation.name][id]=null;let existingAddonID=id;let jsonfile=stagingDir.clone();jsonfile.append(id+".json");try{aManifests[aLocation.name][id]=loadManifestFromFile(stageDirEntry);}
catch(e){logger.error("Unable to read add-on manifest from "+stageDirEntry.path,e); seenFiles.push(stageDirEntry.leafName);seenFiles.push(jsonfile.leafName);continue;}
 
if(jsonfile.exists()){logger.debug("Found updated metadata for "+id+" in "+aLocation.name);let fis=Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);let json=Cc["@mozilla.org/dom/json;1"].createInstance(Ci.nsIJSON);try{fis.init(jsonfile,-1,0,0);let metadata=json.decodeFromStream(fis,jsonfile.fileSize);aManifests[aLocation.name][id].importMetadata(metadata);}
catch(e){

 logger.error("Unable to read metadata from "+jsonfile.path,e);}
finally{fis.close();}}
seenFiles.push(jsonfile.leafName);existingAddonID=aManifests[aLocation.name][id].existingAddonID||id;var oldBootstrap=null;logger.debug("Processing install of "+id+" in "+aLocation.name);if(existingAddonID in this.bootstrappedAddons){try{var existingAddon=aLocation.getLocationForID(existingAddonID);if(this.bootstrappedAddons[existingAddonID].descriptor==existingAddon.persistentDescriptor){oldBootstrap=this.bootstrappedAddons[existingAddonID];
 let newVersion=aManifests[aLocation.name][id].version;let oldVersion=oldBootstrap.version;let uninstallReason=Services.vc.compare(oldVersion,newVersion)<0?BOOTSTRAP_REASONS.ADDON_UPGRADE:BOOTSTRAP_REASONS.ADDON_DOWNGRADE;this.callBootstrapMethod(createAddonDetails(existingAddonID,oldBootstrap),existingAddon,"uninstall",uninstallReason,{newVersion:newVersion});this.unloadBootstrapScope(existingAddonID);flushStartupCache();}}
catch(e){}}
try{var addonInstallLocation=aLocation.installAddon(id,stageDirEntry,existingAddonID);if(aManifests[aLocation.name][id])
aManifests[aLocation.name][id]._sourceBundle=addonInstallLocation;}
catch(e){logger.error("Failed to install staged add-on "+id+" in "+aLocation.name,e); AddonInstall.createStagedInstall(aLocation,stageDirEntry,aManifests[aLocation.name][id]); seenFiles.pop();delete aManifests[aLocation.name][id];if(oldBootstrap){ this.callBootstrapMethod(createAddonDetails(existingAddonID,oldBootstrap),existingAddon,"install",BOOTSTRAP_REASONS.ADDON_INSTALL);}
continue;}}
try{aLocation.cleanStagingDir(seenFiles);}
catch(e){logger.debug("Error cleaning staging dir "+stagingDir.path,e);}},this);return changed;},installDistributionAddons:function XPI_installDistributionAddons(aManifests){let distroDir;try{distroDir=FileUtils.getDir(KEY_APP_DISTRIBUTION,[DIR_EXTENSIONS]);}
catch(e){return false;}
if(!distroDir.exists())
return false;if(!distroDir.isDirectory())
return false;let changed=false;let profileLocation=this.installLocationsByName[KEY_APP_PROFILE];let entries=distroDir.directoryEntries.QueryInterface(Ci.nsIDirectoryEnumerator);let entry;while((entry=entries.nextFile)){let id=entry.leafName;if(entry.isFile()){if(id.substring(id.length-4).toLowerCase()==".xpi"){id=id.substring(0,id.length-4);}
else{logger.debug("Ignoring distribution add-on that isn't an XPI: "+entry.path);continue;}}
else if(!entry.isDirectory()){logger.debug("Ignoring distribution add-on that isn't a file or directory: "+
entry.path);continue;}
if(!gIDTest.test(id)){logger.debug("Ignoring distribution add-on whose name is not a valid add-on ID: "+
entry.path);continue;}
let addon;try{addon=loadManifestFromFile(entry);}
catch(e){logger.warn("File entry "+entry.path+" contains an invalid add-on",e);continue;}
if(addon.id!=id){logger.warn("File entry "+entry.path+" contains an add-on with an "+"incorrect ID")
continue;}
let existingEntry=null;try{existingEntry=profileLocation.getLocationForID(id);}
catch(e){}
if(existingEntry){let existingAddon;try{existingAddon=loadManifestFromFile(existingEntry);if(Services.vc.compare(addon.version,existingAddon.version)<=0)
continue;}
catch(e){ logger.warn("Profile contains an add-on with a bad or missing install "+"manifest at "+existingEntry.path+", overwriting",e);}}
else if(Prefs.getBoolPref(PREF_BRANCH_INSTALLED_ADDON+id,false)){continue;} 
try{profileLocation.installAddon(id,entry,null,true);logger.debug("Installed distribution add-on "+id);Services.prefs.setBoolPref(PREF_BRANCH_INSTALLED_ADDON+id,true)

 
if(!(KEY_APP_PROFILE in aManifests))
aManifests[KEY_APP_PROFILE]={};aManifests[KEY_APP_PROFILE][id]=addon;changed=true;}
catch(e){logger.error("Failed to install distribution add-on "+entry.path,e);}}
entries.close();return changed;},processFileChanges:function XPI_processFileChanges(aState,aManifests,aUpdateCompatibility,aOldAppVersion,aOldPlatformVersion){let visibleAddons={};let oldBootstrappedAddons=this.bootstrappedAddons;this.bootstrappedAddons={};function updateMetadata(aInstallLocation,aOldAddon,aAddonState){logger.debug("Add-on "+aOldAddon.id+" modified in "+aInstallLocation.name); let newAddon=aManifests[aInstallLocation.name][aOldAddon.id];try{ if(!newAddon){let file=aInstallLocation.getLocationForID(aOldAddon.id);newAddon=loadManifestFromFile(file);applyBlocklistChanges(aOldAddon,newAddon);


newAddon.pendingUninstall=aOldAddon.pendingUninstall;}

if(newAddon.id!=aOldAddon.id)
throw new Error("Incorrect id in install manifest for existing add-on "+aOldAddon.id);}
catch(e){logger.warn("updateMetadata: Add-on "+aOldAddon.id+" is invalid",e);XPIDatabase.removeAddonMetadata(aOldAddon);if(!aInstallLocation.locked)
aInstallLocation.uninstallAddon(aOldAddon.id);else
logger.warn("Could not uninstall invalid item from locked install location"); if(aOldAddon.active)
return true;return false;} 
newAddon._installLocation=aInstallLocation;newAddon.updateDate=aAddonState.mtime;newAddon.visible=!(newAddon.id in visibleAddons); let newDBAddon=XPIDatabase.updateAddonMetadata(aOldAddon,newAddon,aAddonState.descriptor);if(newDBAddon.visible){visibleAddons[newDBAddon.id]=newDBAddon; AddonManagerPrivate.addStartupChange(AddonManager.STARTUP_CHANGE_CHANGED,newDBAddon.id);
 if(aOldAddon.active&&isAddonDisabled(newDBAddon))
XPIProvider.enableDefaultTheme(); if(newDBAddon.active&&newDBAddon.bootstrap){ flushStartupCache();let installReason=Services.vc.compare(aOldAddon.version,newDBAddon.version)<0?BOOTSTRAP_REASONS.ADDON_UPGRADE:BOOTSTRAP_REASONS.ADDON_DOWNGRADE;let file=Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);file.persistentDescriptor=aAddonState.descriptor;XPIProvider.callBootstrapMethod(newDBAddon,file,"install",installReason,{oldVersion:aOldAddon.version});return false;}
return true;}
return false;}
function updateDescriptor(aInstallLocation,aOldAddon,aAddonState){logger.debug("Add-on "+aOldAddon.id+" moved to "+aAddonState.descriptor);aOldAddon.descriptor=aAddonState.descriptor;aOldAddon.visible=!(aOldAddon.id in visibleAddons);XPIDatabase.saveChanges();if(aOldAddon.visible){visibleAddons[aOldAddon.id]=aOldAddon;if(aOldAddon.bootstrap&&aOldAddon.active){let bootstrap=oldBootstrappedAddons[aOldAddon.id];bootstrap.descriptor=aAddonState.descriptor;XPIProvider.bootstrappedAddons[aOldAddon.id]=bootstrap;}
return true;}
return false;}
function updateVisibilityAndCompatibility(aInstallLocation,aOldAddon,aAddonState){let changed=false; if(!(aOldAddon.id in visibleAddons)){visibleAddons[aOldAddon.id]=aOldAddon;if(!aOldAddon.visible){AddonManagerPrivate.addStartupChange(AddonManager.STARTUP_CHANGE_CHANGED,aOldAddon.id);XPIDatabase.makeAddonVisible(aOldAddon);if(aOldAddon.bootstrap){ let file=Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);file.persistentDescriptor=aAddonState.descriptor;XPIProvider.callBootstrapMethod(aOldAddon,file,"install",BOOTSTRAP_REASONS.ADDON_INSTALL);
 if(!isAddonDisabled(aOldAddon)){XPIDatabase.updateAddonActive(aOldAddon,true);}
else{XPIProvider.unloadBootstrapScope(newAddon.id);}}
else{ changed=true;}}}
if(aUpdateCompatibility){let wasDisabled=isAddonDisabled(aOldAddon);let wasAppDisabled=aOldAddon.appDisabled;let wasUserDisabled=aOldAddon.userDisabled;let wasSoftDisabled=aOldAddon.softDisabled; applyBlocklistChanges(aOldAddon,aOldAddon,aOldAppVersion,aOldPlatformVersion);aOldAddon.appDisabled=!isUsableAddon(aOldAddon);let isDisabled=isAddonDisabled(aOldAddon);if(wasAppDisabled!=aOldAddon.appDisabled||wasUserDisabled!=aOldAddon.userDisabled||wasSoftDisabled!=aOldAddon.softDisabled){logger.debug("Add-on "+aOldAddon.id+" changed appDisabled state to "+
aOldAddon.appDisabled+", userDisabled state to "+
aOldAddon.userDisabled+" and softDisabled state to "+
aOldAddon.softDisabled);XPIDatabase.saveChanges();}

if(aOldAddon.visible&&wasDisabled!=isDisabled){
 let change=isDisabled?AddonManager.STARTUP_CHANGE_DISABLED:AddonManager.STARTUP_CHANGE_ENABLED;AddonManagerPrivate.addStartupChange(change,aOldAddon.id);if(aOldAddon.bootstrap){ XPIDatabase.updateAddonActive(aOldAddon,!isDisabled);}
else{changed=true;}}}
if(aOldAddon.visible&&aOldAddon.active&&aOldAddon.bootstrap){XPIProvider.bootstrappedAddons[aOldAddon.id]={version:aOldAddon.version,type:aOldAddon.type,descriptor:aAddonState.descriptor,multiprocessCompatible:aOldAddon.multiprocessCompatible};}
return changed;}
function removeMetadata(aOldAddon){ logger.debug("Add-on "+aOldAddon.id+" removed from "+aOldAddon.location);XPIDatabase.removeAddonMetadata(aOldAddon); if(aOldAddon.visible){AddonManagerPrivate.addStartupChange(AddonManager.STARTUP_CHANGE_UNINSTALLED,aOldAddon.id);}
else if(AddonManager.getStartupChanges(AddonManager.STARTUP_CHANGE_INSTALLED).indexOf(aOldAddon.id)!=-1){AddonManagerPrivate.addStartupChange(AddonManager.STARTUP_CHANGE_CHANGED,aOldAddon.id);}
if(aOldAddon.active){
 if(aOldAddon.type=="theme")
XPIProvider.enableDefaultTheme();return true;}
return false;}
function addMetadata(aInstallLocation,aId,aAddonState,aMigrateData){logger.debug("New add-on "+aId+" installed in "+aInstallLocation.name);let newAddon=null;let sameVersion=false;
 if(aInstallLocation.name in aManifests)
newAddon=aManifests[aInstallLocation.name][aId];

let isNewInstall=(!!newAddon)||(!XPIDatabase.activeBundles&&!aMigrateData);
 let isDetectedInstall=isNewInstall&&!newAddon; try{if(!newAddon){let file=aInstallLocation.getLocationForID(aId);newAddon=loadManifestFromFile(file);}
if(newAddon.id!=aId){throw new Error("Invalid addon ID: expected addon ID "+aId+", found "+newAddon.id+" in manifest");}}
catch(e){logger.warn("addMetadata: Add-on "+aId+" is invalid",e);
 if(!aInstallLocation.locked)
aInstallLocation.uninstallAddon(aId);else
logger.warn("Could not uninstall invalid item from locked install location");return false;}
newAddon._installLocation=aInstallLocation;newAddon.visible=!(newAddon.id in visibleAddons);newAddon.installDate=aAddonState.mtime;newAddon.updateDate=aAddonState.mtime;newAddon.foreignInstall=isDetectedInstall;if(aMigrateData){logger.debug("Migrating data from old database");DB_MIGRATE_METADATA.forEach(function(aProp){
 if(aProp=="userDisabled"&&newAddon.type=="theme")
return;if(aProp in aMigrateData)
newAddon[aProp]=aMigrateData[aProp];});
 newAddon.foreignInstall|=aInstallLocation.name!=KEY_APP_PROFILE;
if(aMigrateData.version==newAddon.version){logger.debug("Migrating compatibility info");sameVersion=true;if("targetApplications"in aMigrateData)
newAddon.applyCompatibilityUpdate(aMigrateData,true);} 
applyBlocklistChanges(newAddon,newAddon,aOldAppVersion,aOldPlatformVersion);} 
if(newAddon.type=="theme"&&newAddon.internalName==XPIProvider.defaultSkin)
newAddon.foreignInstall=false;if(isDetectedInstall&&newAddon.foreignInstall){
 let disablingScopes=Prefs.getIntPref(PREF_EM_AUTO_DISABLED_SCOPES,0);if(aInstallLocation.scope&disablingScopes)
newAddon.userDisabled=true;}

if(!isNewInstall&&XPIDatabase.activeBundles){ if(newAddon.type=="theme")
newAddon.active=newAddon.internalName==XPIProvider.currentSkin;else
newAddon.active=XPIDatabase.activeBundles.indexOf(aAddonState.descriptor)!=-1;
 if(!newAddon.active&&newAddon.visible&&!isAddonDisabled(newAddon)){ if(newAddon.blocklistState==Blocklist.STATE_SOFTBLOCKED)
newAddon.softDisabled=true;else
newAddon.userDisabled=true;}}
else{newAddon.active=(newAddon.visible&&!isAddonDisabled(newAddon))}
let newDBAddon=XPIDatabase.addAddonMetadata(newAddon,aAddonState.descriptor);if(newDBAddon.visible){if(isDetectedInstall){
 if(AddonManager.getStartupChanges(AddonManager.STARTUP_CHANGE_UNINSTALLED).indexOf(newDBAddon.id)!=-1){AddonManagerPrivate.addStartupChange(AddonManager.STARTUP_CHANGE_CHANGED,newDBAddon.id);}
else{AddonManagerPrivate.addStartupChange(AddonManager.STARTUP_CHANGE_INSTALLED,newDBAddon.id);}} 
if(newDBAddon._installLocation.name!=KEY_APP_GLOBAL)
XPIProvider.allAppGlobal=false;visibleAddons[newDBAddon.id]=newDBAddon;let installReason=BOOTSTRAP_REASONS.ADDON_INSTALL;let extraParams={}; if(newDBAddon.id in oldBootstrappedAddons){let oldBootstrap=oldBootstrappedAddons[newDBAddon.id];extraParams.oldVersion=oldBootstrap.version;XPIProvider.bootstrappedAddons[newDBAddon.id]=oldBootstrap;

if(sameVersion||!isNewInstall)
return false;installReason=Services.vc.compare(oldBootstrap.version,newDBAddon.version)<0?BOOTSTRAP_REASONS.ADDON_UPGRADE:BOOTSTRAP_REASONS.ADDON_DOWNGRADE;let oldAddonFile=Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);oldAddonFile.persistentDescriptor=oldBootstrap.descriptor;XPIProvider.callBootstrapMethod(createAddonDetails(newDBAddon.id,oldBootstrap),oldAddonFile,"uninstall",installReason,{newVersion:newDBAddon.version});XPIProvider.unloadBootstrapScope(newDBAddon.id);
 if(newDBAddon.bootstrap)
flushStartupCache();}
if(!newDBAddon.bootstrap)
return true; let file=Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);file.persistentDescriptor=aAddonState.descriptor;XPIProvider.callBootstrapMethod(newDBAddon,file,"install",installReason,extraParams);if(!newDBAddon.active)
XPIProvider.unloadBootstrapScope(newDBAddon.id);}
return false;}
let changed=false;let knownLocations=XPIDatabase.getInstallLocations();

for(let aSt of aState.reverse()){
let installLocation=this.installLocationsByName[aSt.name];let addonStates=aSt.addons;if(knownLocations.has(installLocation.name)){knownLocations.delete(installLocation.name);let addons=XPIDatabase.getAddonsInLocation(installLocation.name);
 for(let aOldAddon of addons){
 if(AddonManager.getStartupChanges(AddonManager.STARTUP_CHANGE_INSTALLED).indexOf(aOldAddon.id)!=-1){AddonManagerPrivate.addStartupChange(AddonManager.STARTUP_CHANGE_CHANGED,aOldAddon.id);} 
if(aOldAddon.id in addonStates){let addonState=addonStates[aOldAddon.id];delete addonStates[aOldAddon.id];recordAddonTelemetry(aOldAddon); if(aOldAddon.updateDate!=addonState.mtime){if(addonState.mtime<aOldAddon.updateDate){this.setTelemetry(aOldAddon.id,"olderFile",{name:this._mostRecentlyModifiedFile[aOldAddon.id],mtime:addonState.mtime,oldtime:aOldAddon.updateDate});}
else if(addonState.rdfTime){if(addonState.rdfTime>aOldAddon.updateDate){this.setTelemetry(aOldAddon.id,"modifiedInstallRDF",1);}
else{this.setTelemetry(aOldAddon.id,"modifiedFile",this._mostRecentlyModifiedFile[aOldAddon.id]);}}
else{this.setTelemetry(aOldAddon.id,"modifiedXPI",1);}}


 
if(aOldAddon.id in aManifests[installLocation.name]||aOldAddon.updateDate!=addonState.mtime||(aUpdateCompatibility&&installLocation.name==KEY_APP_GLOBAL)){changed=updateMetadata(installLocation,aOldAddon,addonState)||changed;}
else if(aOldAddon.descriptor!=addonState.descriptor){changed=updateDescriptor(installLocation,aOldAddon,addonState)||changed;}
else{changed=updateVisibilityAndCompatibility(installLocation,aOldAddon,addonState)||changed;}
if(aOldAddon.visible&&aOldAddon._installLocation.name!=KEY_APP_GLOBAL)
XPIProvider.allAppGlobal=false;}
else{changed=removeMetadata(aOldAddon)||changed;}}}
let locMigrateData={};if(XPIDatabase.migrateData&&installLocation.name in XPIDatabase.migrateData)
locMigrateData=XPIDatabase.migrateData[installLocation.name];for(let id in addonStates){changed=addMetadata(installLocation,id,addonStates[id],(locMigrateData[id]||null))||changed;}}


for(let location of knownLocations){let addons=XPIDatabase.getAddonsInLocation(location);for(let aOldAddon of addons){changed=removeMetadata(aOldAddon)||changed;}} 
this.installStates=this.getInstallLocationStates();let cache=JSON.stringify(this.installStates);Services.prefs.setCharPref(PREF_INSTALL_CACHE,cache);this.persistBootstrappedAddons();XPIDatabase.migrateData=null;return changed;},importPermissions:function XPI_importPermissions(){PermissionsUtils.importFromPrefs(PREF_XPI_PERMISSIONS_BRANCH,XPI_PERMISSION);},checkForChanges:function XPI_checkForChanges(aAppChanged,aOldAppVersion,aOldPlatformVersion){logger.debug("checkForChanges");
let updateReasons=[];if(aAppChanged){updateReasons.push("appChanged");}
 
try{this.bootstrappedAddons=JSON.parse(Prefs.getCharPref(PREF_BOOTSTRAP_ADDONS,"{}"));}catch(e){logger.warn("Error parsing enabled bootstrapped extensions cache",e);}

 
let manifests={};let updated=this.processPendingFileChanges(manifests);if(updated){updateReasons.push("pendingFileChanges");}


let hasPendingChanges=Prefs.getBoolPref(PREF_PENDING_OPERATIONS);if(hasPendingChanges){updateReasons.push("hasPendingChanges");} 
if(aAppChanged!==false&&Prefs.getBoolPref(PREF_INSTALL_DISTRO_ADDONS,true))
{updated=this.installDistributionAddons(manifests);if(updated){updateReasons.push("installDistributionAddons");}} 
let telemetryCaptureTime=Date.now();this.installStates=this.getInstallLocationStates();let telemetry=Services.telemetry;telemetry.getHistogramById("CHECK_ADDONS_MODIFIED_MS").add(Date.now()-telemetryCaptureTime); let cache=Prefs.getCharPref(PREF_INSTALL_CACHE,"[]");
 let newState=JSON.stringify(this.installStates);if(cache!=newState){logger.debug("Directory state JSON differs: cache "+cache+" state "+newState);if(directoryStateDiffers(this.installStates,cache)){updateReasons.push("directoryState");}
else{AddonManagerPrivate.recordSimpleMeasure("XPIDB_startup_state_badCompare",1);}} 
if(DB_SCHEMA!=Prefs.getIntPref(PREF_DB_SCHEMA,0)){
 if(this.installStates.length==0){logger.debug("Empty XPI database, setting schema version preference to "+DB_SCHEMA);Services.prefs.setIntPref(PREF_DB_SCHEMA,DB_SCHEMA);}
else{updateReasons.push("schemaChanged");}}


let dbFile=FileUtils.getFile(KEY_PROFILEDIR,[FILE_DATABASE],true);if(!dbFile.exists()&&this.installStates.length>0){updateReasons.push("needNewDatabase");}
if(updateReasons.length==0){let bootstrapDescriptors=[this.bootstrappedAddons[b].descriptor
for(b in this.bootstrappedAddons)];this.installStates.forEach(function(aInstallLocationState){for(let id in aInstallLocationState.addons){let pos=bootstrapDescriptors.indexOf(aInstallLocationState.addons[id].descriptor);if(pos!=-1)
bootstrapDescriptors.splice(pos,1);}});if(bootstrapDescriptors.length>0){logger.warn("Bootstrap state is invalid (missing add-ons: "+bootstrapDescriptors.toSource()+")");updateReasons.push("missingBootstrapAddon");}} 
try{let extensionListChanged=false;
 if(updateReasons.length>0){AddonManagerPrivate.recordSimpleMeasure("XPIDB_startup_load_reasons",updateReasons);XPIDatabase.syncLoadDB(false);try{extensionListChanged=this.processFileChanges(this.installStates,manifests,aAppChanged,aOldAppVersion,aOldPlatformVersion);}
catch(e){logger.error("Failed to process extension changes at startup",e);}}
if(aAppChanged){
 if(this.currentSkin!=this.defaultSkin){let oldSkin=XPIDatabase.getVisibleAddonForInternalName(this.currentSkin);if(!oldSkin||isAddonDisabled(oldSkin))
this.enableDefaultTheme();}
 
try{let oldCache=FileUtils.getFile(KEY_PROFILEDIR,[FILE_OLD_CACHE],true);if(oldCache.exists())
oldCache.remove(true);}
catch(e){logger.warn("Unable to remove old extension cache "+oldCache.path,e);}}

if(extensionListChanged||hasPendingChanges){logger.debug("Updating database with changes to installed add-ons");XPIDatabase.updateActiveAddons();Services.prefs.setBoolPref(PREF_PENDING_OPERATIONS,!XPIDatabase.writeAddonsList());Services.prefs.setCharPref(PREF_BOOTSTRAP_ADDONS,JSON.stringify(this.bootstrappedAddons));return true;}
logger.debug("No changes found");}
catch(e){logger.error("Error during startup file checks",e);} 
let addonsList=FileUtils.getFile(KEY_PROFILEDIR,[FILE_XPI_ADDONS_LIST],true);if(addonsList.exists()==(this.installStates.length==0)){logger.debug("Add-ons list is invalid, rebuilding");XPIDatabase.writeAddonsList();}
return false;},supportsMimetype:function XPI_supportsMimetype(aMimetype){return aMimetype=="application/x-xpinstall";},isInstallEnabled:function XPI_isInstallEnabled(){ return Prefs.getBoolPref(PREF_XPI_ENABLED,true);},isDirectRequestWhitelisted:function XPI_isDirectRequestWhitelisted(){return Prefs.getBoolPref(PREF_XPI_DIRECT_WHITELISTED,true);},isFileRequestWhitelisted:function XPI_isFileRequestWhitelisted(){return Prefs.getBoolPref(PREF_XPI_FILE_WHITELISTED,true);},isInstallAllowed:function XPI_isInstallAllowed(aUri){if(!this.isInstallEnabled())
return false;if(!aUri)
return this.isDirectRequestWhitelisted();if(this.isFileRequestWhitelisted()&&(aUri.schemeIs("chrome")||aUri.schemeIs("file")))
return true;this.importPermissions();let permission=Services.perms.testPermission(aUri,XPI_PERMISSION);if(permission==Ci.nsIPermissionManager.DENY_ACTION)
return false;let requireWhitelist=Prefs.getBoolPref(PREF_XPI_WHITELIST_REQUIRED,true);if(requireWhitelist&&(permission!=Ci.nsIPermissionManager.ALLOW_ACTION))
return false;return true;},getInstallForURL:function XPI_getInstallForURL(aUrl,aHash,aName,aIcons,aVersion,aLoadGroup,aCallback){AddonInstall.createDownload(function getInstallForURL_createDownload(aInstall){aCallback(aInstall.wrapper);},aUrl,aHash,aName,aIcons,aVersion,aLoadGroup);},getInstallForFile:function XPI_getInstallForFile(aFile,aCallback){AddonInstall.createInstall(function getInstallForFile_createInstall(aInstall){if(aInstall)
aCallback(aInstall.wrapper);else
aCallback(null);},aFile);},removeActiveInstall:function XPI_removeActiveInstall(aInstall){let where=this.installs.indexOf(aInstall);if(where==-1){logger.warn("removeActiveInstall: could not find active install for "
+aInstall.sourceURI.spec);return;}
this.installs.splice(where,1);},getAddonByID:function XPI_getAddonByID(aId,aCallback){XPIDatabase.getVisibleAddonForID(aId,function getAddonByID_getVisibleAddonForID(aAddon){aCallback(createWrapper(aAddon));});},getAddonsByTypes:function XPI_getAddonsByTypes(aTypes,aCallback){XPIDatabase.getVisibleAddons(aTypes,function getAddonsByTypes_getVisibleAddons(aAddons){aCallback([createWrapper(a)for each(a in aAddons)]);});},getAddonBySyncGUID:function XPI_getAddonBySyncGUID(aGUID,aCallback){XPIDatabase.getAddonBySyncGUID(aGUID,function getAddonBySyncGUID_getAddonBySyncGUID(aAddon){aCallback(createWrapper(aAddon));});},getAddonsWithOperationsByTypes:function XPI_getAddonsWithOperationsByTypes(aTypes,aCallback){XPIDatabase.getVisibleAddonsWithPendingOperations(aTypes,function getAddonsWithOpsByTypes_getVisibleAddonsWithPendingOps(aAddons){let results=[createWrapper(a)for each(a in aAddons)];XPIProvider.installs.forEach(function(aInstall){if(aInstall.state==AddonManager.STATE_INSTALLED&&!(aInstall.addon.inDatabase))
results.push(createWrapper(aInstall.addon));});aCallback(results);});},getInstallsByTypes:function XPI_getInstallsByTypes(aTypes,aCallback){let results=[];this.installs.forEach(function(aInstall){if(!aTypes||aTypes.indexOf(aInstall.type)>=0)
results.push(aInstall.wrapper);});aCallback(results);},mapURIToAddonID:function XPI_mapURIToAddonID(aURI){let resolved=this._resolveURIToFile(aURI);if(!resolved||!(resolved instanceof Ci.nsIFileURL))
return null;for(let[id,path]of this._addonFileMap){if(resolved.file.path.startsWith(path))
return id;}
return null;},addonChanged:function XPI_addonChanged(aId,aType,aPendingRestart){ if(aType!="theme")
return;if(!aId){ this.enableDefaultTheme();return;}
 
let previousTheme=null;let newSkin=this.defaultSkin;let addons=XPIDatabase.getAddonsByType("theme");addons.forEach(function(aTheme){if(!aTheme.visible)
return;if(aTheme.id==aId)
newSkin=aTheme.internalName;else if(aTheme.userDisabled==false&&!aTheme.pendingUninstall)
previousTheme=aTheme;},this);if(aPendingRestart){Services.prefs.setBoolPref(PREF_DSS_SWITCHPENDING,true);Services.prefs.setCharPref(PREF_DSS_SKIN_TO_SELECT,newSkin);}
else if(newSkin==this.currentSkin){try{Services.prefs.clearUserPref(PREF_DSS_SWITCHPENDING);}
catch(e){}
try{Services.prefs.clearUserPref(PREF_DSS_SKIN_TO_SELECT);}
catch(e){}}
else{Services.prefs.setCharPref(PREF_GENERAL_SKINS_SELECTEDSKIN,newSkin);this.currentSkin=newSkin;}
this.selectedSkin=newSkin;
 Services.prefs.savePrefFile(null);
if(previousTheme)
this.updateAddonDisabledState(previousTheme,true);},updateAddonAppDisabledStates:function XPI_updateAddonAppDisabledStates(){let addons=XPIDatabase.getAddons();addons.forEach(function(aAddon){this.updateAddonDisabledState(aAddon);},this);},updateAddonRepositoryData:function XPI_updateAddonRepositoryData(aCallback){let self=this;XPIDatabase.getVisibleAddons(null,function UARD_getVisibleAddonsCallback(aAddons){let pending=aAddons.length;logger.debug("updateAddonRepositoryData found "+pending+" visible add-ons");if(pending==0){aCallback();return;}
function notifyComplete(){if(--pending==0)
aCallback();}
for(let addon of aAddons){AddonRepository.getCachedAddonByID(addon.id,function UARD_getCachedAddonCallback(aRepoAddon){if(aRepoAddon){logger.debug("updateAddonRepositoryData got info for "+addon.id);addon._repositoryAddon=aRepoAddon;addon.compatibilityOverrides=aRepoAddon.compatibilityOverrides;self.updateAddonDisabledState(addon);}
notifyComplete();});};});},enableDefaultTheme:function XPI_enableDefaultTheme(){logger.debug("Activating default theme");let addon=XPIDatabase.getVisibleAddonForInternalName(this.defaultSkin);if(addon){if(addon.userDisabled){this.updateAddonDisabledState(addon,false);}
else if(!this.extensionsActive){

 Services.prefs.setCharPref(PREF_GENERAL_SKINS_SELECTEDSKIN,addon.internalName);this.currentSkin=this.selectedSkin=addon.internalName;Prefs.clearUserPref(PREF_DSS_SKIN_TO_SELECT);Prefs.clearUserPref(PREF_DSS_SWITCHPENDING);}
else{logger.warn("Attempting to activate an already active default theme");}}
else{logger.warn("Unable to activate the default theme");}},onDebugConnectionChange:function(aEvent,aWhat,aConnection){if(aWhat!="opened")
return;for(let id of Object.keys(this.bootstrapScopes)){aConnection.setAddonOptions(id,{global:this.bootstrapScopes[id]});}},observe:function XPI_observe(aSubject,aTopic,aData){if(aTopic==NOTIFICATION_FLUSH_PERMISSIONS){if(!aData||aData==XPI_PERMISSION){this.importPermissions();}
return;}
else if(aTopic==NOTIFICATION_TOOLBOXPROCESS_LOADED){Services.obs.removeObserver(this,NOTIFICATION_TOOLBOXPROCESS_LOADED,false);this._toolboxProcessLoaded=true;BrowserToolboxProcess.on("connectionchange",this.onDebugConnectionChange.bind(this));}
if(aTopic=="nsPref:changed"){switch(aData){case PREF_EM_MIN_COMPAT_APP_VERSION:case PREF_EM_MIN_COMPAT_PLATFORM_VERSION:this.minCompatibleAppVersion=Prefs.getCharPref(PREF_EM_MIN_COMPAT_APP_VERSION,null);this.minCompatiblePlatformVersion=Prefs.getCharPref(PREF_EM_MIN_COMPAT_PLATFORM_VERSION,null);this.updateAddonAppDisabledStates();break;}}},enableRequiresRestart:function XPI_enableRequiresRestart(aAddon){
if(!this.extensionsActive)
return false;
 if(Services.appinfo.inSafeMode)
return false; if(aAddon.active)
return false;if(aAddon.type=="theme"){
 if(Prefs.getBoolPref(PREF_EM_DSS_ENABLED))
return false;
return aAddon.internalName!=this.currentSkin;}
return!aAddon.bootstrap;},disableRequiresRestart:function XPI_disableRequiresRestart(aAddon){
if(!this.extensionsActive)
return false;
 if(Services.appinfo.inSafeMode)
return false; if(!aAddon.active)
return false;if(aAddon.type=="theme"){
 if(Prefs.getBoolPref(PREF_EM_DSS_ENABLED))
return false;

if(aAddon.internalName!=this.defaultSkin)
return true;




return this.selectedSkin!=this.currentSkin;}
return!aAddon.bootstrap;},installRequiresRestart:function XPI_installRequiresRestart(aAddon){
if(!this.extensionsActive)
return false;
 if(Services.appinfo.inSafeMode)
return false;

if(aAddon.inDatabase)
return false;
 if("_install"in aAddon&&aAddon._install){

 let existingAddon=aAddon._install.existingAddon;if(existingAddon&&this.uninstallRequiresRestart(existingAddon))
return true;}

if(isAddonDisabled(aAddon))
return false;

 return aAddon.type=="theme"||!aAddon.bootstrap;},uninstallRequiresRestart:function XPI_uninstallRequiresRestart(aAddon){
if(!this.extensionsActive)
return false;
 if(Services.appinfo.inSafeMode)
return false;
 return this.disableRequiresRestart(aAddon);},loadBootstrapScope:function XPI_loadBootstrapScope(aId,aFile,aVersion,aType,aMultiprocessCompatible){ this.bootstrappedAddons[aId]={version:aVersion,type:aType,descriptor:aFile.persistentDescriptor,multiprocessCompatible:aMultiprocessCompatible};this.persistBootstrappedAddons();this.addAddonsToCrashReporter(); if(aType=="locale"){this.bootstrapScopes[aId]=null;return;}
logger.debug("Loading bootstrap scope from "+aFile.path);let principal=Cc["@mozilla.org/systemprincipal;1"].createInstance(Ci.nsIPrincipal);if(!aMultiprocessCompatible&&Prefs.getBoolPref("browser.tabs.remote.autostart",false)){let interposition=Cc["@mozilla.org/addons/multiprocess-shims;1"].getService(Ci.nsIAddonInterposition);Cu.setAddonInterposition(aId,interposition);}
if(!aFile.exists()){this.bootstrapScopes[aId]=new Cu.Sandbox(principal,{sandboxName:aFile.path,wantGlobalProperties:["indexedDB"],addonId:aId,metadata:{addonID:aId}});logger.error("Attempted to load bootstrap scope from missing directory "+aFile.path);return;}
let uri=getURIForResourceInFile(aFile,"bootstrap.js").spec;if(aType=="dictionary")
uri="resource://gre/modules/addons/SpellCheckDictionaryBootstrap.js"
this.bootstrapScopes[aId]=new Cu.Sandbox(principal,{sandboxName:uri,wantGlobalProperties:["indexedDB"],addonId:aId,metadata:{addonID:aId,URI:uri}});let loader=Cc["@mozilla.org/moz/jssubscript-loader;1"].createInstance(Ci.mozIJSSubScriptLoader);try{for(let name in BOOTSTRAP_REASONS)
this.bootstrapScopes[aId][name]=BOOTSTRAP_REASONS[name];const features=["Worker","ChromeWorker"];for(let feature of features)
this.bootstrapScopes[aId][feature]=gGlobalScope[feature]; this.bootstrapScopes[aId]["console"]=new ConsoleAPI({consoleID:"addon/"+aId});

this.bootstrapScopes[aId].__SCRIPT_URI_SPEC__=uri;Components.utils.evalInSandbox("Components.classes['@mozilla.org/moz/jssubscript-loader;1'] \
                   .createInstance(Components.interfaces.mozIJSSubScriptLoader) \
                   .loadSubScript(__SCRIPT_URI_SPEC__);",this.bootstrapScopes[aId],"ECMAv5");}
catch(e){logger.warn("Error loading bootstrap.js for "+aId,e);}
 
if(this._toolboxProcessLoaded){BrowserToolboxProcess.setAddonOptions(aId,{global:this.bootstrapScopes[aId]});}},unloadBootstrapScope:function XPI_unloadBootstrapScope(aId){
Cu.setAddonInterposition(aId,null);delete this.bootstrapScopes[aId];delete this.bootstrappedAddons[aId];this.persistBootstrappedAddons();this.addAddonsToCrashReporter();
 if(this._toolboxProcessLoaded){BrowserToolboxProcess.setAddonOptions(aId,{global:null});}},callBootstrapMethod:function XPI_callBootstrapMethod(aAddon,aFile,aMethod,aReason,aExtraParams){ if(Services.appinfo.inSafeMode)
return;if(!aAddon.id||!aAddon.version||!aAddon.type){logger.error(new Error("aAddon must include an id, version, and type"));return;}
let timeStart=new Date();if(aMethod=="startup"){logger.debug("Registering manifest for "+aFile.path);Components.manager.addBootstrappedManifestLocation(aFile);}
try{ if(!(aAddon.id in this.bootstrapScopes))
this.loadBootstrapScope(aAddon.id,aFile,aAddon.version,aAddon.type,aAddon.multiprocessCompatible); if(aAddon.type=="locale")
return;if(!(aMethod in this.bootstrapScopes[aAddon.id])){logger.warn("Add-on "+aAddon.id+" is missing bootstrap method "+aMethod);return;}
let params={id:aAddon.id,version:aAddon.version,installPath:aFile.clone(),resourceURI:getURIForResourceInFile(aFile,"")};if(aExtraParams){for(let key in aExtraParams){params[key]=aExtraParams[key];}}
logger.debug("Calling bootstrap method "+aMethod+" on "+aAddon.id+" version "+
aAddon.version);try{this.bootstrapScopes[aAddon.id][aMethod](params,aReason);}
catch(e){logger.warn("Exception running bootstrap method "+aMethod+" on "+aAddon.id,e);}}
finally{if(aMethod=="shutdown"&&aReason!=BOOTSTRAP_REASONS.APP_SHUTDOWN){logger.debug("Removing manifest for "+aFile.path);Components.manager.removeBootstrappedManifestLocation(aFile);}
this.setTelemetry(aAddon.id,aMethod+"_MS",new Date()-timeStart);}},updateAddonDisabledState:function XPI_updateAddonDisabledState(aAddon,aUserDisabled,aSoftDisabled){if(!(aAddon.inDatabase))
throw new Error("Can only update addon states for installed addons.");if(aUserDisabled!==undefined&&aSoftDisabled!==undefined){throw new Error("Cannot change userDisabled and softDisabled at the "+"same time");}
if(aUserDisabled===undefined){aUserDisabled=aAddon.userDisabled;}
else if(!aUserDisabled){ aSoftDisabled=false;}
 
if(aSoftDisabled===undefined||aUserDisabled)
aSoftDisabled=aAddon.softDisabled;let appDisabled=!isUsableAddon(aAddon); if(aAddon.userDisabled==aUserDisabled&&aAddon.appDisabled==appDisabled&&aAddon.softDisabled==aSoftDisabled)
return;let wasDisabled=isAddonDisabled(aAddon);let isDisabled=aUserDisabled||aSoftDisabled||appDisabled;let appDisabledChanged=aAddon.appDisabled!=appDisabled;
if(aAddon.type!="experiment"){XPIDatabase.setAddonProperties(aAddon,{userDisabled:aUserDisabled,appDisabled:appDisabled,softDisabled:aSoftDisabled});}
if(appDisabledChanged){AddonManagerPrivate.callAddonListeners("onPropertyChanged",aAddon,["appDisabled"]);}
 
if(!aAddon.visible||(wasDisabled==isDisabled))
return; Services.prefs.setBoolPref(PREF_PENDING_OPERATIONS,true);let wrapper=createWrapper(aAddon);if(isDisabled!=aAddon.active){AddonManagerPrivate.callAddonListeners("onOperationCancelled",wrapper);}
else{if(isDisabled){var needsRestart=this.disableRequiresRestart(aAddon);AddonManagerPrivate.callAddonListeners("onDisabling",wrapper,needsRestart);}
else{needsRestart=this.enableRequiresRestart(aAddon);AddonManagerPrivate.callAddonListeners("onEnabling",wrapper,needsRestart);}
if(!needsRestart){XPIDatabase.updateAddonActive(aAddon,!isDisabled);if(isDisabled){if(aAddon.bootstrap){let file=aAddon._installLocation.getLocationForID(aAddon.id);this.callBootstrapMethod(aAddon,file,"shutdown",BOOTSTRAP_REASONS.ADDON_DISABLE);this.unloadBootstrapScope(aAddon.id);}
AddonManagerPrivate.callAddonListeners("onDisabled",wrapper);}
else{if(aAddon.bootstrap){let file=aAddon._installLocation.getLocationForID(aAddon.id);this.callBootstrapMethod(aAddon,file,"startup",BOOTSTRAP_REASONS.ADDON_ENABLE);}
AddonManagerPrivate.callAddonListeners("onEnabled",wrapper);}}} 
if(aAddon.type=="theme"&&!isDisabled)
AddonManagerPrivate.notifyAddonChanged(aAddon.id,aAddon.type,needsRestart);},uninstallAddon:function XPI_uninstallAddon(aAddon){if(!(aAddon.inDatabase))
throw new Error("Cannot uninstall addon "+aAddon.id+" because it is not installed");if(aAddon._installLocation.locked)
throw new Error("Cannot uninstall addon "+aAddon.id
+" from locked install location "+aAddon._installLocation.name);if("_hasResourceCache"in aAddon)
aAddon._hasResourceCache=new Map();if(aAddon._updateCheck){logger.debug("Cancel in-progress update check for "+aAddon.id);aAddon._updateCheck.cancel();} 
let requiresRestart=this.uninstallRequiresRestart(aAddon);if(requiresRestart){
let stage=aAddon._installLocation.getStagingDir();stage.append(aAddon.id);if(!stage.exists())
stage.create(Ci.nsIFile.DIRECTORY_TYPE,FileUtils.PERMS_DIRECTORY);XPIDatabase.setAddonProperties(aAddon,{pendingUninstall:true});Services.prefs.setBoolPref(PREF_PENDING_OPERATIONS,true);}
if(!aAddon.visible)
return;let wrapper=createWrapper(aAddon);AddonManagerPrivate.callAddonListeners("onUninstalling",wrapper,requiresRestart); function revealAddon(aAddon){XPIDatabase.makeAddonVisible(aAddon);let wrappedAddon=createWrapper(aAddon);AddonManagerPrivate.callAddonListeners("onInstalling",wrappedAddon,false);if(!isAddonDisabled(aAddon)&&!XPIProvider.enableRequiresRestart(aAddon)){XPIDatabase.updateAddonActive(aAddon,true);}
if(aAddon.bootstrap){let file=aAddon._installLocation.getLocationForID(aAddon.id);XPIProvider.callBootstrapMethod(aAddon,file,"install",BOOTSTRAP_REASONS.ADDON_INSTALL);if(aAddon.active){XPIProvider.callBootstrapMethod(aAddon,file,"startup",BOOTSTRAP_REASONS.ADDON_INSTALL);}
else{XPIProvider.unloadBootstrapScope(aAddon.id);}}
 
AddonManagerPrivate.callAddonListeners("onInstalled",wrappedAddon);}
function checkInstallLocation(aPos){if(aPos<0)
return;let location=XPIProvider.installLocations[aPos];XPIDatabase.getAddonInLocation(aAddon.id,location.name,function checkInstallLocation_getAddonInLocation(aNewAddon){if(aNewAddon)
revealAddon(aNewAddon);else
checkInstallLocation(aPos-1);})}
if(!requiresRestart){if(aAddon.bootstrap){let file=aAddon._installLocation.getLocationForID(aAddon.id);if(aAddon.active){this.callBootstrapMethod(aAddon,file,"shutdown",BOOTSTRAP_REASONS.ADDON_UNINSTALL);}
this.callBootstrapMethod(aAddon,file,"uninstall",BOOTSTRAP_REASONS.ADDON_UNINSTALL);this.unloadBootstrapScope(aAddon.id);flushStartupCache();}
aAddon._installLocation.uninstallAddon(aAddon.id);XPIDatabase.removeAddonMetadata(aAddon);AddonManagerPrivate.callAddonListeners("onUninstalled",wrapper);checkInstallLocation(this.installLocations.length-1);} 
if(aAddon.type=="theme"&&aAddon.active)
AddonManagerPrivate.notifyAddonChanged(null,aAddon.type,requiresRestart);},cancelUninstallAddon:function XPI_cancelUninstallAddon(aAddon){if(!(aAddon.inDatabase))
throw new Error("Can only cancel uninstall for installed addons.");aAddon._installLocation.cleanStagingDir([aAddon.id]);XPIDatabase.setAddonProperties(aAddon,{pendingUninstall:false});if(!aAddon.visible)
return;Services.prefs.setBoolPref(PREF_PENDING_OPERATIONS,true);let wrapper=createWrapper(aAddon);AddonManagerPrivate.callAddonListeners("onOperationCancelled",wrapper);if(aAddon.type=="theme"&&aAddon.active)
AddonManagerPrivate.notifyAddonChanged(aAddon.id,aAddon.type,false);}};function getHashStringForCrypto(aCrypto){ function toHexString(charCode)
("0"+charCode.toString(16)).slice(-2);let binary=aCrypto.finish(false);return[toHexString(binary.charCodeAt(i))for(i in binary)].join("").toLowerCase()}
function AddonInstall(aInstallLocation,aUrl,aHash,aReleaseNotesURI,aExistingAddon,aLoadGroup){this.wrapper=new AddonInstallWrapper(this);this.installLocation=aInstallLocation;this.sourceURI=aUrl;this.releaseNotesURI=aReleaseNotesURI;if(aHash){let hashSplit=aHash.toLowerCase().split(":");this.originalHash={algorithm:hashSplit[0],data:hashSplit[1]};}
this.hash=this.originalHash;this.loadGroup=aLoadGroup;this.listeners=[];this.icons={};this.existingAddon=aExistingAddon;this.error=0;if(aLoadGroup)
this.window=aLoadGroup.notificationCallbacks.getInterface(Ci.nsIDOMWindow);else
this.window=null;this.logger=logger;}
AddonInstall.prototype={installLocation:null,wrapper:null,stream:null,crypto:null,originalHash:null,hash:null,loadGroup:null,badCertHandler:null,listeners:null,restartDownload:false,name:null,type:null,version:null,icons:null,releaseNotesURI:null,sourceURI:null,file:null,ownsTempFile:false,certificate:null,certName:null,linkedInstalls:null,existingAddon:null,addon:null,state:null,error:null,progress:null,maxProgress:null,initStagedInstall:function AI_initStagedInstall(aManifest){this.name=aManifest.name;this.type=aManifest.type;this.version=aManifest.version;this.icons=aManifest.icons;this.releaseNotesURI=aManifest.releaseNotesURI?NetUtil.newURI(aManifest.releaseNotesURI):null
this.sourceURI=aManifest.sourceURI?NetUtil.newURI(aManifest.sourceURI):null;this.file=null;this.addon=aManifest;this.state=AddonManager.STATE_INSTALLED;XPIProvider.installs.push(this);},initLocalInstall:function AI_initLocalInstall(aCallback){aCallback=makeSafe(aCallback);this.file=this.sourceURI.QueryInterface(Ci.nsIFileURL).file;if(!this.file.exists()){logger.warn("XPI file "+this.file.path+" does not exist");this.state=AddonManager.STATE_DOWNLOAD_FAILED;this.error=AddonManager.ERROR_NETWORK_FAILURE;aCallback(this);return;}
this.state=AddonManager.STATE_DOWNLOADED;this.progress=this.file.fileSize;this.maxProgress=this.file.fileSize;if(this.hash){let crypto=Cc["@mozilla.org/security/hash;1"].createInstance(Ci.nsICryptoHash);try{crypto.initWithString(this.hash.algorithm);}
catch(e){logger.warn("Unknown hash algorithm '"+this.hash.algorithm+"' for addon "+this.sourceURI.spec,e);this.state=AddonManager.STATE_DOWNLOAD_FAILED;this.error=AddonManager.ERROR_INCORRECT_HASH;aCallback(this);return;}
let fis=Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);fis.init(this.file,-1,-1,false);crypto.updateFromStream(fis,this.file.fileSize);let calculatedHash=getHashStringForCrypto(crypto);if(calculatedHash!=this.hash.data){logger.warn("File hash ("+calculatedHash+") did not match provided hash ("+
this.hash.data+")");this.state=AddonManager.STATE_DOWNLOAD_FAILED;this.error=AddonManager.ERROR_INCORRECT_HASH;aCallback(this);return;}}
try{let self=this;this.loadManifest(function initLocalInstall_loadManifest(){XPIDatabase.getVisibleAddonForID(self.addon.id,function initLocalInstall_getVisibleAddon(aAddon){self.existingAddon=aAddon;if(aAddon)
applyBlocklistChanges(aAddon,self.addon);self.addon.updateDate=Date.now();self.addon.installDate=aAddon?aAddon.installDate:self.addon.updateDate;if(!self.addon.isCompatible){self.state=AddonManager.STATE_CHECKING;new UpdateChecker(self.addon,{onUpdateFinished:function updateChecker_onUpdateFinished(aAddon){self.state=AddonManager.STATE_DOWNLOADED;XPIProvider.installs.push(self);AddonManagerPrivate.callInstallListeners("onNewInstall",self.listeners,self.wrapper);aCallback(self);}},AddonManager.UPDATE_WHEN_ADDON_INSTALLED);}
else{XPIProvider.installs.push(self);AddonManagerPrivate.callInstallListeners("onNewInstall",self.listeners,self.wrapper);aCallback(self);}});});}
catch(e){logger.warn("Invalid XPI",e);this.state=AddonManager.STATE_DOWNLOAD_FAILED;this.error=AddonManager.ERROR_CORRUPT_FILE;aCallback(this);return;}},initAvailableDownload:function AI_initAvailableDownload(aName,aType,aIcons,aVersion,aCallback){this.state=AddonManager.STATE_AVAILABLE;this.name=aName;this.type=aType;this.version=aVersion;this.icons=aIcons;this.progress=0;this.maxProgress=-1;XPIProvider.installs.push(this);AddonManagerPrivate.callInstallListeners("onNewInstall",this.listeners,this.wrapper);makeSafe(aCallback)(this);},install:function AI_install(){switch(this.state){case AddonManager.STATE_AVAILABLE:this.startDownload();break;case AddonManager.STATE_DOWNLOADED:this.startInstall();break;case AddonManager.STATE_DOWNLOAD_FAILED:case AddonManager.STATE_INSTALL_FAILED:case AddonManager.STATE_CANCELLED:this.removeTemporaryFile();this.state=AddonManager.STATE_AVAILABLE;this.error=0;this.progress=0;this.maxProgress=-1;this.hash=this.originalHash;XPIProvider.installs.push(this);this.startDownload();break;case AddonManager.STATE_DOWNLOADING:case AddonManager.STATE_CHECKING:case AddonManager.STATE_INSTALLING: return;default:throw new Error("Cannot start installing from this state");}},cancel:function AI_cancel(){switch(this.state){case AddonManager.STATE_DOWNLOADING:if(this.channel)
this.channel.cancel(Cr.NS_BINDING_ABORTED);case AddonManager.STATE_AVAILABLE:case AddonManager.STATE_DOWNLOADED:logger.debug("Cancelling download of "+this.sourceURI.spec);this.state=AddonManager.STATE_CANCELLED;XPIProvider.removeActiveInstall(this);AddonManagerPrivate.callInstallListeners("onDownloadCancelled",this.listeners,this.wrapper);this.removeTemporaryFile();break;case AddonManager.STATE_INSTALLED:logger.debug("Cancelling install of "+this.addon.id);let xpi=this.installLocation.getStagingDir();xpi.append(this.addon.id+".xpi");flushJarCache(xpi);this.installLocation.cleanStagingDir([this.addon.id,this.addon.id+".xpi",this.addon.id+".json"]);this.state=AddonManager.STATE_CANCELLED;XPIProvider.removeActiveInstall(this);if(this.existingAddon){delete this.existingAddon.pendingUpgrade;this.existingAddon.pendingUpgrade=null;}
AddonManagerPrivate.callAddonListeners("onOperationCancelled",createWrapper(this.addon));AddonManagerPrivate.callInstallListeners("onInstallCancelled",this.listeners,this.wrapper);break;default:throw new Error("Cannot cancel install of "+this.sourceURI.spec+" from this state ("+this.state+")");}},addListener:function AI_addListener(aListener){if(!this.listeners.some(function addListener_matchListener(i){return i==aListener;}))
this.listeners.push(aListener);},removeListener:function AI_removeListener(aListener){this.listeners=this.listeners.filter(function removeListener_filterListener(i){return i!=aListener;});},removeTemporaryFile:function AI_removeTemporaryFile(){ if(!this.ownsTempFile){this.logger.debug("removeTemporaryFile: "+this.sourceURI.spec+" does not own temp file");return;}
try{this.logger.debug("removeTemporaryFile: "+this.sourceURI.spec+" removing temp file "+
this.file.path);this.file.remove(true);this.ownsTempFile=false;}
catch(e){this.logger.warn("Failed to remove temporary file "+this.file.path+" for addon "+
this.sourceURI.spec,e);}},updateAddonURIs:function AI_updateAddonURIs(){this.addon.sourceURI=this.sourceURI.spec;if(this.releaseNotesURI)
this.addon.releaseNotesURI=this.releaseNotesURI.spec;},_loadMultipackageManifests:function AI_loadMultipackageManifests(aZipReader,aCallback){let files=[];let entries=aZipReader.findEntries("(*.[Xx][Pp][Ii]|*.[Jj][Aa][Rr])");while(entries.hasMore()){let entryName=entries.getNext();var target=getTemporaryFile();try{aZipReader.extract(entryName,target);files.push(target);}
catch(e){logger.warn("Failed to extract "+entryName+" from multi-package "+"XPI",e);target.remove(false);}}
aZipReader.close();if(files.length==0){throw new Error("Multi-package XPI does not contain any packages "+"to install");}
let addon=null;
while(files.length>0){this.removeTemporaryFile();this.file=files.shift();this.ownsTempFile=true;try{addon=loadManifestFromZipFile(this.file);break;}
catch(e){logger.warn(this.file.leafName+" cannot be installed from multi-package "+"XPI",e);}}
if(!addon){ aCallback();return;}
this.addon=addon;this.updateAddonURIs();this.addon._install=this;this.name=this.addon.selectedLocale.name;this.type=this.addon.type;this.version=this.addon.version;
 
if(files.length>0){this.linkedInstalls=[];let count=0;let self=this;files.forEach(function(file){AddonInstall.createInstall(function loadMultipackageManifests_createInstall(aInstall){if(aInstall.state==AddonManager.STATE_DOWNLOAD_FAILED){ file.remove(true);}
else{ aInstall.ownsTempFile=true;self.linkedInstalls.push(aInstall)
aInstall.sourceURI=self.sourceURI;aInstall.releaseNotesURI=self.releaseNotesURI;aInstall.updateAddonURIs();}
count++;if(count==files.length)
aCallback();},file);},this);}
else{aCallback();}},loadManifest:function AI_loadManifest(aCallback){aCallback=makeSafe(aCallback);let self=this;function addRepositoryData(aAddon){ AddonRepository.getCachedAddonByID(aAddon.id,function loadManifest_getCachedAddonByID(aRepoAddon){if(aRepoAddon){aAddon._repositoryAddon=aRepoAddon;self.name=self.name||aAddon._repositoryAddon.name;aAddon.compatibilityOverrides=aRepoAddon.compatibilityOverrides;aAddon.appDisabled=!isUsableAddon(aAddon);aCallback();return;} 
AddonRepository.cacheAddons([aAddon.id],function loadManifest_cacheAddons(){AddonRepository.getCachedAddonByID(aAddon.id,function loadManifest_getCachedAddonByID(aRepoAddon){aAddon._repositoryAddon=aRepoAddon;self.name=self.name||aAddon._repositoryAddon.name;aAddon.compatibilityOverrides=aRepoAddon?aRepoAddon.compatibilityOverrides:null;aAddon.appDisabled=!isUsableAddon(aAddon);aCallback();});});});}
let zipreader=Cc["@mozilla.org/libjar/zip-reader;1"].createInstance(Ci.nsIZipReader);try{zipreader.open(this.file);}
catch(e){zipreader.close();throw e;}
let principal=zipreader.getCertificatePrincipal(null);if(principal&&principal.hasCertificate){logger.debug("Verifying XPI signature");if(verifyZipSigning(zipreader,principal)){let x509=principal.certificate;if(x509 instanceof Ci.nsIX509Cert)
this.certificate=x509;if(this.certificate&&this.certificate.commonName.length>0)
this.certName=this.certificate.commonName;else
this.certName=principal.prettyName;}
else{zipreader.close();throw new Error("XPI is incorrectly signed");}}
try{this.addon=loadManifestFromZipReader(zipreader);}
catch(e){zipreader.close();throw e;}
if(this.addon.type=="multipackage"){this._loadMultipackageManifests(zipreader,function loadManifest_loadMultipackageManifests(){addRepositoryData(self.addon);});return;}
zipreader.close();this.updateAddonURIs();this.addon._install=this;this.name=this.addon.selectedLocale.name;this.type=this.addon.type;this.version=this.addon.version;

addRepositoryData(this.addon);},observe:function AI_observe(aSubject,aTopic,aData){ this.cancel();},startDownload:function AI_startDownload(){this.state=AddonManager.STATE_DOWNLOADING;if(!AddonManagerPrivate.callInstallListeners("onDownloadStarted",this.listeners,this.wrapper)){logger.debug("onDownloadStarted listeners cancelled installation of addon "+this.sourceURI.spec);this.state=AddonManager.STATE_CANCELLED;XPIProvider.removeActiveInstall(this);AddonManagerPrivate.callInstallListeners("onDownloadCancelled",this.listeners,this.wrapper)
return;} 
if(this.state!=AddonManager.STATE_DOWNLOADING)
return;if(this.channel){
 logger.debug("Waiting for previous download to complete");this.restartDownload=true;return;}
this.openChannel();},openChannel:function AI_openChannel(){this.restartDownload=false;try{this.file=getTemporaryFile();this.ownsTempFile=true;this.stream=Cc["@mozilla.org/network/file-output-stream;1"].createInstance(Ci.nsIFileOutputStream);this.stream.init(this.file,FileUtils.MODE_WRONLY|FileUtils.MODE_CREATE|FileUtils.MODE_TRUNCATE,FileUtils.PERMS_FILE,0);}
catch(e){logger.warn("Failed to start download for addon "+this.sourceURI.spec,e);this.state=AddonManager.STATE_DOWNLOAD_FAILED;this.error=AddonManager.ERROR_FILE_ACCESS;XPIProvider.removeActiveInstall(this);AddonManagerPrivate.callInstallListeners("onDownloadFailed",this.listeners,this.wrapper);return;}
let listener=Cc["@mozilla.org/network/stream-listener-tee;1"].createInstance(Ci.nsIStreamListenerTee);listener.init(this,this.stream);try{Components.utils.import("resource://gre/modules/CertUtils.jsm");let requireBuiltIn=Prefs.getBoolPref(PREF_INSTALL_REQUIREBUILTINCERTS,true);this.badCertHandler=new BadCertHandler(!requireBuiltIn);this.channel=NetUtil.newChannel(this.sourceURI);this.channel.notificationCallbacks=this;if(this.channel instanceof Ci.nsIHttpChannelInternal)
this.channel.forceAllowThirdPartyCookie=true;this.channel.asyncOpen(listener,null);Services.obs.addObserver(this,"network:offline-about-to-go-offline",false);}
catch(e){logger.warn("Failed to start download for addon "+this.sourceURI.spec,e);this.state=AddonManager.STATE_DOWNLOAD_FAILED;this.error=AddonManager.ERROR_NETWORK_FAILURE;XPIProvider.removeActiveInstall(this);AddonManagerPrivate.callInstallListeners("onDownloadFailed",this.listeners,this.wrapper);}},onDataAvailable:function AI_onDataAvailable(aRequest,aContext,aInputstream,aOffset,aCount){this.crypto.updateFromStream(aInputstream,aCount);this.progress+=aCount;if(!AddonManagerPrivate.callInstallListeners("onDownloadProgress",this.listeners,this.wrapper)){}},asyncOnChannelRedirect:function AI_asyncOnChannelRedirect(aOldChannel,aNewChannel,aFlags,aCallback){if(!this.hash&&aOldChannel.originalURI.schemeIs("https")&&aOldChannel instanceof Ci.nsIHttpChannel){try{let hashStr=aOldChannel.getResponseHeader("X-Target-Digest");let hashSplit=hashStr.toLowerCase().split(":");this.hash={algorithm:hashSplit[0],data:hashSplit[1]};}
catch(e){}}

if(!this.hash)
this.badCertHandler.asyncOnChannelRedirect(aOldChannel,aNewChannel,aFlags,aCallback);else
aCallback.onRedirectVerifyCallback(Cr.NS_OK);this.channel=aNewChannel;},onStartRequest:function AI_onStartRequest(aRequest,aContext){this.crypto=Cc["@mozilla.org/security/hash;1"].createInstance(Ci.nsICryptoHash);if(this.hash){try{this.crypto.initWithString(this.hash.algorithm);}
catch(e){logger.warn("Unknown hash algorithm '"+this.hash.algorithm+"' for addon "+this.sourceURI.spec,e);this.state=AddonManager.STATE_DOWNLOAD_FAILED;this.error=AddonManager.ERROR_INCORRECT_HASH;XPIProvider.removeActiveInstall(this);AddonManagerPrivate.callInstallListeners("onDownloadFailed",this.listeners,this.wrapper);aRequest.cancel(Cr.NS_BINDING_ABORTED);return;}}
else{
this.crypto.initWithString("sha1");}
this.progress=0;if(aRequest instanceof Ci.nsIChannel){try{this.maxProgress=aRequest.contentLength;}
catch(e){}
logger.debug("Download started for "+this.sourceURI.spec+" to file "+
this.file.path);}},onStopRequest:function AI_onStopRequest(aRequest,aContext,aStatus){this.stream.close();this.channel=null;this.badCerthandler=null;Services.obs.removeObserver(this,"network:offline-about-to-go-offline"); if(aStatus==Cr.NS_BINDING_ABORTED){this.removeTemporaryFile();if(this.restartDownload)
this.openChannel();return;}
logger.debug("Download of "+this.sourceURI.spec+" completed.");if(Components.isSuccessCode(aStatus)){if(!(aRequest instanceof Ci.nsIHttpChannel)||aRequest.requestSucceeded){if(!this.hash&&(aRequest instanceof Ci.nsIChannel)){try{checkCert(aRequest,!Prefs.getBoolPref(PREF_INSTALL_REQUIREBUILTINCERTS,true));}
catch(e){this.downloadFailed(AddonManager.ERROR_NETWORK_FAILURE,e);return;}}
let calculatedHash=getHashStringForCrypto(this.crypto);this.crypto=null;if(this.hash&&calculatedHash!=this.hash.data){this.downloadFailed(AddonManager.ERROR_INCORRECT_HASH,"Downloaded file hash ("+calculatedHash+") did not match provided hash ("+this.hash.data+")");return;}
try{let self=this;this.loadManifest(function onStopRequest_loadManifest(){if(self.addon.isCompatible){self.downloadCompleted();}
else{self.state=AddonManager.STATE_CHECKING;new UpdateChecker(self.addon,{onUpdateFinished:function onStopRequest_onUpdateFinished(aAddon){self.downloadCompleted();}},AddonManager.UPDATE_WHEN_ADDON_INSTALLED);}});}
catch(e){this.downloadFailed(AddonManager.ERROR_CORRUPT_FILE,e);}}
else{if(aRequest instanceof Ci.nsIHttpChannel)
this.downloadFailed(AddonManager.ERROR_NETWORK_FAILURE,aRequest.responseStatus+" "+
aRequest.responseStatusText);else
this.downloadFailed(AddonManager.ERROR_NETWORK_FAILURE,aStatus);}}
else{this.downloadFailed(AddonManager.ERROR_NETWORK_FAILURE,aStatus);}},downloadFailed:function AI_downloadFailed(aReason,aError){logger.warn("Download of "+this.sourceURI.spec+" failed",aError);this.state=AddonManager.STATE_DOWNLOAD_FAILED;this.error=aReason;XPIProvider.removeActiveInstall(this);AddonManagerPrivate.callInstallListeners("onDownloadFailed",this.listeners,this.wrapper);
 if(this.state==AddonManager.STATE_DOWNLOAD_FAILED){logger.debug("downloadFailed: removing temp file for "+this.sourceURI.spec);this.removeTemporaryFile();}
else
logger.debug("downloadFailed: listener changed AddonInstall state for "+
this.sourceURI.spec+" to "+this.state);},downloadCompleted:function AI_downloadCompleted(){let self=this;XPIDatabase.getVisibleAddonForID(this.addon.id,function downloadCompleted_getVisibleAddonForID(aAddon){if(aAddon)
self.existingAddon=aAddon;self.state=AddonManager.STATE_DOWNLOADED;self.addon.updateDate=Date.now();if(self.existingAddon){self.addon.existingAddonID=self.existingAddon.id;self.addon.installDate=self.existingAddon.installDate;applyBlocklistChanges(self.existingAddon,self.addon);}
else{self.addon.installDate=self.addon.updateDate;}
if(AddonManagerPrivate.callInstallListeners("onDownloadEnded",self.listeners,self.wrapper)){ if(self.state!=AddonManager.STATE_DOWNLOADED)
return;self.install();if(self.linkedInstalls){self.linkedInstalls.forEach(function(aInstall){aInstall.install();});}}});},

startInstall:function AI_startInstall(){this.state=AddonManager.STATE_INSTALLING;if(!AddonManagerPrivate.callInstallListeners("onInstallStarted",this.listeners,this.wrapper)){this.state=AddonManager.STATE_DOWNLOADED;XPIProvider.removeActiveInstall(this);AddonManagerPrivate.callInstallListeners("onInstallCancelled",this.listeners,this.wrapper)
return;}
 
for(let aInstall of XPIProvider.installs){if(aInstall.state==AddonManager.STATE_INSTALLED&&aInstall.installLocation==this.installLocation&&aInstall.addon.id==this.addon.id){logger.debug("Cancelling previous pending install of "+aInstall.addon.id);aInstall.cancel();}}
let isUpgrade=this.existingAddon&&this.existingAddon._installLocation==this.installLocation;let requiresRestart=XPIProvider.installRequiresRestart(this.addon);logger.debug("Starting install of "+this.addon.id+" from "+this.sourceURI.spec);AddonManagerPrivate.callAddonListeners("onInstalling",createWrapper(this.addon),requiresRestart);let stagingDir=this.installLocation.getStagingDir();let stagedAddon=stagingDir.clone();Task.spawn((function(){let installedUnpacked=0;yield this.installLocation.requestStagingDir(); if(this.addon.unpack||Prefs.getBoolPref(PREF_XPI_UNPACK,false)){logger.debug("Addon "+this.addon.id+" will be installed as "+"an unpacked directory");stagedAddon.append(this.addon.id);yield removeAsync(stagedAddon);yield OS.File.makeDir(stagedAddon.path);yield ZipUtils.extractFilesAsync(this.file,stagedAddon);installedUnpacked=1;}
else{logger.debug("Addon "+this.addon.id+" will be installed as "+"a packed xpi");stagedAddon.append(this.addon.id+".xpi");yield removeAsync(stagedAddon);yield OS.File.copy(this.file.path,stagedAddon.path);}
if(requiresRestart){ this.addon._sourceBundle=stagedAddon; let stagedJSON=stagedAddon.clone();stagedJSON.leafName=this.addon.id+".json";if(stagedJSON.exists())
stagedJSON.remove(true);let stream=Cc["@mozilla.org/network/file-output-stream;1"].createInstance(Ci.nsIFileOutputStream);let converter=Cc["@mozilla.org/intl/converter-output-stream;1"].createInstance(Ci.nsIConverterOutputStream);try{stream.init(stagedJSON,FileUtils.MODE_WRONLY|FileUtils.MODE_CREATE|FileUtils.MODE_TRUNCATE,FileUtils.PERMS_FILE,0);converter.init(stream,"UTF-8",0,0x0000);converter.writeString(JSON.stringify(this.addon));}
finally{converter.close();stream.close();}
logger.debug("Staged install of "+this.addon.id+" from "+this.sourceURI.spec+" ready; waiting for restart.");this.state=AddonManager.STATE_INSTALLED;if(isUpgrade){delete this.existingAddon.pendingUpgrade;this.existingAddon.pendingUpgrade=this.addon;}
AddonManagerPrivate.callInstallListeners("onInstallEnded",this.listeners,this.wrapper,createWrapper(this.addon));}
else{ XPIProvider.removeActiveInstall(this);
 let reason=BOOTSTRAP_REASONS.ADDON_INSTALL;if(this.existingAddon){if(Services.vc.compare(this.existingAddon.version,this.addon.version)<0)
reason=BOOTSTRAP_REASONS.ADDON_UPGRADE;else
reason=BOOTSTRAP_REASONS.ADDON_DOWNGRADE;if(this.existingAddon.bootstrap){let file=this.existingAddon._installLocation.getLocationForID(this.existingAddon.id);if(this.existingAddon.active){XPIProvider.callBootstrapMethod(this.existingAddon,file,"shutdown",reason,{newVersion:this.addon.version});}
XPIProvider.callBootstrapMethod(this.existingAddon,file,"uninstall",reason,{newVersion:this.addon.version});XPIProvider.unloadBootstrapScope(this.existingAddon.id);flushStartupCache();}
if(!isUpgrade&&this.existingAddon.active){XPIDatabase.updateAddonActive(this.existingAddon,false);}} 
let existingAddonID=this.existingAddon?this.existingAddon.id:null;let file=this.installLocation.installAddon(this.addon.id,stagedAddon,existingAddonID); this.addon._sourceBundle=file;this.addon._installLocation=this.installLocation;let scanStarted=Date.now();let[,mTime,scanItems]=recursiveLastModifiedTime(file);let scanTime=Date.now()-scanStarted;this.addon.updateDate=mTime;this.addon.visible=true;if(isUpgrade){this.addon=XPIDatabase.updateAddonMetadata(this.existingAddon,this.addon,file.persistentDescriptor);}
else{this.addon.installDate=this.addon.updateDate;this.addon.active=(this.addon.visible&&!isAddonDisabled(this.addon))
this.addon=XPIDatabase.addAddonMetadata(this.addon,file.persistentDescriptor);}
let extraParams={};if(this.existingAddon){extraParams.oldVersion=this.existingAddon.version;}
if(this.addon.bootstrap){XPIProvider.callBootstrapMethod(this.addon,file,"install",reason,extraParams);}
AddonManagerPrivate.callAddonListeners("onInstalled",createWrapper(this.addon));logger.debug("Install of "+this.sourceURI.spec+" completed.");this.state=AddonManager.STATE_INSTALLED;AddonManagerPrivate.callInstallListeners("onInstallEnded",this.listeners,this.wrapper,createWrapper(this.addon));if(this.addon.bootstrap){if(this.addon.active){XPIProvider.callBootstrapMethod(this.addon,file,"startup",reason,extraParams);}
else{
 XPIProvider.unloadBootstrapScope(this.addon.id);}}
XPIProvider.setTelemetry(this.addon.id,"unpacked",installedUnpacked);XPIProvider.setTelemetry(this.addon.id,"location",this.installLocation.name);XPIProvider.setTelemetry(this.addon.id,"scan_MS",scanTime);XPIProvider.setTelemetry(this.addon.id,"scan_items",scanItems);recordAddonTelemetry(this.addon);}}).bind(this)).then(null,(e)=>{logger.warn("Failed to install "+this.file.path+" from "+this.sourceURI.spec,e);if(stagedAddon.exists())
recursiveRemove(stagedAddon);this.state=AddonManager.STATE_INSTALL_FAILED;this.error=AddonManager.ERROR_FILE_ACCESS;XPIProvider.removeActiveInstall(this);AddonManagerPrivate.callAddonListeners("onOperationCancelled",createWrapper(this.addon));AddonManagerPrivate.callInstallListeners("onInstallFailed",this.listeners,this.wrapper);}).then(()=>{this.removeTemporaryFile();return this.installLocation.releaseStagingDir();});},getInterface:function AI_getInterface(iid){if(iid.equals(Ci.nsIAuthPrompt2)){var factory=Cc["@mozilla.org/prompter;1"].getService(Ci.nsIPromptFactory);return factory.getPrompt(this.window,Ci.nsIAuthPrompt);}
else if(iid.equals(Ci.nsIChannelEventSink)){return this;}
return this.badCertHandler.getInterface(iid);}}
AddonInstall.createStagedInstall=function AI_createStagedInstall(aInstallLocation,aDir,aManifest){let url=Services.io.newFileURI(aDir);let install=new AddonInstall(aInstallLocation,aDir);install.initStagedInstall(aManifest);};AddonInstall.createInstall=function AI_createInstall(aCallback,aFile){let location=XPIProvider.installLocationsByName[KEY_APP_PROFILE];let url=Services.io.newFileURI(aFile);try{let install=new AddonInstall(location,url);install.initLocalInstall(aCallback);}
catch(e){logger.error("Error creating install",e);makeSafe(aCallback)(null);}};AddonInstall.createDownload=function AI_createDownload(aCallback,aUri,aHash,aName,aIcons,aVersion,aLoadGroup){let location=XPIProvider.installLocationsByName[KEY_APP_PROFILE];let url=NetUtil.newURI(aUri);let install=new AddonInstall(location,url,aHash,null,null,aLoadGroup);if(url instanceof Ci.nsIFileURL)
install.initLocalInstall(aCallback);else
install.initAvailableDownload(aName,null,aIcons,aVersion,aCallback);};AddonInstall.createUpdate=function AI_createUpdate(aCallback,aAddon,aUpdate){let url=NetUtil.newURI(aUpdate.updateURL);let releaseNotesURI=null;try{if(aUpdate.updateInfoURL)
releaseNotesURI=NetUtil.newURI(escapeAddonURI(aAddon,aUpdate.updateInfoURL));}
catch(e){}
let install=new AddonInstall(aAddon._installLocation,url,aUpdate.updateHash,releaseNotesURI,aAddon);if(url instanceof Ci.nsIFileURL){install.initLocalInstall(aCallback);}
else{install.initAvailableDownload(aAddon.selectedLocale.name,aAddon.type,aAddon.icons,aUpdate.version,aCallback);}};function AddonInstallWrapper(aInstall){["name","type","version","icons","releaseNotesURI","file","state","error","progress","maxProgress","certificate","certName"].forEach(function(aProp){this.__defineGetter__(aProp,function AIW_propertyGetter()aInstall[aProp]);},this);this.__defineGetter__("iconURL",function AIW_iconURL()aInstall.icons[32]);this.__defineGetter__("existingAddon",function AIW_existingAddonGetter(){return createWrapper(aInstall.existingAddon);});this.__defineGetter__("addon",function AIW_addonGetter()createWrapper(aInstall.addon));this.__defineGetter__("sourceURI",function AIW_sourceURIGetter()aInstall.sourceURI);this.__defineGetter__("linkedInstalls",function AIW_linkedInstallsGetter(){if(!aInstall.linkedInstalls)
return null;return[i.wrapper for each(i in aInstall.linkedInstalls)];});this.install=function AIW_install(){aInstall.install();}
this.cancel=function AIW_cancel(){aInstall.cancel();}
this.addListener=function AIW_addListener(listener){aInstall.addListener(listener);}
this.removeListener=function AIW_removeListener(listener){aInstall.removeListener(listener);}}
AddonInstallWrapper.prototype={};function UpdateChecker(aAddon,aListener,aReason,aAppVersion,aPlatformVersion){if(!aListener||!aReason)
throw Cr.NS_ERROR_INVALID_ARG;Components.utils.import("resource://gre/modules/addons/AddonUpdateChecker.jsm");this.addon=aAddon;aAddon._updateCheck=this;XPIProvider.doing(this);this.listener=aListener;this.appVersion=aAppVersion;this.platformVersion=aPlatformVersion;this.syncCompatibility=(aReason==AddonManager.UPDATE_WHEN_NEW_APP_INSTALLED);let updateURL=aAddon.updateURL;if(!updateURL){if(aReason==AddonManager.UPDATE_WHEN_PERIODIC_UPDATE&&Services.prefs.getPrefType(PREF_EM_UPDATE_BACKGROUND_URL)==Services.prefs.PREF_STRING){updateURL=Services.prefs.getCharPref(PREF_EM_UPDATE_BACKGROUND_URL);}else{updateURL=Services.prefs.getCharPref(PREF_EM_UPDATE_URL);}}
const UPDATE_TYPE_COMPATIBILITY=32;const UPDATE_TYPE_NEWVERSION=64;aReason|=UPDATE_TYPE_COMPATIBILITY;if("onUpdateAvailable"in this.listener)
aReason|=UPDATE_TYPE_NEWVERSION;let url=escapeAddonURI(aAddon,updateURL,aReason,aAppVersion);this._parser=AddonUpdateChecker.checkForUpdates(aAddon.id,aAddon.updateKey,url,this);}
UpdateChecker.prototype={addon:null,listener:null,appVersion:null,platformVersion:null,syncCompatibility:null,callListener:function UC_callListener(aMethod,...aArgs){if(!(aMethod in this.listener))
return;try{this.listener[aMethod].apply(this.listener,aArgs);}
catch(e){logger.warn("Exception calling UpdateListener method "+aMethod,e);}},onUpdateCheckComplete:function UC_onUpdateCheckComplete(aUpdates){XPIProvider.done(this.addon._updateCheck);this.addon._updateCheck=null;let AUC=AddonUpdateChecker;let ignoreMaxVersion=false;let ignoreStrictCompat=false;if(!AddonManager.checkCompatibility){ignoreMaxVersion=true;ignoreStrictCompat=true;}else if(this.addon.type in COMPATIBLE_BY_DEFAULT_TYPES&&!AddonManager.strictCompatibility&&!this.addon.strictCompatibility&&!this.addon.hasBinaryComponents){ignoreMaxVersion=true;} 
let compatUpdate=AUC.getCompatibilityUpdate(aUpdates,this.addon.version,this.syncCompatibility,null,null,ignoreMaxVersion,ignoreStrictCompat); if(compatUpdate)
this.addon.applyCompatibilityUpdate(compatUpdate,this.syncCompatibility);

if((this.appVersion&&Services.vc.compare(this.appVersion,Services.appinfo.version)!=0)||(this.platformVersion&&Services.vc.compare(this.platformVersion,Services.appinfo.platformVersion)!=0)){compatUpdate=AUC.getCompatibilityUpdate(aUpdates,this.addon.version,false,this.appVersion,this.platformVersion,ignoreMaxVersion,ignoreStrictCompat);}
if(compatUpdate)
this.callListener("onCompatibilityUpdateAvailable",createWrapper(this.addon));else
this.callListener("onNoCompatibilityUpdateAvailable",createWrapper(this.addon));function sendUpdateAvailableMessages(aSelf,aInstall){if(aInstall){aSelf.callListener("onUpdateAvailable",createWrapper(aSelf.addon),aInstall.wrapper);}
else{aSelf.callListener("onNoUpdateAvailable",createWrapper(aSelf.addon));}
aSelf.callListener("onUpdateFinished",createWrapper(aSelf.addon),AddonManager.UPDATE_STATUS_NO_ERROR);}
let compatOverrides=AddonManager.strictCompatibility?null:this.addon.compatibilityOverrides;let update=AUC.getNewestCompatibleUpdate(aUpdates,this.appVersion,this.platformVersion,ignoreMaxVersion,ignoreStrictCompat,compatOverrides);if(update&&Services.vc.compare(this.addon.version,update.version)<0){for(let currentInstall of XPIProvider.installs){ if(currentInstall.existingAddon!=this.addon||currentInstall.version!=update.version)
continue;

 if(currentInstall.state==AddonManager.STATE_AVAILABLE){logger.debug("Found an existing AddonInstall for "+this.addon.id);sendUpdateAvailableMessages(this,currentInstall);}
else
sendUpdateAvailableMessages(this,null);return;}
let self=this;AddonInstall.createUpdate(function onUpdateCheckComplete_createUpdate(aInstall){sendUpdateAvailableMessages(self,aInstall);},this.addon,update);}
else{sendUpdateAvailableMessages(this,null);}},onUpdateCheckError:function UC_onUpdateCheckError(aError){XPIProvider.done(this.addon._updateCheck);this.addon._updateCheck=null;this.callListener("onNoCompatibilityUpdateAvailable",createWrapper(this.addon));this.callListener("onNoUpdateAvailable",createWrapper(this.addon));this.callListener("onUpdateFinished",createWrapper(this.addon),aError);},cancel:function UC_cancel(){let parser=this._parser;if(parser){this._parser=null; parser.cancel();}}};function AddonInternal(){}
AddonInternal.prototype={_selectedLocale:null,active:false,visible:false,userDisabled:false,appDisabled:false,softDisabled:false,sourceURI:null,releaseNotesURI:null,foreignInstall:false,get selectedLocale(){if(this._selectedLocale)
return this._selectedLocale;let locale=findClosestLocale(this.locales);this._selectedLocale=locale?locale:this.defaultLocale;return this._selectedLocale;},get providesUpdatesSecurely(){return!!(this.updateKey||!this.updateURL||this.updateURL.substring(0,6)=="https:");},get isCompatible(){return this.isCompatibleWith();},get isPlatformCompatible(){if(this.targetPlatforms.length==0)
return true;let matchedOS=false;
 let needsABI=false;let abi=null;try{abi=Services.appinfo.XPCOMABI;}
catch(e){}
for(let platform of this.targetPlatforms){if(platform.os==Services.appinfo.OS){if(platform.abi){needsABI=true;if(platform.abi===abi)
return true;}
else{matchedOS=true;}}}
return matchedOS&&!needsABI;},isCompatibleWith:function AddonInternal_isCompatibleWith(aAppVersion,aPlatformVersion){



if(this.type=="experiment"){return true;}
let app=this.matchingTargetApplication;if(!app)
return false;if(!aAppVersion)
aAppVersion=Services.appinfo.version;if(!aPlatformVersion)
aPlatformVersion=Services.appinfo.platformVersion;let version;if(app.id==Services.appinfo.ID)
version=aAppVersion;else if(app.id==TOOLKIT_ID)
version=aPlatformVersion


if(this.type in COMPATIBLE_BY_DEFAULT_TYPES&&!AddonManager.strictCompatibility&&!this.strictCompatibility&&!this.hasBinaryComponents){if(this._repositoryAddon&&this._repositoryAddon.compatibilityOverrides){let overrides=this._repositoryAddon.compatibilityOverrides;let override=AddonRepository.findMatchingCompatOverride(this.version,overrides);if(override&&override.type=="incompatible")
return false;}
let minCompatVersion;if(app.id==Services.appinfo.ID)
minCompatVersion=XPIProvider.minCompatibleAppVersion;else if(app.id==TOOLKIT_ID)
minCompatVersion=XPIProvider.minCompatiblePlatformVersion;if(minCompatVersion&&Services.vc.compare(minCompatVersion,app.maxVersion)>0)
return false;return Services.vc.compare(version,app.minVersion)>=0;}
return(Services.vc.compare(version,app.minVersion)>=0)&&(Services.vc.compare(version,app.maxVersion)<=0)},get matchingTargetApplication(){let app=null;for(let targetApp of this.targetApplications){if(targetApp.id==Services.appinfo.ID)
return targetApp;if(targetApp.id==TOOLKIT_ID)
app=targetApp;}
return app;},get blocklistState(){let staticItem=findMatchingStaticBlocklistItem(this);if(staticItem)
return staticItem.level;return Blocklist.getAddonBlocklistState(createWrapper(this));},get blocklistURL(){let staticItem=findMatchingStaticBlocklistItem(this);if(staticItem){let url=Services.urlFormatter.formatURLPref("extensions.blocklist.itemURL");return url.replace(/%blockID%/g,staticItem.blockID);}
return Blocklist.getAddonBlocklistURL(createWrapper(this));},applyCompatibilityUpdate:function AddonInternal_applyCompatibilityUpdate(aUpdate,aSyncCompatibility){this.targetApplications.forEach(function(aTargetApp){aUpdate.targetApplications.forEach(function(aUpdateTarget){if(aTargetApp.id==aUpdateTarget.id&&(aSyncCompatibility||Services.vc.compare(aTargetApp.maxVersion,aUpdateTarget.maxVersion)<0)){aTargetApp.minVersion=aUpdateTarget.minVersion;aTargetApp.maxVersion=aUpdateTarget.maxVersion;}});});this.appDisabled=!isUsableAddon(this);},getDataDirectory:function(callback){let parentPath=OS.Path.join(OS.Constants.Path.profileDir,"extension-data");let dirPath=OS.Path.join(parentPath,this.id);Task.spawn(function*(){yield OS.File.makeDir(parentPath,{ignoreExisting:true});yield OS.File.makeDir(dirPath,{ignoreExisting:true});}).then(()=>callback(dirPath,null),e=>callback(dirPath,e));},toJSON:function AddonInternal_toJSON(aKey){let obj={};for(let prop in this){ if(prop.substring(0,1)=="_")
continue; if(this.__lookupGetter__(prop))
continue; if(this.__lookupSetter__(prop))
continue; if(typeof this[prop]=="function")
continue;obj[prop]=this[prop];}
return obj;},importMetadata:function AddonInternal_importMetaData(aObj){PENDING_INSTALL_METADATA.forEach(function(aProp){if(!(aProp in aObj))
return;this[aProp]=aObj[aProp];},this); this.appDisabled=!isUsableAddon(this);},permissions:function AddonInternal_permissions(){let permissions=0; if(!(this.inDatabase))
return permissions;

if(this.type=="experiment"){return AddonManager.PERM_CAN_UNINSTALL;}
if(!this.appDisabled){if(this.userDisabled||this.softDisabled){permissions|=AddonManager.PERM_CAN_ENABLE;}
else if(this.type!="theme"){permissions|=AddonManager.PERM_CAN_DISABLE;}}
 
if(!this._installLocation.locked&&!this.pendingUninstall){ if(!this._installLocation.isLinkedAddon(this.id)){permissions|=AddonManager.PERM_CAN_UPGRADE;}
permissions|=AddonManager.PERM_CAN_UNINSTALL;}
return permissions;},};function createWrapper(aAddon){if(!aAddon)
return null;if(!aAddon._wrapper){aAddon._hasResourceCache=new Map();aAddon._wrapper=new AddonWrapper(aAddon);}
return aAddon._wrapper;}
function AddonWrapper(aAddon){function chooseValue(aObj,aProp){let repositoryAddon=aAddon._repositoryAddon;let objValue=aObj[aProp];if(repositoryAddon&&(aProp in repositoryAddon)&&(objValue===undefined||objValue===null)){return[repositoryAddon[aProp],true];}
return[objValue,false];}
["id","syncGUID","version","type","isCompatible","isPlatformCompatible","providesUpdatesSecurely","blocklistState","blocklistURL","appDisabled","softDisabled","skinnable","size","foreignInstall","hasBinaryComponents","strictCompatibility","compatibilityOverrides","updateURL","getDataDirectory"].forEach(function(aProp){this.__defineGetter__(aProp,function AddonWrapper_propertyGetter()aAddon[aProp]);},this);["fullDescription","developerComments","eula","supportURL","contributionURL","contributionAmount","averageRating","reviewCount","reviewURL","totalDownloads","weeklyDownloads","dailyUsers","repositoryStatus"].forEach(function(aProp){this.__defineGetter__(aProp,function AddonWrapper_repoPropertyGetter(){if(aAddon._repositoryAddon)
return aAddon._repositoryAddon[aProp];return null;});},this);this.__defineGetter__("aboutURL",function AddonWrapper_aboutURLGetter(){return this.isActive?aAddon["aboutURL"]:null;});["installDate","updateDate"].forEach(function(aProp){this.__defineGetter__(aProp,function AddonWrapper_datePropertyGetter()new Date(aAddon[aProp]));},this);["sourceURI","releaseNotesURI"].forEach(function(aProp){this.__defineGetter__(aProp,function AddonWrapper_URIPropertyGetter(){let[target,fromRepo]=chooseValue(aAddon,aProp);if(!target)
return null;if(fromRepo)
return target;return NetUtil.newURI(target);});},this);this.__defineGetter__("optionsURL",function AddonWrapper_optionsURLGetter(){if(this.isActive&&aAddon.optionsURL)
return aAddon.optionsURL;if(this.isActive&&this.hasResource("options.xul"))
return this.getResourceURI("options.xul").spec;return null;},this);this.__defineGetter__("optionsType",function AddonWrapper_optionsTypeGetter(){if(!this.isActive)
return null;let hasOptionsXUL=this.hasResource("options.xul");let hasOptionsURL=!!this.optionsURL;if(aAddon.optionsType){switch(parseInt(aAddon.optionsType,10)){case AddonManager.OPTIONS_TYPE_DIALOG:case AddonManager.OPTIONS_TYPE_TAB:return hasOptionsURL?aAddon.optionsType:null;case AddonManager.OPTIONS_TYPE_INLINE:case AddonManager.OPTIONS_TYPE_INLINE_INFO:return(hasOptionsXUL||hasOptionsURL)?aAddon.optionsType:null;}
return null;}
if(hasOptionsXUL)
return AddonManager.OPTIONS_TYPE_INLINE;if(hasOptionsURL)
return AddonManager.OPTIONS_TYPE_DIALOG;return null;},this);this.__defineGetter__("iconURL",function AddonWrapper_iconURLGetter(){return this.icons[32];},this);this.__defineGetter__("icon64URL",function AddonWrapper_icon64URLGetter(){return this.icons[64];},this);this.__defineGetter__("icons",function AddonWrapper_iconsGetter(){let icons={};if(aAddon._repositoryAddon){for(let size in aAddon._repositoryAddon.icons){icons[size]=aAddon._repositoryAddon.icons[size];}}
if(this.isActive&&aAddon.iconURL){icons[32]=aAddon.iconURL;}else if(this.hasResource("icon.png")){icons[32]=this.getResourceURI("icon.png").spec;}
if(this.isActive&&aAddon.icon64URL){icons[64]=aAddon.icon64URL;}else if(this.hasResource("icon64.png")){icons[64]=this.getResourceURI("icon64.png").spec;}
Object.freeze(icons);return icons;},this);PROP_LOCALE_SINGLE.forEach(function(aProp){this.__defineGetter__(aProp,function AddonWrapper_singleLocaleGetter(){ if(aProp=="creator"&&aAddon._repositoryAddon&&aAddon._repositoryAddon.creator){return aAddon._repositoryAddon.creator;}
let result=null;if(aAddon.active){try{let pref=PREF_EM_EXTENSION_FORMAT+aAddon.id+"."+aProp;let value=Services.prefs.getComplexValue(pref,Ci.nsIPrefLocalizedString);if(value.data)
result=value.data;}
catch(e){}}
if(result==null)
[result,]=chooseValue(aAddon.selectedLocale,aProp);if(aProp=="creator")
return result?new AddonManagerPrivate.AddonAuthor(result):null;return result;});},this);PROP_LOCALE_MULTI.forEach(function(aProp){this.__defineGetter__(aProp,function AddonWrapper_multiLocaleGetter(){let results=null;let usedRepository=false;if(aAddon.active){let pref=PREF_EM_EXTENSION_FORMAT+aAddon.id+"."+
aProp.substring(0,aProp.length-1);let list=Services.prefs.getChildList(pref,{});if(list.length>0){list.sort();results=[];list.forEach(function(aPref){let value=Services.prefs.getComplexValue(aPref,Ci.nsIPrefLocalizedString);if(value.data)
results.push(value.data);});}}
if(results==null)
[results,usedRepository]=chooseValue(aAddon.selectedLocale,aProp);if(results&&!usedRepository){results=results.map(function mapResult(aResult){return new AddonManagerPrivate.AddonAuthor(aResult);});}
return results;});},this);this.__defineGetter__("screenshots",function AddonWrapper_screenshotsGetter(){let repositoryAddon=aAddon._repositoryAddon;if(repositoryAddon&&("screenshots"in repositoryAddon)){let repositoryScreenshots=repositoryAddon.screenshots;if(repositoryScreenshots&&repositoryScreenshots.length>0)
return repositoryScreenshots;}
if(aAddon.type=="theme"&&this.hasResource("preview.png")){let url=this.getResourceURI("preview.png").spec;return[new AddonManagerPrivate.AddonScreenshot(url)];}
return null;});this.__defineGetter__("applyBackgroundUpdates",function AddonWrapper_applyBackgroundUpdatesGetter(){return aAddon.applyBackgroundUpdates;});this.__defineSetter__("applyBackgroundUpdates",function AddonWrapper_applyBackgroundUpdatesSetter(val){if(this.type=="experiment"){logger.warn("Setting applyBackgroundUpdates on an experiment is not supported.");return;}
if(val!=AddonManager.AUTOUPDATE_DEFAULT&&val!=AddonManager.AUTOUPDATE_DISABLE&&val!=AddonManager.AUTOUPDATE_ENABLE){val=val?AddonManager.AUTOUPDATE_DEFAULT:AddonManager.AUTOUPDATE_DISABLE;}
if(val==aAddon.applyBackgroundUpdates)
return val;XPIDatabase.setAddonProperties(aAddon,{applyBackgroundUpdates:val});AddonManagerPrivate.callAddonListeners("onPropertyChanged",this,["applyBackgroundUpdates"]);return val;});this.__defineSetter__("syncGUID",function AddonWrapper_syncGUIDGetter(val){if(aAddon.syncGUID==val)
return val;if(aAddon.inDatabase)
XPIDatabase.setAddonSyncGUID(aAddon,val);aAddon.syncGUID=val;return val;});this.__defineGetter__("install",function AddonWrapper_installGetter(){if(!("_install"in aAddon)||!aAddon._install)
return null;return aAddon._install.wrapper;});this.__defineGetter__("pendingUpgrade",function AddonWrapper_pendingUpgradeGetter(){return createWrapper(aAddon.pendingUpgrade);});this.__defineGetter__("scope",function AddonWrapper_scopeGetter(){if(aAddon._installLocation)
return aAddon._installLocation.scope;return AddonManager.SCOPE_PROFILE;});this.__defineGetter__("pendingOperations",function AddonWrapper_pendingOperationsGetter(){let pending=0;if(!(aAddon.inDatabase)){


if(!aAddon._install||aAddon._install.state==AddonManager.STATE_INSTALLING||aAddon._install.state==AddonManager.STATE_INSTALLED)
return AddonManager.PENDING_INSTALL;}
else if(aAddon.pendingUninstall){
 return AddonManager.PENDING_UNINSTALL;}


if(aAddon.type!="experiment"){if(aAddon.active&&isAddonDisabled(aAddon))
pending|=AddonManager.PENDING_DISABLE;else if(!aAddon.active&&!isAddonDisabled(aAddon))
pending|=AddonManager.PENDING_ENABLE;}
if(aAddon.pendingUpgrade)
pending|=AddonManager.PENDING_UPGRADE;return pending;});this.__defineGetter__("operationsRequiringRestart",function AddonWrapper_operationsRequiringRestartGetter(){let ops=0;if(XPIProvider.installRequiresRestart(aAddon))
ops|=AddonManager.OP_NEEDS_RESTART_INSTALL;if(XPIProvider.uninstallRequiresRestart(aAddon))
ops|=AddonManager.OP_NEEDS_RESTART_UNINSTALL;if(XPIProvider.enableRequiresRestart(aAddon))
ops|=AddonManager.OP_NEEDS_RESTART_ENABLE;if(XPIProvider.disableRequiresRestart(aAddon))
ops|=AddonManager.OP_NEEDS_RESTART_DISABLE;return ops;});this.__defineGetter__("isDebuggable",function AddonWrapper_isDebuggable(){return this.isActive&&aAddon.bootstrap;});this.__defineGetter__("permissions",function AddonWrapper_permisionsGetter(){return aAddon.permissions();});this.__defineGetter__("isActive",function AddonWrapper_isActiveGetter(){if(Services.appinfo.inSafeMode)
return false;return aAddon.active;});this.__defineGetter__("userDisabled",function AddonWrapper_userDisabledGetter(){if(XPIProvider._enabledExperiments.has(aAddon.id)){return false;}
return aAddon.softDisabled||aAddon.userDisabled;});this.__defineSetter__("userDisabled",function AddonWrapper_userDisabledSetter(val){if(val==this.userDisabled){return val;}
if(aAddon.type=="experiment"){if(val){XPIProvider._enabledExperiments.delete(aAddon.id);}else{XPIProvider._enabledExperiments.add(aAddon.id);}}
if(aAddon.inDatabase){if(aAddon.type=="theme"&&val){if(aAddon.internalName==XPIProvider.defaultSkin)
throw new Error("Cannot disable the default theme");XPIProvider.enableDefaultTheme();}
else{XPIProvider.updateAddonDisabledState(aAddon,val);}}
else{aAddon.userDisabled=val; if(!val)
aAddon.softDisabled=false;}
return val;});this.__defineSetter__("softDisabled",function AddonWrapper_softDisabledSetter(val){if(val==aAddon.softDisabled)
return val;if(aAddon.inDatabase){ if(aAddon.type=="theme"&&val&&!aAddon.userDisabled){if(aAddon.internalName==XPIProvider.defaultSkin)
throw new Error("Cannot disable the default theme");XPIProvider.enableDefaultTheme();}
else{XPIProvider.updateAddonDisabledState(aAddon,undefined,val);}}
else{ if(!aAddon.userDisabled)
aAddon.softDisabled=val;}
return val;});this.isCompatibleWith=function AddonWrapper_isCompatiblewith(aAppVersion,aPlatformVersion){return aAddon.isCompatibleWith(aAppVersion,aPlatformVersion);};this.uninstall=function AddonWrapper_uninstall(){if(!(aAddon.inDatabase))
throw new Error("Cannot uninstall an add-on that isn't installed");if(aAddon.pendingUninstall)
throw new Error("Add-on is already marked to be uninstalled");XPIProvider.uninstallAddon(aAddon);};this.cancelUninstall=function AddonWrapper_cancelUninstall(){if(!(aAddon.inDatabase))
throw new Error("Cannot cancel uninstall for an add-on that isn't installed");if(!aAddon.pendingUninstall)
throw new Error("Add-on is not marked to be uninstalled");XPIProvider.cancelUninstallAddon(aAddon);};this.findUpdates=function AddonWrapper_findUpdates(aListener,aReason,aAppVersion,aPlatformVersion){
if(this.type=="experiment"){AddonManagerPrivate.callNoUpdateListeners(this,aListener,aReason,aAppVersion,aPlatformVersion);return;}
new UpdateChecker(aAddon,aListener,aReason,aAppVersion,aPlatformVersion);}; this.cancelUpdate=function AddonWrapper_cancelUpdate(){if(aAddon._updateCheck){aAddon._updateCheck.cancel();return true;}
return false;};this.hasResource=function AddonWrapper_hasResource(aPath){if(aAddon._hasResourceCache.has(aPath))
return aAddon._hasResourceCache.get(aPath);let bundle=aAddon._sourceBundle.clone();try{var isDir=bundle.isDirectory();}catch(e){aAddon._hasResourceCache.set(aPath,false);return false;}
if(isDir){if(aPath){aPath.split("/").forEach(function(aPart){bundle.append(aPart);});}
let result=bundle.exists();aAddon._hasResourceCache.set(aPath,result);return result;}
let zipReader=Cc["@mozilla.org/libjar/zip-reader;1"].createInstance(Ci.nsIZipReader);try{zipReader.open(bundle);let result=zipReader.hasEntry(aPath);aAddon._hasResourceCache.set(aPath,result);return result;}
catch(e){aAddon._hasResourceCache.set(aPath,false);return false;}
finally{zipReader.close();}},this.getResourceURI=function AddonWrapper_getResourceURI(aPath){if(!aPath)
return NetUtil.newURI(aAddon._sourceBundle);return getURIForResourceInFile(aAddon._sourceBundle,aPath);}}
function DirectoryInstallLocation(aName,aDirectory,aScope,aLocked){this._name=aName;this.locked=aLocked;this._directory=aDirectory;this._scope=aScope
this._IDToFileMap={};this._FileToIDMap={};this._linkedAddons=[];this._stagingDirLock=0;if(!aDirectory.exists())
return;if(!aDirectory.isDirectory())
throw new Error("Location must be a directory.");this._readAddons();}
DirectoryInstallLocation.prototype={_name:"",_directory:null,_IDToFileMap:null, _FileToIDMap:null,_readDirectoryFromFile:function DirInstallLocation__readDirectoryFromFile(aFile){let fis=Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);fis.init(aFile,-1,-1,false);let line={value:""};if(fis instanceof Ci.nsILineInputStream)
fis.readLine(line);fis.close();if(line.value){let linkedDirectory=Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);try{linkedDirectory.initWithPath(line.value);}
catch(e){linkedDirectory.setRelativeDescriptor(aFile.parent,line.value);}
if(!linkedDirectory.exists()){logger.warn("File pointer "+aFile.path+" points to "+linkedDirectory.path+" which does not exist");return null;}
if(!linkedDirectory.isDirectory()){logger.warn("File pointer "+aFile.path+" points to "+linkedDirectory.path+" which is not a directory");return null;}
return linkedDirectory;}
logger.warn("File pointer "+aFile.path+" does not contain a path");return null;},_readAddons:function DirInstallLocation__readAddons(){

let entries=getDirectoryEntries(this._directory);for(let entry of entries){let id=entry.leafName;if(id==DIR_STAGE||id==DIR_XPI_STAGE||id==DIR_TRASH)
continue;let directLoad=false;if(entry.isFile()&&id.substring(id.length-4).toLowerCase()==".xpi"){directLoad=true;id=id.substring(0,id.length-4);}
if(!gIDTest.test(id)){logger.debug("Ignoring file entry whose name is not a valid add-on ID: "+
entry.path);continue;}
if(entry.isFile()&&!directLoad){let newEntry=this._readDirectoryFromFile(entry);if(!newEntry){logger.debug("Deleting stale pointer file "+entry.path);try{entry.remove(true);}
catch(e){logger.warn("Failed to remove stale pointer file "+entry.path,e);}
continue;}
entry=newEntry;this._linkedAddons.push(id);}
this._IDToFileMap[id]=entry;this._FileToIDMap[entry.path]=id;XPIProvider._addURIMapping(id,entry);}},get name(){return this._name;},get scope(){return this._scope;},get addonLocations(){let locations=[];for(let id in this._IDToFileMap){locations.push(this._IDToFileMap[id].clone());}
return locations;},getStagingDir:function DirInstallLocation_getStagingDir(){let dir=this._directory.clone();dir.append(DIR_STAGE);return dir;},requestStagingDir:function(){this._stagingDirLock++;if(this._stagingDirPromise)
return this._stagingDirPromise;OS.File.makeDir(this._directory.path);let stagepath=OS.Path.join(this._directory.path,DIR_STAGE);return this._stagingDirPromise=OS.File.makeDir(stagepath).then(null,(e)=>{if(e instanceof OS.File.Error&&e.becauseExists)
return;logger.error("Failed to create staging directory",e);throw e;});},releaseStagingDir:function(){this._stagingDirLock--;if(this._stagingDirLock==0){this._stagingDirPromise=null;this.cleanStagingDir();}
return Promise.resolve();},cleanStagingDir:function(aLeafNames=[]){let dir=this.getStagingDir();for(let name of aLeafNames){let file=dir.clone();file.append(name);recursiveRemove(file);}
if(this._stagingDirLock>0)
return;let dirEntries=dir.directoryEntries.QueryInterface(Ci.nsIDirectoryEnumerator);try{if(dirEntries.nextFile)
return;}
finally{dirEntries.close();}
try{setFilePermissions(dir,FileUtils.PERMS_DIRECTORY);dir.remove(false);}
catch(e){logger.warn("Failed to remove staging dir",e);}},getXPIStagingDir:function DirInstallLocation_getXPIStagingDir(){let dir=this._directory.clone();dir.append(DIR_XPI_STAGE);return dir;},getTrashDir:function DirInstallLocation_getTrashDir(){let trashDir=this._directory.clone();trashDir.append(DIR_TRASH);if(trashDir.exists())
recursiveRemove(trashDir);trashDir.create(Ci.nsIFile.DIRECTORY_TYPE,FileUtils.PERMS_DIRECTORY);return trashDir;},installAddon:function DirInstallLocation_installAddon(aId,aSource,aExistingAddonID,aCopy){let trashDir=this.getTrashDir();let transaction=new SafeInstallOperation();let self=this;function moveOldAddon(aId){let file=self._directory.clone();file.append(aId);if(file.exists())
transaction.moveUnder(file,trashDir);file=self._directory.clone();file.append(aId+".xpi");if(file.exists()){flushJarCache(file);transaction.moveUnder(file,trashDir);}}
 
try{moveOldAddon(aId);if(aExistingAddonID&&aExistingAddonID!=aId){moveOldAddon(aExistingAddonID);{let oldDataDir=FileUtils.getDir(KEY_PROFILEDIR,["extension-data",aExistingAddonID],false,true);if(oldDataDir.exists()){let newDataDir=FileUtils.getDir(KEY_PROFILEDIR,["extension-data",aId],false,true);if(newDataDir.exists()){let trashData=trashDir.clone();trashData.append("data-directory");transaction.moveUnder(newDataDir,trashData);}
transaction.moveTo(oldDataDir,newDataDir);}}}
if(aCopy){transaction.copy(aSource,this._directory);}
else{if(aSource.isFile())
flushJarCache(aSource);transaction.moveUnder(aSource,this._directory);}}
finally{
try{recursiveRemove(trashDir);}
catch(e){logger.warn("Failed to remove trash directory when installing "+aId,e);}}
let newFile=this._directory.clone();newFile.append(aSource.leafName);try{newFile.lastModifiedTime=Date.now();}catch(e){logger.warn("failed to set lastModifiedTime on "+newFile.path,e);}
this._FileToIDMap[newFile.path]=aId;this._IDToFileMap[aId]=newFile;XPIProvider._addURIMapping(aId,newFile);if(aExistingAddonID&&aExistingAddonID!=aId&&aExistingAddonID in this._IDToFileMap){delete this._FileToIDMap[this._IDToFileMap[aExistingAddonID]];delete this._IDToFileMap[aExistingAddonID];}
return newFile;},uninstallAddon:function DirInstallLocation_uninstallAddon(aId){let file=this._IDToFileMap[aId];if(!file){logger.warn("Attempted to remove "+aId+" from "+
this._name+" but it was already gone");return;}
file=this._directory.clone();file.append(aId);if(!file.exists())
file.leafName+=".xpi";if(!file.exists()){logger.warn("Attempted to remove "+aId+" from "+
this._name+" but it was already gone");delete this._FileToIDMap[file.path];delete this._IDToFileMap[aId];return;}
let trashDir=this.getTrashDir();if(file.leafName!=aId){logger.debug("uninstallAddon: flushing jar cache "+file.path+" for addon "+aId);flushJarCache(file);}
let transaction=new SafeInstallOperation();try{transaction.moveUnder(file,trashDir);}
finally{
 try{recursiveRemove(trashDir);}
catch(e){logger.warn("Failed to remove trash directory when uninstalling "+aId,e);}}
delete this._FileToIDMap[file.path];delete this._IDToFileMap[aId];},getIDForLocation:function DirInstallLocation_getIDForLocation(aFile){if(aFile.path in this._FileToIDMap)
return this._FileToIDMap[aFile.path];throw new Error("Unknown add-on location "+aFile.path);},getLocationForID:function DirInstallLocation_getLocationForID(aId){if(aId in this._IDToFileMap)
return this._IDToFileMap[aId].clone();throw new Error("Unknown add-on ID "+aId);},isLinkedAddon:function DirInstallLocation__isLinkedAddon(aId){return this._linkedAddons.indexOf(aId)!=-1;}};let addonTypes=[new AddonManagerPrivate.AddonType("extension",URI_EXTENSION_STRINGS,STRING_TYPE_NAME,AddonManager.VIEW_TYPE_LIST,4000),new AddonManagerPrivate.AddonType("theme",URI_EXTENSION_STRINGS,STRING_TYPE_NAME,AddonManager.VIEW_TYPE_LIST,5000),new AddonManagerPrivate.AddonType("dictionary",URI_EXTENSION_STRINGS,STRING_TYPE_NAME,AddonManager.VIEW_TYPE_LIST,7000,AddonManager.TYPE_UI_HIDE_EMPTY),new AddonManagerPrivate.AddonType("locale",URI_EXTENSION_STRINGS,STRING_TYPE_NAME,AddonManager.VIEW_TYPE_LIST,8000,AddonManager.TYPE_UI_HIDE_EMPTY),];

if(Prefs.getBoolPref("experiments.supported",false)){addonTypes.push(new AddonManagerPrivate.AddonType("experiment",URI_EXTENSION_STRINGS,STRING_TYPE_NAME,AddonManager.VIEW_TYPE_LIST,11000,AddonManager.TYPE_UI_HIDE_EMPTY));}
AddonManagerPrivate.registerProvider(XPIProvider,addonTypes);