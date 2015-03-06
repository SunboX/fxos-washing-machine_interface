"use strict";const Cc=Components.classes;const Ci=Components.interfaces;const Cu=Components.utils;Cu.import("resource://gre/modules/Services.jsm");Cu.import("resource://gre/modules/FileUtils.jsm");this.EXPORTED_SYMBOLS=["FreeSpaceWatcher"];function debug(aMsg){}
const DEFAULT_WATCHER_DELAY=1000;this.FreeSpaceWatcher={timers:{},id:0,create:function spaceWatcher_create(aThreshold,aOnStatusChange,aDelay){let timer=Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);debug("Creating new FreeSpaceWatcher");let callback={currentStatus:null,notify:function(aTimer){try{let checkFreeSpace=function(freeBytes){debug("Free bytes: "+freeBytes);let newStatus=freeBytes>aThreshold;if(newStatus!=callback.currentStatus){debug("New status: "+(newStatus?"free":"full"));aOnStatusChange(newStatus?"free":"full");callback.currentStatus=newStatus;}};let navigator=Services.wm.getMostRecentWindow("navigator:browser").navigator;let deviceStorage=null;if(navigator.getDeviceStorage){deviceStorage=navigator.getDeviceStorage("apps");}
if(deviceStorage){let req=deviceStorage.freeSpace();req.onsuccess=req.onerror=function statResult(e){if(!e.target.result){return;}
let freeBytes=e.target.result;checkFreeSpace(freeBytes);}}else{
let dir=FileUtils.getDir("webappsDir",["webapps"],true,true);let freeBytes;try{freeBytes=dir.diskSpaceAvailable;}catch(e){

callback.currentStatus=true;}
if(freeBytes){
checkFreeSpace(freeBytes);}}}catch(e){debug(e);}}}
timer.initWithCallback(callback,aDelay||DEFAULT_WATCHER_DELAY,Ci.nsITimer.TYPE_REPEATING_SLACK);let id="timer-"+this.id++;this.timers[id]=timer;return id;},stop:function spaceWatcher_stop(aId){if(this.timers[aId]){this.timers[aId].cancel();delete this.timers[aId];}}}