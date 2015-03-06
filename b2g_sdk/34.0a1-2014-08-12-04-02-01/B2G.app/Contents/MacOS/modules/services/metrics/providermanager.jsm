"use strict";this.EXPORTED_SYMBOLS=["ProviderManager"];const{classes:Cc,interfaces:Ci,utils:Cu}=Components;Cu.import("resource://gre/modules/services/metrics/dataprovider.jsm");Cu.import("resource://gre/modules/Promise.jsm");Cu.import("resource://gre/modules/Task.jsm");Cu.import("resource://gre/modules/Log.jsm");Cu.import("resource://services-common/utils.js");this.ProviderManager=function(storage){this._log=Log.repository.getLogger("Services.Metrics.ProviderManager");this._providers=new Map();this._storage=storage;this._providerInitQueue=[];this._providerInitializing=false;this._pullOnlyProviders={};this._pullOnlyProvidersRegisterCount=0;this._pullOnlyProvidersState=this.PULL_ONLY_NOT_REGISTERED;this._pullOnlyProvidersCurrentPromise=null;
this.onProviderInit=null;}
this.ProviderManager.prototype=Object.freeze({PULL_ONLY_NOT_REGISTERED:"none",PULL_ONLY_REGISTERING:"registering",PULL_ONLY_UNREGISTERING:"unregistering",PULL_ONLY_REGISTERED:"registered",get providers(){let providers=[];for(let[name,entry]of this._providers){providers.push(entry.provider);}
return providers;},getProvider:function(name){let provider=this._providers.get(name);if(!provider){return null;}
return provider.provider;},registerProvidersFromCategoryManager:function(category){this._log.info("Registering providers from category: "+category);let cm=Cc["@mozilla.org/categorymanager;1"].getService(Ci.nsICategoryManager);let promises=[];let enumerator=cm.enumerateCategory(category);while(enumerator.hasMoreElements()){let entry=enumerator.getNext().QueryInterface(Ci.nsISupportsCString).toString();let uri=cm.getCategoryEntry(category,entry);this._log.info("Attempting to load provider from category manager: "+
entry+" from "+uri);try{let ns={};Cu.import(uri,ns);let promise=this.registerProviderFromType(ns[entry]);if(promise){promises.push(promise);}}catch(ex){this._recordProviderError(entry,"Error registering provider from category manager",ex);continue;}}
return Task.spawn(function wait(){for(let promise of promises){yield promise;}});},registerProvider:function(provider){



if(!provider.name){throw new Error("Provider is not valid: does not have a name.");}
if(this._providers.has(provider.name)){return CommonUtils.laterTickResolvingPromise();}
let deferred=Promise.defer();this._providerInitQueue.push([provider,deferred]);if(this._providerInitQueue.length==1){this._popAndInitProvider();}
return deferred.promise;},registerProviderFromType:function(type){let proto=type.prototype;if(proto.pullOnly){this._log.info("Provider is pull-only. Deferring initialization: "+
proto.name);this._pullOnlyProviders[proto.name]=type;return null;}
let provider=this._initProviderFromType(type);return this.registerProvider(provider);},_initProviderFromType:function(type){let provider=new type();if(this.onProviderInit){this.onProviderInit(provider);}
return provider;},unregisterProvider:function(name){this._providers.delete(name);},ensurePullOnlyProvidersRegistered:function(){let state=this._pullOnlyProvidersState;this._pullOnlyProvidersRegisterCount++;if(state==this.PULL_ONLY_REGISTERED){this._log.debug("Requested pull-only provider registration and "+"providers are already registered.");return CommonUtils.laterTickResolvingPromise();}
if(state==this.PULL_ONLY_REGISTERING){this._log.debug("Requested pull-only provider registration and "+"registration is already in progress.");return this._pullOnlyProvidersCurrentPromise;}
this._log.debug("Pull-only provider registration requested.");

this._pullOnlyProvidersState=this.PULL_ONLY_REGISTERING;let inFlightPromise=this._pullOnlyProvidersCurrentPromise;this._pullOnlyProvidersCurrentPromise=Task.spawn(function registerPullProviders(){if(inFlightPromise){this._log.debug("Waiting for in-flight pull-only provider activity "+"to finish before registering.");try{yield inFlightPromise;}catch(ex){this._log.warn("Error when waiting for existing pull-only promise: "+
CommonUtils.exceptionStr(ex));}}
for each(let providerType in this._pullOnlyProviders){if(this._pullOnlyProvidersState!=this.PULL_ONLY_REGISTERING){this._log.debug("Aborting pull-only provider registration.");break;}
try{let provider=this._initProviderFromType(providerType);

yield this.registerProvider(provider);}catch(ex){this._recordProviderError(providerType.prototype.name,"Error registering pull-only provider",ex);}}

if(this._pullOnlyProvidersState==this.PULL_ONLY_REGISTERING){this._pullOnlyProvidersState=this.PULL_ONLY_REGISTERED;this._pullOnlyProvidersCurrentPromise=null;}}.bind(this));return this._pullOnlyProvidersCurrentPromise;},ensurePullOnlyProvidersUnregistered:function(){let state=this._pullOnlyProvidersState;if(state==this.PULL_ONLY_NOT_REGISTERED){this._log.debug("Requested pull-only provider unregistration but none "+"are registered.");return CommonUtils.laterTickResolvingPromise();}
if(state==this.PULL_ONLY_UNREGISTERING){this._log.debug("Requested pull-only provider unregistration and "+"unregistration is in progress.");this._pullOnlyProvidersRegisterCount=Math.max(0,this._pullOnlyProvidersRegisterCount-1);return this._pullOnlyProvidersCurrentPromise;}

if(this._pullOnlyProvidersRegisterCount>1){this._log.debug("Requested pull-only provider unregistration while "+"other callers still want them registered. Ignoring.");this._pullOnlyProvidersRegisterCount--;return CommonUtils.laterTickResolvingPromise();}
this._log.debug("Pull-only providers being unregistered.");this._pullOnlyProvidersRegisterCount=Math.max(0,this._pullOnlyProvidersRegisterCount-1);this._pullOnlyProvidersState=this.PULL_ONLY_UNREGISTERING;let inFlightPromise=this._pullOnlyProvidersCurrentPromise;this._pullOnlyProvidersCurrentPromise=Task.spawn(function unregisterPullProviders(){if(inFlightPromise){this._log.debug("Waiting for in-flight pull-only provider activity "+"to complete before unregistering.");try{yield inFlightPromise;}catch(ex){this._log.warn("Error when waiting for existing pull-only promise: "+
CommonUtils.exceptionStr(ex));}}
for(let provider of this.providers){if(this._pullOnlyProvidersState!=this.PULL_ONLY_UNREGISTERING){return;}
if(!provider.pullOnly){continue;}
this._log.info("Shutting down pull-only provider: "+
provider.name);try{yield provider.shutdown();}catch(ex){this._recordProviderError(provider.name,"Error when shutting down provider",ex);}finally{this.unregisterProvider(provider.name);}}
if(this._pullOnlyProvidersState==this.PULL_ONLY_UNREGISTERING){this._pullOnlyProvidersState=this.PULL_ONLY_NOT_REGISTERED;this._pullOnlyProvidersCurrentPromise=null;}}.bind(this));return this._pullOnlyProvidersCurrentPromise;},_popAndInitProvider:function(){if(!this._providerInitQueue.length||this._providerInitializing){return;}
let[provider,deferred]=this._providerInitQueue.shift();this._providerInitializing=true;this._log.info("Initializing provider with storage: "+provider.name);Task.spawn(function initProvider(){try{let result=yield provider.init(this._storage);this._log.info("Provider successfully initialized: "+provider.name);this._providers.set(provider.name,{provider:provider,constantsCollected:false,});deferred.resolve(result);}catch(ex){this._recordProviderError(provider.name,"Failed to initialize",ex);deferred.reject(ex);}finally{this._providerInitializing=false;this._popAndInitProvider();}}.bind(this));},collectConstantData:function(){let entries=[];for(let[name,entry]of this._providers){if(entry.constantsCollected){this._log.trace("Provider has already provided constant data: "+
name);continue;}
entries.push(entry);}
let onCollect=function(entry,result){entry.constantsCollected=true;};return this._callCollectOnProviders(entries,"collectConstantData",onCollect);},collectDailyData:function(){return this._callCollectOnProviders(this._providers.values(),"collectDailyData");},_callCollectOnProviders:function(entries,fnProperty,onCollect=null){let promises=[];for(let entry of entries){let provider=entry.provider;let collectPromise;try{collectPromise=provider[fnProperty].call(provider);}catch(ex){this._recordProviderError(provider.name,"Exception when calling "+"collect function: "+fnProperty,ex);continue;}
if(!collectPromise){this._recordProviderError(provider.name,"Does not return a promise "+"from "+fnProperty+"()");continue;}
let promise=collectPromise.then(function onCollected(result){if(onCollect){try{onCollect(entry,result);}catch(ex){this._log.warn("onCollect callback threw: "+
CommonUtils.exceptionStr(ex));}}
return CommonUtils.laterTickResolvingPromise(result);});promises.push([provider.name,promise]);}
return this._handleCollectionPromises(promises);},_handleCollectionPromises:function(promises){return Task.spawn(function waitForPromises(){for(let[name,promise]of promises){try{yield promise;this._log.debug("Provider collected successfully: "+name);}catch(ex){this._recordProviderError(name,"Failed to collect",ex);}}
throw new Task.Result(this);}.bind(this));},_recordProviderError:function(name,msg,ex){msg="Provider error: "+name+": "+msg;if(ex){msg+=": "+CommonUtils.exceptionStr(ex);}
this._log.warn(msg);if(this.onProviderError){try{this.onProviderError(msg);}catch(callError){this._log.warn("Exception when calling onProviderError callback: "+
CommonUtils.exceptionStr(callError));}}},});