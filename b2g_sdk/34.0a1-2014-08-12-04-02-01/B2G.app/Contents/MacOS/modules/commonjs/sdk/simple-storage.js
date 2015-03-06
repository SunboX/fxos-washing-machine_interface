"use strict";module.metadata={"stability":"stable"};const{Cc,Ci,Cu}=require("chrome");const file=require("./io/file");const prefs=require("./preferences/service");const jpSelf=require("./self");const timer=require("./timers");const unload=require("./system/unload");const{emit,on,off}=require("./event/core");const{defer}=require('./core/promise');const{Task}=Cu.import("resource://gre/modules/Task.jsm",{});const WRITE_PERIOD_PREF="extensions.addon-sdk.simple-storage.writePeriod";const WRITE_PERIOD_DEFAULT=300000;const QUOTA_PREF="extensions.addon-sdk.simple-storage.quota";const QUOTA_DEFAULT=5242880;const JETPACK_DIR_BASENAME="jetpack";Object.defineProperties(exports,{storage:{enumerable:true,get:function(){return manager.root;},set:function(value){manager.root=value;}},quotaUsage:{get:function(){return manager.quotaUsage;}}});function getHash(data){let{promise,resolve}=defer();let crypto=Cc["@mozilla.org/security/hash;1"].createInstance(Ci.nsICryptoHash);crypto.init(crypto.MD5);let listener={onStartRequest:function(){},onDataAvailable:function(request,context,inputStream,offset,count){crypto.updateFromStream(inputStream,count);},onStopRequest:function(request,context,status){resolve(crypto.finish(false));}};let converter=Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);converter.charset="UTF-8";let stream=converter.convertToInputStream(data);let pump=Cc["@mozilla.org/network/input-stream-pump;1"].createInstance(Ci.nsIInputStreamPump);pump.init(stream,-1,-1,0,0,true);pump.asyncRead(listener,null);return promise;}
function writeData(filename,data){let{promise,resolve,reject}=defer();let stream=file.open(filename,"w");try{stream.writeAsync(data,err=>{if(err)
reject(err);else
resolve();});}
catch(err){stream.close();reject(err);}
return promise;}

function JsonStore(options){this.filename=options.filename;this.quota=options.quota;this.writePeriod=options.writePeriod;this.onOverQuota=options.onOverQuota;this.onWrite=options.onWrite;this.hash=null;unload.ensure(this);this.startTimer();}
JsonStore.prototype={get root(){return this.isRootInited?this._root:{};},set root(val){let types=["array","boolean","null","number","object","string"];if(types.indexOf(typeof(val))<0){throw new Error("storage must be one of the following types: "+
types.join(", "));}
this._root=val;return val;},
get isRootInited(){return this._root!==undefined;},get quotaUsage(){return this.quota>0?JSON.stringify(this.root).length/this.quota:undefined;},startTimer:function JsonStore_startTimer(){timer.setTimeout(()=>{this.write().then(this.startTimer.bind(this));},this.writePeriod);},purge:function JsonStore_purge(){try{file.remove(this.filename);this.hash=null;let parentPath=this.filename;do{parentPath=file.dirname(parentPath);file.rmdir(parentPath);}while(file.basename(parentPath)!==JETPACK_DIR_BASENAME);}
catch(err){}},read:function JsonStore_read(){try{let str=file.read(this.filename);

this.root=JSON.parse(str);let self=this;getHash(str).then(hash=>this.hash=hash);}
catch(err){this.root={};this.hash=null;}},
unload:function JsonStore_unload(reason){timer.clearTimeout(this.writeTimer);this.writeTimer=null;if(reason==="uninstall")
this.purge();else
this.write();},get _isEmpty(){if(this.root&&typeof(this.root)==="object"){let empty=true;for(let key in this.root){empty=false;break;}
return empty;}
return false;},

write:Task.async(function JsonStore_write(){
if(!this.isRootInited||(this._isEmpty&&!file.exists(this.filename)))
return;let data=JSON.stringify(this.root);
if((this.quota>0)&&(data.length>this.quota)){this.onOverQuota(this);return;} 
let hash=yield getHash(data);if(hash==this.hash)
return;try{yield writeData(this.filename,data);this.hash=hash;if(this.onWrite)
this.onWrite(this);}
catch(err){console.error("Error writing simple storage file: "+this.filename);console.error(err);}})};
let manager=({jsonStore:null,get filename(){let storeFile=Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties).get("ProfD",Ci.nsIFile);storeFile.append(JETPACK_DIR_BASENAME);storeFile.append(jpSelf.id);storeFile.append("simple-storage");file.mkpath(storeFile.path);storeFile.append("store.json");return storeFile.path;},get quotaUsage(){return this.jsonStore.quotaUsage;},get root(){if(!this.jsonStore.isRootInited)
this.jsonStore.read();return this.jsonStore.root;},set root(val){return this.jsonStore.root=val;},unload:function manager_unload(){off(this);},new:function manager_constructor(){let manager=Object.create(this);unload.ensure(manager);manager.jsonStore=new JsonStore({filename:manager.filename,writePeriod:prefs.get(WRITE_PERIOD_PREF,WRITE_PERIOD_DEFAULT),quota:prefs.get(QUOTA_PREF,QUOTA_DEFAULT),onOverQuota:emit.bind(null,exports,"OverQuota")});return manager;}}).new();exports.on=on.bind(null,exports);exports.removeListener=function(type,listener){off(exports,type,listener);};