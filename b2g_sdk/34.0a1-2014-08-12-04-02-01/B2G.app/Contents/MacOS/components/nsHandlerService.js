const Ci=Components.interfaces;const Cc=Components.classes;const Cu=Components.utils;const Cr=Components.results;const CLASS_MIMEINFO="mimetype";const CLASS_PROTOCOLINFO="scheme";const NC_NS="http://home.netscape.com/NC-rdf#";

const DEFAULT_HANDLERS_VERSION="defaultHandlersVersion";const NC_MIME_TYPES=NC_NS+"MIME-types";const NC_PROTOCOL_SCHEMES=NC_NS+"Protocol-Schemes";
const NC_VALUE=NC_NS+"value";const NC_DESCRIPTION=NC_NS+"description";const NC_FILE_EXTENSIONS=NC_NS+"fileExtensions";const NC_HANDLER_INFO=NC_NS+"handlerProp";
const NC_SAVE_TO_DISK=NC_NS+"saveToDisk";const NC_HANDLE_INTERNALLY=NC_NS+"handleInternal";const NC_USE_SYSTEM_DEFAULT=NC_NS+"useSystemDefault";const NC_ALWAYS_ASK=NC_NS+"alwaysAsk";const NC_PREFERRED_APP=NC_NS+"externalApplication";const NC_POSSIBLE_APP=NC_NS+"possibleApplication";
const NC_PRETTY_NAME=NC_NS+"prettyName";const NC_PATH=NC_NS+"path";const NC_URI_TEMPLATE=NC_NS+"uriTemplate";const NC_SERVICE=NC_NS+"service";const NC_METHOD=NC_NS+"method";const NC_OBJPATH=NC_NS+"objectPath";const NC_INTERFACE=NC_NS+"dBusInterface";Cu.import("resource://gre/modules/XPCOMUtils.jsm");function HandlerService(){this._init();}
const HandlerServiceFactory={_instance:null,createInstance:function(outer,iid){if(this._instance)
return this._instance;let processType=Cc["@mozilla.org/xre/runtime;1"].getService(Ci.nsIXULRuntime).processType;if(processType!=Ci.nsIXULRuntime.PROCESS_TYPE_DEFAULT)
return Cr.NS_ERROR_NOT_IMPLEMENTED;return(this._instance=new HandlerService());}};HandlerService.prototype={ classID:Components.ID("{32314cc8-22f7-4f7f-a645-1a45453ba6a6}"),QueryInterface:XPCOMUtils.generateQI([Ci.nsIHandlerService]),_xpcom_factory:HandlerServiceFactory,
_init:function HS__init(){
this._observerSvc.addObserver(this,"profile-before-change",false);
this._observerSvc.addObserver(this,"xpcom-shutdown",false); this._observerSvc.addObserver(this,"profile-do-change",false); this._updateDB();},_updateDB:function HS__updateDB(){try{var defaultHandlersVersion=this._datastoreDefaultHandlersVersion;}catch(ex){ return;}
try{
 if(defaultHandlersVersion<this._prefsDefaultHandlersVersion){
 this._datastoreDefaultHandlersVersion=this._prefsDefaultHandlersVersion;this._injectNewDefaults();}}catch(ex){
 this._datastoreDefaultHandlersVersion=defaultHandlersVersion;}},get _currentLocale(){var chromeRegistry=Cc["@mozilla.org/chrome/chrome-registry;1"].getService(Ci.nsIXULChromeRegistry);var currentLocale=chromeRegistry.getSelectedLocale("global");return currentLocale;},_destroy:function HS__destroy(){this._observerSvc.removeObserver(this,"profile-before-change");this._observerSvc.removeObserver(this,"xpcom-shutdown");this._observerSvc.removeObserver(this,"profile-do-change");
},_onProfileChange:function HS__onProfileChange(){
this.__ds=null;},_isInHandlerArray:function HS__isInHandlerArray(aArray,aHandler){var enumerator=aArray.enumerate();while(enumerator.hasMoreElements()){let handler=enumerator.getNext();handler.QueryInterface(Ci.nsIHandlerApp);if(handler.equals(aHandler))
return true;}
return false;}, get _datastoreDefaultHandlersVersion(){var version=this._getValue("urn:root",NC_NS+this._currentLocale+"_"+DEFAULT_HANDLERS_VERSION);return version?version:-1;},set _datastoreDefaultHandlersVersion(aNewVersion){return this._setLiteral("urn:root",NC_NS+this._currentLocale+"_"+
DEFAULT_HANDLERS_VERSION,aNewVersion);},get _prefsDefaultHandlersVersion(){ var prefSvc=Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService);var handlerSvcBranch=prefSvc.getBranch("gecko.handlerService."); return Number(handlerSvcBranch.getComplexValue("defaultHandlersVersion",Ci.nsIPrefLocalizedString).data);},_injectNewDefaults:function HS__injectNewDefaults(){ var prefSvc=Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService);let schemesPrefBranch=prefSvc.getBranch("gecko.handlerService.schemes.");let schemePrefList=schemesPrefBranch.getChildList("");var schemes={}; for each(var schemePrefName in schemePrefList){let[scheme,handlerNumber,attribute]=schemePrefName.split(".");try{var attrData=schemesPrefBranch.getComplexValue(schemePrefName,Ci.nsIPrefLocalizedString).data;if(!(scheme in schemes))
schemes[scheme]={};if(!(handlerNumber in schemes[scheme]))
schemes[scheme][handlerNumber]={};schemes[scheme][handlerNumber][attribute]=attrData;}catch(ex){}}
let protoSvc=Cc["@mozilla.org/uriloader/external-protocol-service;1"].getService(Ci.nsIExternalProtocolService);for(var scheme in schemes){


let osDefaultHandlerFound={};let protoInfo=protoSvc.getProtocolHandlerInfoFromOS(scheme,osDefaultHandlerFound);if(this.exists(protoInfo))
this.fillHandlerInfo(protoInfo,null);else
protoSvc.setProtocolHandlerDefaults(protoInfo,osDefaultHandlerFound.value);let possibleHandlers=protoInfo.possibleApplicationHandlers;for each(var handlerPrefs in schemes[scheme]){let handlerApp=Cc["@mozilla.org/uriloader/web-handler-app;1"].createInstance(Ci.nsIWebHandlerApp);handlerApp.uriTemplate=handlerPrefs.uriTemplate;handlerApp.name=handlerPrefs.name;if(!this._isInHandlerArray(possibleHandlers,handlerApp)){possibleHandlers.appendElement(handlerApp,false);}}
this.store(protoInfo);}},
observe:function HS__observe(subject,topic,data){switch(topic){case"profile-before-change":this._onProfileChange();break;case"xpcom-shutdown":this._destroy();break;case"profile-do-change":this._updateDB();break;}}, enumerate:function HS_enumerate(){var handlers=Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);this._appendHandlers(handlers,CLASS_MIMEINFO);this._appendHandlers(handlers,CLASS_PROTOCOLINFO);return handlers.enumerate();},fillHandlerInfo:function HS_fillHandlerInfo(aHandlerInfo,aOverrideType){var type=aOverrideType||aHandlerInfo.type;var typeID=this._getTypeID(this._getClass(aHandlerInfo),type);

if(!this._hasValue(typeID,NC_VALUE))
throw Cr.NS_ERROR_NOT_AVAILABLE;if(this._hasValue(typeID,NC_DESCRIPTION))
aHandlerInfo.description=this._getValue(typeID,NC_DESCRIPTION);


var infoID=this._getInfoID(this._getClass(aHandlerInfo),type);aHandlerInfo.preferredAction=this._retrievePreferredAction(infoID);var preferredHandlerID=this._getPreferredHandlerID(this._getClass(aHandlerInfo),type);


aHandlerInfo.preferredApplicationHandler=this._retrieveHandlerApp(preferredHandlerID);this._fillPossibleHandlers(infoID,aHandlerInfo.possibleApplicationHandlers,aHandlerInfo.preferredApplicationHandler);
var alwaysAsk;if(this._hasValue(infoID,NC_ALWAYS_ASK)){alwaysAsk=(this._getValue(infoID,NC_ALWAYS_ASK)!="false");}else{var prefSvc=Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService);var prefBranch=prefSvc.getBranch("network.protocol-handler.");try{alwaysAsk=prefBranch.getBoolPref("warn-external."+type);}catch(e){try{alwaysAsk=prefBranch.getBoolPref("warn-external-default");}catch(e){alwaysAsk=true;}}}
aHandlerInfo.alwaysAskBeforeHandling=alwaysAsk;
if(aHandlerInfo instanceof Ci.nsIMIMEInfo)
for each(let fileExtension in this._retrieveFileExtensions(typeID))
aHandlerInfo.appendExtension(fileExtension);},store:function HS_store(aHandlerInfo){


this._ensureRecordsForType(aHandlerInfo);this._storePreferredAction(aHandlerInfo);this._storePreferredHandler(aHandlerInfo);this._storePossibleHandlers(aHandlerInfo);this._storeAlwaysAsk(aHandlerInfo);
if(this._ds instanceof Ci.nsIRDFRemoteDataSource)
this._ds.Flush();},exists:function HS_exists(aHandlerInfo){var found;try{var typeID=this._getTypeID(this._getClass(aHandlerInfo),aHandlerInfo.type);found=this._hasLiteralAssertion(typeID,NC_VALUE,aHandlerInfo.type);}catch(e){found=false;}
return found;},remove:function HS_remove(aHandlerInfo){var preferredHandlerID=this._getPreferredHandlerID(this._getClass(aHandlerInfo),aHandlerInfo.type);this._removeAssertions(preferredHandlerID);var infoID=this._getInfoID(this._getClass(aHandlerInfo),aHandlerInfo.type);
var possibleHandlerIDs=[];var possibleHandlerTargets=this._getTargets(infoID,NC_POSSIBLE_APP);while(possibleHandlerTargets.hasMoreElements()){let possibleHandlerTarget=possibleHandlerTargets.getNext();if(possibleHandlerTarget instanceof Ci.nsIRDFResource)
possibleHandlerIDs.push(possibleHandlerTarget.ValueUTF8);}
this._removeAssertions(infoID);
for each(let possibleHandlerID in possibleHandlerIDs)
if(!this._existsResourceTarget(NC_POSSIBLE_APP,possibleHandlerID))
this._removeAssertions(possibleHandlerID);var typeID=this._getTypeID(this._getClass(aHandlerInfo),aHandlerInfo.type);this._removeAssertions(typeID);
var typeList=this._ensureAndGetTypeList(this._getClass(aHandlerInfo));var type=this._rdf.GetResource(typeID);var typeIndex=typeList.IndexOf(type);if(typeIndex!=-1)
typeList.RemoveElementAt(typeIndex,true);

if(this._ds instanceof Ci.nsIRDFRemoteDataSource)
this._ds.Flush();},getTypeFromExtension:function HS_getTypeFromExtension(aFileExtension){var fileExtension=aFileExtension.toLowerCase();var typeID;if(this._existsLiteralTarget(NC_FILE_EXTENSIONS,fileExtension))
typeID=this._getSourceForLiteral(NC_FILE_EXTENSIONS,fileExtension);if(typeID&&this._hasValue(typeID,NC_VALUE)){let type=this._getValue(typeID,NC_VALUE);if(type=="")
throw Cr.NS_ERROR_FAILURE;return type;}
return"";},_retrievePreferredAction:function HS__retrievePreferredAction(aInfoID){if(this._getValue(aInfoID,NC_SAVE_TO_DISK)=="true")
return Ci.nsIHandlerInfo.saveToDisk;if(this._getValue(aInfoID,NC_USE_SYSTEM_DEFAULT)=="true")
return Ci.nsIHandlerInfo.useSystemDefault;if(this._getValue(aInfoID,NC_HANDLE_INTERNALLY)=="true")
return Ci.nsIHandlerInfo.handleInternally;return Ci.nsIHandlerInfo.useHelperApp;},_fillPossibleHandlers:function HS__fillPossibleHandlers(aInfoID,aPossibleHandlers,aPreferredHandler){

if(aPreferredHandler)
aPossibleHandlers.appendElement(aPreferredHandler,false);var possibleHandlerTargets=this._getTargets(aInfoID,NC_POSSIBLE_APP);while(possibleHandlerTargets.hasMoreElements()){let possibleHandlerTarget=possibleHandlerTargets.getNext();if(!(possibleHandlerTarget instanceof Ci.nsIRDFResource))
continue;let possibleHandlerID=possibleHandlerTarget.ValueUTF8;let possibleHandler=this._retrieveHandlerApp(possibleHandlerID);if(possibleHandler&&(!aPreferredHandler||!possibleHandler.equals(aPreferredHandler)))
aPossibleHandlers.appendElement(possibleHandler,false);}},_retrieveHandlerApp:function HS__retrieveHandlerApp(aHandlerAppID){var handlerApp;if(this._hasValue(aHandlerAppID,NC_PATH)){let executable=this._getFileWithPath(this._getValue(aHandlerAppID,NC_PATH));if(!executable)
return null;handlerApp=Cc["@mozilla.org/uriloader/local-handler-app;1"].createInstance(Ci.nsILocalHandlerApp);handlerApp.executable=executable;}
else if(this._hasValue(aHandlerAppID,NC_URI_TEMPLATE)){let uriTemplate=this._getValue(aHandlerAppID,NC_URI_TEMPLATE);if(!uriTemplate)
return null;handlerApp=Cc["@mozilla.org/uriloader/web-handler-app;1"].createInstance(Ci.nsIWebHandlerApp);handlerApp.uriTemplate=uriTemplate;}
else if(this._hasValue(aHandlerAppID,NC_SERVICE)){let service=this._getValue(aHandlerAppID,NC_SERVICE);if(!service)
return null;let method=this._getValue(aHandlerAppID,NC_METHOD);if(!method)
return null;let objpath=this._getValue(aHandlerAppID,NC_OBJPATH);if(!objpath)
return null;let iface=this._getValue(aHandlerAppID,NC_INTERFACE);if(!iface)
return null;handlerApp=Cc["@mozilla.org/uriloader/dbus-handler-app;1"].createInstance(Ci.nsIDBusHandlerApp);handlerApp.service=service;handlerApp.method=method;handlerApp.objectPath=objpath;handlerApp.dBusInterface=iface;}
else
return null;handlerApp.name=this._getValue(aHandlerAppID,NC_PRETTY_NAME);return handlerApp;},_retrieveFileExtensions:function HS__retrieveFileExtensions(aTypeID){var fileExtensions=[];var fileExtensionTargets=this._getTargets(aTypeID,NC_FILE_EXTENSIONS);while(fileExtensionTargets.hasMoreElements()){let fileExtensionTarget=fileExtensionTargets.getNext();if(fileExtensionTarget instanceof Ci.nsIRDFLiteral&&fileExtensionTarget.Value!="")
fileExtensions.push(fileExtensionTarget.Value);}
return fileExtensions;},_getFileWithPath:function HS__getFileWithPath(aPath){var file=Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);try{file.initWithPath(aPath);if(file.exists())
return file;}
catch(ex){

file=this._dirSvc.get("XCurProcD",Ci.nsIFile);try{file.append(aPath);if(file.exists())
return file;}
catch(ex){}}
return null;}, _storePreferredAction:function HS__storePreferredAction(aHandlerInfo){var infoID=this._getInfoID(this._getClass(aHandlerInfo),aHandlerInfo.type);switch(aHandlerInfo.preferredAction){case Ci.nsIHandlerInfo.saveToDisk:this._setLiteral(infoID,NC_SAVE_TO_DISK,"true");this._removeTarget(infoID,NC_HANDLE_INTERNALLY);this._removeTarget(infoID,NC_USE_SYSTEM_DEFAULT);break;case Ci.nsIHandlerInfo.handleInternally:this._setLiteral(infoID,NC_HANDLE_INTERNALLY,"true");this._removeTarget(infoID,NC_SAVE_TO_DISK);this._removeTarget(infoID,NC_USE_SYSTEM_DEFAULT);break;case Ci.nsIHandlerInfo.useSystemDefault:this._setLiteral(infoID,NC_USE_SYSTEM_DEFAULT,"true");this._removeTarget(infoID,NC_SAVE_TO_DISK);this._removeTarget(infoID,NC_HANDLE_INTERNALLY);break;


case Ci.nsIHandlerInfo.useHelperApp:default:this._removeTarget(infoID,NC_SAVE_TO_DISK);this._removeTarget(infoID,NC_HANDLE_INTERNALLY);this._removeTarget(infoID,NC_USE_SYSTEM_DEFAULT);break;}},_storePreferredHandler:function HS__storePreferredHandler(aHandlerInfo){var infoID=this._getInfoID(this._getClass(aHandlerInfo),aHandlerInfo.type);var handlerID=this._getPreferredHandlerID(this._getClass(aHandlerInfo),aHandlerInfo.type);var handler=aHandlerInfo.preferredApplicationHandler;if(handler){this._storeHandlerApp(handlerID,handler);


this._setResource(infoID,NC_PREFERRED_APP,handlerID);}
else{this._removeTarget(infoID,NC_PREFERRED_APP);this._removeAssertions(handlerID);}},_storePossibleHandlers:function HS__storePossibleHandlers(aHandlerInfo){var infoID=this._getInfoID(this._getClass(aHandlerInfo),aHandlerInfo.type);
var currentHandlerApps={};var currentHandlerTargets=this._getTargets(infoID,NC_POSSIBLE_APP);while(currentHandlerTargets.hasMoreElements()){let handlerApp=currentHandlerTargets.getNext();if(handlerApp instanceof Ci.nsIRDFResource){let handlerAppID=handlerApp.ValueUTF8;currentHandlerApps[handlerAppID]=true;}}
var newHandlerApps=aHandlerInfo.possibleApplicationHandlers.enumerate();while(newHandlerApps.hasMoreElements()){let handlerApp=newHandlerApps.getNext().QueryInterface(Ci.nsIHandlerApp);let handlerAppID=this._getPossibleHandlerAppID(handlerApp);if(!this._hasResourceAssertion(infoID,NC_POSSIBLE_APP,handlerAppID)){this._storeHandlerApp(handlerAppID,handlerApp);this._addResourceAssertion(infoID,NC_POSSIBLE_APP,handlerAppID);}
delete currentHandlerApps[handlerAppID];}


for(let handlerAppID in currentHandlerApps){this._removeResourceAssertion(infoID,NC_POSSIBLE_APP,handlerAppID);if(!this._existsResourceTarget(NC_POSSIBLE_APP,handlerAppID))
this._removeAssertions(handlerAppID);}},_storeHandlerApp:function HS__storeHandlerApp(aHandlerAppID,aHandlerApp){aHandlerApp.QueryInterface(Ci.nsIHandlerApp);this._setLiteral(aHandlerAppID,NC_PRETTY_NAME,aHandlerApp.name);


if(aHandlerApp instanceof Ci.nsILocalHandlerApp){this._setLiteral(aHandlerAppID,NC_PATH,aHandlerApp.executable.path);this._removeTarget(aHandlerAppID,NC_URI_TEMPLATE);this._removeTarget(aHandlerAppID,NC_METHOD);this._removeTarget(aHandlerAppID,NC_SERVICE);this._removeTarget(aHandlerAppID,NC_OBJPATH);this._removeTarget(aHandlerAppID,NC_INTERFACE);}
else if(aHandlerApp instanceof Ci.nsIWebHandlerApp){aHandlerApp.QueryInterface(Ci.nsIWebHandlerApp);this._setLiteral(aHandlerAppID,NC_URI_TEMPLATE,aHandlerApp.uriTemplate);this._removeTarget(aHandlerAppID,NC_PATH);this._removeTarget(aHandlerAppID,NC_METHOD);this._removeTarget(aHandlerAppID,NC_SERVICE);this._removeTarget(aHandlerAppID,NC_OBJPATH);this._removeTarget(aHandlerAppID,NC_INTERFACE);}
else if(aHandlerApp instanceof Ci.nsIDBusHandlerApp){aHandlerApp.QueryInterface(Ci.nsIDBusHandlerApp);this._setLiteral(aHandlerAppID,NC_SERVICE,aHandlerApp.service);this._setLiteral(aHandlerAppID,NC_METHOD,aHandlerApp.method);this._setLiteral(aHandlerAppID,NC_OBJPATH,aHandlerApp.objectPath);this._setLiteral(aHandlerAppID,NC_INTERFACE,aHandlerApp.dBusInterface);this._removeTarget(aHandlerAppID,NC_PATH);this._removeTarget(aHandlerAppID,NC_URI_TEMPLATE);}
else{throw"unknown handler type";}},_storeAlwaysAsk:function HS__storeAlwaysAsk(aHandlerInfo){var infoID=this._getInfoID(this._getClass(aHandlerInfo),aHandlerInfo.type);this._setLiteral(infoID,NC_ALWAYS_ASK,aHandlerInfo.alwaysAskBeforeHandling?"true":"false");},
 __observerSvc:null,get _observerSvc(){if(!this.__observerSvc)
this.__observerSvc=Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);return this.__observerSvc;}, __dirSvc:null,get _dirSvc(){if(!this.__dirSvc)
this.__dirSvc=Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties);return this.__dirSvc;}, __mimeSvc:null,get _mimeSvc(){if(!this.__mimeSvc)
this.__mimeSvc=Cc["@mozilla.org/mime;1"].getService(Ci.nsIMIMEService);return this.__mimeSvc;}, __protocolSvc:null,get _protocolSvc(){if(!this.__protocolSvc)
this.__protocolSvc=Cc["@mozilla.org/uriloader/external-protocol-service;1"].getService(Ci.nsIExternalProtocolService);return this.__protocolSvc;}, __rdf:null,get _rdf(){if(!this.__rdf)
this.__rdf=Cc["@mozilla.org/rdf/rdf-service;1"].getService(Ci.nsIRDFService);return this.__rdf;}, __containerUtils:null,get _containerUtils(){if(!this.__containerUtils)
this.__containerUtils=Cc["@mozilla.org/rdf/container-utils;1"].getService(Ci.nsIRDFContainerUtils);return this.__containerUtils;},__ds:null,get _ds(){if(!this.__ds){var file=this._dirSvc.get("UMimTyp",Ci.nsIFile);var ioService=Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);var fileHandler=ioService.getProtocolHandler("file").QueryInterface(Ci.nsIFileProtocolHandler);this.__ds=this._rdf.GetDataSourceBlocking(fileHandler.getURLSpecFromFile(file));}
return this.__ds;},_getClass:function HS__getClass(aHandlerInfo){if(aHandlerInfo instanceof Ci.nsIMIMEInfo)
return CLASS_MIMEINFO;else
return CLASS_PROTOCOLINFO;},_getTypeID:function HS__getTypeID(aClass,aType){return"urn:"+aClass+":"+aType;},_getInfoID:function HS__getInfoID(aClass,aType){return"urn:"+aClass+":handler:"+aType;},_getPreferredHandlerID:function HS__getPreferredHandlerID(aClass,aType){return"urn:"+aClass+":externalApplication:"+aType;},_getPossibleHandlerAppID:function HS__getPossibleHandlerAppID(aHandlerApp){var handlerAppID="urn:handler:";if(aHandlerApp instanceof Ci.nsILocalHandlerApp)
handlerAppID+="local:"+aHandlerApp.executable.path;else if(aHandlerApp instanceof Ci.nsIWebHandlerApp){aHandlerApp.QueryInterface(Ci.nsIWebHandlerApp);handlerAppID+="web:"+aHandlerApp.uriTemplate;}
else if(aHandlerApp instanceof Ci.nsIDBusHandlerApp){aHandlerApp.QueryInterface(Ci.nsIDBusHandlerApp);handlerAppID+="dbus:"+aHandlerApp.service+" "+aHandlerApp.method+" "+aHandlerApp.uriTemplate;}else{throw"unknown handler type";}
return handlerAppID;},_ensureAndGetTypeList:function HS__ensureAndGetTypeList(aClass){var source=this._rdf.GetResource("urn:"+aClass+"s");var property=this._rdf.GetResource(aClass==CLASS_MIMEINFO?NC_MIME_TYPES:NC_PROTOCOL_SCHEMES);var target=this._rdf.GetResource("urn:"+aClass+"s:root");if(!this._ds.HasAssertion(source,property,target,true))
this._ds.Assert(source,property,target,true);if(!this._containerUtils.IsContainer(this._ds,target))
this._containerUtils.MakeSeq(this._ds,target);var typeList=Cc["@mozilla.org/rdf/container;1"].createInstance(Ci.nsIRDFContainer);typeList.Init(this._ds,target);return typeList;},_ensureRecordsForType:function HS__ensureRecordsForType(aHandlerInfo){var typeList=this._ensureAndGetTypeList(this._getClass(aHandlerInfo));
var typeID=this._getTypeID(this._getClass(aHandlerInfo),aHandlerInfo.type);var type=this._rdf.GetResource(typeID);if(typeList.IndexOf(type)!=-1)
return;typeList.AppendElement(type);this._setLiteral(typeID,NC_VALUE,aHandlerInfo.type);var infoID=this._getInfoID(this._getClass(aHandlerInfo),aHandlerInfo.type);this._setLiteral(infoID,NC_ALWAYS_ASK,"false");this._setResource(typeID,NC_HANDLER_INFO,infoID);


var preferredHandlerID=this._getPreferredHandlerID(this._getClass(aHandlerInfo),aHandlerInfo.type);this._setLiteral(preferredHandlerID,NC_PATH,"");this._setResource(infoID,NC_PREFERRED_APP,preferredHandlerID);},_appendHandlers:function HS__appendHandlers(aHandlers,aClass){var typeList=this._ensureAndGetTypeList(aClass);var enumerator=typeList.GetElements();while(enumerator.hasMoreElements()){var element=enumerator.getNext();


if(!(element instanceof Ci.nsIRDFResource))
continue;
var type=this._getValue(element.ValueUTF8,NC_VALUE);if(!type)
continue;var handler;if(typeList.Resource.ValueUTF8=="urn:mimetypes:root")
handler=this._mimeSvc.getFromTypeAndExtension(type,null);else
handler=this._protocolSvc.getProtocolHandlerInfo(type);aHandlers.appendElement(handler,false);}},_hasValue:function HS__hasValue(sourceURI,propertyURI){var source=this._rdf.GetResource(sourceURI);var property=this._rdf.GetResource(propertyURI);return this._ds.hasArcOut(source,property);},_getValue:function HS__getValue(sourceURI,propertyURI){var source=this._rdf.GetResource(sourceURI);var property=this._rdf.GetResource(propertyURI);var target=this._ds.GetTarget(source,property,true);if(!target)
return null;if(target instanceof Ci.nsIRDFResource)
return target.ValueUTF8;if(target instanceof Ci.nsIRDFLiteral)
return target.Value;return null;},_getTargets:function HS__getTargets(sourceURI,propertyURI){var source=this._rdf.GetResource(sourceURI);var property=this._rdf.GetResource(propertyURI);return this._ds.GetTargets(source,property,true);},_setLiteral:function HS__setLiteral(sourceURI,propertyURI,value){var source=this._rdf.GetResource(sourceURI);var property=this._rdf.GetResource(propertyURI);var target=this._rdf.GetLiteral(value);this._setTarget(source,property,target);},_setResource:function HS__setResource(sourceURI,propertyURI,targetURI){var source=this._rdf.GetResource(sourceURI);var property=this._rdf.GetResource(propertyURI);var target=this._rdf.GetResource(targetURI);this._setTarget(source,property,target);},_setTarget:function HS__setTarget(source,property,target){if(this._ds.hasArcOut(source,property)){var oldTarget=this._ds.GetTarget(source,property,true);this._ds.Change(source,property,oldTarget,target);}
else
this._ds.Assert(source,property,target,true);},_addResourceAssertion:function HS__addResourceAssertion(sourceURI,propertyURI,targetURI){var source=this._rdf.GetResource(sourceURI);var property=this._rdf.GetResource(propertyURI);var target=this._rdf.GetResource(targetURI);this._ds.Assert(source,property,target,true);},_removeResourceAssertion:function HS__removeResourceAssertion(sourceURI,propertyURI,targetURI){var source=this._rdf.GetResource(sourceURI);var property=this._rdf.GetResource(propertyURI);var target=this._rdf.GetResource(targetURI);this._ds.Unassert(source,property,target);},_hasResourceAssertion:function HS__hasResourceAssertion(sourceURI,propertyURI,targetURI){var source=this._rdf.GetResource(sourceURI);var property=this._rdf.GetResource(propertyURI);var target=this._rdf.GetResource(targetURI);return this._ds.HasAssertion(source,property,target,true);},_hasLiteralAssertion:function HS__hasLiteralAssertion(sourceURI,propertyURI,value){var source=this._rdf.GetResource(sourceURI);var property=this._rdf.GetResource(propertyURI);var target=this._rdf.GetLiteral(value);return this._ds.HasAssertion(source,property,target,true);},_existsLiteralTarget:function HS__existsLiteralTarget(propertyURI,value){var property=this._rdf.GetResource(propertyURI);var target=this._rdf.GetLiteral(value);return this._ds.hasArcIn(target,property);},_getSourceForLiteral:function HS__getSourceForLiteral(propertyURI,value){var property=this._rdf.GetResource(propertyURI);var target=this._rdf.GetLiteral(value);var source=this._ds.GetSource(property,target,true);if(source)
return source.ValueUTF8;return null;},_existsResourceTarget:function HS__existsResourceTarget(propertyURI,targetURI){var property=this._rdf.GetResource(propertyURI);var target=this._rdf.GetResource(targetURI);return this._ds.hasArcIn(target,property);},_removeTarget:function HS__removeTarget(sourceURI,propertyURI){var source=this._rdf.GetResource(sourceURI);var property=this._rdf.GetResource(propertyURI);if(this._ds.hasArcOut(source,property)){var target=this._ds.GetTarget(source,property,true);this._ds.Unassert(source,property,target);}},_removeAssertions:function HS__removeAssertions(sourceURI){var source=this._rdf.GetResource(sourceURI);var properties=this._ds.ArcLabelsOut(source);while(properties.hasMoreElements()){let property=properties.getNext();let targets=this._ds.GetTargets(source,property,true);while(targets.hasMoreElements()){let target=targets.getNext();this._ds.Unassert(source,property,target);}}}};this.NSGetFactory=XPCOMUtils.generateNSGetFactory([HandlerService]);