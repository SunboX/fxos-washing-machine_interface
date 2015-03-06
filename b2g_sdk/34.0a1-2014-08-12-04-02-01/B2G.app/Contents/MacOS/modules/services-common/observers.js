this.EXPORTED_SYMBOLS=["Observers"];const Cc=Components.classes;const Ci=Components.interfaces;const Cr=Components.results;const Cu=Components.utils;Cu.import("resource://gre/modules/XPCOMUtils.jsm");this.Observers={add:function(topic,callback,thisObject){let observer=new Observer(topic,callback,thisObject);this._cache.push(observer);this._service.addObserver(observer,topic,true);return observer;},remove:function(topic,callback,thisObject){


let[observer]=this._cache.filter(function(v)v.topic==topic&&v.callback==callback&&v.thisObject==thisObject);if(observer){this._service.removeObserver(observer,topic);this._cache.splice(this._cache.indexOf(observer),1);}},notify:function(topic,subject,data){subject=(typeof subject=="undefined")?null:new Subject(subject);data=(typeof data=="undefined")?null:data;this._service.notifyObservers(subject,topic,data);},_service:Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService),_cache:[]};function Observer(topic,callback,thisObject){this.topic=topic;this.callback=callback;this.thisObject=thisObject;}
Observer.prototype={QueryInterface:XPCOMUtils.generateQI([Ci.nsIObserver,Ci.nsISupportsWeakReference]),observe:function(subject,topic,data){

if(subject&&typeof subject=="object"&&("wrappedJSObject"in subject)&&("observersModuleSubjectWrapper"in subject.wrappedJSObject))
subject=subject.wrappedJSObject.object;if(typeof this.callback=="function"){if(this.thisObject)
this.callback.call(this.thisObject,subject,data);else
this.callback(subject,data);}
else
this.callback.observe(subject,topic,data);}}
function Subject(object){


this.wrappedJSObject={observersModuleSubjectWrapper:true,object:object};}
Subject.prototype={QueryInterface:XPCOMUtils.generateQI([]),getHelperForLanguage:function(){},getInterfaces:function(){}};