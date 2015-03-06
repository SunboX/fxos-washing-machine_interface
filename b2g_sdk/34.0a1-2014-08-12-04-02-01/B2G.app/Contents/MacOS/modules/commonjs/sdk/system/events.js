'use strict';module.metadata={'stability':'unstable'};const{Cc,Ci,Cu}=require('chrome');const{Unknown}=require('../platform/xpcom');const{Class}=require('../core/heritage');const{ns}=require('../core/namespace');const{addObserver,removeObserver,notifyObservers}=Cc['@mozilla.org/observer-service;1'].getService(Ci.nsIObserverService);const unloadSubject=require('@loader/unload');const Subject=Class({extends:Unknown,initialize:function initialize(object){



this.wrappedJSObject={observersModuleSubjectWrapper:true,object:object};},getHelperForLanguage:function(){},getInterfaces:function(){}});function emit(type,event){


 let subject=event&&typeof event==='object'&&'subject'in event?Subject(event.subject):null;let data=event&&typeof event==='object'?('data'in event?event.data:null):
event;notifyObservers(subject,type,data);}
exports.emit=emit;const Observer=Class({extends:Unknown,initialize:function initialize(listener){this.listener=listener;},interfaces:['nsIObserver','nsISupportsWeakReference'],observe:function(subject,topic,data){


if(subject&&typeof(subject)=='object'&&('wrappedJSObject'in subject)&&('observersModuleSubjectWrapper'in subject.wrappedJSObject))
subject=subject.wrappedJSObject.object;try{this.listener({type:topic,subject:subject,data:data});}
catch(error){console.exception(error);}}});const subscribers=ns();function on(type,listener,strong){
let weak=!strong;let observers=subscribers(listener);
if(!(type in observers)){let observer=Observer(listener);observers[type]=observer;addObserver(observer,type,weak); let ref=Cu.getWeakReference(observer);weakRefs.set(observer,ref);stillAlive.set(ref,type);}}
exports.on=on;function once(type,listener){


on(type,listener);on(type,function cleanup(){off(type,listener);off(type,cleanup);},true);}
exports.once=once;function off(type,listener){let observers=subscribers(listener);
if(type in observers){let observer=observers[type];delete observers[type];removeObserver(observer,type);stillAlive.delete(weakRefs.get(observer));}}
exports.off=off;let weakRefs=new WeakMap();let stillAlive=new Map();on('sdk:loader:destroy',function onunload({subject,data:reason}){ if(subject.wrappedJSObject===unloadSubject){off('sdk:loader:destroy',onunload); if(reason==='shutdown')
return;stillAlive.forEach((type,ref)=>{let observer=ref.get();if(observer)
removeObserver(observer,type);})}
},true);