"use strict";const Cu=Components.utils;const Cc=Components.classes;const Ci=Components.interfaces;Cu.import("resource://gre/modules/XPCOMUtils.jsm",this);Cu.import("resource://gre/modules/Services.jsm",this);XPCOMUtils.defineLazyModuleGetter(this,"Promise","resource://gre/modules/Promise.jsm");XPCOMUtils.defineLazyModuleGetter(this,"Task","resource://gre/modules/Task.jsm");XPCOMUtils.defineLazyServiceGetter(this,"gDebug","@mozilla.org/xpcom/debug;1","nsIDebug");Object.defineProperty(this,"gCrashReporter",{get:function(){delete this.gCrashReporter;try{let reporter=Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsICrashReporter);return this.gCrashReporter=reporter;}catch(ex){return this.gCrashReporter=null;}},configurable:true});const DELAY_WARNING_MS=10*1000;
const PREF_DELAY_CRASH_MS="toolkit.asyncshutdown.crash_timeout";let DELAY_CRASH_MS=60*1000;try{DELAY_CRASH_MS=Services.prefs.getIntPref(PREF_DELAY_CRASH_MS);}catch(ex){}
Services.prefs.addObserver(PREF_DELAY_CRASH_MS,function(){DELAY_CRASH_MS=Services.prefs.getIntPref(PREF_DELAY_CRASH_MS);},false);function log(msg,prefix="",error=null){dump(prefix+msg+"\n");if(error){dump(prefix+error+"\n");if(typeof error=="object"&&"stack"in error){dump(prefix+error.stack+"\n");}}}
function warn(msg,error=null){return log(msg,"WARNING: ",error);}
function fatalerr(msg,error=null){return log(msg,"FATAL ERROR: ",error);}


function safeGetState(fetchState){if(!fetchState){return"(none)";}
let data,string;try{
string=JSON.stringify(fetchState());data=JSON.parse(string);
if(data&&typeof data=="object"){data.toString=function(){return string;};}
return data;}catch(ex){if(string){return string;}
try{return"Error getting state: "+ex+" at "+ex.stack;}catch(ex2){return"Error getting state but could not display error";}}}
function looseTimer(delay){let DELAY_BEAT=1000;let timer=Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);let beats=Math.ceil(delay/DELAY_BEAT);let deferred=Promise.defer();timer.initWithCallback(function(){if(beats<=0){deferred.resolve();}
--beats;},DELAY_BEAT,Ci.nsITimer.TYPE_REPEATING_PRECISE_CAN_SKIP);
deferred.promise.then(()=>timer.cancel(),()=>timer.cancel());return deferred;}
this.EXPORTED_SYMBOLS=["AsyncShutdown"];let gPhases=new Map();this.AsyncShutdown={get _getPhase(){let accepted=false;try{accepted=Services.prefs.getBoolPref("toolkit.asyncshutdown.testing");}catch(ex){}
if(accepted){return getPhase;}
return undefined;}};function getPhase(topic){let phase=gPhases.get(topic);if(phase){return phase;}
let spinner=new Spinner(topic);phase=Object.freeze({addBlocker:function(name,condition,fetchState=null){spinner.addBlocker(name,condition,fetchState);},removeBlocker:function(condition){return spinner.removeBlocker(condition);},get _trigger(){let accepted=false;try{accepted=Services.prefs.getBoolPref("toolkit.asyncshutdown.testing");}catch(ex){}
if(accepted){return()=>spinner.observe();}
return undefined;}});gPhases.set(topic,phase);return phase;};function Spinner(topic){this._barrier=new Barrier(topic);this._topic=topic;Services.obs.addObserver(this,topic,false);}
Spinner.prototype={addBlocker:function(name,condition,fetchState){this._barrier.client.addBlocker(name,condition,fetchState);},removeBlocker:function(condition){return this._barrier.client.removeBlocker(condition);}, observe:function(){let topic=this._topic;let barrier=this._barrier;Services.obs.removeObserver(this,topic);let satisfied=false; let promise=this._barrier.wait({warnAfterMS:DELAY_WARNING_MS,crashAfterMS:DELAY_CRASH_MS}); promise.then(()=>satisfied=true); let thread=Services.tm.mainThread;while(!satisfied){try{thread.processNextEvent(true);}catch(ex){
Promise.reject(ex);}}}};function Barrier(name){this._conditions=new Map();this._indirections=null;this._name=name;this._promise=null;this._monitors=null;this.client={addBlocker:function(name,condition,fetchState){if(typeof name!="string"){throw new TypeError("Expected a human-readable name as first argument");}
if(fetchState&&typeof fetchState!="function"){throw new TypeError("Expected nothing or a function as third argument");}
if(!this._conditions){throw new Error("Phase "+this._name+" has already begun, it is too late to register"+" completion condition '"+name+"'.");}
let leaf=Components.stack;let frame;for(frame=leaf;frame!=null&&frame.filename==leaf.filename;frame=frame.caller){}
let filename=frame?frame.filename:"?";let lineNumber=frame?frame.lineNumber:-1;
let frames=[];while(frame!=null){frames.push(frame.filename+":"+frame.name+":"+frame.lineNumber);frame=frame.caller;}
let stack=Task.Debugging.generateReadableStack(frames.join("\n")).split("\n");let set=this._conditions.get(condition);if(!set){set=[];this._conditions.set(condition,set);}
set.push({name:name,fetchState:fetchState,filename:filename,lineNumber:lineNumber,stack:stack});}.bind(this),removeBlocker:function(condition){if(this._conditions){return this._conditions.delete(condition);}
if(this._indirections){ let deferred=this._indirections.get(condition);if(deferred){ deferred.resolve();}
return this._indirections.delete(condition);}
return false;}.bind(this),};}
Barrier.prototype=Object.freeze({get state(){if(this._conditions){return"Not started";}
if(!this._monitors){return"Complete";}
let frozen=[];for(let{name,isComplete,fetchState,stack,filename,lineNumber}of this._monitors){if(!isComplete){frozen.push({name:name,state:safeGetState(fetchState),filename:filename,lineNumber:lineNumber,stack:stack});}}
return frozen;},wait:function(options={}){if(this._promise){return this._promise;}
return this._promise=this._wait(options);},_wait:function(options){let topic=this._name;let conditions=this._conditions;this._conditions=null; if(conditions.size==0){return Promise.resolve();}
this._indirections=new Map();let allPromises=[];
this._monitors=[];for(let _condition of conditions.keys()){for(let current of conditions.get(_condition)){let condition=_condition; let{name,fetchState,stack,filename,lineNumber}=current;
let indirection=Promise.defer();this._indirections.set(condition,indirection); try{if(typeof condition=="function"){try{condition=condition(topic);}catch(ex){condition=Promise.reject(ex);}}




condition=Promise.resolve(condition);let monitor={isComplete:false,name:name,fetchState:fetchState,stack:stack,filename:filename,lineNumber:lineNumber};condition=condition.then(null,function onError(error){let msg="A completion condition encountered an error"+" while we were spinning the event loop."+" Condition: "+name+" Phase: "+topic+" State: "+safeGetState(fetchState);warn(msg,error);
Promise.reject(error);});condition.then(()=>indirection.resolve());indirection.promise.then(()=>monitor.isComplete=true);this._monitors.push(monitor);allPromises.push(indirection.promise);}catch(error){let msg="A completion condition encountered an error"+" while we were initializing the phase."+" Condition: "+name+" Phase: "+topic+" State: "+safeGetState(fetchState);warn(msg,error);}}}
conditions=null;let promise=Promise.all(allPromises);allPromises=null;promise=promise.then(null,function onError(error){let msg="An uncaught error appeared while completing the phase."+" Phase: "+topic;warn(msg,error);});promise=promise.then(()=>{this._monitors=null;this._indirections=null;});
 let warnAfterMS=DELAY_WARNING_MS;if(options&&"warnAfterMS"in options){if(typeof options.warnAfterMS=="number"||options.warnAfterMS==null){ warnAfterMS=options.warnAfterMS;}else{throw new TypeError("Wrong option value for warnAfterMS");}}
if(warnAfterMS&&warnAfterMS>0){let timer=Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);timer.initWithCallback(function(){let msg="At least one completion condition is taking too long to complete."+" Conditions: "+JSON.stringify(this.state)+" Barrier: "+topic;warn(msg);}.bind(this),warnAfterMS,Ci.nsITimer.TYPE_ONE_SHOT);promise=promise.then(function onSuccess(){timer.cancel();
});}
let crashAfterMS=DELAY_CRASH_MS;if(options&&"crashAfterMS"in options){if(typeof options.crashAfterMS=="number"||options.crashAfterMS==null){ crashAfterMS=options.crashAfterMS;}else{throw new TypeError("Wrong option value for crashAfterMS");}}
if(crashAfterMS>0){let timeToCrash=null;




timeToCrash=looseTimer(crashAfterMS);timeToCrash.promise.then(function onTimeout(){let state=this.state;


let msg="AsyncShutdown timeout in "+topic+" Conditions: "+JSON.stringify(state)+" At least one completion condition failed to complete"+" within a reasonable amount of time. Causing a crash to"+" ensure that we do not leave the user with an unresponsive"+" process draining resources.";fatalerr(msg);if(gCrashReporter&&gCrashReporter.enabled){let data={phase:topic,conditions:state};gCrashReporter.annotateCrashReport("AsyncShutdownTimeout",JSON.stringify(data));}else{warn("No crash reporter available");}





let filename="?";let lineNumber=-1;for(let monitor of this._monitors){if(monitor.isComplete){continue;}
filename=monitor.filename;lineNumber=monitor.lineNumber;}
gDebug.abort(filename,lineNumber);}.bind(this),function onSatisfied(){
});promise=promise.then(function(){timeToCrash.reject();});}
return promise;},});


this.AsyncShutdown.profileChangeTeardown=getPhase("profile-change-teardown");this.AsyncShutdown.profileBeforeChange=getPhase("profile-before-change");this.AsyncShutdown.sendTelemetry=getPhase("profile-before-change2");this.AsyncShutdown.webWorkersShutdown=getPhase("web-workers-shutdown");this.AsyncShutdown.Barrier=Barrier;Object.freeze(this.AsyncShutdown);