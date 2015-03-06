"use strict";const Cu=Components.utils;const Cc=Components.classes;const Ci=Components.interfaces;Cu.import("resource://gre/modules/osfile.jsm");Cu.import("resource://gre/modules/Promise.jsm");let MakeTimer=()=>Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);this.EXPORTED_SYMBOLS=["DeferredSave"];const DEFAULT_SAVE_DELAY_MS=50;Cu.import("resource://gre/modules/Log.jsm");
const DEFERREDSAVE_PARENT_LOGGER_ID="DeferredSave";let parentLogger=Log.repository.getLogger(DEFERREDSAVE_PARENT_LOGGER_ID);parentLogger.level=Log.Level.Warn;let formatter=new Log.BasicFormatter();
parentLogger.addAppender(new Log.ConsoleAppender(formatter));
parentLogger.addAppender(new Log.DumpAppender(formatter));



Cu.import("resource://gre/modules/Services.jsm");const PREF_LOGGING_ENABLED="extensions.logging.enabled";const NS_PREFBRANCH_PREFCHANGE_TOPIC_ID="nsPref:changed";var PrefObserver={init:function PrefObserver_init(){Services.prefs.addObserver(PREF_LOGGING_ENABLED,this,false);Services.obs.addObserver(this,"xpcom-shutdown",false);this.observe(null,NS_PREFBRANCH_PREFCHANGE_TOPIC_ID,PREF_LOGGING_ENABLED);},observe:function PrefObserver_observe(aSubject,aTopic,aData){if(aTopic=="xpcom-shutdown"){Services.prefs.removeObserver(PREF_LOGGING_ENABLED,this);Services.obs.removeObserver(this,"xpcom-shutdown");}
else if(aTopic==NS_PREFBRANCH_PREFCHANGE_TOPIC_ID){let debugLogEnabled=false;try{debugLogEnabled=Services.prefs.getBoolPref(PREF_LOGGING_ENABLED);}
catch(e){}
if(debugLogEnabled){parentLogger.level=Log.Level.Debug;}
else{parentLogger.level=Log.Level.Warn;}}}};PrefObserver.init();this.DeferredSave=function(aPath,aDataProvider,aDelay){ 
let leafName=OS.Path.basename(aPath);let logger_id=DEFERREDSAVE_PARENT_LOGGER_ID+"."+leafName;this.logger=Log.repository.getLogger(logger_id);

this._pending=null;




 this._writing=Promise.resolve(0); this.writeInProgress=false;this._path=aPath;this._dataProvider=aDataProvider;this._timer=null;
 this.totalSaves=0;
 this.overlappedSaves=0;this._lastError=null;if(aDelay&&(aDelay>0))
this._delay=aDelay;else
this._delay=DEFAULT_SAVE_DELAY_MS;}
this.DeferredSave.prototype={get dirty(){return this._pending||this.writeInProgress;},get lastError(){return this._lastError;}, _startTimer:function(){if(!this._pending){return;}
this.logger.debug("Starting timer");if(!this._timer)
this._timer=MakeTimer();this._timer.initWithCallback(()=>this._deferredSave(),this._delay,Ci.nsITimer.TYPE_ONE_SHOT);},saveChanges:function(){this.logger.debug("Save changes");if(!this._pending){if(this.writeInProgress){this.logger.debug("Data changed while write in progress");this.overlappedSaves++;}
this._pending=Promise.defer(); 
this._writing.then(count=>this._startTimer(),error=>this._startTimer());}
return this._pending.promise;},_deferredSave:function(){let pending=this._pending;this._pending=null;let writing=this._writing;this._writing=pending.promise;
let toSave=null;try{toSave=this._dataProvider();}
catch(e){this.logger.error("Deferred save dataProvider failed",e);writing.then(null,error=>{}).then(count=>{pending.reject(e);});return;}
writing.then(null,error=>{return 0;}).then(count=>{this.logger.debug("Starting write");this.totalSaves++;this.writeInProgress=true;OS.File.writeAtomic(this._path,toSave,{tmpPath:this._path+".tmp"}).then(result=>{this._lastError=null;this.writeInProgress=false;this.logger.debug("Write succeeded");pending.resolve(result);},error=>{this._lastError=error;this.writeInProgress=false;this.logger.warn("Write failed",error);pending.reject(error);});});},flush:function(){

if(this._pending){this.logger.debug("Flush called while data is dirty");if(this._timer){this._timer.cancel();this._timer=null;}
this._deferredSave();}
return this._writing;}};