"use strict";let Cu=Components.utils;let Ci=Components.interfaces;let Cc=Components.classes;Cu.import("resource://gre/modules/XPCOMUtils.jsm");Cu.import("resource://gre/modules/Services.jsm");const STORAGE_MAX_EVENTS=200;var _consoleStorage=new Map();const CONSOLEAPISTORAGE_CID=Components.ID('{96cf7855-dfa9-4c6d-8276-f9705b4890f2}');function ConsoleAPIStorageService(){this.init();}
ConsoleAPIStorageService.prototype={classID:CONSOLEAPISTORAGE_CID,QueryInterface:XPCOMUtils.generateQI([Ci.nsIConsoleAPIStorage,Ci.nsIObserver]),classInfo:XPCOMUtils.generateCI({classID:CONSOLEAPISTORAGE_CID,contractID:'@mozilla.org/consoleAPI-storage;1',interfaces:[Ci.nsIConsoleAPIStorage,Ci.nsIObserver],flags:Ci.nsIClassInfo.SINGLETON}),observe:function CS_observe(aSubject,aTopic,aData)
{if(aTopic=="xpcom-shutdown"){Services.obs.removeObserver(this,"xpcom-shutdown");Services.obs.removeObserver(this,"inner-window-destroyed");Services.obs.removeObserver(this,"memory-pressure");}
else if(aTopic=="inner-window-destroyed"){let innerWindowID=aSubject.QueryInterface(Ci.nsISupportsPRUint64).data;this.clearEvents(innerWindowID+"");}
else if(aTopic=="memory-pressure"){this.clearEvents();}},init:function CS_init()
{Services.obs.addObserver(this,"xpcom-shutdown",false);Services.obs.addObserver(this,"inner-window-destroyed",false);Services.obs.addObserver(this,"memory-pressure",false);},getEvents:function CS_getEvents(aId)
{if(aId!=null){return(_consoleStorage.get(aId)||[]).slice(0);}
let result=[];for(let[id,events]of _consoleStorage){result.push.apply(result,events);}
return result.sort(function(a,b){return a.timeStamp-b.timeStamp;});},recordEvent:function CS_recordEvent(aId,aEvent)
{if(!_consoleStorage.has(aId)){_consoleStorage.set(aId,[]);}
let storage=_consoleStorage.get(aId);storage.push(aEvent); if(storage.length>STORAGE_MAX_EVENTS){storage.shift();}
Services.obs.notifyObservers(aEvent,"console-storage-cache-event",aId);},clearEvents:function CS_clearEvents(aId)
{if(aId!=null){_consoleStorage.delete(aId);}
else{_consoleStorage.clear();Services.obs.notifyObservers(null,"console-storage-reset",null);}},};this.NSGetFactory=XPCOMUtils.generateNSGetFactory([ConsoleAPIStorageService]);