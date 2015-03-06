"use strict";const Cu=Components.utils;const PREF_BRANCH="toolkit.telemetry.";const PREF_ENABLED=PREF_BRANCH+"enabled";this.EXPORTED_SYMBOLS=["UITelemetry",];Cu.import("resource://gre/modules/Services.jsm",this);this.UITelemetry={_enabled:undefined,_activeSessions:{},_measurements:[],get enabled(){if(this._enabled!==undefined){return this._enabled;}
Services.prefs.addObserver(PREF_ENABLED,this,false);Services.obs.addObserver(this,"profile-before-change",false);try{this._enabled=Services.prefs.getBoolPref(PREF_ENABLED);}catch(e){this._enabled=false;}
return this._enabled;},observe:function(aSubject,aTopic,aData){if(aTopic=="profile-before-change"){Services.obs.removeObserver(this,"profile-before-change");Services.prefs.removeObserver(PREF_ENABLED,this);this._enabled=undefined;return;}
if(aTopic=="nsPref:changed"){switch(aData){case PREF_ENABLED:let on=Services.prefs.getBoolPref(PREF_ENABLED);this._enabled=on;if(!on){this._activeSessions={};this._measurements=[];}
break;}}},get wrappedJSObject(){return this;},_simpleMeasureFunctions:{},uptimeMillis:function(){return Date.now()-Services.startup.getStartupInfo().process;},addEvent:function(aAction,aMethod,aTimestamp,aExtras){if(!this.enabled){return;}
let sessions=Object.keys(this._activeSessions);let aEvent={type:"event",action:aAction,method:aMethod,sessions:sessions,timestamp:(aTimestamp==undefined)?this.uptimeMillis():aTimestamp,};if(aExtras){aEvent.extras=aExtras;}
this._recordEvent(aEvent);},startSession:function(aName,aTimestamp){if(!this.enabled){return;}
if(this._activeSessions[aName]){return;}
this._activeSessions[aName]=(aTimestamp==undefined)?this.uptimeMillis():aTimestamp;},stopSession:function(aName,aReason,aTimestamp){if(!this.enabled){return;}
let sessionStart=this._activeSessions[aName];delete this._activeSessions[aName];if(!sessionStart){return;}
let aEvent={type:"session",name:aName,reason:aReason,start:sessionStart,end:(aTimestamp==undefined)?this.uptimeMillis():aTimestamp,};this._recordEvent(aEvent);},_recordEvent:function(aEvent){this._measurements.push(aEvent);},getSimpleMeasures:function(){if(!this.enabled){return{};}
let result={};for(let name in this._simpleMeasureFunctions){result[name]=this._simpleMeasureFunctions[name]();}
return result;},addSimpleMeasureFunction:function(aName,aFunction){if(!this.enabled){return;}
if(aName in this._simpleMeasureFunctions){throw new Error("A simple measurement function is already registered for "+aName);}
if(!aFunction||typeof aFunction!=='function'){throw new Error("addSimpleMeasureFunction called with non-function argument.");}
this._simpleMeasureFunctions[aName]=aFunction;},removeSimpleMeasureFunction:function(aName){delete this._simpleMeasureFunctions[aName];},getUIMeasurements:function(){if(!this.enabled){return[];}
return this._measurements.slice();}};