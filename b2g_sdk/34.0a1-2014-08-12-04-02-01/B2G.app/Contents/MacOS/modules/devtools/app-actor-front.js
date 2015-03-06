const{Ci,Cc,Cu,Cr}=require("chrome");Cu.import("resource://gre/modules/osfile.jsm");const{Services}=Cu.import("resource://gre/modules/Services.jsm");const{FileUtils}=Cu.import("resource://gre/modules/FileUtils.jsm");const{NetUtil}=Cu.import("resource://gre/modules/NetUtil.jsm");const{devtools}=Cu.import("resource://gre/modules/devtools/Loader.jsm",{});const{Promise:promise}=Cu.import("resource://gre/modules/Promise.jsm",{});const EventEmitter=require("devtools/toolkit/event-emitter");
const PR_USEC_PER_MSEC=1000;const PR_RDWR=0x04;const PR_CREATE_FILE=0x08;const PR_TRUNCATE=0x20;const CHUNK_SIZE=10000;const appTargets=new Map();const fronts=new Map();function addDirToZip(writer,dir,basePath){let files=dir.directoryEntries;while(files.hasMoreElements()){let file=files.getNext().QueryInterface(Ci.nsIFile);if(file.isHidden()||file.isSpecial()||file.equals(writer.file))
{continue;}
if(file.isDirectory()){writer.addEntryDirectory(basePath+file.leafName+"/",file.lastModifiedTime*PR_USEC_PER_MSEC,true);addDirToZip(writer,file,basePath+file.leafName+"/");}else{writer.addEntryFile(basePath+file.leafName,Ci.nsIZipWriter.COMPRESSION_DEFAULT,file,true);}}}
function getResultTest(code){let regexp=/^\[Exception... "(.*)"  nsresult: "0x[0-9a-fA-F]* \((.*)\)"  location: ".*"  data: .*\]$/;let ex=Cc["@mozilla.org/js/xpc/Exception;1"].createInstance(Ci.nsIXPCException);ex.initialize(null,code,null,null,null,null);let[,message,name]=regexp.exec(ex.toString());return{name:name,message:message};}
function zipDirectory(zipFile,dirToArchive){let deferred=promise.defer();let writer=Cc["@mozilla.org/zipwriter;1"].createInstance(Ci.nsIZipWriter);writer.open(zipFile,PR_RDWR|PR_CREATE_FILE|PR_TRUNCATE);this.addDirToZip(writer,dirToArchive,"");writer.processQueue({onStartRequest:function onStartRequest(request,context){},onStopRequest:(request,context,status)=>{if(status==Cr.NS_OK){writer.close();deferred.resolve(zipFile);}
else{let{name,message}=getResultText(status);deferred.reject(name+": "+message);}}},null);return deferred.promise;}
function uploadPackage(client,webappsActor,packageFile){if(client.traits.bulk){return uploadPackageBulk(client,webappsActor,packageFile);}else{return uploadPackageJSON(client,webappsActor,packageFile);}}
function uploadPackageJSON(client,webappsActor,packageFile){let deferred=promise.defer();let request={to:webappsActor,type:"uploadPackage"};client.request(request,(res)=>{openFile(res.actor);});let fileSize;let bytesRead=0;function emitProgress(){emitInstallProgress({bytesSent:bytesRead,totalBytes:fileSize});}
function openFile(actor){let openedFile;OS.File.open(packageFile.path).then(file=>{openedFile=file;return openedFile.stat();}).then(fileInfo=>{fileSize=fileInfo.size;emitProgress();uploadChunk(actor,openedFile);});}
function uploadChunk(actor,file){file.read(CHUNK_SIZE).then(function(bytes){bytesRead+=bytes.length;emitProgress();
 let chunk=String.fromCharCode.apply(null,bytes);let request={to:actor,type:"chunk",chunk:chunk};client.request(request,(res)=>{if(bytes.length==CHUNK_SIZE){uploadChunk(actor,file);}else{file.close().then(function(){endsUpload(actor);});}});});}
function endsUpload(actor){let request={to:actor,type:"done"};client.request(request,(res)=>{deferred.resolve(actor);});}
return deferred.promise;}
function uploadPackageBulk(client,webappsActor,packageFile){let deferred=promise.defer();let request={to:webappsActor,type:"uploadPackage",bulk:true};client.request(request,(res)=>{startBulkUpload(res.actor);});function startBulkUpload(actor){console.log("Starting bulk upload");let fileSize=packageFile.fileSize;console.log("File size: "+fileSize);let request=client.startBulkRequest({actor:actor,type:"stream",length:fileSize});request.on("bulk-send-ready",({copyFrom})=>{NetUtil.asyncFetch(packageFile,function(inputStream){let copying=copyFrom(inputStream);copying.on("progress",(e,progress)=>{emitInstallProgress(progress);});copying.then(()=>{console.log("Bulk upload done");inputStream.close();deferred.resolve(actor);});});});}
return deferred.promise;}
function removeServerTemporaryFile(client,fileActor){let request={to:fileActor,type:"remove"};client.request(request);}
function installPackaged(client,webappsActor,packagePath,appId){let deferred=promise.defer();let file=FileUtils.File(packagePath);let packagePromise;if(file.isDirectory()){let tmpZipFile=FileUtils.getDir("TmpD",[],true);tmpZipFile.append("application.zip");tmpZipFile.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE,parseInt("666",8));packagePromise=zipDirectory(tmpZipFile,file)}else{packagePromise=promise.resolve(file);}
packagePromise.then((zipFile)=>{uploadPackage(client,webappsActor,zipFile).then((fileActor)=>{let request={to:webappsActor,type:"install",appId:appId,upload:fileActor};client.request(request,(res)=>{ if(res.error){deferred.reject(res);}
if("error"in res)
deferred.reject({error:res.error,message:res.message});else
deferred.resolve({appId:res.appId});});
if(zipFile!=file)
zipFile.remove(false);
 deferred.promise.then(()=>removeServerTemporaryFile(client,fileActor),()=>removeServerTemporaryFile(client,fileActor));});});return deferred.promise;}
exports.installPackaged=installPackaged;function emitInstallProgress(progress){exports.emit("install-progress",progress);}
function installHosted(client,webappsActor,appId,metadata,manifest){let deferred=promise.defer();let request={to:webappsActor,type:"install",appId:appId,metadata:metadata,manifest:manifest};client.request(request,(res)=>{if(res.error){deferred.reject(res);}
if("error"in res)
deferred.reject({error:res.error,message:res.message});else
deferred.resolve({appId:res.appId});});return deferred.promise;}
exports.installHosted=installHosted;function getTargetForApp(client,webappsActor,manifestURL){

let existingTarget=appTargets.get(manifestURL);if(existingTarget)
return promise.resolve(existingTarget);let deferred=promise.defer();let request={to:webappsActor,type:"getAppActor",manifestURL:manifestURL,}
client.request(request,(res)=>{if(res.error){deferred.reject(res.error);}else{let options={form:res.actor,client:client,chrome:false};devtools.TargetFactory.forRemoteTab(options).then((target)=>{target.isApp=true;appTargets.set(manifestURL,target);target.on("close",()=>{appTargets.delete(manifestURL);});deferred.resolve(target)},(error)=>{deferred.reject(error);});}});return deferred.promise;}
exports.getTargetForApp=getTargetForApp;function reloadApp(client,webappsActor,manifestURL){return getTargetForApp(client,webappsActor,manifestURL).then((target)=>{ let request={to:target.form.actor,type:"reload",manifestURL:manifestURL};return client.request(request);},()=>{throw new Error("Not running");});}
exports.reloadApp=reloadApp;function launchApp(client,webappsActor,manifestURL){return client.request({to:webappsActor,type:"launch",manifestURL:manifestURL});}
exports.launchApp=launchApp;function closeApp(client,webappsActor,manifestURL){return client.request({to:webappsActor,type:"close",manifestURL:manifestURL});}
exports.closeApp=closeApp;function getTarget(client,form){let deferred=promise.defer();let options={form:form,client:client,chrome:false};devtools.TargetFactory.forRemoteTab(options).then((target)=>{target.isApp=true;deferred.resolve(target)},(error)=>{deferred.reject(error);});return deferred.promise;}
function App(client,webappsActor,manifest){this.client=client;this.webappsActor=webappsActor;this.manifest=manifest; this.running=false;}
App.prototype={getForm:function(){if(this._form){return promise.resolve(this._form);}
let request={to:this.webappsActor,type:"getAppActor",manifestURL:this.manifest.manifestURL};return this.client.request(request).then(res=>{return this._form=res.actor;});},getTarget:function(){if(this._target){return promise.resolve(this._target);}
return this.getForm().then((form)=>getTarget(this.client,form)).then((target)=>{target.on("close",()=>{delete this._form;delete this._target;});return this._target=target;});}};function AppActorFront(client,form){if(fronts.has(form.webappsActor)){return fronts.get(form.webappsActor);}
fronts.set(form.webappsActor,this);this.client=client;this.actor=form.webappsActor;this._clientListener=this._clientListener.bind(this);this._listeners=[];}
AppActorFront.prototype={get runningApps(){if(!this._apps){throw new Error("Can't get running apps before calling watchApps.");}
let r=new Map();for(let[manifestURL,app]of this._apps){if(app.running){r.set(manifestURL,app);}}
return r;},get apps(){if(!this._apps){throw new Error("Can't get apps before calling watchApps.");}
return this._apps;},_getApp:function(manifestURL){let app=this._apps.get(manifestURL);if(app){return promise.resolve(app);}else{let request={to:this.actor,type:"getApp",manifestURL:manifestURL};return this.client.request(request).then(res=>{let app=new App(this.client,this.actor,res.app);this._apps.set(manifestURL,app);return app;},e=>{console.error("Unable to retrieve app",manifestURL,e);});}},watchApps:function(listener){this._listeners.push(listener);
 if(this._listeners.length>1){this.runningApps.forEach((app,manifestURL)=>{listener("appOpen",app);});return promise.resolve();}
let client=this.client;let f=this._clientListener;client.addListener("appOpen",f);client.addListener("appClose",f);client.addListener("appInstall",f);client.addListener("appUninstall",f);
 let request={to:this.actor,type:"getAll"};return this.client.request(request).then(res=>{this._apps=new Map();for(let a of res.apps){let app=new App(this.client,this.actor,a);this._apps.set(a.manifestURL,app);}}).then(()=>{ let request={to:this.actor,type:"listRunningApps"};return this.client.request(request).then(res=>res.apps);}).then(apps=>{let promises=apps.map(manifestURL=>{ return this._getApp(manifestURL).then(app=>{app.running=true; this._notifyListeners("appOpen",app);});});return promise.all(promises);}).then(()=>{ let request={to:this.actor,type:"watchApps"};return this.client.request(request);});},_clientListener:function(type,message){let{manifestURL}=message;this._getApp(manifestURL).then((app)=>{switch(type){case"appOpen":app.running=true;break;case"appClose":app.running=false;case"appInstall": break;case"appUninstall": if(app.running){app.running=false;this._notifyListeners("appClose",app);}
this._apps.delete(manifestURL);break;default:return;}
this._notifyListeners(type,app);});},_notifyListeners:function(type,app){this._listeners.forEach(f=>{f(type,app);});},unwatchApps:function(listener){let idx=this._listeners.indexOf(listener);if(idx!=-1){this._listeners.splice(idx,1);} 
if(this._listeners.length!=0){return;}
let request={to:this.actor,type:"unwatchApps"};this.client.request(request);let client=this.client;let f=this._clientListener;client.removeListener("appOpen",f);client.removeListener("appClose",f);client.removeListener("appInstall",f);client.removeListener("appUninstall",f);}}
exports.AppActorFront=AppActorFront;EventEmitter.decorate(exports);