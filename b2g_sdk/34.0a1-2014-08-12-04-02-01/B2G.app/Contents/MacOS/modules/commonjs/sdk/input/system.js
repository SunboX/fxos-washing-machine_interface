"use strict";const{Cc,Ci,Cr,Cu}=require("chrome");const{Input,start,stop,end,receive,outputs}=require("../event/utils");const{once,off}=require("../event/core");const{id:addonID}=require("../self");const unloadMessage=require("@loader/unload");const{addObserver,removeObserver}=Cc['@mozilla.org/observer-service;1'].getService(Ci.nsIObserverService);const addonUnloadTopic="sdk:loader:destroy";const isXrayWrapper=Cu.isXrayWrapper;

const isLegacyWrapper=x=>x&&x.wrappedJSObject&&"observersModuleSubjectWrapper"in x.wrappedJSObject;const unwrapLegacy=x=>x.wrappedJSObject.object;






const InputPort=function InputPort({id,topic,initial}){this.id=id||topic;this.topic=topic||"sdk:"+addonID+":"+id;this.value=initial===void(0)?null:initial;this.observing=false;this[outputs]=[];};InputPort.prototype=new Input();InputPort.prototype.constructor=InputPort;
InputPort.start=input=>{input.addListener(input);
addObserver(input,addonUnloadTopic,false);};InputPort.prototype[start]=InputPort.start;InputPort.addListener=input=>addObserver(input,input.topic,false);InputPort.prototype.addListener=InputPort.addListener;

InputPort.stop=input=>{input.removeListener(input);removeObserver(input,addonUnloadTopic);};InputPort.prototype[stop]=InputPort.stop;InputPort.removeListener=input=>removeObserver(input,input.topic);InputPort.prototype.removeListener=InputPort.removeListener;
InputPort.prototype.QueryInterface=function(iid){if(!iid.equals(Ci.nsIObserver)&&!iid.equals(Ci.nsISupportsWeakReference))
throw Cr.NS_ERROR_NO_INTERFACE;return this;};

InputPort.prototype.observe=function(subject,topic,data){

const message=subject===null?null:isLegacyWrapper(subject)?unwrapLegacy(subject):isXrayWrapper(subject)?subject:subject.wrappedJSObject?subject.wrappedJSObject:subject;if(topic===this.topic){receive(this,message);}
if(topic===addonUnloadTopic&&message===unloadMessage){end(this);}};exports.InputPort=InputPort;