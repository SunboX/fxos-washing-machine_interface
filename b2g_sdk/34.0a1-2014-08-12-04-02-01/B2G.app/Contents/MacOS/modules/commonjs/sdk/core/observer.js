"use strict";module.metadata={"stability":"experimental"};const{Cc,Ci,Cr}=require("chrome");const{Class}=require("./heritage");const{isWeak}=require("./reference");const method=require("../../method/core");const{addObserver,removeObserver}=Cc['@mozilla.org/observer-service;1'].getService(Ci.nsIObserverService);
const observe=method("observer/observe");exports.observe=observe;const subscribe=method("observe/subscribe");exports.subscribe=subscribe;const unsubscribe=method("observer/unsubscribe");exports.unsubscribe=unsubscribe;

const ObserverDelegee=Class({initialize:function(delegate){this.delegate=delegate;},QueryInterface:function(iid){const isObserver=iid.equals(Ci.nsIObserver);const isWeakReference=iid.equals(Ci.nsISupportsWeakReference);if(!isObserver&&!isWeakReference)
throw Cr.NS_ERROR_NO_INTERFACE;return this;},observe:function(subject,topic,data){observe(this.delegate,subject,topic,data);}});
const Observer=Class({});exports.Observer=Observer;

const subscribers=new WeakMap();
subscribe.define(Observer,(observer,topic)=>{if(!subscribers.has(observer)){const delegee=new ObserverDelegee(observer);subscribers.set(observer,delegee);addObserver(delegee,topic,isWeak(observer));}});
unsubscribe.define(Observer,(observer,topic)=>{const delegee=subscribers.get(observer);if(delegee){subscribers.delete(observer);removeObserver(delegee,topic);}});