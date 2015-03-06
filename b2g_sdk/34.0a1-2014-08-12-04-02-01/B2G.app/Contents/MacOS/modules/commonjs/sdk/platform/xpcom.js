"use strict";module.metadata={"stability":"unstable"};const{Cc,Ci,Cr,Cm,components:{classesByID}}=require('chrome');const{registerFactory,unregisterFactory,isCIDRegistered}=Cm.QueryInterface(Ci.nsIComponentRegistrar);const{merge}=require('../util/object');const{Class,extend,mix}=require('../core/heritage');const{uuid}=require('../util/uuid');
const Unknown=new function(){function hasInterface(component,iid){return component&&component.interfaces&&(component.interfaces.some(function(id)iid.equals(Ci[id]))||component.implements.some(function($)hasInterface($,iid))||hasInterface(Object.getPrototypeOf(component),iid));}
return Class({QueryInterface:function QueryInterface(iid){


if(iid&&!hasInterface(this,iid))
throw Cr.NS_ERROR_NO_INTERFACE;return this;},interfaces:Object.freeze(['nsISupports'])});}
exports.Unknown=Unknown;
const Factory=Class({extends:Unknown,interfaces:['nsIFactory'],get id(){throw Error('Factory must implement `id` property')},contract:null,description:'Jetpack generated factory',lockFactory:function lockFactory(lock)undefined,register:true,unregister:true,initialize:function initialize(options){merge(this,{id:'id'in options?options.id:uuid(),register:'register'in options?options.register:this.register,unregister:'unregister'in options?options.unregister:this.unregister,contract:'contract'in options?options.contract:null,Component:options.Component});if(this.register)
register(this);},createInstance:function createInstance(outer,iid){try{if(outer)
throw Cr.NS_ERROR_NO_AGGREGATION;return this.create().QueryInterface(iid);}
catch(error){throw error instanceof Ci.nsIException?error:Cr.NS_ERROR_FAILURE;}},create:function create()this.Component()});exports.Factory=Factory;

const Service=Class({extends:Factory,initialize:function initialize(options){this.component=options.Component();Factory.prototype.initialize.call(this,options);},description:'Jetpack generated service',create:function create()this.component});exports.Service=Service;function isRegistered({id})isCIDRegistered(id)
exports.isRegistered=isRegistered;function register(factory){if(!(factory instanceof Factory)){throw new Error("xpcom.register() expect a Factory instance.\n"+"Please refactor your code to new xpcom module if you"+" are repacking an addon from SDK <= 1.5:\n"+"https://developer.mozilla.org/en-US/Add-ons/SDK/Low-Level_APIs/platform_xpcom");}
registerFactory(factory.id,factory.description,factory.contract,factory);if(factory.unregister)
require('../system/unload').when(unregister.bind(null,factory));}
exports.register=register;function unregister(factory){if(isRegistered(factory))
unregisterFactory(factory.id,factory);}
exports.unregister=unregister;function autoRegister(path){




var runtime=require("../system/runtime");var osDirName=runtime.OS+"_"+runtime.XPCOMABI;var platformVersion=require("../system/xul-app").platformVersion.substring(0,5);var file=Cc['@mozilla.org/file/local;1'].createInstance(Ci.nsILocalFile);file.initWithPath(path);file.append(osDirName);file.append(platformVersion);if(!(file.exists()&&file.isDirectory()))
throw new Error("component not available for OS/ABI "+
osDirName+" and platform "+platformVersion);Cm.QueryInterface(Ci.nsIComponentRegistrar);Cm.autoRegister(file);}
exports.autoRegister=autoRegister;function factoryByID(id)classesByID[id]||null
exports.factoryByID=factoryByID;function factoryByContract(contract)factoryByID(Cm.contractIDToCID(contract))
exports.factoryByContract=factoryByContract;