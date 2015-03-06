'use strict';module.metadata={"stability":"stable"};const{Cc,Ci}=require('chrome');const{get,set,exists}=Cc['@mozilla.org/process/environment;1'].getService(Ci.nsIEnvironment);exports.env=Proxy.create({
getPropertyNames:function()[],getOwnPropertyNames:function()[],enumerate:function()[],keys:function()[],
fix:function()undefined,getPropertyDescriptor:function(name)this.getOwnPropertyDescriptor(name),

getOwnPropertyDescriptor:function(name){return!exists(name)?undefined:{value:get(name),enumerable:false,configurable:true,writable:true
}},
defineProperty:function(name,{value})set(name,value),delete:function(name){set(name,null);return true;},has:function(name)this.hasOwn(name),hasOwn:function(name)exists(name),

get:function(proxy,name)Object.prototype[name]||get(name)||undefined,set:function(proxy,name,value)Object.prototype[name]||set(name,value)});