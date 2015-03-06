"use strict";const Cc=Components.classes;const Ci=Components.interfaces;const Cr=Components.results;Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");Components.utils.import("resource://gre/modules/Services.jsm");try{

Components.utils.import("resource://gre/modules/AddonManager.jsm");}catch(e){}
XPCOMUtils.defineLazyModuleGetter(this,"FileUtils","resource://gre/modules/FileUtils.jsm");XPCOMUtils.defineLazyModuleGetter(this,"UpdateChannel","resource://gre/modules/UpdateChannel.jsm");XPCOMUtils.defineLazyModuleGetter(this,"OS","resource://gre/modules/osfile.jsm");XPCOMUtils.defineLazyModuleGetter(this,"Task","resource://gre/modules/Task.jsm");const TOOLKIT_ID="toolkit@mozilla.org"
const KEY_PROFILEDIR="ProfD";const KEY_APPDIR="XCurProcD";const FILE_BLOCKLIST="blocklist.xml";const PREF_BLOCKLIST_LASTUPDATETIME="app.update.lastUpdateTime.blocklist-background-update-timer";const PREF_BLOCKLIST_URL="extensions.blocklist.url";const PREF_BLOCKLIST_ITEM_URL="extensions.blocklist.itemURL";const PREF_BLOCKLIST_ENABLED="extensions.blocklist.enabled";const PREF_BLOCKLIST_INTERVAL="extensions.blocklist.interval";const PREF_BLOCKLIST_LEVEL="extensions.blocklist.level";const PREF_BLOCKLIST_PINGCOUNTTOTAL="extensions.blocklist.pingCountTotal";const PREF_BLOCKLIST_PINGCOUNTVERSION="extensions.blocklist.pingCountVersion";const PREF_BLOCKLIST_SUPPRESSUI="extensions.blocklist.suppressUI";const PREF_PLUGINS_NOTIFYUSER="plugins.update.notifyUser";const PREF_GENERAL_USERAGENT_LOCALE="general.useragent.locale";const PREF_APP_DISTRIBUTION="distribution.id";const PREF_APP_DISTRIBUTION_VERSION="distribution.version";const PREF_EM_LOGGING_ENABLED="extensions.logging.enabled";const XMLURI_BLOCKLIST="http://www.mozilla.org/2006/addons-blocklist";const XMLURI_PARSE_ERROR="http://www.mozilla.org/newlayout/xml/parsererror.xml"
const UNKNOWN_XPCOM_ABI="unknownABI";const URI_BLOCKLIST_DIALOG="chrome://mozapps/content/extensions/blocklist.xul"
const DEFAULT_SEVERITY=3;const DEFAULT_LEVEL=2;const MAX_BLOCK_LEVEL=3;const SEVERITY_OUTDATED=0;const VULNERABILITYSTATUS_NONE=0;const VULNERABILITYSTATUS_UPDATE_AVAILABLE=1;const VULNERABILITYSTATUS_NO_UPDATE=2;const EXTENSION_BLOCK_FILTERS=["id","name","creator","homepageURL","updateURL"];var gLoggingEnabled=null;var gBlocklistEnabled=true;var gBlocklistLevel=DEFAULT_LEVEL;XPCOMUtils.defineLazyServiceGetter(this,"gConsole","@mozilla.org/consoleservice;1","nsIConsoleService");XPCOMUtils.defineLazyServiceGetter(this,"gVersionChecker","@mozilla.org/xpcom/version-comparator;1","nsIVersionComparator");XPCOMUtils.defineLazyGetter(this,"gPref",function bls_gPref(){return Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).QueryInterface(Ci.nsIPrefBranch);});XPCOMUtils.defineLazyGetter(this,"gApp",function bls_gApp(){return Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo).QueryInterface(Ci.nsIXULRuntime);});XPCOMUtils.defineLazyGetter(this,"gABI",function bls_gABI(){let abi=null;try{abi=gApp.XPCOMABI;}
catch(e){LOG("BlockList Global gABI: XPCOM ABI unknown.");}

let macutils=Cc["@mozilla.org/xpcom/mac-utils;1"].getService(Ci.nsIMacUtils);if(macutils.isUniversalBinary)
abi+="-u-"+macutils.architecturesInBinary;return abi;});XPCOMUtils.defineLazyGetter(this,"gOSVersion",function bls_gOSVersion(){let osVersion;let sysInfo=Cc["@mozilla.org/system-info;1"].getService(Ci.nsIPropertyBag2);try{osVersion=sysInfo.getProperty("name")+" "+sysInfo.getProperty("version");}
catch(e){LOG("BlockList Global gOSVersion: OS Version unknown.");}
if(osVersion){try{osVersion+=" ("+sysInfo.getProperty("secondaryLibrary")+")";}
catch(e){}
osVersion=encodeURIComponent(osVersion);}
return osVersion;});XPCOMUtils.defineLazyGetter(this,"gCertUtils",function bls_gCertUtils(){let temp={};Components.utils.import("resource://gre/modules/CertUtils.jsm",temp);return temp;});function LOG(string){if(gLoggingEnabled){dump("*** "+string+"\n");gConsole.logStringMessage(string);}}
function getPref(func,preference,defaultValue){try{return gPref[func](preference);}
catch(e){}
return defaultValue;}
function newURI(spec){var ioServ=Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);return ioServ.newURI(spec,null,null);}
function restartApp(){var os=Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);var cancelQuit=Cc["@mozilla.org/supports-PRBool;1"].createInstance(Ci.nsISupportsPRBool);os.notifyObservers(cancelQuit,"quit-application-requested",null);if(cancelQuit.data)
return;var as=Cc["@mozilla.org/toolkit/app-startup;1"].getService(Ci.nsIAppStartup);as.quit(Ci.nsIAppStartup.eRestart|Ci.nsIAppStartup.eAttemptQuit);}
function matchesOSABI(blocklistElement){if(blocklistElement.hasAttribute("os")){var choices=blocklistElement.getAttribute("os").split(",");if(choices.length>0&&choices.indexOf(gApp.OS)<0)
return false;}
if(blocklistElement.hasAttribute("xpcomabi")){choices=blocklistElement.getAttribute("xpcomabi").split(",");if(choices.length>0&&choices.indexOf(gApp.XPCOMABI)<0)
return false;}
return true;}
function getLocale(){try{ var defaultPrefs=gPref.getDefaultBranch(null);return defaultPrefs.getComplexValue(PREF_GENERAL_USERAGENT_LOCALE,Ci.nsIPrefLocalizedString).data;}catch(e){}
return gPref.getCharPref(PREF_GENERAL_USERAGENT_LOCALE);}
function getDistributionPrefValue(aPrefName){var prefValue="default";var defaults=gPref.getDefaultBranch(null);try{prefValue=defaults.getCharPref(aPrefName);}catch(e){}
return prefValue;}
function parseRegExp(aStr){let lastSlash=aStr.lastIndexOf("/");let pattern=aStr.slice(1,lastSlash);let flags=aStr.slice(lastSlash+1);return new RegExp(pattern,flags);}
function Blocklist(){Services.obs.addObserver(this,"xpcom-shutdown",false);Services.obs.addObserver(this,"sessionstore-windows-restored",false);gLoggingEnabled=getPref("getBoolPref",PREF_EM_LOGGING_ENABLED,false);gBlocklistEnabled=getPref("getBoolPref",PREF_BLOCKLIST_ENABLED,true);gBlocklistLevel=Math.min(getPref("getIntPref",PREF_BLOCKLIST_LEVEL,DEFAULT_LEVEL),MAX_BLOCK_LEVEL);gPref.addObserver("extensions.blocklist.",this,false);gPref.addObserver(PREF_EM_LOGGING_ENABLED,this,false);this.wrappedJSObject=this;}
Blocklist.prototype={_addonEntries:null,_pluginEntries:null,observe:function Blocklist_observe(aSubject,aTopic,aData){switch(aTopic){case"xpcom-shutdown":Services.obs.removeObserver(this,"xpcom-shutdown");gPref.removeObserver("extensions.blocklist.",this);gPref.removeObserver(PREF_EM_LOGGING_ENABLED,this);break;case"nsPref:changed":switch(aData){case PREF_EM_LOGGING_ENABLED:gLoggingEnabled=getPref("getBoolPref",PREF_EM_LOGGING_ENABLED,false);break;case PREF_BLOCKLIST_ENABLED:gBlocklistEnabled=getPref("getBoolPref",PREF_BLOCKLIST_ENABLED,true);this._loadBlocklist();this._blocklistUpdated(null,null);break;case PREF_BLOCKLIST_LEVEL:gBlocklistLevel=Math.min(getPref("getIntPref",PREF_BLOCKLIST_LEVEL,DEFAULT_LEVEL),MAX_BLOCK_LEVEL);this._blocklistUpdated(null,null);break;}
break;case"sessionstore-windows-restored":Services.obs.removeObserver(this,"sessionstore-windows-restored");this._preloadBlocklist();break;}},isAddonBlocklisted:function Blocklist_isAddonBlocklisted(addon,appVersion,toolkitVersion){return this.getAddonBlocklistState(addon,appVersion,toolkitVersion)==Ci.nsIBlocklistService.STATE_BLOCKED;},getAddonBlocklistState:function Blocklist_getAddonBlocklistState(addon,appVersion,toolkitVersion){if(!this._isBlocklistLoaded())
this._loadBlocklist();return this._getAddonBlocklistState(addon,this._addonEntries,appVersion,toolkitVersion);},_getAddonBlocklistState:function Blocklist_getAddonBlocklistStateCall(addon,addonEntries,appVersion,toolkitVersion){if(!gBlocklistEnabled)
return Ci.nsIBlocklistService.STATE_NOT_BLOCKED;if(!appVersion)
appVersion=gApp.version;if(!toolkitVersion)
toolkitVersion=gApp.platformVersion;var blItem=this._findMatchingAddonEntry(addonEntries,addon);if(!blItem)
return Ci.nsIBlocklistService.STATE_NOT_BLOCKED;for(let currentblItem of blItem.versions){if(currentblItem.includesItem(addon.version,appVersion,toolkitVersion))
return currentblItem.severity>=gBlocklistLevel?Ci.nsIBlocklistService.STATE_BLOCKED:Ci.nsIBlocklistService.STATE_SOFTBLOCKED;}
return Ci.nsIBlocklistService.STATE_NOT_BLOCKED;},_getAddonPrefs:function Blocklist_getAddonPrefs(addon){let entry=this._findMatchingAddonEntry(this._addonEntries,addon);return entry.prefs.slice(0);},_findMatchingAddonEntry:function Blocklist_findMatchingAddonEntry(aAddonEntries,aAddon){if(!aAddon)
return null;
function checkEntry(entry,params){for(let[key,value]of entry){if(value===null||value===undefined)
continue;if(params[key]){if(value instanceof RegExp){if(!value.test(params[key])){return false;}}else if(value!==params[key]){return false;}}else{return false;}}
return true;}
let params={};for(let filter of EXTENSION_BLOCK_FILTERS){params[filter]=aAddon[filter];}
if(params.creator)
params.creator=params.creator.name;for(let entry of aAddonEntries){if(checkEntry(entry.attributes,params)){return entry;}}
return null;},getAddonBlocklistURL:function Blocklist_getAddonBlocklistURL(addon,appVersion,toolkitVersion){if(!gBlocklistEnabled)
return"";if(!this._isBlocklistLoaded())
this._loadBlocklist();let blItem=this._findMatchingAddonEntry(this._addonEntries,addon);if(!blItem||!blItem.blockID)
return null;return this._createBlocklistURL(blItem.blockID);},_createBlocklistURL:function Blocklist_createBlocklistURL(id){let url=Services.urlFormatter.formatURLPref(PREF_BLOCKLIST_ITEM_URL);url=url.replace(/%blockID%/g,id);return url;},notify:function Blocklist_notify(aTimer){if(!gBlocklistEnabled)
return;try{var dsURI=gPref.getCharPref(PREF_BLOCKLIST_URL);}
catch(e){LOG("Blocklist::notify: The "+PREF_BLOCKLIST_URL+" preference"+" is missing!");return;}
var pingCountVersion=getPref("getIntPref",PREF_BLOCKLIST_PINGCOUNTVERSION,0);var pingCountTotal=getPref("getIntPref",PREF_BLOCKLIST_PINGCOUNTTOTAL,1);var daysSinceLastPing=0;if(pingCountVersion==0){daysSinceLastPing="new";}
else{
let secondsInDay=60*60*24;let lastUpdateTime=getPref("getIntPref",PREF_BLOCKLIST_LASTUPDATETIME,0);if(lastUpdateTime==0){daysSinceLastPing="invalid";}
else{let now=Math.round(Date.now()/1000);daysSinceLastPing=Math.floor((now-lastUpdateTime)/secondsInDay);}
if(daysSinceLastPing==0||daysSinceLastPing=="invalid"){pingCountVersion=pingCountTotal="invalid";}}
if(pingCountVersion<1)
pingCountVersion=1;if(pingCountTotal<1)
pingCountTotal=1;dsURI=dsURI.replace(/%APP_ID%/g,gApp.ID);dsURI=dsURI.replace(/%APP_VERSION%/g,gApp.version);dsURI=dsURI.replace(/%PRODUCT%/g,gApp.name);dsURI=dsURI.replace(/%VERSION%/g,gApp.version);dsURI=dsURI.replace(/%BUILD_ID%/g,gApp.appBuildID);dsURI=dsURI.replace(/%BUILD_TARGET%/g,gApp.OS+"_"+gABI);dsURI=dsURI.replace(/%OS_VERSION%/g,gOSVersion);dsURI=dsURI.replace(/%LOCALE%/g,getLocale());dsURI=dsURI.replace(/%CHANNEL%/g,UpdateChannel.get());dsURI=dsURI.replace(/%PLATFORM_VERSION%/g,gApp.platformVersion);dsURI=dsURI.replace(/%DISTRIBUTION%/g,getDistributionPrefValue(PREF_APP_DISTRIBUTION));dsURI=dsURI.replace(/%DISTRIBUTION_VERSION%/g,getDistributionPrefValue(PREF_APP_DISTRIBUTION_VERSION));dsURI=dsURI.replace(/%PING_COUNT%/g,pingCountVersion);dsURI=dsURI.replace(/%TOTAL_PING_COUNT%/g,pingCountTotal);dsURI=dsURI.replace(/%DAYS_SINCE_LAST_PING%/g,daysSinceLastPing);dsURI=dsURI.replace(/\+/g,"%2B");

if(pingCountVersion!="invalid"){pingCountVersion++;if(pingCountVersion>2147483647){
pingCountVersion=-1;}
gPref.setIntPref(PREF_BLOCKLIST_PINGCOUNTVERSION,pingCountVersion);}
if(pingCountTotal!="invalid"){pingCountTotal++;if(pingCountTotal>2147483647){
pingCountTotal=-1;}
gPref.setIntPref(PREF_BLOCKLIST_PINGCOUNTTOTAL,pingCountTotal);} 
try{var uri=newURI(dsURI);}
catch(e){LOG("Blocklist::notify: There was an error creating the blocklist URI\r\n"+"for: "+dsURI+", error: "+e);return;}
LOG("Blocklist::notify: Requesting "+uri.spec);var request=Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Ci.nsIXMLHttpRequest);request.open("GET",uri.spec,true);request.channel.notificationCallbacks=new gCertUtils.BadCertHandler();request.overrideMimeType("text/xml");request.setRequestHeader("Cache-Control","no-cache");request.QueryInterface(Components.interfaces.nsIJSXMLHttpRequest);var self=this;request.addEventListener("error",function errorEventListener(event){self.onXMLError(event);},false);request.addEventListener("load",function loadEventListener(event){self.onXMLLoad(event);},false);request.send(null);
if(!this._isBlocklistLoaded())
this._loadBlocklist();},onXMLLoad:Task.async(function*(aEvent){let request=aEvent.target;try{gCertUtils.checkCert(request.channel);}
catch(e){LOG("Blocklist::onXMLLoad: "+e);return;}
let responseXML=request.responseXML;if(!responseXML||responseXML.documentElement.namespaceURI==XMLURI_PARSE_ERROR||(request.status!=200&&request.status!=0)){LOG("Blocklist::onXMLLoad: there was an error during load");return;}
var oldAddonEntries=this._addonEntries;var oldPluginEntries=this._pluginEntries;this._addonEntries=[];this._pluginEntries=[];this._loadBlocklistFromString(request.responseText);this._blocklistUpdated(oldAddonEntries,oldPluginEntries);try{let path=OS.Path.join(OS.Constants.Path.profileDir,FILE_BLOCKLIST);yield OS.File.writeAtomic(path,request.responseText,{tmpPath:path+".tmp"});}catch(e){LOG("Blocklist::onXMLLoad: "+e);}}),onXMLError:function Blocklist_onXMLError(aEvent){try{var request=aEvent.target;var status=request.status;}
catch(e){request=aEvent.target.channel.QueryInterface(Ci.nsIRequest);status=request.status;}
var statusText="nsIXMLHttpRequest channel unavailable";if(status!=0){try{statusText=request.statusText;}catch(e){}}
LOG("Blocklist:onError: There was an error loading the blocklist file\r\n"+
statusText);},_loadBlocklist:function Blocklist_loadBlocklist(){this._addonEntries=[];this._pluginEntries=[];var profFile=FileUtils.getFile(KEY_PROFILEDIR,[FILE_BLOCKLIST]);if(profFile.exists()){this._loadBlocklistFromFile(profFile);return;}
var appFile=FileUtils.getFile(KEY_APPDIR,[FILE_BLOCKLIST]);if(appFile.exists()){this._loadBlocklistFromFile(appFile);return;}
LOG("Blocklist::_loadBlocklist: no XML File found");},_loadBlocklistFromFile:function Blocklist_loadBlocklistFromFile(file){if(!gBlocklistEnabled){LOG("Blocklist::_loadBlocklistFromFile: blocklist is disabled");return;}
let telemetry=Services.telemetry;if(this._isBlocklistPreloaded()){telemetry.getHistogramById("BLOCKLIST_SYNC_FILE_LOAD").add(false);this._loadBlocklistFromString(this._preloadedBlocklistContent);delete this._preloadedBlocklistContent;return;}
if(!file.exists()){LOG("Blocklist::_loadBlocklistFromFile: XML File does not exist "+file.path);return;}
telemetry.getHistogramById("BLOCKLIST_SYNC_FILE_LOAD").add(true);let text="";let fstream=null;let cstream=null;try{fstream=Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);cstream=Components.classes["@mozilla.org/intl/converter-input-stream;1"].createInstance(Components.interfaces.nsIConverterInputStream);fstream.init(file,FileUtils.MODE_RDONLY,FileUtils.PERMS_FILE,0);cstream.init(fstream,"UTF-8",0,0);let(str={}){let read=0;do{read=cstream.readString(0xffffffff,str); text+=str.value;}while(read!=0);}}catch(e){LOG("Blocklist::_loadBlocklistFromFile: Failed to load XML file "+e);}finally{cstream.close();fstream.close();}
text&&this._loadBlocklistFromString(text);},_isBlocklistLoaded:function(){return this._addonEntries!=null&&this._pluginEntries!=null;},_isBlocklistPreloaded:function(){return this._preloadedBlocklistContent!=null;},_clear:function(){this._addonEntries=null;this._pluginEntries=null;this._preloadedBlocklistContent=null;},_preloadBlocklist:Task.async(function*(){let profPath=OS.Path.join(OS.Constants.Path.profileDir,FILE_BLOCKLIST);try{yield this._preloadBlocklistFile(profPath);return;}catch(e){LOG("Blocklist::_preloadBlocklist: Failed to load XML file "+e)}
var appFile=FileUtils.getFile(KEY_APPDIR,[FILE_BLOCKLIST]);try{yield this._preloadBlocklistFile(appFile.path);return;}catch(e){LOG("Blocklist::_preloadBlocklist: Failed to load XML file "+e)}
LOG("Blocklist::_preloadBlocklist: no XML File found");}),_preloadBlocklistFile:Task.async(function*(path){if(this._addonEntries){return;}
if(!gBlocklistEnabled){LOG("Blocklist::_preloadBlocklistFile: blocklist is disabled");return;}
let text=yield OS.File.read(path,{encoding:"utf-8"});if(!this._addonEntries){this._preloadedBlocklistContent=text;}}),_loadBlocklistFromString:function Blocklist_loadBlocklistFromString(text){try{var parser=Cc["@mozilla.org/xmlextras/domparser;1"].createInstance(Ci.nsIDOMParser);var doc=parser.parseFromString(text,"text/xml");if(doc.documentElement.namespaceURI!=XMLURI_BLOCKLIST){LOG("Blocklist::_loadBlocklistFromFile: aborting due to incorrect "+"XML Namespace.\r\nExpected: "+XMLURI_BLOCKLIST+"\r\n"+"Received: "+doc.documentElement.namespaceURI);return;}
var childNodes=doc.documentElement.childNodes;for(let element of childNodes){if(!(element instanceof Ci.nsIDOMElement))
continue;switch(element.localName){case"emItems":this._addonEntries=this._processItemNodes(element.childNodes,"em",this._handleEmItemNode);break;case"pluginItems":this._pluginEntries=this._processItemNodes(element.childNodes,"plugin",this._handlePluginItemNode);break;default:Services.obs.notifyObservers(element,"blocklist-data-"+element.localName,null);}}}
catch(e){LOG("Blocklist::_loadBlocklistFromFile: Error constructing blocklist "+e);return;}},_processItemNodes:function Blocklist_processItemNodes(itemNodes,prefix,handler){var result=[];var itemName=prefix+"Item";for(var i=0;i<itemNodes.length;++i){var blocklistElement=itemNodes.item(i);if(!(blocklistElement instanceof Ci.nsIDOMElement)||blocklistElement.localName!=itemName)
continue;handler(blocklistElement,result);}
return result;},_handleEmItemNode:function Blocklist_handleEmItemNode(blocklistElement,result){if(!matchesOSABI(blocklistElement))
return;let blockEntry={versions:[],prefs:[],blockID:null,attributes:new Map()
};
function regExpCheck(attr){return attr.startsWith("/")?parseRegExp(attr):attr;}
for(let filter of EXTENSION_BLOCK_FILTERS){let attr=blocklistElement.getAttribute(filter);if(attr)
blockEntry.attributes.set(filter,regExpCheck(attr));}
var childNodes=blocklistElement.childNodes;for(let x=0;x<childNodes.length;x++){var childElement=childNodes.item(x);if(!(childElement instanceof Ci.nsIDOMElement))
continue;if(childElement.localName==="prefs"){let prefElements=childElement.childNodes;for(let i=0;i<prefElements.length;i++){let prefElement=prefElements.item(i);if(!(prefElement instanceof Ci.nsIDOMElement)||prefElement.localName!=="pref")
continue;blockEntry.prefs.push(prefElement.textContent);}}
else if(childElement.localName==="versionRange")
blockEntry.versions.push(new BlocklistItemData(childElement));}

if(blockEntry.versions.length==0)
blockEntry.versions.push(new BlocklistItemData(null));blockEntry.blockID=blocklistElement.getAttribute("blockID");result.push(blockEntry);},_handlePluginItemNode:function Blocklist_handlePluginItemNode(blocklistElement,result){if(!matchesOSABI(blocklistElement))
return;var matchNodes=blocklistElement.childNodes;var blockEntry={matches:{},versions:[],blockID:null,};var hasMatch=false;for(var x=0;x<matchNodes.length;++x){var matchElement=matchNodes.item(x);if(!(matchElement instanceof Ci.nsIDOMElement))
continue;if(matchElement.localName=="match"){var name=matchElement.getAttribute("name");var exp=matchElement.getAttribute("exp");try{blockEntry.matches[name]=new RegExp(exp,"m");hasMatch=true;}catch(e){}}
if(matchElement.localName=="versionRange")
blockEntry.versions.push(new BlocklistItemData(matchElement));} 
if(!hasMatch)
return; if(blockEntry.versions.length==0)
blockEntry.versions.push(new BlocklistItemData(null));blockEntry.blockID=blocklistElement.getAttribute("blockID");result.push(blockEntry);},getPluginBlocklistState:function Blocklist_getPluginBlocklistState(plugin,appVersion,toolkitVersion){if(!this._isBlocklistLoaded())
this._loadBlocklist();return this._getPluginBlocklistState(plugin,this._pluginEntries,appVersion,toolkitVersion);},_getPluginBlocklistState:function Blocklist_getPluginBlocklistState(plugin,pluginEntries,appVersion,toolkitVersion){if(!gBlocklistEnabled)
return Ci.nsIBlocklistService.STATE_NOT_BLOCKED;if(!appVersion)
appVersion=gApp.version;if(!toolkitVersion)
toolkitVersion=gApp.platformVersion;for each(var blockEntry in pluginEntries){var matchFailed=false;for(var name in blockEntry.matches){if(!(name in plugin)||typeof(plugin[name])!="string"||!blockEntry.matches[name].test(plugin[name])){matchFailed=true;break;}}
if(matchFailed)
continue;for(let blockEntryVersion of blockEntry.versions){if(blockEntryVersion.includesItem(plugin.version,appVersion,toolkitVersion)){if(blockEntryVersion.severity>=gBlocklistLevel)
return Ci.nsIBlocklistService.STATE_BLOCKED;if(blockEntryVersion.severity==SEVERITY_OUTDATED){let vulnerabilityStatus=blockEntryVersion.vulnerabilityStatus;if(vulnerabilityStatus==VULNERABILITYSTATUS_UPDATE_AVAILABLE)
return Ci.nsIBlocklistService.STATE_VULNERABLE_UPDATE_AVAILABLE;if(vulnerabilityStatus==VULNERABILITYSTATUS_NO_UPDATE)
return Ci.nsIBlocklistService.STATE_VULNERABLE_NO_UPDATE;return Ci.nsIBlocklistService.STATE_OUTDATED;}
return Ci.nsIBlocklistService.STATE_SOFTBLOCKED;}}}
return Ci.nsIBlocklistService.STATE_NOT_BLOCKED;},getPluginBlocklistURL:function Blocklist_getPluginBlocklistURL(plugin){if(!gBlocklistEnabled)
return"";if(!this._isBlocklistLoaded())
this._loadBlocklist();for each(let blockEntry in this._pluginEntries){let matchFailed=false;for(let name in blockEntry.matches){if(!(name in plugin)||typeof(plugin[name])!="string"||!blockEntry.matches[name].test(plugin[name])){matchFailed=true;break;}}
if(!matchFailed){if(!blockEntry.blockID)
return null;else
return this._createBlocklistURL(blockEntry.blockID);}}},_blocklistUpdated:function Blocklist_blocklistUpdated(oldAddonEntries,oldPluginEntries){var addonList=[];function resetPrefs(prefs){for(let pref of prefs)
gPref.clearUserPref(pref);}
var self=this;const types=["extension","theme","locale","dictionary","service"];AddonManager.getAddonsByTypes(types,function blocklistUpdated_getAddonsByTypes(addons){for(let addon of addons){let oldState=Ci.nsIBlocklistService.STATE_NOTBLOCKED;if(oldAddonEntries)
oldState=self._getAddonBlocklistState(addon,oldAddonEntries);let state=self.getAddonBlocklistState(addon);LOG("Blocklist state for "+addon.id+" changed from "+
oldState+" to "+state); if(state==oldState)
continue;if(state===Ci.nsIBlocklistService.STATE_BLOCKED){let prefs=self._getAddonPrefs(addon);resetPrefs(prefs);} 
if(state!=Ci.nsIBlocklistService.STATE_SOFTBLOCKED)
addon.softDisabled=false;if(state==Ci.nsIBlocklistService.STATE_NOT_BLOCKED)
continue;
if(state==Ci.nsIBlocklistService.STATE_SOFTBLOCKED&&oldState==Ci.nsIBlocklistService.STATE_BLOCKED){addon.softDisabled=true;continue;}
 
if(!addon.isActive)
continue;addonList.push({name:addon.name,version:addon.version,icon:addon.iconURL,disable:false,blocked:state==Ci.nsIBlocklistService.STATE_BLOCKED,item:addon,url:self.getAddonBlocklistURL(addon),});}
AddonManagerPrivate.updateAddonAppDisabledStates();var phs=Cc["@mozilla.org/plugin/host;1"].getService(Ci.nsIPluginHost);var plugins=phs.getPluginTags();for(let plugin of plugins){let oldState=-1;if(oldPluginEntries)
oldState=self._getPluginBlocklistState(plugin,oldPluginEntries);let state=self.getPluginBlocklistState(plugin);LOG("Blocklist state for "+plugin.name+" changed from "+
oldState+" to "+state); if(state==oldState)
continue;if(oldState==Ci.nsIBlocklistService.STATE_BLOCKED){if(state==Ci.nsIBlocklistService.STATE_SOFTBLOCKED)
plugin.enabledState=Ci.nsIPluginTag.STATE_DISABLED;}
else if(!plugin.disabled&&state!=Ci.nsIBlocklistService.STATE_NOT_BLOCKED){if(state==Ci.nsIBlocklistService.STATE_OUTDATED){gPref.setBoolPref(PREF_PLUGINS_NOTIFYUSER,true);}
else if(state!=Ci.nsIBlocklistService.STATE_VULNERABLE_UPDATE_AVAILABLE&&state!=Ci.nsIBlocklistService.STATE_VULNERABLE_NO_UPDATE){addonList.push({name:plugin.name,version:plugin.version,icon:"chrome://mozapps/skin/plugins/pluginGeneric.png",disable:false,blocked:state==Ci.nsIBlocklistService.STATE_BLOCKED,item:plugin,url:self.getPluginBlocklistURL(plugin),});}}}
if(addonList.length==0){Services.obs.notifyObservers(self,"blocklist-updated","");return;}
if("@mozilla.org/addons/blocklist-prompt;1"in Cc){try{let blockedPrompter=Cc["@mozilla.org/addons/blocklist-prompt;1"].getService(Ci.nsIBlocklistPrompt);blockedPrompter.prompt(addonList);}catch(e){LOG(e);}
Services.obs.notifyObservers(self,"blocklist-updated","");return;}
var args={restart:false,list:addonList}; args.wrappedJSObject=args;let applyBlocklistChanges=function blocklistUpdated_applyBlocklistChanges(){for(let addon of addonList){if(!addon.disable)
continue;if(addon.item instanceof Ci.nsIPluginTag)
addon.item.enabledState=Ci.nsIPluginTag.STATE_DISABLED;else{addon.item.softDisabled=true;let prefs=self._getAddonPrefs(addon.item);resetPrefs(prefs);}}
if(args.restart)
restartApp();Services.obs.notifyObservers(self,"blocklist-updated","");Services.obs.removeObserver(applyBlocklistChanges,"addon-blocklist-closed");}
Services.obs.addObserver(applyBlocklistChanges,"addon-blocklist-closed",false);if(getPref("getBoolPref",PREF_BLOCKLIST_SUPPRESSUI,false)){applyBlocklistChanges();return;}
function blocklistUnloadHandler(event){if(event.target.location==URI_BLOCKLIST_DIALOG){applyBlocklistChanges();blocklistWindow.removeEventListener("unload",blocklistUnloadHandler);}}
let blocklistWindow=Services.ww.openWindow(null,URI_BLOCKLIST_DIALOG,"","chrome,centerscreen,dialog,titlebar",args);if(blocklistWindow)
blocklistWindow.addEventListener("unload",blocklistUnloadHandler,false);});},classID:Components.ID("{66354bc9-7ed1-4692-ae1d-8da97d6b205e}"),QueryInterface:XPCOMUtils.generateQI([Ci.nsIObserver,Ci.nsIBlocklistService,Ci.nsITimerCallback]),};function BlocklistItemData(versionRangeElement){var versionRange=this.getBlocklistVersionRange(versionRangeElement);this.minVersion=versionRange.minVersion;this.maxVersion=versionRange.maxVersion;if(versionRangeElement&&versionRangeElement.hasAttribute("severity"))
this.severity=versionRangeElement.getAttribute("severity");else
this.severity=DEFAULT_SEVERITY;if(versionRangeElement&&versionRangeElement.hasAttribute("vulnerabilitystatus")){this.vulnerabilityStatus=versionRangeElement.getAttribute("vulnerabilitystatus");}else{this.vulnerabilityStatus=VULNERABILITYSTATUS_NONE;}
this.targetApps={};var found=false;if(versionRangeElement){for(var i=0;i<versionRangeElement.childNodes.length;++i){var targetAppElement=versionRangeElement.childNodes.item(i);if(!(targetAppElement instanceof Ci.nsIDOMElement)||targetAppElement.localName!="targetApplication")
continue;found=true;var appID=targetAppElement.hasAttribute("id")?targetAppElement.getAttribute("id"):gApp.ID;this.targetApps[appID]=this.getBlocklistAppVersions(targetAppElement);}}
 
if(!found)
this.targetApps[gApp.ID]=this.getBlocklistAppVersions(null);}
BlocklistItemData.prototype={includesItem:function BlocklistItemData_includesItem(version,appVersion,toolkitVersion){
 if(!version&&(this.minVersion||this.maxVersion))
return false; if(!this.matchesRange(version,this.minVersion,this.maxVersion))
return false; if(this.matchesTargetRange(gApp.ID,appVersion))
return true; return this.matchesTargetRange(TOOLKIT_ID,toolkitVersion);},matchesRange:function BlocklistItemData_matchesRange(version,minVersion,maxVersion){if(minVersion&&gVersionChecker.compare(version,minVersion)<0)
return false;if(maxVersion&&gVersionChecker.compare(version,maxVersion)>0)
return false;return true;},matchesTargetRange:function BlocklistItemData_matchesTargetRange(appID,appVersion){var blTargetApp=this.targetApps[appID];if(!blTargetApp)
return false;for(let app of blTargetApp){if(this.matchesRange(appVersion,app.minVersion,app.maxVersion))
return true;}
return false;},getBlocklistAppVersions:function BlocklistItemData_getBlocklistAppVersions(targetAppElement){var appVersions=[];if(targetAppElement){for(var i=0;i<targetAppElement.childNodes.length;++i){var versionRangeElement=targetAppElement.childNodes.item(i);if(!(versionRangeElement instanceof Ci.nsIDOMElement)||versionRangeElement.localName!="versionRange")
continue;appVersions.push(this.getBlocklistVersionRange(versionRangeElement));}}
 
if(appVersions.length==0)
appVersions.push(this.getBlocklistVersionRange(null));return appVersions;},getBlocklistVersionRange:function BlocklistItemData_getBlocklistVersionRange(versionRangeElement){var minVersion=null;var maxVersion=null;if(!versionRangeElement)
return{minVersion:minVersion,maxVersion:maxVersion};if(versionRangeElement.hasAttribute("minVersion"))
minVersion=versionRangeElement.getAttribute("minVersion");if(versionRangeElement.hasAttribute("maxVersion"))
maxVersion=versionRangeElement.getAttribute("maxVersion");return{minVersion:minVersion,maxVersion:maxVersion};}};this.NSGetFactory=XPCOMUtils.generateNSGetFactory([Blocklist]);