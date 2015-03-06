const Cc=Components.classes;const Ci=Components.interfaces;const Cu=Components.utils;const Cr=Components.results;Cu.import("resource://gre/modules/XPCOMUtils.jsm");Cu.import("resource://gre/modules/Services.jsm");const XRE_OS_UPDATE_APPLY_TO_DIR="OSUpdApplyToD"
const UPDATE_ARCHIVE_DIR="UpdArchD"
const LOCAL_DIR="/data/local";const UPDATES_DIR="updates/0";const FOTA_DIR="updates/fota";XPCOMUtils.defineLazyServiceGetter(Services,"env","@mozilla.org/process/environment;1","nsIEnvironment");XPCOMUtils.defineLazyServiceGetter(Services,"um","@mozilla.org/updates/update-manager;1","nsIUpdateManager");XPCOMUtils.defineLazyServiceGetter(Services,"volumeService","@mozilla.org/telephony/volume-service;1","nsIVolumeService");XPCOMUtils.defineLazyServiceGetter(this,"cpmm","@mozilla.org/childprocessmessagemanager;1","nsISyncMessageSender");XPCOMUtils.defineLazyGetter(this,"gExtStorage",function dp_gExtStorage(){return Services.env.get("EXTERNAL_STORAGE");});const gUseSDCard=true;const VERBOSE=1;let log=VERBOSE?function log_dump(msg){dump("DirectoryProvider: "+msg+"\n");}:function log_noop(msg){};function DirectoryProvider(){}
DirectoryProvider.prototype={classID:Components.ID("{9181eb7c-6f87-11e1-90b1-4f59d80dd2e5}"),QueryInterface:XPCOMUtils.generateQI([Ci.nsIDirectoryServiceProvider]),_xpcom_factory:XPCOMUtils.generateSingletonFactory(DirectoryProvider),_profD:null,getFile:function dp_getFile(prop,persistent){
if(prop=="coreAppsDir"){let appsDir=Services.dirsvc.get("ProfD",Ci.nsIFile);appsDir.append("webapps");persistent.value=true;return appsDir;}else if(prop=="ProfD"){let inParent=Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULRuntime).processType==Ci.nsIXULRuntime.PROCESS_TYPE_DEFAULT;if(inParent){return null;}
if(!this._profD){this._profD=cpmm.sendSyncMessage("getProfD",{})[0];}
let file=Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);file.initWithPath(this._profD);persistent.value=true;return file;}
return null;}, volumeHasFreeSpace:function dp_volumeHasFreeSpace(volumePath,requiredSpace){if(!volumePath){return false;}
if(!Services.volumeService){return false;}
let volume=Services.volumeService.createOrGetVolumeByPath(volumePath);if(!volume||volume.state!==Ci.nsIVolume.STATE_MOUNTED){return false;}
let stat=volume.getStats();if(!stat){return false;}
return requiredSpace<=stat.freeBytes;},findUpdateDirWithFreeSpace:function dp_findUpdateDirWithFreeSpace(requiredSpace,subdir){if(!Services.volumeService){return this.createUpdatesDir(LOCAL_DIR,subdir);}
let activeUpdate=Services.um.activeUpdate;if(gUseSDCard){if(this.volumeHasFreeSpace(gExtStorage,requiredSpace)){let extUpdateDir=this.createUpdatesDir(gExtStorage,subdir);if(extUpdateDir!==null){return extUpdateDir;}
log("Warning: "+gExtStorage+" has enough free space for update "+
activeUpdate.name+", but is not writable");}}
if(this.volumeHasFreeSpace(LOCAL_DIR,requiredSpace)){let localUpdateDir=this.createUpdatesDir(LOCAL_DIR,subdir);if(localUpdateDir!==null){return localUpdateDir;}
log("Warning: "+LOCAL_DIR+" has enough free space for update "+
activeUpdate.name+", but is not writable");}
return null;},getUpdateDir:function dp_getUpdateDir(persistent,subdir,multiple){let defaultUpdateDir=this.getDefaultUpdateDir();persistent.value=false;let activeUpdate=Services.um.activeUpdate;if(!activeUpdate){log("Warning: No active update found, using default update dir: "+
defaultUpdateDir);return defaultUpdateDir;}
let selectedPatch=activeUpdate.selectedPatch;if(!selectedPatch){log("Warning: No selected patch, using default update dir: "+
defaultUpdateDir);return defaultUpdateDir;}
let requiredSpace=selectedPatch.size*multiple;let updateDir=this.findUpdateDirWithFreeSpace(requiredSpace,subdir);if(updateDir){return updateDir;}


log("Error: No volume found with "+requiredSpace+" bytes for downloading"+" update "+activeUpdate.name);activeUpdate.errorCode=Cr.NS_ERROR_FILE_TOO_BIG;return null;},createUpdatesDir:function dp_createUpdatesDir(root,subdir){let dir=Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);dir.initWithPath(root);if(!dir.isWritable()){log("Error: "+dir.path+" isn't writable");return null;}
dir.appendRelativePath(subdir);if(dir.exists()){if(dir.isDirectory()&&dir.isWritable()){return dir;}

log("Error: "+dir.path+" is a file or isn't writable");return null;}

try{dir.create(Ci.nsIFile.DIRECTORY_TYPE,0770);}catch(e){log("Error: "+dir.path+" unable to create directory");return null;}
return dir;},getDefaultUpdateDir:function dp_getDefaultUpdateDir(){let path=gExtStorage;if(!path){path=LOCAL_DIR;}
if(Services.volumeService){let extVolume=Services.volumeService.createOrGetVolumeByPath(path);if(!extVolume){path=LOCAL_DIR;}}
let dir=Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile)
dir.initWithPath(path);if(!dir.exists()&&path!=LOCAL_DIR){ dir.initWithPath(LOCAL_DIR);if(!dir.exists()){throw Cr.NS_ERROR_FILE_NOT_FOUND;}}
dir.appendRelativePath("updates");return dir;}};this.NSGetFactory=XPCOMUtils.generateNSGetFactory([DirectoryProvider]);