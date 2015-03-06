"use strict";module.metadata={"stability":"deprecated"};const{Cc,Ci,Cu,components}=require("chrome");const{when:unload}=require("../system/unload")
var trackedObjects={};const Compacter={notify:function(){var newTrackedObjects={};for(let name in trackedObjects){let oldBin=trackedObjects[name];let newBin=[];let strongRefs=[];for(let i=0,l=oldBin.length;i<l;i++){let strongRef=oldBin[i].weakref.get();if(strongRef&&strongRefs.indexOf(strongRef)==-1){strongRefs.push(strongRef);newBin.push(oldBin[i]);}}
if(newBin.length)
newTrackedObjects[name]=newBin;}
trackedObjects=newTrackedObjects;}};var timer=Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);timer.initWithCallback(Compacter,5000,Ci.nsITimer.TYPE_REPEATING_SLACK);function track(object,bin,stackFrameNumber){var frame=components.stack.caller;var weakref=Cu.getWeakReference(object);if(!bin&&'constructor'in object)
bin=object.constructor.name;if(bin=="Object")
bin=frame.name;if(!bin)
bin="generic";if(!(bin in trackedObjects))
trackedObjects[bin]=[];if(stackFrameNumber>0)
for(var i=0;i<stackFrameNumber;i++)
frame=frame.caller;trackedObjects[bin].push({weakref:weakref,created:new Date(),filename:frame.filename,lineNo:frame.lineNumber,bin:bin});}
exports.track=track;var getBins=exports.getBins=function getBins(){var names=[];for(let name in trackedObjects)
names.push(name);return names;};function getObjects(bin){var results=[];function getLiveObjectsInBin(bin){for(let i=0,l=bin.length;i<l;i++){let object=bin[i].weakref.get();if(object){results.push(bin[i]);}}}
if(bin){if(bin in trackedObjects)
getLiveObjectsInBin(trackedObjects[bin]);}
else{for(let name in trackedObjects)
getLiveObjectsInBin(trackedObjects[name]);}
return results;}
exports.getObjects=getObjects;function gc(){


var test_utils=Cc["@mozilla.org/appshell/appShellService;1"].getService(Ci.nsIAppShellService).hiddenDOMWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);test_utils.garbageCollect(); Compacter.notify();
test_utils.garbageCollect();};exports.gc=gc;unload(_=>{trackedObjects={};if(timer){timer.cancel();timer=null;}});