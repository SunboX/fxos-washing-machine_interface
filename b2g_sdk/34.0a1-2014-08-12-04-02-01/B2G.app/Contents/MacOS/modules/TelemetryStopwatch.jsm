const Cc=Components.classes;const Ci=Components.interfaces;const Cu=Components.utils;this.EXPORTED_SYMBOLS=["TelemetryStopwatch"];let Telemetry=Cc["@mozilla.org/base/telemetry;1"].getService(Ci.nsITelemetry);

let simpleTimers={};let objectTimers=new WeakMap();this.TelemetryStopwatch={start:function(aHistogram,aObj){if(!validTypes(aHistogram,aObj))
return false;let timers;if(aObj){timers=objectTimers.get(aObj)||{};objectTimers.set(aObj,timers);}else{timers=simpleTimers;}
if(timers.hasOwnProperty(aHistogram)){delete timers[aHistogram];Cu.reportError("TelemetryStopwatch: key \""+
aHistogram+"\" was already initialized");return false;}
timers[aHistogram]=Date.now();return true;},cancel:function ts_cancel(aHistogram,aObj){if(!validTypes(aHistogram,aObj))
return false;let timers=aObj?objectTimers.get(aObj)||{}:simpleTimers;if(timers.hasOwnProperty(aHistogram)){delete timers[aHistogram];return true;}
return false;},finish:function(aHistogram,aObj){if(!validTypes(aHistogram,aObj))
return false;let timers=aObj?objectTimers.get(aObj)||{}:simpleTimers;let start=timers[aHistogram];delete timers[aHistogram];if(start){let delta=Date.now()-start;let histogram=Telemetry.getHistogramById(aHistogram);histogram.add(delta);return true;}
return false;}}
function validTypes(aKey,aObj){return(typeof aKey=="string")&&(aObj===undefined||typeof aObj=="object");}