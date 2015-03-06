"use strict";(function(){const observerSvc=Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);const EVENTS={'content-document-interactive':'ready','chrome-document-interactive':'ready','content-document-loaded':'load','chrome-document-loaded':'load',}
let listener={observe:function(subject,topic){
if(!docShell){observerSvc.removeObserver(this,topic);}
else{if(subject===content.document)
sendAsyncMessage('sdk/tab/event',{type:EVENTS[topic]});}}}
Object.keys(EVENTS).forEach((topic)=>observerSvc.addObserver(listener,topic,false));docShell.chromeEventHandler.addEventListener('pageshow',(e)=>{if(e.target===content.document)
sendAsyncMessage('sdk/tab/event',{type:e.type,persisted:e.persisted});},true);})();