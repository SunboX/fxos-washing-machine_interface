"use strict";this.EXPORTED_SYMBOLS=["DeferredTask",];const{classes:Cc,interfaces:Ci,utils:Cu,results:Cr}=Components;Cu.import("resource://gre/modules/XPCOMUtils.jsm");XPCOMUtils.defineLazyModuleGetter(this,"Promise","resource://gre/modules/Promise.jsm");XPCOMUtils.defineLazyModuleGetter(this,"Task","resource://gre/modules/Task.jsm");const Timer=Components.Constructor("@mozilla.org/timer;1","nsITimer","initWithCallback");this.DeferredTask=function(aTaskFn,aDelayMs){this._taskFn=aTaskFn;this._delayMs=aDelayMs;}
this.DeferredTask.prototype={_taskFn:null,_delayMs:null,get isArmed()this._armed,_armed:false,get isRunning()!!this._runningPromise,_runningPromise:null,_timer:null,_startTimer:function()
{this._timer=new Timer(this._timerCallback.bind(this),this._delayMs,Ci.nsITimer.TYPE_ONE_SHOT);},arm:function()
{if(this._finalized){throw new Error("Unable to arm timer, the object has been finalized.");}
this._armed=true;
if(!this._runningPromise&&!this._timer){this._startTimer();}},disarm:function(){this._armed=false;if(this._timer){

this._timer.cancel();this._timer=null;}},finalize:function(){if(this._finalized){throw new Error("The object has been already finalized.");}
this._finalized=true;
if(this._timer){this.disarm();this._timerCallback();}
if(this._runningPromise){return this._runningPromise;}
return Promise.resolve();},_finalized:false,_timerCallback:function()
{let runningDeferred=Promise.defer();



this._timer=null;this._armed=false;this._runningPromise=runningDeferred.promise;runningDeferred.resolve(Task.spawn(function(){yield Task.spawn(this._taskFn).then(null,Cu.reportError);
if(this._armed){if(!this._finalized){this._startTimer();}else{

this._armed=false;yield Task.spawn(this._taskFn).then(null,Cu.reportError);}}

this._runningPromise=null;}.bind(this)).then(null,Cu.reportError));},};