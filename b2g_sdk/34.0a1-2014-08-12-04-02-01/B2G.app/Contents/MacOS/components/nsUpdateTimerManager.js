Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");Components.utils.import("resource://gre/modules/Services.jsm");const Cc=Components.classes;const Ci=Components.interfaces;const PREF_APP_UPDATE_LASTUPDATETIME_FMT="app.update.lastUpdateTime.%ID%";const PREF_APP_UPDATE_TIMERMINIMUMDELAY="app.update.timerMinimumDelay";const PREF_APP_UPDATE_TIMERFIRSTINTERVAL="app.update.timerFirstInterval";const PREF_APP_UPDATE_LOG="app.update.log";const CATEGORY_UPDATE_TIMER="update-timer";XPCOMUtils.defineLazyGetter(this,"gLogEnabled",function tm_gLogEnabled(){return getPref("getBoolPref",PREF_APP_UPDATE_LOG,false);});function getPref(func,preference,defaultValue){try{return Services.prefs[func](preference);}
catch(e){}
return defaultValue;}
function LOG(string){if(gLogEnabled){dump("*** UTM:SVC "+string+"\n");Services.console.logStringMessage("UTM:SVC "+string);}}
function TimerManager(){Services.obs.addObserver(this,"xpcom-shutdown",false);}
TimerManager.prototype={_timer:null,_timerMinimumDelay:null,_timers:{},observe:function TM_observe(aSubject,aTopic,aData){var minInterval=30000;
var minFirstInterval=10000;switch(aTopic){case"utm-test-init":
minInterval=500;minFirstInterval=500;case"profile-after-change":
this._timerMinimumDelay=Math.max(1000*getPref("getIntPref",PREF_APP_UPDATE_TIMERMINIMUMDELAY,120),minInterval);let firstInterval=Math.max(getPref("getIntPref",PREF_APP_UPDATE_TIMERFIRSTINTERVAL,this._timerMinimumDelay),minFirstInterval);this._canEnsureTimer=true;this._ensureTimer(firstInterval);break;case"xpcom-shutdown":Services.obs.removeObserver(this,"xpcom-shutdown");this._cancelTimer();for(var timerID in this._timers)
delete this._timers[timerID];this._timers=null;break;}},notify:function TM_notify(timer){var nextDelay=null;function updateNextDelay(delay){if(nextDelay===null||delay<nextDelay)
nextDelay=delay;}


var now=Math.round(Date.now()/1000);var callbackToFire=null;var earliestIntendedTime=null;var skippedFirings=false;function tryFire(callback,intendedTime){var selected=false;if(intendedTime<=now){if(intendedTime<earliestIntendedTime||earliestIntendedTime===null){callbackToFire=callback;earliestIntendedTime=intendedTime;selected=true;}
else if(earliestIntendedTime!==null)
skippedFirings=true;}



if(!selected)
updateNextDelay(intendedTime-now);}
var catMan=Cc["@mozilla.org/categorymanager;1"].getService(Ci.nsICategoryManager);var entries=catMan.enumerateCategory(CATEGORY_UPDATE_TIMER);while(entries.hasMoreElements()){let entry=entries.getNext().QueryInterface(Ci.nsISupportsCString).data;let value=catMan.getCategoryEntry(CATEGORY_UPDATE_TIMER,entry);let[cid,method,timerID,prefInterval,defaultInterval]=value.split(",");defaultInterval=parseInt(defaultInterval);if(!timerID||!defaultInterval||isNaN(defaultInterval)){LOG("TimerManager:notify - update-timer category registered"+
(cid?" for "+cid:"")+" without required parameters - "+"skipping");continue;}
let interval=getPref("getIntPref",prefInterval,defaultInterval);let prefLastUpdate=PREF_APP_UPDATE_LASTUPDATETIME_FMT.replace(/%ID%/,timerID);
let lastUpdateTime=getPref("getIntPref",prefLastUpdate,0);

if(lastUpdateTime>now)
lastUpdateTime=0;if(lastUpdateTime==0)
Services.prefs.setIntPref(prefLastUpdate,lastUpdateTime);tryFire(function(){try{Components.classes[cid][method](Ci.nsITimerCallback).notify(timer);LOG("TimerManager:notify - notified "+cid);}
catch(e){LOG("TimerManager:notify - error notifying component id: "+
cid+" ,error: "+e);}
lastUpdateTime=now;Services.prefs.setIntPref(prefLastUpdate,lastUpdateTime);updateNextDelay(lastUpdateTime+interval-now);},lastUpdateTime+interval);}
for(let _timerID in this._timers){let timerID=_timerID; let timerData=this._timers[timerID];

if(timerData.lastUpdateTime>now){let prefLastUpdate=PREF_APP_UPDATE_LASTUPDATETIME_FMT.replace(/%ID%/,timerID);timerData.lastUpdateTime=0;Services.prefs.setIntPref(prefLastUpdate,timerData.lastUpdateTime);}
tryFire(function(){if(timerData.callback&&timerData.callback.notify){try{timerData.callback.notify(timer);LOG("TimerManager:notify - notified timerID: "+timerID);}
catch(e){LOG("TimerManager:notify - error notifying timerID: "+timerID+", error: "+e);}}
else{LOG("TimerManager:notify - timerID: "+timerID+" doesn't "+"implement nsITimerCallback - skipping");}
lastUpdateTime=now;timerData.lastUpdateTime=lastUpdateTime;let prefLastUpdate=PREF_APP_UPDATE_LASTUPDATETIME_FMT.replace(/%ID%/,timerID);Services.prefs.setIntPref(prefLastUpdate,lastUpdateTime);updateNextDelay(timerData.lastUpdateTime+timerData.interval-now);},timerData.lastUpdateTime+timerData.interval);}
if(callbackToFire)
callbackToFire();if(nextDelay!==null){if(skippedFirings)
timer.delay=this._timerMinimumDelay;else
timer.delay=Math.max(nextDelay*1000,this._timerMinimumDelay);this.lastTimerReset=Date.now();}else{this._cancelTimer();}},_ensureTimer:function(interval){if(!this._canEnsureTimer)
return;if(!this._timer){this._timer=Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);this._timer.initWithCallback(this,interval,Ci.nsITimer.TYPE_REPEATING_SLACK);this.lastTimerReset=Date.now();}else{if(Date.now()+interval<this.lastTimerReset+this._timer.delay)
this._timer.delay=Math.max(this.lastTimerReset+interval-Date.now(),0);}},_cancelTimer:function(){if(this._timer){this._timer.cancel();this._timer=null;}},registerTimer:function TM_registerTimer(id,callback,interval){LOG("TimerManager:registerTimer - id: "+id);let prefLastUpdate=PREF_APP_UPDATE_LASTUPDATETIME_FMT.replace(/%ID%/,id);
let lastUpdateTime=getPref("getIntPref",prefLastUpdate,0);let now=Math.round(Date.now()/1000);if(lastUpdateTime>now)
lastUpdateTime=0;if(lastUpdateTime==0)
Services.prefs.setIntPref(prefLastUpdate,lastUpdateTime);this._timers[id]={callback:callback,interval:interval,lastUpdateTime:lastUpdateTime};this._ensureTimer(interval*1000);},classID:Components.ID("{B322A5C0-A419-484E-96BA-D7182163899F}"),QueryInterface:XPCOMUtils.generateQI([Ci.nsIUpdateTimerManager,Ci.nsITimerCallback,Ci.nsIObserver])};this.NSGetFactory=XPCOMUtils.generateNSGetFactory([TimerManager]);