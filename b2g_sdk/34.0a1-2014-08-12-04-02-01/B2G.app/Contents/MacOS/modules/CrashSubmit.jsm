Components.utils.import("resource://gre/modules/Services.jsm");Components.utils.import("resource://gre/modules/KeyValueParser.jsm");this.EXPORTED_SYMBOLS=["CrashSubmit"];const Cc=Components.classes;const Ci=Components.interfaces;const STATE_START=Ci.nsIWebProgressListener.STATE_START;const STATE_STOP=Ci.nsIWebProgressListener.STATE_STOP;const SUCCESS="success";const FAILED="failed";const SUBMITTING="submitting";let reportURL=null;let strings=null;let myListener=null;function parseINIStrings(file){var factory=Cc["@mozilla.org/xpcom/ini-parser-factory;1"].getService(Ci.nsIINIParserFactory);var parser=factory.createINIParser(file);var obj={};var en=parser.getKeys("Strings");while(en.hasMore()){var key=en.getNext();obj[key]=parser.getString("Strings",key);}
return obj;}

function getL10nStrings(){let dirSvc=Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties);let path=dirSvc.get("GreD",Ci.nsIFile);path.append("crashreporter.ini");if(!path.exists()){ path=path.parent;path.append("crashreporter.app");path.append("Contents");path.append("MacOS");path.append("crashreporter.ini");if(!path.exists()){ return;}}
let crstrings=parseINIStrings(path);strings={'crashid':crstrings.CrashID,'reporturl':crstrings.CrashDetailsURL};path=dirSvc.get("XCurProcD",Ci.nsIFile);path.append("crashreporter-override.ini");if(path.exists()){crstrings=parseINIStrings(path);if('CrashID'in crstrings)
strings['crashid']=crstrings.CrashID;if('CrashDetailsURL'in crstrings)
strings['reporturl']=crstrings.CrashDetailsURL;}}
function getDir(name){let directoryService=Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties);let dir=directoryService.get("UAppData",Ci.nsIFile);dir.append("Crash Reports");dir.append(name);return dir;}
function writeFile(dirName,fileName,data){let path=getDir(dirName);if(!path.exists())
path.create(Ci.nsIFile.DIRECTORY_TYPE,0700);path.append(fileName);var fs=Cc["@mozilla.org/network/file-output-stream;1"].createInstance(Ci.nsIFileOutputStream); fs.init(path,-1,-1,0);var os=Cc["@mozilla.org/intl/converter-output-stream;1"].createInstance(Ci.nsIConverterOutputStream);os.init(fs,"UTF-8",0,0x0000);os.writeString(data);os.close();fs.close();}
function getPendingMinidump(id){let pendingDir=getDir("pending");let dump=pendingDir.clone();let extra=pendingDir.clone();dump.append(id+".dmp");extra.append(id+".extra");return[dump,extra];}
function getAllPendingMinidumpsIDs(){let minidumps=[];let pendingDir=getDir("pending");if(!(pendingDir.exists()&&pendingDir.isDirectory()))
return[];let entries=pendingDir.directoryEntries;while(entries.hasMoreElements()){let entry=entries.getNext().QueryInterface(Ci.nsIFile);if(entry.isFile()){let matches=entry.leafName.match(/(.+)\.extra$/);if(matches)
minidumps.push(matches[1]);}}
return minidumps;}
function pruneSavedDumps(){const KEEP=10;let pendingDir=getDir("pending");if(!(pendingDir.exists()&&pendingDir.isDirectory()))
return;let entries=pendingDir.directoryEntries;let entriesArray=[];while(entries.hasMoreElements()){let entry=entries.getNext().QueryInterface(Ci.nsIFile);if(entry.isFile()){let matches=entry.leafName.match(/(.+)\.extra$/);if(matches)
entriesArray.push(entry);}}
entriesArray.sort(function(a,b){let dateA=a.lastModifiedTime;let dateB=b.lastModifiedTime;if(dateA<dateB)
return-1;if(dateB<dateA)
return 1;return 0;});if(entriesArray.length>KEEP){for(let i=0;i<entriesArray.length-KEEP;++i){let extra=entriesArray[i];let matches=extra.leafName.match(/(.+)\.extra$/);if(matches){let dump=extra.clone();dump.leafName=matches[1]+'.dmp';dump.remove(false);extra.remove(false);}}}}
function addFormEntry(doc,form,name,value){var input=doc.createElement("input");input.type="hidden";input.name=name;input.value=value;form.appendChild(input);}
function writeSubmittedReport(crashID,viewURL){var data=strings.crashid.replace("%s",crashID);if(viewURL)
data+="\n"+strings.reporturl.replace("%s",viewURL);writeFile("submitted",crashID+".txt",data);}
function Submitter(id,processType,submitSuccess,submitError,noThrottle,extraExtraKeyVals){this.id=id;this.processType=processType;this.successCallback=submitSuccess;this.errorCallback=submitError;this.noThrottle=noThrottle;this.additionalDumps=[];this.extraKeyVals=extraExtraKeyVals||{};}
Submitter.prototype={submitSuccess:function Submitter_submitSuccess(ret)
{writeSubmittedReport(ret.CrashID,ret.ViewURL); try{this.dump.remove(false);this.extra.remove(false);for(let i of this.additionalDumps){i.dump.remove(false);}}
catch(ex){}
this.notifyStatus(SUCCESS,ret);this.cleanup();},cleanup:function Submitter_cleanup(){ this.successCallback=null;this.errorCallback=null;this.iframe=null;this.dump=null;this.extra=null;this.additionalDumps=null; let idx=CrashSubmit._activeSubmissions.indexOf(this);if(idx!=-1)
CrashSubmit._activeSubmissions.splice(idx,1);},submitForm:function Submitter_submitForm()
{if(!('ServerURL'in this.extraKeyVals)){return false;}
let serverURL=this.extraKeyVals.ServerURL;var envOverride=Cc['@mozilla.org/process/environment;1'].getService(Ci.nsIEnvironment).get("MOZ_CRASHREPORTER_URL");if(envOverride!=''){serverURL=envOverride;}
else if('PluginHang'in this.extraKeyVals){try{serverURL=Services.prefs.getCharPref("toolkit.crashreporter.pluginHangSubmitURL");}catch(e){}}
let xhr=Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Ci.nsIXMLHttpRequest);xhr.open("POST",serverURL,true);let formData=Cc["@mozilla.org/files/formdata;1"].createInstance(Ci.nsIDOMFormData); for(let[name,value]in Iterator(this.extraKeyVals)){if(name!="ServerURL"){formData.append(name,value);}}
if(this.noThrottle){ formData.append("Throttleable","0");} 
formData.append("upload_file_minidump",File(this.dump.path));if(this.additionalDumps.length>0){let names=[];for(let i of this.additionalDumps){names.push(i.name);formData.append("upload_file_minidump_"+i.name,File(i.dump.path));}}
let self=this;xhr.addEventListener("readystatechange",function(aEvt){if(xhr.readyState==4){let ret=xhr.status==200?parseKeyValuePairs(xhr.responseText):{};let submitted=!!ret.CrashID;if(self.processType){let crashTime=new Date();let manager=Services.crashmanager;manager.addSubmission(self.processType,manager.CRASH_TYPE_CRASH,submitted,submitted?ret.CrashID:"",crashTime);}
if(submitted){self.submitSuccess(ret);}
else{self.notifyStatus(FAILED);self.cleanup();}}},false);xhr.send(formData);return true;},notifyStatus:function Submitter_notify(status,ret)
{let propBag=Cc["@mozilla.org/hash-property-bag;1"].createInstance(Ci.nsIWritablePropertyBag2);propBag.setPropertyAsAString("minidumpID",this.id);if(status==SUCCESS){propBag.setPropertyAsAString("serverCrashID",ret.CrashID);}
let extraKeyValsBag=Cc["@mozilla.org/hash-property-bag;1"].createInstance(Ci.nsIWritablePropertyBag2);for(let key in this.extraKeyVals){extraKeyValsBag.setPropertyAsAString(key,this.extraKeyVals[key]);}
propBag.setPropertyAsInterface("extra",extraKeyValsBag);Services.obs.notifyObservers(propBag,"crash-report-status",status);switch(status){case SUCCESS:if(this.successCallback)
this.successCallback(this.id,ret);break;case FAILED:if(this.errorCallback)
this.errorCallback(this.id);break;default:}},submit:function Submitter_submit()
{let[dump,extra]=getPendingMinidump(this.id);if(!dump.exists()||!extra.exists()){this.notifyStatus(FAILED);this.cleanup();return false;}
let extraKeyVals=parseKeyValuePairsFromFile(extra);for(let key in extraKeyVals){if(!(key in this.extraKeyVals)){this.extraKeyVals[key]=extraKeyVals[key];}}
let additionalDumps=[];if("additional_minidumps"in this.extraKeyVals){let names=this.extraKeyVals.additional_minidumps.split(',');for(let name of names){let[dump,extra]=getPendingMinidump(this.id+"-"+name);if(!dump.exists()){this.notifyStatus(FAILED);this.cleanup();return false;}
additionalDumps.push({'name':name,'dump':dump});}}
this.notifyStatus(SUBMITTING);this.dump=dump;this.extra=extra;this.additionalDumps=additionalDumps;if(!this.submitForm()){this.notifyStatus(FAILED);this.cleanup();return false;}
return true;}};this.CrashSubmit={submit:function CrashSubmit_submit(id,params)
{params=params||{};let processType=null;let submitSuccess=null;let submitError=null;let noThrottle=false;let extraExtraKeyVals=null;if('processType'in params)
processType=params.processType;if('submitSuccess'in params)
submitSuccess=params.submitSuccess;if('submitError'in params)
submitError=params.submitError;if('noThrottle'in params)
noThrottle=params.noThrottle;if('extraExtraKeyVals'in params)
extraExtraKeyVals=params.extraExtraKeyVals;let submitter=new Submitter(id,processType,submitSuccess,submitError,noThrottle,extraExtraKeyVals);CrashSubmit._activeSubmissions.push(submitter);return submitter.submit();},delete:function CrashSubmit_delete(id){let[dump,extra]=getPendingMinidump(id);dump.QueryInterface(Ci.nsIFile).remove(false);extra.QueryInterface(Ci.nsIFile).remove(false);},pendingIDs:function CrashSubmit_pendingIDs(){return getAllPendingMinidumpsIDs();},pruneSavedDumps:function CrashSubmit_pruneSavedDumps(){pruneSavedDumps();}, _activeSubmissions:[]};getL10nStrings();