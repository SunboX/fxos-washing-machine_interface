"use strict";const Cc=Components.classes;const Ci=Components.interfaces;const Cu=Components.utils;Cu.import("resource://gre/modules/XPCOMUtils.jsm");Cu.import("resource://gre/modules/Services.jsm");Cu.import("resource://gre/modules/WebappsUpdater.jsm");function debug(aStr){}
function WebappsUpdateTimer(){}
WebappsUpdateTimer.prototype={QueryInterface:XPCOMUtils.generateQI([Ci.nsITimerCallback]),classID:Components.ID("{637b0f77-2429-49a0-915f-abf5d0db8b9a}"),notify:function(aTimer){try{
if(Services.prefs.getBoolPref("app.update.enabled")===true&&Services.prefs.getIntPref("app.update.interval")===86400){return;}}catch(e){}
if(Services.io.offline){debug("Network is offline. Setting up an offline status observer.");Services.obs.addObserver(this,"network:offline-status-changed",false);return;}

WebappsUpdater.updateApps();},observe:function(aSubject,aTopic,aData){if(aTopic!=="network:offline-status-changed"||aData!=="online"){return;}
debug("Network is online. Checking updates.");Services.obs.removeObserver(this,"network:offline-status-changed");WebappsUpdater.updateApps();}};this.NSGetFactory=XPCOMUtils.generateNSGetFactory([WebappsUpdateTimer]);