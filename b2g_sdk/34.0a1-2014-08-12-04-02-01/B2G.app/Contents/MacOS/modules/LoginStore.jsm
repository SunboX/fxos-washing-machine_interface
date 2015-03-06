"use strict";this.EXPORTED_SYMBOLS=["LoginStore",];const{classes:Cc,interfaces:Ci,utils:Cu,results:Cr}=Components;Cu.import("resource://gre/modules/XPCOMUtils.jsm");Cu.import("resource://gre/modules/Task.jsm");XPCOMUtils.defineLazyModuleGetter(this,"AsyncShutdown","resource://gre/modules/AsyncShutdown.jsm");XPCOMUtils.defineLazyModuleGetter(this,"DeferredTask","resource://gre/modules/DeferredTask.jsm");XPCOMUtils.defineLazyModuleGetter(this,"FileUtils","resource://gre/modules/FileUtils.jsm");XPCOMUtils.defineLazyModuleGetter(this,"OS","resource://gre/modules/osfile.jsm")
XPCOMUtils.defineLazyGetter(this,"gTextDecoder",function(){return new TextDecoder();});XPCOMUtils.defineLazyGetter(this,"gTextEncoder",function(){return new TextEncoder();});const FileInputStream=Components.Constructor("@mozilla.org/network/file-input-stream;1","nsIFileInputStream","init");const kSaveDelayMs=1500;const kDataVersion=1;function LoginStore(aPath)
{this.path=aPath;this._saver=new DeferredTask(()=>this.save(),kSaveDelayMs);AsyncShutdown.profileBeforeChange.addBlocker("Login store: writing data",()=>this._saver.finalize());}
LoginStore.prototype={path:"",data:null,dataReady:false,load:function()
{return Task.spawn(function(){try{let bytes=yield OS.File.read(this.path);if(this.dataReady){return;}
this.data=JSON.parse(gTextDecoder.decode(bytes));}catch(ex){


if(!(ex instanceof OS.File.Error&&ex.becauseNoSuchFile)){Cu.reportError(ex);try{let openInfo=yield OS.File.openUnique(this.path+".corrupt",{humanReadable:true});yield openInfo.file.close();yield OS.File.move(this.path,openInfo.path);}catch(e2){Cu.reportError(e2);}}



if(this.dataReady){return;}
this.data={nextId:1,};}
this._processLoadedData();}.bind(this));},ensureDataReady:function()
{if(this.dataReady){return;}
try{let inputStream=new FileInputStream(new FileUtils.File(this.path),FileUtils.MODE_RDONLY,FileUtils.PERMS_FILE,0)
try{let json=Cc["@mozilla.org/dom/json;1"].createInstance(Ci.nsIJSON);this.data=json.decodeFromStream(inputStream,inputStream.available());}finally{inputStream.close();}}catch(ex){


if(!(ex instanceof Components.Exception&&ex.result==Cr.NS_ERROR_FILE_NOT_FOUND)){Cu.reportError(ex);try{let originalFile=new FileUtils.File(this.path);let backupFile=originalFile.clone();backupFile.leafName+=".corrupt";backupFile.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE,FileUtils.PERMS_FILE);backupFile.remove(false);originalFile.moveTo(backupFile.parent,backupFile.leafName);}catch(e2){Cu.reportError(e2);}}
this.data={nextId:1,};}
this._processLoadedData();},_processLoadedData:function()
{if(!this.data.logins){this.data.logins=[];}
if(!this.data.disabledHosts){this.data.disabledHosts=[];}
this.data.version=kDataVersion;this.dataReady=true;},saveSoon:function()this._saver.arm(),_saver:null,save:function()
{return Task.spawn(function(){let bytes=gTextEncoder.encode(JSON.stringify(this.data));yield OS.File.writeAtomic(this.path,bytes,{tmpPath:this.path+".tmp"});}.bind(this));},};