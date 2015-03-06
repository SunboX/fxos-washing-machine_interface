"use strict";const Cc=Components.classes;const Ci=Components.interfaces;const Cr=Components.results;const Cu=Components.utils;


if("@mozilla.org/xre/app-info;1"in Cc){let runtime=Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULRuntime);if(runtime.processType!=Ci.nsIXULRuntime.PROCESS_TYPE_DEFAULT){throw new Error("You cannot use the AddonManager in child processes!");}}
const PREF_BLOCKLIST_PINGCOUNTVERSION="extensions.blocklist.pingCountVersion";const PREF_DEFAULT_PROVIDERS_ENABLED="extensions.defaultProviders.enabled";const PREF_EM_UPDATE_ENABLED="extensions.update.enabled";const PREF_EM_LAST_APP_VERSION="extensions.lastAppVersion";const PREF_EM_LAST_PLATFORM_VERSION="extensions.lastPlatformVersion";const PREF_EM_AUTOUPDATE_DEFAULT="extensions.update.autoUpdateDefault";const PREF_EM_STRICT_COMPATIBILITY="extensions.strictCompatibility";const PREF_EM_CHECK_UPDATE_SECURITY="extensions.checkUpdateSecurity";const PREF_EM_UPDATE_BACKGROUND_URL="extensions.update.background.url";const PREF_APP_UPDATE_ENABLED="app.update.enabled";const PREF_APP_UPDATE_AUTO="app.update.auto";const PREF_EM_HOTFIX_ID="extensions.hotfix.id";const PREF_EM_HOTFIX_LASTVERSION="extensions.hotfix.lastVersion";const PREF_EM_HOTFIX_URL="extensions.hotfix.url";const PREF_EM_CERT_CHECKATTRIBUTES="extensions.hotfix.cert.checkAttributes";const PREF_EM_HOTFIX_CERTS="extensions.hotfix.certs.";const PREF_MATCH_OS_LOCALE="intl.locale.matchOS";const PREF_SELECTED_LOCALE="general.useragent.locale";const UNKNOWN_XPCOM_ABI="unknownABI";const UPDATE_REQUEST_VERSION=2;const CATEGORY_UPDATE_PARAMS="extension-update-params";const XMLURI_BLOCKLIST="http://www.mozilla.org/2006/addons-blocklist";const KEY_PROFILEDIR="ProfD";const KEY_APPDIR="XCurProcD";const FILE_BLOCKLIST="blocklist.xml";const BRANCH_REGEXP=/^([^\.]+\.[0-9]+[a-z]*).*/gi;const PREF_EM_CHECK_COMPATIBILITY_BASE="extensions.checkCompatibility";var PREF_EM_CHECK_COMPATIBILITY=PREF_EM_CHECK_COMPATIBILITY_BASE+".nightly";const TOOLKIT_ID="toolkit@mozilla.org";const VALID_TYPES_REGEXP=/^[\w\-]+$/;Cu.import("resource://gre/modules/Services.jsm");Cu.import("resource://gre/modules/XPCOMUtils.jsm");Cu.import("resource://gre/modules/AsyncShutdown.jsm");XPCOMUtils.defineLazyModuleGetter(this,"Task","resource://gre/modules/Task.jsm");XPCOMUtils.defineLazyModuleGetter(this,"Promise","resource://gre/modules/Promise.jsm");XPCOMUtils.defineLazyModuleGetter(this,"AddonRepository","resource://gre/modules/addons/AddonRepository.jsm");XPCOMUtils.defineLazyModuleGetter(this,"FileUtils","resource://gre/modules/FileUtils.jsm");XPCOMUtils.defineLazyGetter(this,"CertUtils",function certUtilsLazyGetter(){let certUtils={};Components.utils.import("resource://gre/modules/CertUtils.jsm",certUtils);return certUtils;});this.EXPORTED_SYMBOLS=["AddonManager","AddonManagerPrivate"];const CATEGORY_PROVIDER_MODULE="addon-provider-module";const DEFAULT_PROVIDERS=["resource://gre/modules/addons/XPIProvider.jsm","resource://gre/modules/LightweightThemeManager.jsm"];Cu.import("resource://gre/modules/Log.jsm");
const PARENT_LOGGER_ID="addons";let parentLogger=Log.repository.getLogger(PARENT_LOGGER_ID);parentLogger.level=Log.Level.Warn;let formatter=new Log.BasicFormatter();
parentLogger.addAppender(new Log.ConsoleAppender(formatter));
parentLogger.addAppender(new Log.DumpAppender(formatter));
const LOGGER_ID="addons.manager";let logger=Log.repository.getLogger(LOGGER_ID);



const PREF_LOGGING_ENABLED="extensions.logging.enabled";const NS_PREFBRANCH_PREFCHANGE_TOPIC_ID="nsPref:changed";var PrefObserver={init:function PrefObserver_init(){Services.prefs.addObserver(PREF_LOGGING_ENABLED,this,false);Services.obs.addObserver(this,"xpcom-shutdown",false);this.observe(null,NS_PREFBRANCH_PREFCHANGE_TOPIC_ID,PREF_LOGGING_ENABLED);},observe:function PrefObserver_observe(aSubject,aTopic,aData){if(aTopic=="xpcom-shutdown"){Services.prefs.removeObserver(PREF_LOGGING_ENABLED,this);Services.obs.removeObserver(this,"xpcom-shutdown");}
else if(aTopic==NS_PREFBRANCH_PREFCHANGE_TOPIC_ID){let debugLogEnabled=false;try{debugLogEnabled=Services.prefs.getBoolPref(PREF_LOGGING_ENABLED);}
catch(e){}
if(debugLogEnabled){parentLogger.level=Log.Level.Debug;}
else{parentLogger.level=Log.Level.Warn;}}}};PrefObserver.init();function safeCall(aCallback,...aArgs){try{aCallback.apply(null,aArgs);}
catch(e){logger.warn("Exception calling callback",e);}}
function callProvider(aProvider,aMethod,aDefault,...aArgs){if(!(aMethod in aProvider))
return aDefault;try{return aProvider[aMethod].apply(aProvider,aArgs);}
catch(e){logger.error("Exception calling provider "+aMethod,e);return aDefault;}}
function getLocale(){try{if(Services.prefs.getBoolPref(PREF_MATCH_OS_LOCALE))
return Services.locale.getLocaleComponentForUserAgent();}
catch(e){}
try{let locale=Services.prefs.getComplexValue(PREF_SELECTED_LOCALE,Ci.nsIPrefLocalizedString);if(locale)
return locale;}
catch(e){}
try{return Services.prefs.getCharPref(PREF_SELECTED_LOCALE);}
catch(e){}
return"en-US";}
function AsyncObjectCaller(aObjects,aMethod,aListener){this.objects=aObjects.slice(0);this.method=aMethod;this.listener=aListener;this.callNext();}
AsyncObjectCaller.prototype={objects:null,method:null,listener:null,callNext:function AOC_callNext(){if(this.objects.length==0){this.listener.noMoreObjects(this);return;}
let object=this.objects.shift();if(!this.method||this.method in object)
this.listener.nextObject(this,object);else
this.callNext();}};function AddonAuthor(aName,aURL){this.name=aName;this.url=aURL;}
AddonAuthor.prototype={name:null,url:null, toString:function AddonAuthor_toString(){return this.name||"";}}
function AddonScreenshot(aURL,aWidth,aHeight,aThumbnailURL,aThumbnailWidth,aThumbnailHeight,aCaption){this.url=aURL;if(aWidth)this.width=aWidth;if(aHeight)this.height=aHeight;if(aThumbnailURL)this.thumbnailURL=aThumbnailURL;if(aThumbnailWidth)this.thumbnailWidth=aThumbnailWidth;if(aThumbnailHeight)this.thumbnailHeight=aThumbnailHeight;if(aCaption)this.caption=aCaption;}
AddonScreenshot.prototype={url:null,width:null,height:null,thumbnailURL:null,thumbnailWidth:null,thumbnailHeight:null,caption:null, toString:function AddonScreenshot_toString(){return this.url||"";}}
function AddonCompatibilityOverride(aType,aMinVersion,aMaxVersion,aAppID,aAppMinVersion,aAppMaxVersion){this.type=aType;this.minVersion=aMinVersion;this.maxVersion=aMaxVersion;this.appID=aAppID;this.appMinVersion=aAppMinVersion;this.appMaxVersion=aAppMaxVersion;}
AddonCompatibilityOverride.prototype={type:null,minVersion:null,maxVersion:null,appID:null,appMinVersion:null,appMaxVersion:null};function AddonType(aID,aLocaleURI,aLocaleKey,aViewType,aUIPriority,aFlags){if(!aID)
throw Components.Exception("An AddonType must have an ID",Cr.NS_ERROR_INVALID_ARG);if(aViewType&&aUIPriority===undefined)
throw Components.Exception("An AddonType with a defined view must have a set UI priority",Cr.NS_ERROR_INVALID_ARG);if(!aLocaleKey)
throw Components.Exception("An AddonType must have a displayable name",Cr.NS_ERROR_INVALID_ARG);this.id=aID;this.uiPriority=aUIPriority;this.viewType=aViewType;this.flags=aFlags;if(aLocaleURI){this.__defineGetter__("name",function nameGetter(){delete this.name;let bundle=Services.strings.createBundle(aLocaleURI);this.name=bundle.GetStringFromName(aLocaleKey.replace("%ID%",aID));return this.name;});}
else{this.name=aLocaleKey;}}
var gStarted=false;var gStartupComplete=false;var gCheckCompatibility=true;var gStrictCompatibility=true;var gCheckUpdateSecurityDefault=true;var gCheckUpdateSecurity=gCheckUpdateSecurityDefault;var gUpdateEnabled=true;var gAutoUpdateDefault=true;var gHotfixID=null;var gShutdownBarrier=null;var AddonManagerInternal={managerListeners:[],installListeners:[],addonListeners:[],typeListeners:[],providers:[],types:{},startupChanges:{}, telemetryDetails:{}, typesProxy:Proxy.create({getOwnPropertyDescriptor:function typesProxy_getOwnPropertyDescriptor(aName){if(!(aName in AddonManagerInternal.types))
return undefined;return{value:AddonManagerInternal.types[aName].type,writable:false,configurable:false,enumerable:true}},getPropertyDescriptor:function typesProxy_getPropertyDescriptor(aName){return this.getOwnPropertyDescriptor(aName);},getOwnPropertyNames:function typesProxy_getOwnPropertyNames(){return Object.keys(AddonManagerInternal.types);},getPropertyNames:function typesProxy_getPropertyNames(){return this.getOwnPropertyNames();},delete:function typesProxy_delete(aName){ return false;},defineProperty:function typesProxy_defineProperty(aName,aProperty){},fix:function typesProxy_fix(){return undefined;},
 enumerate:function typesProxy_enumerate(){ return this.getPropertyNames();}}),recordTimestamp:function AMI_recordTimestamp(name,value){this.TelemetryTimestamps.add(name,value);},validateBlocklist:function AMI_validateBlocklist(){let appBlocklist=FileUtils.getFile(KEY_APPDIR,[FILE_BLOCKLIST]); if(!appBlocklist.exists())
return;let profileBlocklist=FileUtils.getFile(KEY_PROFILEDIR,[FILE_BLOCKLIST]);
 if(!profileBlocklist.exists()){try{appBlocklist.copyTo(profileBlocklist.parent,FILE_BLOCKLIST);}
catch(e){logger.warn("Failed to copy the application shipped blocklist to the profile",e);}
return;}
let fileStream=Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);try{let cstream=Cc["@mozilla.org/intl/converter-input-stream;1"].createInstance(Ci.nsIConverterInputStream);fileStream.init(appBlocklist,FileUtils.MODE_RDONLY,FileUtils.PERMS_FILE,0);cstream.init(fileStream,"UTF-8",0,0);let data="";let str={};let read=0;do{read=cstream.readString(0xffffffff,str);data+=str.value;}while(read!=0);let parser=Cc["@mozilla.org/xmlextras/domparser;1"].createInstance(Ci.nsIDOMParser);var doc=parser.parseFromString(data,"text/xml");}
catch(e){logger.warn("Application shipped blocklist could not be loaded",e);return;}
finally{try{fileStream.close();}
catch(e){logger.warn("Unable to close blocklist file stream",e);}}
 
if(doc.documentElement.namespaceURI!=XMLURI_BLOCKLIST){logger.warn("Application shipped blocklist has an unexpected namespace ("+
doc.documentElement.namespaceURI+")");return;}
 
if(!doc.documentElement.hasAttribute("lastupdate"))
return;
 if(doc.documentElement.getAttribute("lastupdate")<=profileBlocklist.lastModifiedTime)
return; try{appBlocklist.copyTo(profileBlocklist.parent,FILE_BLOCKLIST);}
catch(e){logger.warn("Failed to copy the application shipped blocklist to the profile",e);}},startup:function AMI_startup(){try{if(gStarted)
return;this.recordTimestamp("AMI_startup_begin"); for(let provider in this.telemetryDetails)
delete this.telemetryDetails[provider];let appChanged=undefined;let oldAppVersion=null;try{oldAppVersion=Services.prefs.getCharPref(PREF_EM_LAST_APP_VERSION);appChanged=Services.appinfo.version!=oldAppVersion;}
catch(e){}
let oldPlatformVersion=null;try{oldPlatformVersion=Services.prefs.getCharPref(PREF_EM_LAST_PLATFORM_VERSION);}
catch(e){}
if(appChanged!==false){logger.debug("Application has been upgraded");Services.prefs.setCharPref(PREF_EM_LAST_APP_VERSION,Services.appinfo.version);Services.prefs.setCharPref(PREF_EM_LAST_PLATFORM_VERSION,Services.appinfo.platformVersion);Services.prefs.setIntPref(PREF_BLOCKLIST_PINGCOUNTVERSION,(appChanged===undefined?0:-1));this.validateBlocklist();}
try{gCheckCompatibility=Services.prefs.getBoolPref(PREF_EM_CHECK_COMPATIBILITY);}catch(e){}
Services.prefs.addObserver(PREF_EM_CHECK_COMPATIBILITY,this,false);try{gStrictCompatibility=Services.prefs.getBoolPref(PREF_EM_STRICT_COMPATIBILITY);}catch(e){}
Services.prefs.addObserver(PREF_EM_STRICT_COMPATIBILITY,this,false);try{let defaultBranch=Services.prefs.getDefaultBranch("");gCheckUpdateSecurityDefault=defaultBranch.getBoolPref(PREF_EM_CHECK_UPDATE_SECURITY);}catch(e){}
try{gCheckUpdateSecurity=Services.prefs.getBoolPref(PREF_EM_CHECK_UPDATE_SECURITY);}catch(e){}
Services.prefs.addObserver(PREF_EM_CHECK_UPDATE_SECURITY,this,false);try{gUpdateEnabled=Services.prefs.getBoolPref(PREF_EM_UPDATE_ENABLED);}catch(e){}
Services.prefs.addObserver(PREF_EM_UPDATE_ENABLED,this,false);try{gAutoUpdateDefault=Services.prefs.getBoolPref(PREF_EM_AUTOUPDATE_DEFAULT);}catch(e){}
Services.prefs.addObserver(PREF_EM_AUTOUPDATE_DEFAULT,this,false);try{gHotfixID=Services.prefs.getCharPref(PREF_EM_HOTFIX_ID);}catch(e){}
Services.prefs.addObserver(PREF_EM_HOTFIX_ID,this,false);let defaultProvidersEnabled=true;try{defaultProvidersEnabled=Services.prefs.getBoolPref(PREF_DEFAULT_PROVIDERS_ENABLED);}catch(e){}
AddonManagerPrivate.recordSimpleMeasure("default_providers",defaultProvidersEnabled); if(defaultProvidersEnabled){for(let url of DEFAULT_PROVIDERS){try{let scope={};Components.utils.import(url,scope);
 let syms=Object.keys(scope);if((syms.length<1)||(typeof scope[syms[0]].startup!="function")){logger.warn("Provider "+url+" has no startup()");AddonManagerPrivate.recordException("AMI","provider "+url,"no startup()");}
logger.debug("Loaded provider scope for "+url+": "+Object.keys(scope).toSource());}
catch(e){AddonManagerPrivate.recordException("AMI","provider "+url+" load failed",e);logger.error("Exception loading default provider \""+url+"\"",e);}};} 
let catman=Cc["@mozilla.org/categorymanager;1"].getService(Ci.nsICategoryManager);let entries=catman.enumerateCategory(CATEGORY_PROVIDER_MODULE);while(entries.hasMoreElements()){let entry=entries.getNext().QueryInterface(Ci.nsISupportsCString).data;let url=catman.getCategoryEntry(CATEGORY_PROVIDER_MODULE,entry);try{Components.utils.import(url,{});}
catch(e){AddonManagerPrivate.recordException("AMI","provider "+url+" load failed",e);logger.error("Exception loading provider "+entry+" from category \""+
url+"\"",e);}} 
gShutdownBarrier=new AsyncShutdown.Barrier("AddonManager: Waiting for clients to shut down.");AsyncShutdown.profileBeforeChange.addBlocker("AddonManager: shutting down providers",this.shutdownManager.bind(this));gStarted=true;this.callProviders("startup",appChanged,oldAppVersion,oldPlatformVersion); if(appChanged===undefined){for(let type in this.startupChanges)
delete this.startupChanges[type];}
gStartupComplete=true;this.recordTimestamp("AMI_startup_end");}
catch(e){logger.error("startup failed",e);AddonManagerPrivate.recordException("AMI","startup failed",e);}},registerProvider:function AMI_registerProvider(aProvider,aTypes){if(!aProvider||typeof aProvider!="object")
throw Components.Exception("aProvider must be specified",Cr.NS_ERROR_INVALID_ARG);if(aTypes&&!Array.isArray(aTypes))
throw Components.Exception("aTypes must be an array or null",Cr.NS_ERROR_INVALID_ARG);this.providers.push(aProvider);if(aTypes){aTypes.forEach(function(aType){if(!(aType.id in this.types)){if(!VALID_TYPES_REGEXP.test(aType.id)){logger.warn("Ignoring invalid type "+aType.id);return;}
this.types[aType.id]={type:aType,providers:[aProvider]};let typeListeners=this.typeListeners.slice(0);for(let listener of typeListeners){safeCall(function listenerSafeCall(){listener.onTypeAdded(aType);});}}
else{this.types[aType.id].providers.push(aProvider);}},this);}
if(gStarted)
callProvider(aProvider,"startup");},unregisterProvider:function AMI_unregisterProvider(aProvider){if(!aProvider||typeof aProvider!="object")
throw Components.Exception("aProvider must be specified",Cr.NS_ERROR_INVALID_ARG);let pos=0;while(pos<this.providers.length){if(this.providers[pos]==aProvider)
this.providers.splice(pos,1);else
pos++;}
for(let type in this.types){this.types[type].providers=this.types[type].providers.filter(function filterProvider(p)p!=aProvider);if(this.types[type].providers.length==0){let oldType=this.types[type].type;delete this.types[type];let typeListeners=this.typeListeners.slice(0);for(let listener of typeListeners){safeCall(function listenerSafeCall(){listener.onTypeRemoved(oldType);});}}}
if(gStarted)
callProvider(aProvider,"shutdown");},callProviders:function AMI_callProviders(aMethod,...aArgs){if(!aMethod||typeof aMethod!="string")
throw Components.Exception("aMethod must be a non-empty string",Cr.NS_ERROR_INVALID_ARG);let providers=this.providers.slice(0);for(let provider of providers){try{if(aMethod in provider)
provider[aMethod].apply(provider,aArgs);}
catch(e){AddonManagerPrivate.recordException("AMI","provider "+aMethod,e);logger.error("Exception calling provider "+aMethod,e);}}},callProvidersAsync:function AMI_callProviders(aMethod,...aArgs){if(!aMethod||typeof aMethod!="string")
throw Components.Exception("aMethod must be a non-empty string",Cr.NS_ERROR_INVALID_ARG);let allProviders=[];let providers=this.providers.slice(0);for(let provider of providers){try{if(aMethod in provider){
let providerResult=provider[aMethod].apply(provider,aArgs);let nextPromise=Promise.resolve(providerResult);nextPromise=nextPromise.then(null,e=>logger.error("Exception calling provider "+aMethod,e));allProviders.push(nextPromise);}}
catch(e){logger.error("Exception calling provider "+aMethod,e);}}
return Promise.all(allProviders);},shutdownManager:function(){logger.debug("shutdown"); Services.prefs.removeObserver(PREF_EM_CHECK_COMPATIBILITY,this);Services.prefs.removeObserver(PREF_EM_STRICT_COMPATIBILITY,this);Services.prefs.removeObserver(PREF_EM_CHECK_UPDATE_SECURITY,this);Services.prefs.removeObserver(PREF_EM_UPDATE_ENABLED,this);Services.prefs.removeObserver(PREF_EM_AUTOUPDATE_DEFAULT,this);Services.prefs.removeObserver(PREF_EM_HOTFIX_ID,this);
let shuttingDown=null;if(gStarted){shuttingDown=gShutdownBarrier.wait().then(null,err=>logger.error("Failure during wait for shutdown barrier",err)).then(()=>this.callProvidersAsync("shutdown")).then(null,err=>logger.error("Failure during async provider shutdown",err)).then(()=>AddonRepository.shutdown());}
else{shuttingDown=AddonRepository.shutdown();}
shuttingDown.then(val=>logger.debug("Async provider shutdown done"),err=>logger.error("Failure during AddonRepository shutdown",err)).then(()=>{this.managerListeners.splice(0,this.managerListeners.length);this.installListeners.splice(0,this.installListeners.length);this.addonListeners.splice(0,this.addonListeners.length);this.typeListeners.splice(0,this.typeListeners.length);for(let type in this.startupChanges)
delete this.startupChanges[type];gStarted=false;gStartupComplete=false;gShutdownBarrier=null;});return shuttingDown;},observe:function AMI_observe(aSubject,aTopic,aData){switch(aData){case PREF_EM_CHECK_COMPATIBILITY:{let oldValue=gCheckCompatibility;try{gCheckCompatibility=Services.prefs.getBoolPref(PREF_EM_CHECK_COMPATIBILITY);}catch(e){gCheckCompatibility=true;}
this.callManagerListeners("onCompatibilityModeChanged");if(gCheckCompatibility!=oldValue)
this.updateAddonAppDisabledStates();break;}
case PREF_EM_STRICT_COMPATIBILITY:{let oldValue=gStrictCompatibility;try{gStrictCompatibility=Services.prefs.getBoolPref(PREF_EM_STRICT_COMPATIBILITY);}catch(e){gStrictCompatibility=true;}
this.callManagerListeners("onCompatibilityModeChanged");if(gStrictCompatibility!=oldValue)
this.updateAddonAppDisabledStates();break;}
case PREF_EM_CHECK_UPDATE_SECURITY:{let oldValue=gCheckUpdateSecurity;try{gCheckUpdateSecurity=Services.prefs.getBoolPref(PREF_EM_CHECK_UPDATE_SECURITY);}catch(e){gCheckUpdateSecurity=true;}
this.callManagerListeners("onCheckUpdateSecurityChanged");if(gCheckUpdateSecurity!=oldValue)
this.updateAddonAppDisabledStates();break;}
case PREF_EM_UPDATE_ENABLED:{let oldValue=gUpdateEnabled;try{gUpdateEnabled=Services.prefs.getBoolPref(PREF_EM_UPDATE_ENABLED);}catch(e){gUpdateEnabled=true;}
this.callManagerListeners("onUpdateModeChanged");break;}
case PREF_EM_AUTOUPDATE_DEFAULT:{let oldValue=gAutoUpdateDefault;try{gAutoUpdateDefault=Services.prefs.getBoolPref(PREF_EM_AUTOUPDATE_DEFAULT);}catch(e){gAutoUpdateDefault=true;}
this.callManagerListeners("onUpdateModeChanged");break;}
case PREF_EM_HOTFIX_ID:{try{gHotfixID=Services.prefs.getCharPref(PREF_EM_HOTFIX_ID);}catch(e){gHotfixID=null;}
break;}}},escapeAddonURI:function AMI_escapeAddonURI(aAddon,aUri,aAppVersion)
{if(!aAddon||typeof aAddon!="object")
throw Components.Exception("aAddon must be an Addon object",Cr.NS_ERROR_INVALID_ARG);if(!aUri||typeof aUri!="string")
throw Components.Exception("aUri must be a non-empty string",Cr.NS_ERROR_INVALID_ARG);if(aAppVersion&&typeof aAppVersion!="string")
throw Components.Exception("aAppVersion must be a string or null",Cr.NS_ERROR_INVALID_ARG);var addonStatus=aAddon.userDisabled||aAddon.softDisabled?"userDisabled":"userEnabled";if(!aAddon.isCompatible)
addonStatus+=",incompatible";if(aAddon.blocklistState==Ci.nsIBlocklistService.STATE_BLOCKED)
addonStatus+=",blocklisted";if(aAddon.blocklistState==Ci.nsIBlocklistService.STATE_SOFTBLOCKED)
addonStatus+=",softblocked";try{var xpcomABI=Services.appinfo.XPCOMABI;}catch(ex){xpcomABI=UNKNOWN_XPCOM_ABI;}
let uri=aUri.replace(/%ITEM_ID%/g,aAddon.id);uri=uri.replace(/%ITEM_VERSION%/g,aAddon.version);uri=uri.replace(/%ITEM_STATUS%/g,addonStatus);uri=uri.replace(/%APP_ID%/g,Services.appinfo.ID);uri=uri.replace(/%APP_VERSION%/g,aAppVersion?aAppVersion:Services.appinfo.version);uri=uri.replace(/%REQ_VERSION%/g,UPDATE_REQUEST_VERSION);uri=uri.replace(/%APP_OS%/g,Services.appinfo.OS);uri=uri.replace(/%APP_ABI%/g,xpcomABI);uri=uri.replace(/%APP_LOCALE%/g,getLocale());uri=uri.replace(/%CURRENT_APP_VERSION%/g,Services.appinfo.version);
var catMan=null;uri=uri.replace(/%(\w{3,})%/g,function parameterReplace(aMatch,aParam){if(!catMan){catMan=Cc["@mozilla.org/categorymanager;1"].getService(Ci.nsICategoryManager);}
try{var contractID=catMan.getCategoryEntry(CATEGORY_UPDATE_PARAMS,aParam);var paramHandler=Cc[contractID].getService(Ci.nsIPropertyBag2);return paramHandler.getPropertyAsAString(aParam);}
catch(e){return aMatch;}});return uri.replace(/\+/g,"%2B");},backgroundUpdateCheck:function AMI_backgroundUpdateCheck(){if(!gStarted)
throw Components.Exception("AddonManager is not initialized",Cr.NS_ERROR_NOT_INITIALIZED);logger.debug("Background update check beginning");return Task.spawn(function*backgroundUpdateTask(){let hotfixID=this.hotfixID;let checkHotfix=hotfixID&&Services.prefs.getBoolPref(PREF_APP_UPDATE_ENABLED)&&Services.prefs.getBoolPref(PREF_APP_UPDATE_AUTO);if(!this.updateEnabled&&!checkHotfix)
return;Services.obs.notifyObservers(null,"addons-background-update-start",null);if(this.updateEnabled){let scope={};Components.utils.import("resource://gre/modules/LightweightThemeManager.jsm",scope);scope.LightweightThemeManager.updateCurrentTheme();let allAddons=yield new Promise((resolve,reject)=>this.getAllAddons(resolve));
yield AddonRepository.backgroundUpdateCheck(); let updates=[];for(let addon of allAddons){if(addon.id==hotfixID){continue;}
 
updates.push(new Promise((resolve,reject)=>{addon.findUpdates({onUpdateAvailable:function BUC_onUpdateAvailable(aAddon,aInstall){
logger.debug("Found update for add-on ${id}",aAddon);if(aAddon.permissions&AddonManager.PERM_CAN_UPGRADE&&AddonManager.shouldAutoUpdate(aAddon)){logger.debug("Starting install of ${id}",aAddon);aInstall.install();}},onUpdateFinished:aAddon=>{logger.debug("onUpdateFinished for ${id}",aAddon);resolve();}},AddonManager.UPDATE_WHEN_PERIODIC_UPDATE);}));}
yield Promise.all(updates);}
if(checkHotfix){var hotfixVersion="";try{hotfixVersion=Services.prefs.getCharPref(PREF_EM_HOTFIX_LASTVERSION);}
catch(e){}
let url=null;if(Services.prefs.getPrefType(PREF_EM_HOTFIX_URL)==Ci.nsIPrefBranch.PREF_STRING)
url=Services.prefs.getCharPref(PREF_EM_HOTFIX_URL);else
url=Services.prefs.getCharPref(PREF_EM_UPDATE_BACKGROUND_URL);url=AddonManager.escapeAddonURI({id:hotfixID,version:hotfixVersion,userDisabled:false,appDisabled:false},url);Components.utils.import("resource://gre/modules/addons/AddonUpdateChecker.jsm");let update=null;try{let foundUpdates=yield new Promise((resolve,reject)=>{AddonUpdateChecker.checkForUpdates(hotfixID,null,url,{onUpdateCheckComplete:resolve,onUpdateCheckError:reject});});update=AddonUpdateChecker.getNewestCompatibleUpdate(foundUpdates);}catch(e){}

if(update){if(Services.vc.compare(hotfixVersion,update.version)<0){logger.debug("Downloading hotfix version "+update.version);let aInstall=yield new Promise((resolve,reject)=>AddonManager.getInstallForURL(update.updateURL,resolve,"application/x-xpinstall",update.updateHash,null,null,update.version));aInstall.addListener({onDownloadEnded:function BUC_onDownloadEnded(aInstall){try{if(!Services.prefs.getBoolPref(PREF_EM_CERT_CHECKATTRIBUTES))
return;}
catch(e){return;}
try{CertUtils.validateCert(aInstall.certificate,CertUtils.readCertPrefs(PREF_EM_HOTFIX_CERTS));}
catch(e){logger.warn("The hotfix add-on was not signed by the expected "+"certificate and so will not be installed.",e);aInstall.cancel();}},onInstallEnded:function BUC_onInstallEnded(aInstall){Services.prefs.setCharPref(PREF_EM_HOTFIX_LASTVERSION,aInstall.version);},onInstallCancelled:function BUC_onInstallCancelled(aInstall){
Services.prefs.setCharPref(PREF_EM_HOTFIX_LASTVERSION,hotfixVersion);}});aInstall.install();}}}
logger.debug("Background update check complete");Services.obs.notifyObservers(null,"addons-background-update-complete",null);}.bind(this));},addStartupChange:function AMI_addStartupChange(aType,aID){if(!aType||typeof aType!="string")
throw Components.Exception("aType must be a non-empty string",Cr.NS_ERROR_INVALID_ARG);if(!aID||typeof aID!="string")
throw Components.Exception("aID must be a non-empty string",Cr.NS_ERROR_INVALID_ARG);if(gStartupComplete)
return; for(let type in this.startupChanges)
this.removeStartupChange(type,aID);if(!(aType in this.startupChanges))
this.startupChanges[aType]=[];this.startupChanges[aType].push(aID);},removeStartupChange:function AMI_removeStartupChange(aType,aID){if(!aType||typeof aType!="string")
throw Components.Exception("aType must be a non-empty string",Cr.NS_ERROR_INVALID_ARG);if(!aID||typeof aID!="string")
throw Components.Exception("aID must be a non-empty string",Cr.NS_ERROR_INVALID_ARG);if(gStartupComplete)
return;if(!(aType in this.startupChanges))
return;this.startupChanges[aType]=this.startupChanges[aType].filter(function filterItem(aItem)aItem!=aID);},callManagerListeners:function AMI_callManagerListeners(aMethod,...aArgs){if(!gStarted)
throw Components.Exception("AddonManager is not initialized",Cr.NS_ERROR_NOT_INITIALIZED);if(!aMethod||typeof aMethod!="string")
throw Components.Exception("aMethod must be a non-empty string",Cr.NS_ERROR_INVALID_ARG);let managerListeners=this.managerListeners.slice(0);for(let listener of managerListeners){try{if(aMethod in listener)
listener[aMethod].apply(listener,aArgs);}
catch(e){logger.warn("AddonManagerListener threw exception when calling "+aMethod,e);}}},callInstallListeners:function AMI_callInstallListeners(aMethod,aExtraListeners,...aArgs){if(!gStarted)
throw Components.Exception("AddonManager is not initialized",Cr.NS_ERROR_NOT_INITIALIZED);if(!aMethod||typeof aMethod!="string")
throw Components.Exception("aMethod must be a non-empty string",Cr.NS_ERROR_INVALID_ARG);if(aExtraListeners&&!Array.isArray(aExtraListeners))
throw Components.Exception("aExtraListeners must be an array or null",Cr.NS_ERROR_INVALID_ARG);let result=true;let listeners;if(aExtraListeners)
listeners=aExtraListeners.concat(this.installListeners);else
listeners=this.installListeners.slice(0);for(let listener of listeners){try{if(aMethod in listener){if(listener[aMethod].apply(listener,aArgs)===false)
result=false;}}
catch(e){logger.warn("InstallListener threw exception when calling "+aMethod,e);}}
return result;},callAddonListeners:function AMI_callAddonListeners(aMethod,...aArgs){if(!gStarted)
throw Components.Exception("AddonManager is not initialized",Cr.NS_ERROR_NOT_INITIALIZED);if(!aMethod||typeof aMethod!="string")
throw Components.Exception("aMethod must be a non-empty string",Cr.NS_ERROR_INVALID_ARG);let addonListeners=this.addonListeners.slice(0);for(let listener of addonListeners){try{if(aMethod in listener)
listener[aMethod].apply(listener,aArgs);}
catch(e){logger.warn("AddonListener threw exception when calling "+aMethod,e);}}},notifyAddonChanged:function AMI_notifyAddonChanged(aID,aType,aPendingRestart){if(!gStarted)
throw Components.Exception("AddonManager is not initialized",Cr.NS_ERROR_NOT_INITIALIZED);if(aID&&typeof aID!="string")
throw Components.Exception("aID must be a string or null",Cr.NS_ERROR_INVALID_ARG);if(!aType||typeof aType!="string")
throw Components.Exception("aType must be a non-empty string",Cr.NS_ERROR_INVALID_ARG);this.callProviders("addonChanged",aID,aType,aPendingRestart);},updateAddonAppDisabledStates:function AMI_updateAddonAppDisabledStates(){if(!gStarted)
throw Components.Exception("AddonManager is not initialized",Cr.NS_ERROR_NOT_INITIALIZED);this.callProviders("updateAddonAppDisabledStates");},updateAddonRepositoryData:function AMI_updateAddonRepositoryData(aCallback){if(!gStarted)
throw Components.Exception("AddonManager is not initialized",Cr.NS_ERROR_NOT_INITIALIZED);if(typeof aCallback!="function")
throw Components.Exception("aCallback must be a function",Cr.NS_ERROR_INVALID_ARG);new AsyncObjectCaller(this.providers,"updateAddonRepositoryData",{nextObject:function updateAddonRepositoryData_nextObject(aCaller,aProvider){callProvider(aProvider,"updateAddonRepositoryData",null,aCaller.callNext.bind(aCaller));},noMoreObjects:function updateAddonRepositoryData_noMoreObjects(aCaller){safeCall(aCallback); Services.obs.notifyObservers(null,"TEST:addon-repository-data-updated",null);}});},getInstallForURL:function AMI_getInstallForURL(aUrl,aCallback,aMimetype,aHash,aName,aIcons,aVersion,aLoadGroup){if(!gStarted)
throw Components.Exception("AddonManager is not initialized",Cr.NS_ERROR_NOT_INITIALIZED);if(!aUrl||typeof aUrl!="string")
throw Components.Exception("aURL must be a non-empty string",Cr.NS_ERROR_INVALID_ARG);if(typeof aCallback!="function")
throw Components.Exception("aCallback must be a function",Cr.NS_ERROR_INVALID_ARG);if(!aMimetype||typeof aMimetype!="string")
throw Components.Exception("aMimetype must be a non-empty string",Cr.NS_ERROR_INVALID_ARG);if(aHash&&typeof aHash!="string")
throw Components.Exception("aHash must be a string or null",Cr.NS_ERROR_INVALID_ARG);if(aName&&typeof aName!="string")
throw Components.Exception("aName must be a string or null",Cr.NS_ERROR_INVALID_ARG);if(aIcons){if(typeof aIcons=="string")
aIcons={"32":aIcons};else if(typeof aIcons!="object")
throw Components.Exception("aIcons must be a string, an object or null",Cr.NS_ERROR_INVALID_ARG);}else{aIcons={};}
if(aVersion&&typeof aVersion!="string")
throw Components.Exception("aVersion must be a string or null",Cr.NS_ERROR_INVALID_ARG);if(aLoadGroup&&(!(aLoadGroup instanceof Ci.nsILoadGroup)))
throw Components.Exception("aLoadGroup must be a nsILoadGroup or null",Cr.NS_ERROR_INVALID_ARG);let providers=this.providers.slice(0);for(let provider of providers){if(callProvider(provider,"supportsMimetype",false,aMimetype)){callProvider(provider,"getInstallForURL",null,aUrl,aHash,aName,aIcons,aVersion,aLoadGroup,function getInstallForURL_safeCall(aInstall){safeCall(aCallback,aInstall);});return;}}
safeCall(aCallback,null);},getInstallForFile:function AMI_getInstallForFile(aFile,aCallback,aMimetype){if(!gStarted)
throw Components.Exception("AddonManager is not initialized",Cr.NS_ERROR_NOT_INITIALIZED);if(!(aFile instanceof Ci.nsIFile))
throw Components.Exception("aFile must be a nsIFile",Cr.NS_ERROR_INVALID_ARG);if(typeof aCallback!="function")
throw Components.Exception("aCallback must be a function",Cr.NS_ERROR_INVALID_ARG);if(aMimetype&&typeof aMimetype!="string")
throw Components.Exception("aMimetype must be a string or null",Cr.NS_ERROR_INVALID_ARG);new AsyncObjectCaller(this.providers,"getInstallForFile",{nextObject:function getInstallForFile_nextObject(aCaller,aProvider){callProvider(aProvider,"getInstallForFile",null,aFile,function getInstallForFile_safeCall(aInstall){if(aInstall)
safeCall(aCallback,aInstall);else
aCaller.callNext();});},noMoreObjects:function getInstallForFile_noMoreObjects(aCaller){safeCall(aCallback,null);}});},getInstallsByTypes:function AMI_getInstallsByTypes(aTypes,aCallback){if(!gStarted)
throw Components.Exception("AddonManager is not initialized",Cr.NS_ERROR_NOT_INITIALIZED);if(aTypes&&!Array.isArray(aTypes))
throw Components.Exception("aTypes must be an array or null",Cr.NS_ERROR_INVALID_ARG);if(typeof aCallback!="function")
throw Components.Exception("aCallback must be a function",Cr.NS_ERROR_INVALID_ARG);let installs=[];new AsyncObjectCaller(this.providers,"getInstallsByTypes",{nextObject:function getInstallsByTypes_nextObject(aCaller,aProvider){callProvider(aProvider,"getInstallsByTypes",null,aTypes,function getInstallsByTypes_safeCall(aProviderInstalls){installs=installs.concat(aProviderInstalls);aCaller.callNext();});},noMoreObjects:function getInstallsByTypes_noMoreObjects(aCaller){safeCall(aCallback,installs);}});},getAllInstalls:function AMI_getAllInstalls(aCallback){if(!gStarted)
throw Components.Exception("AddonManager is not initialized",Cr.NS_ERROR_NOT_INITIALIZED);this.getInstallsByTypes(null,aCallback);},mapURIToAddonID:function AMI_mapURIToAddonID(aURI){if(!(aURI instanceof Ci.nsIURI)){throw Components.Exception("aURI is not a nsIURI",Cr.NS_ERROR_INVALID_ARG);} 
let providers=this.providers.slice(0);for(let provider of providers){var id=callProvider(provider,"mapURIToAddonID",null,aURI);if(id!==null){return id;}}
return null;},isInstallEnabled:function AMI_isInstallEnabled(aMimetype){if(!gStarted)
throw Components.Exception("AddonManager is not initialized",Cr.NS_ERROR_NOT_INITIALIZED);if(!aMimetype||typeof aMimetype!="string")
throw Components.Exception("aMimetype must be a non-empty string",Cr.NS_ERROR_INVALID_ARG);let providers=this.providers.slice(0);for(let provider of providers){if(callProvider(provider,"supportsMimetype",false,aMimetype)&&callProvider(provider,"isInstallEnabled"))
return true;}
return false;},isInstallAllowed:function AMI_isInstallAllowed(aMimetype,aURI){if(!gStarted)
throw Components.Exception("AddonManager is not initialized",Cr.NS_ERROR_NOT_INITIALIZED);if(!aMimetype||typeof aMimetype!="string")
throw Components.Exception("aMimetype must be a non-empty string",Cr.NS_ERROR_INVALID_ARG);if(aURI&&!(aURI instanceof Ci.nsIURI))
throw Components.Exception("aURI must be a nsIURI or null",Cr.NS_ERROR_INVALID_ARG);let providers=this.providers.slice(0);for(let provider of providers){if(callProvider(provider,"supportsMimetype",false,aMimetype)&&callProvider(provider,"isInstallAllowed",null,aURI))
return true;}
return false;},installAddonsFromWebpage:function AMI_installAddonsFromWebpage(aMimetype,aSource,aURI,aInstalls){if(!gStarted)
throw Components.Exception("AddonManager is not initialized",Cr.NS_ERROR_NOT_INITIALIZED);if(!aMimetype||typeof aMimetype!="string")
throw Components.Exception("aMimetype must be a non-empty string",Cr.NS_ERROR_INVALID_ARG);if(aSource&&!(aSource instanceof Ci.nsIDOMWindow)&&!(aSource instanceof Ci.nsIDOMNode))
throw Components.Exception("aSource must be a nsIDOMWindow, a XUL element, or null",Cr.NS_ERROR_INVALID_ARG);if(aURI&&!(aURI instanceof Ci.nsIURI))
throw Components.Exception("aURI must be a nsIURI or null",Cr.NS_ERROR_INVALID_ARG);if(!Array.isArray(aInstalls))
throw Components.Exception("aInstalls must be an array",Cr.NS_ERROR_INVALID_ARG);if(!("@mozilla.org/addons/web-install-listener;1"in Cc)){logger.warn("No web installer available, cancelling all installs");aInstalls.forEach(function(aInstall){aInstall.cancel();});return;}
try{let weblistener=Cc["@mozilla.org/addons/web-install-listener;1"].getService(Ci.amIWebInstallListener);if(!this.isInstallEnabled(aMimetype,aURI)){weblistener.onWebInstallDisabled(aSource,aURI,aInstalls,aInstalls.length);}
else if(!this.isInstallAllowed(aMimetype,aURI)){if(weblistener.onWebInstallBlocked(aSource,aURI,aInstalls,aInstalls.length)){aInstalls.forEach(function(aInstall){aInstall.install();});}}
else if(weblistener.onWebInstallRequested(aSource,aURI,aInstalls,aInstalls.length)){aInstalls.forEach(function(aInstall){aInstall.install();});}}
catch(e){

logger.warn("Failure calling web installer",e);aInstalls.forEach(function(aInstall){aInstall.cancel();});}},addInstallListener:function AMI_addInstallListener(aListener){if(!aListener||typeof aListener!="object")
throw Components.Exception("aListener must be a InstallListener object",Cr.NS_ERROR_INVALID_ARG);if(!this.installListeners.some(function addInstallListener_matchListener(i){return i==aListener;}))
this.installListeners.push(aListener);},removeInstallListener:function AMI_removeInstallListener(aListener){if(!aListener||typeof aListener!="object")
throw Components.Exception("aListener must be a InstallListener object",Cr.NS_ERROR_INVALID_ARG);let pos=0;while(pos<this.installListeners.length){if(this.installListeners[pos]==aListener)
this.installListeners.splice(pos,1);else
pos++;}},getAddonByID:function AMI_getAddonByID(aID,aCallback){if(!gStarted)
throw Components.Exception("AddonManager is not initialized",Cr.NS_ERROR_NOT_INITIALIZED);if(!aID||typeof aID!="string")
throw Components.Exception("aID must be a non-empty string",Cr.NS_ERROR_INVALID_ARG);if(typeof aCallback!="function")
throw Components.Exception("aCallback must be a function",Cr.NS_ERROR_INVALID_ARG);new AsyncObjectCaller(this.providers,"getAddonByID",{nextObject:function getAddonByID_nextObject(aCaller,aProvider){callProvider(aProvider,"getAddonByID",null,aID,function getAddonByID_safeCall(aAddon){if(aAddon)
safeCall(aCallback,aAddon);else
aCaller.callNext();});},noMoreObjects:function getAddonByID_noMoreObjects(aCaller){safeCall(aCallback,null);}});},getAddonBySyncGUID:function AMI_getAddonBySyncGUID(aGUID,aCallback){if(!gStarted)
throw Components.Exception("AddonManager is not initialized",Cr.NS_ERROR_NOT_INITIALIZED);if(!aGUID||typeof aGUID!="string")
throw Components.Exception("aGUID must be a non-empty string",Cr.NS_ERROR_INVALID_ARG);if(typeof aCallback!="function")
throw Components.Exception("aCallback must be a function",Cr.NS_ERROR_INVALID_ARG);new AsyncObjectCaller(this.providers,"getAddonBySyncGUID",{nextObject:function getAddonBySyncGUID_nextObject(aCaller,aProvider){callProvider(aProvider,"getAddonBySyncGUID",null,aGUID,function getAddonBySyncGUID_safeCall(aAddon){if(aAddon){safeCall(aCallback,aAddon);}else{aCaller.callNext();}});},noMoreObjects:function getAddonBySyncGUID_noMoreObjects(aCaller){safeCall(aCallback,null);}});},getAddonsByIDs:function AMI_getAddonsByIDs(aIDs,aCallback){if(!gStarted)
throw Components.Exception("AddonManager is not initialized",Cr.NS_ERROR_NOT_INITIALIZED);if(!Array.isArray(aIDs))
throw Components.Exception("aIDs must be an array",Cr.NS_ERROR_INVALID_ARG);if(typeof aCallback!="function")
throw Components.Exception("aCallback must be a function",Cr.NS_ERROR_INVALID_ARG);let addons=[];new AsyncObjectCaller(aIDs,null,{nextObject:function getAddonsByIDs_nextObject(aCaller,aID){AddonManagerInternal.getAddonByID(aID,function getAddonsByIDs_getAddonByID(aAddon){addons.push(aAddon);aCaller.callNext();});},noMoreObjects:function getAddonsByIDs_noMoreObjects(aCaller){safeCall(aCallback,addons);}});},getAddonsByTypes:function AMI_getAddonsByTypes(aTypes,aCallback){if(!gStarted)
throw Components.Exception("AddonManager is not initialized",Cr.NS_ERROR_NOT_INITIALIZED);if(aTypes&&!Array.isArray(aTypes))
throw Components.Exception("aTypes must be an array or null",Cr.NS_ERROR_INVALID_ARG);if(typeof aCallback!="function")
throw Components.Exception("aCallback must be a function",Cr.NS_ERROR_INVALID_ARG);let addons=[];new AsyncObjectCaller(this.providers,"getAddonsByTypes",{nextObject:function getAddonsByTypes_nextObject(aCaller,aProvider){callProvider(aProvider,"getAddonsByTypes",null,aTypes,function getAddonsByTypes_concatAddons(aProviderAddons){addons=addons.concat(aProviderAddons);aCaller.callNext();});},noMoreObjects:function getAddonsByTypes_noMoreObjects(aCaller){safeCall(aCallback,addons);}});},getAllAddons:function AMI_getAllAddons(aCallback){if(!gStarted)
throw Components.Exception("AddonManager is not initialized",Cr.NS_ERROR_NOT_INITIALIZED);if(typeof aCallback!="function")
throw Components.Exception("aCallback must be a function",Cr.NS_ERROR_INVALID_ARG);this.getAddonsByTypes(null,aCallback);},getAddonsWithOperationsByTypes:function AMI_getAddonsWithOperationsByTypes(aTypes,aCallback){if(!gStarted)
throw Components.Exception("AddonManager is not initialized",Cr.NS_ERROR_NOT_INITIALIZED);if(aTypes&&!Array.isArray(aTypes))
throw Components.Exception("aTypes must be an array or null",Cr.NS_ERROR_INVALID_ARG);if(typeof aCallback!="function")
throw Components.Exception("aCallback must be a function",Cr.NS_ERROR_INVALID_ARG);let addons=[];new AsyncObjectCaller(this.providers,"getAddonsWithOperationsByTypes",{nextObject:function getAddonsWithOperationsByTypes_nextObject
(aCaller,aProvider){callProvider(aProvider,"getAddonsWithOperationsByTypes",null,aTypes,function getAddonsWithOperationsByTypes_concatAddons
(aProviderAddons){addons=addons.concat(aProviderAddons);aCaller.callNext();});},noMoreObjects:function getAddonsWithOperationsByTypes_noMoreObjects(caller){safeCall(aCallback,addons);}});},addManagerListener:function AMI_addManagerListener(aListener){if(!aListener||typeof aListener!="object")
throw Components.Exception("aListener must be an AddonManagerListener object",Cr.NS_ERROR_INVALID_ARG);if(!this.managerListeners.some(function addManagerListener_matchListener(i){return i==aListener;}))
this.managerListeners.push(aListener);},removeManagerListener:function AMI_removeManagerListener(aListener){if(!aListener||typeof aListener!="object")
throw Components.Exception("aListener must be an AddonManagerListener object",Cr.NS_ERROR_INVALID_ARG);let pos=0;while(pos<this.managerListeners.length){if(this.managerListeners[pos]==aListener)
this.managerListeners.splice(pos,1);else
pos++;}},addAddonListener:function AMI_addAddonListener(aListener){if(!aListener||typeof aListener!="object")
throw Components.Exception("aListener must be an AddonListener object",Cr.NS_ERROR_INVALID_ARG);if(!this.addonListeners.some(function addAddonListener_matchListener(i){return i==aListener;}))
this.addonListeners.push(aListener);},removeAddonListener:function AMI_removeAddonListener(aListener){if(!aListener||typeof aListener!="object")
throw Components.Exception("aListener must be an AddonListener object",Cr.NS_ERROR_INVALID_ARG);let pos=0;while(pos<this.addonListeners.length){if(this.addonListeners[pos]==aListener)
this.addonListeners.splice(pos,1);else
pos++;}},addTypeListener:function AMI_addTypeListener(aListener){if(!aListener||typeof aListener!="object")
throw Components.Exception("aListener must be a TypeListener object",Cr.NS_ERROR_INVALID_ARG);if(!this.typeListeners.some(function addTypeListener_matchListener(i){return i==aListener;}))
this.typeListeners.push(aListener);},removeTypeListener:function AMI_removeTypeListener(aListener){if(!aListener||typeof aListener!="object")
throw Components.Exception("aListener must be a TypeListener object",Cr.NS_ERROR_INVALID_ARG);let pos=0;while(pos<this.typeListeners.length){if(this.typeListeners[pos]==aListener)
this.typeListeners.splice(pos,1);else
pos++;}},get addonTypes(){return this.typesProxy;},get autoUpdateDefault(){return gAutoUpdateDefault;},set autoUpdateDefault(aValue){aValue=!!aValue;if(aValue!=gAutoUpdateDefault)
Services.prefs.setBoolPref(PREF_EM_AUTOUPDATE_DEFAULT,aValue);return aValue;},get checkCompatibility(){return gCheckCompatibility;},set checkCompatibility(aValue){aValue=!!aValue;if(aValue!=gCheckCompatibility){if(!aValue)
Services.prefs.setBoolPref(PREF_EM_CHECK_COMPATIBILITY,false);else
Services.prefs.clearUserPref(PREF_EM_CHECK_COMPATIBILITY);}
return aValue;},get strictCompatibility(){return gStrictCompatibility;},set strictCompatibility(aValue){aValue=!!aValue;if(aValue!=gStrictCompatibility)
Services.prefs.setBoolPref(PREF_EM_STRICT_COMPATIBILITY,aValue);return aValue;},get checkUpdateSecurityDefault(){return gCheckUpdateSecurityDefault;},get checkUpdateSecurity(){return gCheckUpdateSecurity;},set checkUpdateSecurity(aValue){aValue=!!aValue;if(aValue!=gCheckUpdateSecurity){if(aValue!=gCheckUpdateSecurityDefault)
Services.prefs.setBoolPref(PREF_EM_CHECK_UPDATE_SECURITY,aValue);else
Services.prefs.clearUserPref(PREF_EM_CHECK_UPDATE_SECURITY);}
return aValue;},get updateEnabled(){return gUpdateEnabled;},set updateEnabled(aValue){aValue=!!aValue;if(aValue!=gUpdateEnabled)
Services.prefs.setBoolPref(PREF_EM_UPDATE_ENABLED,aValue);return aValue;},get hotfixID(){return gHotfixID;},};this.AddonManagerPrivate={startup:function AMP_startup(){AddonManagerInternal.startup();},registerProvider:function AMP_registerProvider(aProvider,aTypes){AddonManagerInternal.registerProvider(aProvider,aTypes);},unregisterProvider:function AMP_unregisterProvider(aProvider){AddonManagerInternal.unregisterProvider(aProvider);},backgroundUpdateCheck:function AMP_backgroundUpdateCheck(){return AddonManagerInternal.backgroundUpdateCheck();},addStartupChange:function AMP_addStartupChange(aType,aID){AddonManagerInternal.addStartupChange(aType,aID);},removeStartupChange:function AMP_removeStartupChange(aType,aID){AddonManagerInternal.removeStartupChange(aType,aID);},notifyAddonChanged:function AMP_notifyAddonChanged(aID,aType,aPendingRestart){AddonManagerInternal.notifyAddonChanged(aID,aType,aPendingRestart);},updateAddonAppDisabledStates:function AMP_updateAddonAppDisabledStates(){AddonManagerInternal.updateAddonAppDisabledStates();},updateAddonRepositoryData:function AMP_updateAddonRepositoryData(aCallback){AddonManagerInternal.updateAddonRepositoryData(aCallback);},callInstallListeners:function AMP_callInstallListeners(...aArgs){return AddonManagerInternal.callInstallListeners.apply(AddonManagerInternal,aArgs);},callAddonListeners:function AMP_callAddonListeners(...aArgs){AddonManagerInternal.callAddonListeners.apply(AddonManagerInternal,aArgs);},AddonAuthor:AddonAuthor,AddonScreenshot:AddonScreenshot,AddonCompatibilityOverride:AddonCompatibilityOverride,AddonType:AddonType,recordTimestamp:function AMP_recordTimestamp(name,value){AddonManagerInternal.recordTimestamp(name,value);},_simpleMeasures:{},recordSimpleMeasure:function AMP_recordSimpleMeasure(name,value){this._simpleMeasures[name]=value;},recordException:function AMP_recordException(aModule,aContext,aException){let report={module:aModule,context:aContext};if(typeof aException=="number"){report.message=Components.Exception("",aException).name;}
else{report.message=aException.toString();if(aException.fileName){report.file=aException.fileName;report.line=aException.lineNumber;}}
this._simpleMeasures.exception=report;},getSimpleMeasures:function AMP_getSimpleMeasures(){return this._simpleMeasures;},getTelemetryDetails:function AMP_getTelemetryDetails(){return AddonManagerInternal.telemetryDetails;},setTelemetryDetails:function AMP_setTelemetryDetails(aProvider,aDetails){AddonManagerInternal.telemetryDetails[aProvider]=aDetails;},
 simpleTimer:function(aName){let startTime=Date.now();return{done:()=>this.recordSimpleMeasure(aName,Date.now()-startTime)};},callNoUpdateListeners:function(addon,listener,reason,appVersion,platformVersion){if("onNoCompatibilityUpdateAvailable"in listener){safeCall(listener.onNoCompatibilityUpdateAvailable.bind(listener),addon);}
if("onNoUpdateAvailable"in listener){safeCall(listener.onNoUpdateAvailable.bind(listener),addon);}
if("onUpdateFinished"in listener){safeCall(listener.onUpdateFinished.bind(listener),addon);}},};this.AddonManager={
STATE_AVAILABLE:0,STATE_DOWNLOADING:1,STATE_CHECKING:2,STATE_DOWNLOADED:3,STATE_DOWNLOAD_FAILED:4,STATE_INSTALLING:5,STATE_INSTALLED:6,STATE_INSTALL_FAILED:7,STATE_CANCELLED:8,
ERROR_NETWORK_FAILURE:-1,ERROR_INCORRECT_HASH:-2,ERROR_CORRUPT_FILE:-3,ERROR_FILE_ACCESS:-4,UPDATE_STATUS_NO_ERROR:0, UPDATE_STATUS_TIMEOUT:-1,UPDATE_STATUS_DOWNLOAD_ERROR:-2,UPDATE_STATUS_PARSE_ERROR:-3,UPDATE_STATUS_UNKNOWN_FORMAT:-4,UPDATE_STATUS_SECURITY_ERROR:-5,UPDATE_STATUS_CANCELLED:-6,
UPDATE_WHEN_USER_REQUESTED:1,
UPDATE_WHEN_NEW_APP_DETECTED:2,UPDATE_WHEN_NEW_APP_INSTALLED:3,UPDATE_WHEN_PERIODIC_UPDATE:16,UPDATE_WHEN_ADDON_INSTALLED:17,
PENDING_NONE:0,PENDING_ENABLE:1,PENDING_DISABLE:2,PENDING_UNINSTALL:4,PENDING_INSTALL:8,PENDING_UPGRADE:16,
OP_NEEDS_RESTART_NONE:0,OP_NEEDS_RESTART_ENABLE:1,OP_NEEDS_RESTART_DISABLE:2,OP_NEEDS_RESTART_UNINSTALL:4,OP_NEEDS_RESTART_INSTALL:8,PERM_CAN_UNINSTALL:1,PERM_CAN_ENABLE:2,PERM_CAN_DISABLE:4,PERM_CAN_UPGRADE:8,
PERM_CAN_ASK_TO_ACTIVATE:16,SCOPE_PROFILE:1,SCOPE_USER:2,SCOPE_APPLICATION:4,SCOPE_SYSTEM:8,SCOPE_ALL:15, VIEW_TYPE_LIST:"list",TYPE_UI_HIDE_EMPTY:16,
TYPE_SUPPORTS_ASK_TO_ACTIVATE:32,AUTOUPDATE_DISABLE:0,
AUTOUPDATE_DEFAULT:1,AUTOUPDATE_ENABLE:2, OPTIONS_TYPE_DIALOG:1, OPTIONS_TYPE_INLINE:2, OPTIONS_TYPE_TAB:3,OPTIONS_TYPE_INLINE_INFO:4,
 OPTIONS_NOTIFICATION_DISPLAYED:"addon-options-displayed", OPTIONS_NOTIFICATION_HIDDEN:"addon-options-hidden",

STARTUP_CHANGE_INSTALLED:"installed",

STARTUP_CHANGE_CHANGED:"changed",
STARTUP_CHANGE_UNINSTALLED:"uninstalled",

STARTUP_CHANGE_DISABLED:"disabled",

STARTUP_CHANGE_ENABLED:"enabled",


STATE_ASK_TO_ACTIVATE:"askToActivate",getInstallForURL:function AM_getInstallForURL(aUrl,aCallback,aMimetype,aHash,aName,aIcons,aVersion,aLoadGroup){AddonManagerInternal.getInstallForURL(aUrl,aCallback,aMimetype,aHash,aName,aIcons,aVersion,aLoadGroup);},getInstallForFile:function AM_getInstallForFile(aFile,aCallback,aMimetype){AddonManagerInternal.getInstallForFile(aFile,aCallback,aMimetype);},getStartupChanges:function AM_getStartupChanges(aType){if(!(aType in AddonManagerInternal.startupChanges))
return[];return AddonManagerInternal.startupChanges[aType].slice(0);},getAddonByID:function AM_getAddonByID(aID,aCallback){AddonManagerInternal.getAddonByID(aID,aCallback);},getAddonBySyncGUID:function AM_getAddonBySyncGUID(aGUID,aCallback){AddonManagerInternal.getAddonBySyncGUID(aGUID,aCallback);},getAddonsByIDs:function AM_getAddonsByIDs(aIDs,aCallback){AddonManagerInternal.getAddonsByIDs(aIDs,aCallback);},getAddonsWithOperationsByTypes:function AM_getAddonsWithOperationsByTypes(aTypes,aCallback){AddonManagerInternal.getAddonsWithOperationsByTypes(aTypes,aCallback);},getAddonsByTypes:function AM_getAddonsByTypes(aTypes,aCallback){AddonManagerInternal.getAddonsByTypes(aTypes,aCallback);},getAllAddons:function AM_getAllAddons(aCallback){AddonManagerInternal.getAllAddons(aCallback);},getInstallsByTypes:function AM_getInstallsByTypes(aTypes,aCallback){AddonManagerInternal.getInstallsByTypes(aTypes,aCallback);},getAllInstalls:function AM_getAllInstalls(aCallback){AddonManagerInternal.getAllInstalls(aCallback);},mapURIToAddonID:function AM_mapURIToAddonID(aURI){return AddonManagerInternal.mapURIToAddonID(aURI);},isInstallEnabled:function AM_isInstallEnabled(aType){return AddonManagerInternal.isInstallEnabled(aType);},isInstallAllowed:function AM_isInstallAllowed(aType,aUri){return AddonManagerInternal.isInstallAllowed(aType,aUri);},installAddonsFromWebpage:function AM_installAddonsFromWebpage(aType,aSource,aUri,aInstalls){AddonManagerInternal.installAddonsFromWebpage(aType,aSource,aUri,aInstalls);},addManagerListener:function AM_addManagerListener(aListener){AddonManagerInternal.addManagerListener(aListener);},removeManagerListener:function AM_removeManagerListener(aListener){AddonManagerInternal.removeManagerListener(aListener);},addInstallListener:function AM_addInstallListener(aListener){AddonManagerInternal.addInstallListener(aListener);},removeInstallListener:function AM_removeInstallListener(aListener){AddonManagerInternal.removeInstallListener(aListener);},addAddonListener:function AM_addAddonListener(aListener){AddonManagerInternal.addAddonListener(aListener);},removeAddonListener:function AM_removeAddonListener(aListener){AddonManagerInternal.removeAddonListener(aListener);},addTypeListener:function AM_addTypeListener(aListener){AddonManagerInternal.addTypeListener(aListener);},removeTypeListener:function AM_removeTypeListener(aListener){AddonManagerInternal.removeTypeListener(aListener);},get addonTypes(){return AddonManagerInternal.addonTypes;},shouldAutoUpdate:function AM_shouldAutoUpdate(aAddon){if(!aAddon||typeof aAddon!="object")
throw Components.Exception("aAddon must be specified",Cr.NS_ERROR_INVALID_ARG);if(!("applyBackgroundUpdates"in aAddon))
return false;if(aAddon.applyBackgroundUpdates==AddonManager.AUTOUPDATE_ENABLE)
return true;if(aAddon.applyBackgroundUpdates==AddonManager.AUTOUPDATE_DISABLE)
return false;return this.autoUpdateDefault;},get checkCompatibility(){return AddonManagerInternal.checkCompatibility;},set checkCompatibility(aValue){AddonManagerInternal.checkCompatibility=aValue;},get strictCompatibility(){return AddonManagerInternal.strictCompatibility;},set strictCompatibility(aValue){AddonManagerInternal.strictCompatibility=aValue;},get checkUpdateSecurityDefault(){return AddonManagerInternal.checkUpdateSecurityDefault;},get checkUpdateSecurity(){return AddonManagerInternal.checkUpdateSecurity;},set checkUpdateSecurity(aValue){AddonManagerInternal.checkUpdateSecurity=aValue;},get updateEnabled(){return AddonManagerInternal.updateEnabled;},set updateEnabled(aValue){AddonManagerInternal.updateEnabled=aValue;},get autoUpdateDefault(){return AddonManagerInternal.autoUpdateDefault;},set autoUpdateDefault(aValue){AddonManagerInternal.autoUpdateDefault=aValue;},get hotfixID(){return AddonManagerInternal.hotfixID;},escapeAddonURI:function AM_escapeAddonURI(aAddon,aUri,aAppVersion){return AddonManagerInternal.escapeAddonURI(aAddon,aUri,aAppVersion);},get shutdown(){return gShutdownBarrier.client;},};Cu.import("resource://gre/modules/TelemetryTimestamps.jsm",AddonManagerInternal);Object.freeze(AddonManagerInternal);Object.freeze(AddonManagerPrivate);Object.freeze(AddonManager);