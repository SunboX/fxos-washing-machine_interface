this.EXPORTED_SYMBOLS=["XPCOMUtils"];const Cc=Components.classes;const Ci=Components.interfaces;const Cr=Components.results;const Cu=Components.utils;this.XPCOMUtils={generateQI:function XPCU_generateQI(interfaces){let a=[];if(interfaces){for(let i=0;i<interfaces.length;i++){let iface=interfaces[i];if(Ci[iface]){a.push(Ci[iface].name);}}}
return makeQI(a);},generateCI:function XPCU_generateCI(classInfo)
{if(QueryInterface in classInfo)
throw Error("In generateCI, don't use a component for generating classInfo");let _interfaces=[];for(let i=0;i<classInfo.interfaces.length;i++){let iface=classInfo.interfaces[i];if(Ci[iface]){_interfaces.push(Ci[iface]);}}
return{getInterfaces:function XPCU_getInterfaces(countRef){countRef.value=_interfaces.length;return _interfaces;},getHelperForLanguage:function XPCU_getHelperForLanguage(language)null,contractID:classInfo.contractID,classDescription:classInfo.classDescription,classID:classInfo.classID,implementationLanguage:Ci.nsIProgrammingLanguage.JAVASCRIPT,flags:classInfo.flags,QueryInterface:this.generateQI([Ci.nsIClassInfo])};},generateNSGetFactory:function XPCU_generateNSGetFactory(componentsArray){let classes={};for(let i=0;i<componentsArray.length;i++){let component=componentsArray[i];if(!(component.prototype.classID instanceof Components.ID))
throw Error("In generateNSGetFactory, classID missing or incorrect for component "+component);classes[component.prototype.classID]=this._getFactory(component);}
return function NSGetFactory(cid){let cidstring=cid.toString();if(cidstring in classes)
return classes[cidstring];throw Cr.NS_ERROR_FACTORY_NOT_REGISTERED;}},defineLazyGetter:function XPCU_defineLazyGetter(aObject,aName,aLambda)
{Object.defineProperty(aObject,aName,{get:function(){delete aObject[aName];return aObject[aName]=aLambda.apply(aObject);},configurable:true,enumerable:true});},defineLazyServiceGetter:function XPCU_defineLazyServiceGetter(aObject,aName,aContract,aInterfaceName)
{this.defineLazyGetter(aObject,aName,function XPCU_serviceLambda(){return Cc[aContract].getService(Ci[aInterfaceName]);});},defineLazyModuleGetter:function XPCU_defineLazyModuleGetter(aObject,aName,aResource,aSymbol)
{this.defineLazyGetter(aObject,aName,function XPCU_moduleLambda(){var temp={};try{Cu.import(aResource,temp);}catch(ex){Cu.reportError("Failed to load module "+aResource+".");throw ex;}
return temp[aSymbol||aName];});},get categoryManager(){return Components.classes["@mozilla.org/categorymanager;1"].getService(Ci.nsICategoryManager);},IterSimpleEnumerator:function XPCU_IterSimpleEnumerator(e,i)
{while(e.hasMoreElements())
yield e.getNext().QueryInterface(i);},IterStringEnumerator:function XPCU_IterStringEnumerator(e)
{while(e.hasMore())
yield e.getNext();},_getFactory:function XPCOMUtils__getFactory(component){var factory=component.prototype._xpcom_factory;if(!factory){factory={createInstance:function(outer,iid){if(outer)
throw Cr.NS_ERROR_NO_AGGREGATION;return(new component()).QueryInterface(iid);}}}
return factory;},importRelative:function XPCOMUtils__importRelative(that,path,scope){if(!("__URI__"in that))
throw Error("importRelative may only be used from a JSM, and its first argument "+"must be that JSM's global object (hint: use this)");let uri=that.__URI__;let i=uri.lastIndexOf("/");Components.utils.import(uri.substring(0,i+1)+path,scope||that);},generateSingletonFactory:function XPCOMUtils_generateSingletonFactory(aServiceConstructor){return{_instance:null,createInstance:function XPCU_SF_createInstance(aOuter,aIID){if(aOuter!==null){throw Cr.NS_ERROR_NO_AGGREGATION;}
if(this._instance===null){this._instance=new aServiceConstructor();}
return this._instance.QueryInterface(aIID);},lockFactory:function XPCU_SF_lockFactory(aDoLock){throw Cr.NS_ERROR_NOT_IMPLEMENTED;},QueryInterface:XPCOMUtils.generateQI([Ci.nsIFactory])};},};function makeQI(interfaceNames){return function XPCOMUtils_QueryInterface(iid){if(iid.equals(Ci.nsISupports))
return this;if(iid.equals(Ci.nsIClassInfo)&&"classInfo"in this)
return this.classInfo;for(let i=0;i<interfaceNames.length;i++){if(Ci[interfaceNames[i]].equals(iid))
return this;}
throw Cr.NS_ERROR_NO_INTERFACE;};}