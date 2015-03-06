"use strict";module.metadata={"stability":"unstable"};const{Cc,Ci,Cr}=require("chrome");const{emit,on,off}=require("./core");const{addObserver,removeObserver}=Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);const{when:unload}=require("../system/unload");

function ObserverChannel(){}
Object.freeze(Object.defineProperties(ObserverChannel.prototype,{QueryInterface:{value:function(iid){if(!iid.equals(Ci.nsIObserver)&&!iid.equals(Ci.nsISupportsWeakReference)&&!iid.equals(Ci.nsISupports))
throw Cr.NS_ERROR_NO_INTERFACE;return this;}},observe:{value:function(subject,topic,data){emit(this,"data",{type:topic,target:subject,data:data});}}}));function observe(topic){let observerChannel=new ObserverChannel();


addObserver(observerChannel,topic,true); unload(()=>removeObserver(observerChannel,topic));return observerChannel;}
exports.observe=observe;