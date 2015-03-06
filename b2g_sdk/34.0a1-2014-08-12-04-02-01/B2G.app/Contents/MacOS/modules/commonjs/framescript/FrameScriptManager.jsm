"use strict";const globalMM=Components.classes["@mozilla.org/globalmessagemanager;1"].getService(Components.interfaces.nsIMessageListenerManager);
const PATH=__URI__.replace('FrameScriptManager.jsm','');let loadedTabEvents=false;function enableTabEvents(){if(loadedTabEvents)
return;loadedTabEvents=true;globalMM.loadFrameScript(PATH+'tab-events.js',true);}
const EXPORTED_SYMBOLS=['enableTabEvents'];