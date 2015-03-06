"use strict";const Cc=Components.classes;const Ci=Components.interfaces;const Cu=Components.utils;const Cr=Components.results;Components.utils.import("resource://gre/modules/Services.jsm");Components.utils.import("resource://gre/modules/AddonManager.jsm");Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");XPCOMUtils.defineLazyModuleGetter(this,"NetUtil","resource://gre/modules/NetUtil.jsm");XPCOMUtils.defineLazyModuleGetter(this,"OS","resource://gre/modules/osfile.jsm");XPCOMUtils.defineLazyModuleGetter(this,"DeferredSave","resource://gre/modules/DeferredSave.jsm");XPCOMUtils.defineLazyModuleGetter(this,"AddonRepository_SQLiteMigrator","resource://gre/modules/addons/AddonRepository_SQLiteMigrator.jsm");XPCOMUtils.defineLazyModuleGetter(this,"Promise","resource://gre/modules/Promise.jsm");XPCOMUtils.defineLazyModuleGetter(this,"Task","resource://gre/modules/Task.jsm");this.EXPORTED_SYMBOLS=["AddonRepository"];const PREF_GETADDONS_CACHE_ENABLED="extensions.getAddons.cache.enabled";const PREF_GETADDONS_CACHE_TYPES="extensions.getAddons.cache.types";const PREF_GETADDONS_CACHE_ID_ENABLED="extensions.%ID%.getAddons.cache.enabled"
const PREF_GETADDONS_BROWSEADDONS="extensions.getAddons.browseAddons";const PREF_GETADDONS_BYIDS="extensions.getAddons.get.url";const PREF_GETADDONS_BYIDS_PERFORMANCE="extensions.getAddons.getWithPerformance.url";const PREF_GETADDONS_BROWSERECOMMENDED="extensions.getAddons.recommended.browseURL";const PREF_GETADDONS_GETRECOMMENDED="extensions.getAddons.recommended.url";const PREF_GETADDONS_BROWSESEARCHRESULTS="extensions.getAddons.search.browseURL";const PREF_GETADDONS_GETSEARCHRESULTS="extensions.getAddons.search.url";const PREF_GETADDONS_DB_SCHEMA="extensions.getAddons.databaseSchema"
const PREF_METADATA_LASTUPDATE="extensions.getAddons.cache.lastUpdate";const PREF_METADATA_UPDATETHRESHOLD_SEC="extensions.getAddons.cache.updateThreshold";const DEFAULT_METADATA_UPDATETHRESHOLD_SEC=172800;const XMLURI_PARSE_ERROR="http://www.mozilla.org/newlayout/xml/parsererror.xml";const API_VERSION="1.5";const DEFAULT_CACHE_TYPES="extension,theme,locale,dictionary";const KEY_PROFILEDIR="ProfD";const FILE_DATABASE="addons.json";const DB_SCHEMA=5;const DB_MIN_JSON_SCHEMA=5;const DB_BATCH_TIMEOUT_MS=50;const BLANK_DB=function(){return{addons:new Map(),schema:DB_SCHEMA};}
const TOOLKIT_ID="toolkit@mozilla.org";Cu.import("resource://gre/modules/Log.jsm");const LOGGER_ID="addons.repository";
let logger=Log.repository.getLogger(LOGGER_ID);
const STRING_KEY_MAP={name:"name",version:"version",homepage:"homepageURL",support:"supportURL"};
const HTML_KEY_MAP={summary:"description",description:"fullDescription",developer_comments:"developerComments",eula:"eula"};
const INTEGER_KEY_MAP={total_downloads:"totalDownloads",weekly_downloads:"weeklyDownloads",daily_users:"dailyUsers"};let XHRequest=Components.Constructor("@mozilla.org/xmlextras/xmlhttprequest;1","nsIXMLHttpRequest");function convertHTMLToPlainText(html){if(!html)
return html;var converter=Cc["@mozilla.org/widget/htmlformatconverter;1"].createInstance(Ci.nsIFormatConverter);var input=Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);input.data=html.replace(/\n/g,"<br>");var output={};converter.convert("text/html",input,input.data.length,"text/unicode",output,{});if(output.value instanceof Ci.nsISupportsString)
return output.value.data.replace(/\r\n/g,"\n");return html;}
function getAddonsToCache(aIds,aCallback){try{var types=Services.prefs.getCharPref(PREF_GETADDONS_CACHE_TYPES);}
catch(e){}
if(!types)
types=DEFAULT_CACHE_TYPES;types=types.split(",");AddonManager.getAddonsByIDs(aIds,function getAddonsToCache_getAddonsByIDs(aAddons){let enabledIds=[];for(var i=0;i<aIds.length;i++){var preference=PREF_GETADDONS_CACHE_ID_ENABLED.replace("%ID%",aIds[i]);try{if(!Services.prefs.getBoolPref(preference))
continue;}catch(e){}
 
if(aAddons[i]&&(types.indexOf(aAddons[i].type)==-1))
continue;enabledIds.push(aIds[i]);}
aCallback(enabledIds);});}
function AddonSearchResult(aId){this.id=aId;this.icons={};this._unsupportedProperties={};}
AddonSearchResult.prototype={id:null,type:null,name:null,version:null,creator:null,developers:null,description:null,fullDescription:null,developerComments:null,eula:null,get iconURL(){return this.icons&&this.icons[32];},icons:null,screenshots:null,homepageURL:null,learnmoreURL:null,supportURL:null,contributionURL:null,contributionAmount:null,purchaseURL:null,purchaseAmount:null,purchaseDisplayAmount:null,averageRating:null,reviewCount:null,reviewURL:null,totalDownloads:null,weeklyDownloads:null,dailyUsers:null,install:null,sourceURI:null,repositoryStatus:null,size:null,updateDate:null,isCompatible:true,isPlatformCompatible:true,compatibilityOverrides:null,providesUpdatesSecurely:true,blocklistState:Ci.nsIBlocklistService.STATE_NOT_BLOCKED,appDisabled:false,userDisabled:false,scope:AddonManager.SCOPE_PROFILE,isActive:true,pendingOperations:AddonManager.PENDING_NONE,permissions:0,isCompatibleWith:function ASR_isCompatibleWith(aAppVerison,aPlatformVersion){return true;},findUpdates:function ASR_findUpdates(aListener,aReason,aAppVersion,aPlatformVersion){if("onNoCompatibilityUpdateAvailable"in aListener)
aListener.onNoCompatibilityUpdateAvailable(this);if("onNoUpdateAvailable"in aListener)
aListener.onNoUpdateAvailable(this);if("onUpdateFinished"in aListener)
aListener.onUpdateFinished(this);},toJSON:function(){let json={};for(let[property,value]of Iterator(this)){if(property.startsWith("_")||typeof(value)==="function")
continue;try{switch(property){case"sourceURI":json.sourceURI=value?value.spec:"";break;case"updateDate":json.updateDate=value?value.getTime():"";break;default:json[property]=value;}}catch(ex){logger.warn("Error writing property value for "+property);}}
for(let[property,value]of Iterator(this._unsupportedProperties)){if(!property.startsWith("_"))
json[property]=value;}
return json;}}
this.AddonRepository={get cacheEnabled(){
if(!AddonDatabase.databaseOk){logger.warn("Cache is disabled because database is not OK");return false;}
let preference=PREF_GETADDONS_CACHE_ENABLED;let enabled=false;try{enabled=Services.prefs.getBoolPref(preference);}catch(e){logger.warn("cacheEnabled: Couldn't get pref: "+preference);}
return enabled;}, _addons:null, _searching:false, _request:null,_callback:null, _maxResults:null,shutdown:function AddonRepo_shutdown(){this.cancelSearch();this._addons=null;return AddonDatabase.shutdown(false);},metadataAge:function(){let now=Math.round(Date.now()/1000);let lastUpdate=0;try{lastUpdate=Services.prefs.getIntPref(PREF_METADATA_LASTUPDATE);}catch(e){} 
if(now<lastUpdate){return now;}
return now-lastUpdate;},isMetadataStale:function AddonRepo_isMetadataStale(){let threshold=DEFAULT_METADATA_UPDATETHRESHOLD_SEC;try{threshold=Services.prefs.getIntPref(PREF_METADATA_UPDATETHRESHOLD_SEC);}catch(e){}
return(this.metadataAge()>threshold);},getCachedAddonByID:Task.async(function*(aId,aCallback){if(!aId||!this.cacheEnabled){aCallback(null);return;}
function getAddon(aAddons){aCallback(aAddons.get(aId)||null);}
if(this._addons==null){AddonDatabase.retrieveStoredData().then(aAddons=>{this._addons=aAddons;getAddon(aAddons);});return;}
getAddon(this._addons);}),repopulateCache:function(aTimeout){return this._repopulateCacheInternal(false,aTimeout);},_clearCache:function(){this._addons=null;return AddonDatabase.delete().then(()=>new Promise((resolve,reject)=>AddonManagerPrivate.updateAddonRepositoryData(resolve)));},_repopulateCacheInternal:Task.async(function*(aSendPerformance,aTimeout){let allAddons=yield new Promise((resolve,reject)=>AddonManager.getAllAddons(resolve)); let allAddons=[a for(a of allAddons)if(a.id!=AddonManager.hotfixID)]; if(!this.cacheEnabled){logger.debug("Clearing cache because it is disabled");return this._clearCache();}
let ids=[a.id for(a of allAddons)];logger.debug("Repopulate add-on cache with "+ids.toSource());let self=this;let addonsToCache=yield new Promise((resolve,reject)=>getAddonsToCache(ids,resolve)); if(addonsToCache.length==0){logger.debug("Clearing cache because 0 add-ons were requested");return this._clearCache();}
yield new Promise((resolve,reject)=>self._beginGetAddons(addonsToCache,{searchSucceeded:function repopulateCacheInternal_searchSucceeded(aAddons){self._addons=new Map();for(let addon of aAddons){self._addons.set(addon.id,addon);}
AddonDatabase.repopulate(aAddons,resolve);},searchFailed:function repopulateCacheInternal_searchFailed(){logger.warn("Search failed when repopulating cache");resolve();}},aSendPerformance,aTimeout)); yield new Promise((resolve,reject)=>AddonManagerPrivate.updateAddonRepositoryData(resolve));}),cacheAddons:function AddonRepo_cacheAddons(aIds,aCallback){logger.debug("cacheAddons: enabled "+this.cacheEnabled+" IDs "+aIds.toSource());if(!this.cacheEnabled){if(aCallback)
aCallback();return;}
let self=this;getAddonsToCache(aIds,function cacheAddons_getAddonsToCache(aAddons){ if(aAddons.length==0){if(aCallback)
aCallback();return;}
self.getAddonsByIDs(aAddons,{searchSucceeded:function cacheAddons_searchSucceeded(aAddons){for(let addon of aAddons){self._addons.set(addon.id,addon);}
AddonDatabase.insertAddons(aAddons,aCallback);},searchFailed:function cacheAddons_searchFailed(){logger.warn("Search failed when adding add-ons to cache");if(aCallback)
aCallback();}});});},get homepageURL(){let url=this._formatURLPref(PREF_GETADDONS_BROWSEADDONS,{});return(url!=null)?url:"about:blank";},get isSearching(){return this._searching;},getRecommendedURL:function AddonRepo_getRecommendedURL(){let url=this._formatURLPref(PREF_GETADDONS_BROWSERECOMMENDED,{});return(url!=null)?url:"about:blank";},getSearchURL:function AddonRepo_getSearchURL(aSearchTerms){let url=this._formatURLPref(PREF_GETADDONS_BROWSESEARCHRESULTS,{TERMS:encodeURIComponent(aSearchTerms)});return(url!=null)?url:"about:blank";},cancelSearch:function AddonRepo_cancelSearch(){this._searching=false;if(this._request){this._request.abort();this._request=null;}
this._callback=null;},getAddonsByIDs:function AddonRepo_getAddonsByIDs(aIDs,aCallback){return this._beginGetAddons(aIDs,aCallback,false);},_beginGetAddons:function(aIDs,aCallback,aSendPerformance,aTimeout){let ids=aIDs.slice(0);let params={API_VERSION:API_VERSION,IDS:ids.map(encodeURIComponent).join(',')};let pref=PREF_GETADDONS_BYIDS;if(aSendPerformance){let type=Services.prefs.getPrefType(PREF_GETADDONS_BYIDS_PERFORMANCE);if(type==Services.prefs.PREF_STRING){pref=PREF_GETADDONS_BYIDS_PERFORMANCE;let startupInfo=Cc["@mozilla.org/toolkit/app-startup;1"].getService(Ci.nsIAppStartup).getStartupInfo();params.TIME_MAIN="";params.TIME_FIRST_PAINT="";params.TIME_SESSION_RESTORED="";if(startupInfo.process){if(startupInfo.main){params.TIME_MAIN=startupInfo.main-startupInfo.process;}
if(startupInfo.firstPaint){params.TIME_FIRST_PAINT=startupInfo.firstPaint-
startupInfo.process;}
if(startupInfo.sessionRestored){params.TIME_SESSION_RESTORED=startupInfo.sessionRestored-
startupInfo.process;}}}}
let url=this._formatURLPref(pref,params);let self=this;function handleResults(aElements,aTotalResults,aCompatData){ let results=[];for(let i=0;i<aElements.length&&results.length<self._maxResults;i++){let result=self._parseAddon(aElements[i],null,aCompatData);if(result==null)
continue; let idIndex=ids.indexOf(result.addon.id);if(idIndex==-1)
continue;results.push(result); ids.splice(idIndex,1);}

for each(let addonCompat in aCompatData){if(addonCompat.hosted)
continue;let addon=new AddonSearchResult(addonCompat.id);addon.type="extension";addon.compatibilityOverrides=addonCompat.compatRanges;let result={addon:addon,xpiURL:null,xpiHash:null};results.push(result);} 
self._reportSuccess(results,-1);}
this._beginSearch(url,ids.length,aCallback,handleResults,aTimeout);},backgroundUpdateCheck:function(){return this._repopulateCacheInternal(true);},retrieveRecommendedAddons:function AddonRepo_retrieveRecommendedAddons(aMaxResults,aCallback){let url=this._formatURLPref(PREF_GETADDONS_GETRECOMMENDED,{API_VERSION:API_VERSION, MAX_RESULTS:2*aMaxResults});let self=this;function handleResults(aElements,aTotalResults){self._getLocalAddonIds(function retrieveRecommendedAddons_getLocalAddonIds(aLocalAddonIds){ self._parseAddons(aElements,-1,aLocalAddonIds);});}
this._beginSearch(url,aMaxResults,aCallback,handleResults);},searchAddons:function AddonRepo_searchAddons(aSearchTerms,aMaxResults,aCallback){let compatMode="normal";if(!AddonManager.checkCompatibility)
compatMode="ignore";else if(AddonManager.strictCompatibility)
compatMode="strict";let substitutions={API_VERSION:API_VERSION,TERMS:encodeURIComponent(aSearchTerms), MAX_RESULTS:2*aMaxResults,COMPATIBILITY_MODE:compatMode,};let url=this._formatURLPref(PREF_GETADDONS_GETSEARCHRESULTS,substitutions);let self=this;function handleResults(aElements,aTotalResults){self._getLocalAddonIds(function searchAddons_getLocalAddonIds(aLocalAddonIds){self._parseAddons(aElements,aTotalResults,aLocalAddonIds);});}
this._beginSearch(url,aMaxResults,aCallback,handleResults);}, _reportSuccess:function AddonRepo_reportSuccess(aResults,aTotalResults){this._searching=false;this._request=null; let addons=[result.addon for each(result in aResults)];let callback=this._callback;this._callback=null;callback.searchSucceeded(addons,addons.length,aTotalResults);}, _reportFailure:function AddonRepo_reportFailure(){this._searching=false;this._request=null; let callback=this._callback;this._callback=null;callback.searchFailed();},_getUniqueDescendant:function AddonRepo_getUniqueDescendant(aElement,aTagName){let elementsList=aElement.getElementsByTagName(aTagName);return(elementsList.length==1)?elementsList[0]:null;},_getUniqueDirectDescendant:function AddonRepo_getUniqueDirectDescendant(aElement,aTagName){let elementsList=Array.filter(aElement.children,function arrayFiltering(aChild)aChild.tagName==aTagName);return(elementsList.length==1)?elementsList[0]:null;},_getTextContent:function AddonRepo_getTextContent(aElement){let textContent=aElement.textContent.trim();return(textContent.length>0)?textContent:null;},
_getDescendantTextContent:function AddonRepo_getDescendantTextContent(aElement,aTagName){let descendant=this._getUniqueDescendant(aElement,aTagName);return(descendant!=null)?this._getTextContent(descendant):null;},
_getDirectDescendantTextContent:function AddonRepo_getDirectDescendantTextContent(aElement,aTagName){let descendant=this._getUniqueDirectDescendant(aElement,aTagName);return(descendant!=null)?this._getTextContent(descendant):null;},_parseAddon:function AddonRepo_parseAddon(aElement,aSkip,aCompatData){let skipIDs=(aSkip&&aSkip.ids)?aSkip.ids:[];let skipSourceURIs=(aSkip&&aSkip.sourceURIs)?aSkip.sourceURIs:[];let guid=this._getDescendantTextContent(aElement,"guid");if(guid==null||skipIDs.indexOf(guid)!=-1)
return null;let addon=new AddonSearchResult(guid);let result={addon:addon,xpiURL:null,xpiHash:null};if(aCompatData&&guid in aCompatData)
addon.compatibilityOverrides=aCompatData[guid].compatRanges;let self=this;for(let node=aElement.firstChild;node;node=node.nextSibling){if(!(node instanceof Ci.nsIDOMElement))
continue;let localName=node.localName;
 if(localName in STRING_KEY_MAP){addon[STRING_KEY_MAP[localName]]=this._getTextContent(node)||addon[STRING_KEY_MAP[localName]];continue;} 
if(localName in HTML_KEY_MAP){addon[HTML_KEY_MAP[localName]]=convertHTMLToPlainText(this._getTextContent(node));continue;} 
if(localName in INTEGER_KEY_MAP){let value=parseInt(this._getTextContent(node));if(value>=0)
addon[INTEGER_KEY_MAP[localName]]=value;continue;} 
switch(localName){case"type": let id=parseInt(node.getAttribute("id"));switch(id){case 1:addon.type="extension";break;case 2:addon.type="theme";break;case 3:addon.type="dictionary";break;default:logger.warn("Unknown type id when parsing addon: "+id);}
break;case"authors":let authorNodes=node.getElementsByTagName("author");for(let authorNode of authorNodes){let name=self._getDescendantTextContent(authorNode,"name");let link=self._getDescendantTextContent(authorNode,"link");if(name==null||link==null)
continue;let author=new AddonManagerPrivate.AddonAuthor(name,link);if(addon.creator==null)
addon.creator=author;else{if(addon.developers==null)
addon.developers=[];addon.developers.push(author);}}
break;case"previews":let previewNodes=node.getElementsByTagName("preview");for(let previewNode of previewNodes){let full=self._getUniqueDescendant(previewNode,"full");if(full==null)
continue;let fullURL=self._getTextContent(full);let fullWidth=full.getAttribute("width");let fullHeight=full.getAttribute("height");let thumbnailURL,thumbnailWidth,thumbnailHeight;let thumbnail=self._getUniqueDescendant(previewNode,"thumbnail");if(thumbnail){thumbnailURL=self._getTextContent(thumbnail);thumbnailWidth=thumbnail.getAttribute("width");thumbnailHeight=thumbnail.getAttribute("height");}
let caption=self._getDescendantTextContent(previewNode,"caption");let screenshot=new AddonManagerPrivate.AddonScreenshot(fullURL,fullWidth,fullHeight,thumbnailURL,thumbnailWidth,thumbnailHeight,caption);if(addon.screenshots==null)
addon.screenshots=[];if(previewNode.getAttribute("primary")==1)
addon.screenshots.unshift(screenshot);else
addon.screenshots.push(screenshot);}
break;case"learnmore":addon.learnmoreURL=this._getTextContent(node);addon.homepageURL=addon.homepageURL||addon.learnmoreURL;break;case"contribution_data":let meetDevelopers=this._getDescendantTextContent(node,"meet_developers");let suggestedAmount=this._getDescendantTextContent(node,"suggested_amount");if(meetDevelopers!=null){addon.contributionURL=meetDevelopers;addon.contributionAmount=suggestedAmount;}
break
case"payment_data":let link=this._getDescendantTextContent(node,"link");let amountTag=this._getUniqueDescendant(node,"amount");let amount=parseFloat(amountTag.getAttribute("amount"));let displayAmount=this._getTextContent(amountTag);if(link!=null&&amount!=null&&displayAmount!=null){addon.purchaseURL=link;addon.purchaseAmount=amount;addon.purchaseDisplayAmount=displayAmount;}
break
case"rating":let averageRating=parseInt(this._getTextContent(node));if(averageRating>=0)
addon.averageRating=Math.min(5,averageRating);break;case"reviews":let url=this._getTextContent(node);let num=parseInt(node.getAttribute("num"));if(url!=null&&num>=0){addon.reviewURL=url;addon.reviewCount=num;}
break;case"status":let repositoryStatus=parseInt(node.getAttribute("id"));if(!isNaN(repositoryStatus))
addon.repositoryStatus=repositoryStatus;break;case"all_compatible_os":let nodes=node.getElementsByTagName("os");addon.isPlatformCompatible=Array.some(nodes,function parseAddon_platformCompatFilter(aNode){let text=aNode.textContent.toLowerCase().trim();return text=="all"||text==Services.appinfo.OS.toLowerCase();});break;case"install": if(node.hasAttribute("os")){let os=node.getAttribute("os").trim().toLowerCase(); if(os!="all"&&os!=Services.appinfo.OS.toLowerCase())
break;}
let xpiURL=this._getTextContent(node);if(xpiURL==null)
break;if(skipSourceURIs.indexOf(xpiURL)!=-1)
return null;result.xpiURL=xpiURL;addon.sourceURI=NetUtil.newURI(xpiURL);let size=parseInt(node.getAttribute("size"));addon.size=(size>=0)?size:null;let xpiHash=node.getAttribute("hash");if(xpiHash!=null)
xpiHash=xpiHash.trim();result.xpiHash=xpiHash?xpiHash:null;break;case"last_updated":let epoch=parseInt(node.getAttribute("epoch"));if(!isNaN(epoch))
addon.updateDate=new Date(1000*epoch);break;case"icon":addon.icons[node.getAttribute("size")]=this._getTextContent(node);break;}}
return result;},_parseAddons:function AddonRepo_parseAddons(aElements,aTotalResults,aSkip){let self=this;let results=[];function isSameApplication(aAppNode){return self._getTextContent(aAppNode)==Services.appinfo.ID;}
for(let i=0;i<aElements.length&&results.length<this._maxResults;i++){let element=aElements[i];let tags=this._getUniqueDescendant(element,"compatible_applications");if(tags==null)
continue;let applications=tags.getElementsByTagName("appID");let compatible=Array.some(applications,function parseAddons_applicationsCompatFilter(aAppNode){if(!isSameApplication(aAppNode))
return false;let parent=aAppNode.parentNode;let minVersion=self._getDescendantTextContent(parent,"min_version");let maxVersion=self._getDescendantTextContent(parent,"max_version");if(minVersion==null||maxVersion==null)
return false;let currentVersion=Services.appinfo.version;return(Services.vc.compare(minVersion,currentVersion)<=0&&((!AddonManager.strictCompatibility)||Services.vc.compare(currentVersion,maxVersion)<=0));}); if(!compatible){if(AddonManager.checkCompatibility)
continue;if(!Array.some(applications,isSameApplication))
continue;}

let result=this._parseAddon(element,aSkip);if(result==null)
continue; let requiredAttributes=["id","name","version","type","creator"];if(requiredAttributes.some(function parseAddons_attributeFilter(aAttribute)!result.addon[aAttribute]))
continue; if(!result.addon.isPlatformCompatible)
continue;
 if(!result.xpiURL&&!result.addon.purchaseURL)
continue;result.addon.isCompatible=compatible;results.push(result); aSkip.ids.push(result.addon.id);} 
let pendingResults=results.length;if(pendingResults==0){this._reportSuccess(results,aTotalResults);return;} 
let self=this;results.forEach(function(aResult){let addon=aResult.addon;let callback=function addonInstallCallback(aInstall){addon.install=aInstall;pendingResults--;if(pendingResults==0)
self._reportSuccess(results,aTotalResults);}
if(aResult.xpiURL){AddonManager.getInstallForURL(aResult.xpiURL,callback,"application/x-xpinstall",aResult.xpiHash,addon.name,addon.icons,addon.version);}
else{callback(null);}});},_parseAddonCompatElement:function AddonRepo_parseAddonCompatElement(aResultObj,aElement){let guid=this._getDescendantTextContent(aElement,"guid");if(!guid){logger.debug("Compatibility override is missing guid.");return;}
let compat={id:guid};compat.hosted=aElement.getAttribute("hosted")!="false";function findMatchingAppRange(aNodes){let toolkitAppRange=null;for(let node of aNodes){let appID=this._getDescendantTextContent(node,"appID");if(appID!=Services.appinfo.ID&&appID!=TOOLKIT_ID)
continue;let minVersion=this._getDescendantTextContent(node,"min_version");let maxVersion=this._getDescendantTextContent(node,"max_version");if(minVersion==null||maxVersion==null)
continue;let appRange={appID:appID,appMinVersion:minVersion,appMaxVersion:maxVersion};if(appID==TOOLKIT_ID)
toolkitAppRange=appRange;else
return appRange;}
return toolkitAppRange;}
function parseRangeNode(aNode){let type=aNode.getAttribute("type");if(type!="incompatible"){logger.debug("Compatibility override of unsupported type found.");return null;}
let override=new AddonManagerPrivate.AddonCompatibilityOverride(type);override.minVersion=this._getDirectDescendantTextContent(aNode,"min_version");override.maxVersion=this._getDirectDescendantTextContent(aNode,"max_version");if(!override.minVersion){logger.debug("Compatibility override is missing min_version.");return null;}
if(!override.maxVersion){logger.debug("Compatibility override is missing max_version.");return null;}
let appRanges=aNode.querySelectorAll("compatible_applications > application");let appRange=findMatchingAppRange.bind(this)(appRanges);if(!appRange){logger.debug("Compatibility override is missing a valid application range.");return null;}
override.appID=appRange.appID;override.appMinVersion=appRange.appMinVersion;override.appMaxVersion=appRange.appMaxVersion;return override;}
let rangeNodes=aElement.querySelectorAll("version_ranges > version_range");compat.compatRanges=Array.map(rangeNodes,parseRangeNode.bind(this)).filter(function compatRangesFilter(aItem)!!aItem);if(compat.compatRanges.length==0)
return;aResultObj[compat.id]=compat;},_parseAddonCompatData:function AddonRepo_parseAddonCompatData(aElements){let compatData={};Array.forEach(aElements,this._parseAddonCompatElement.bind(this,compatData));return compatData;}, _beginSearch:function(aURI,aMaxResults,aCallback,aHandleResults,aTimeout){if(this._searching||aURI==null||aMaxResults<=0){logger.warn("AddonRepository search failed: searching "+this._searching+" aURI "+aURI+" aMaxResults "+aMaxResults);aCallback.searchFailed();return;}
this._searching=true;this._callback=aCallback;this._maxResults=aMaxResults;logger.debug("Requesting "+aURI);this._request=new XHRequest();this._request.mozBackgroundRequest=true;this._request.open("GET",aURI,true);this._request.overrideMimeType("text/xml");if(aTimeout){this._request.timeout=aTimeout;}
this._request.addEventListener("error",aEvent=>this._reportFailure(),false);this._request.addEventListener("timeout",aEvent=>this._reportFailure(),false);this._request.addEventListener("load",aEvent=>{logger.debug("Got metadata search load event");let request=aEvent.target;let responseXML=request.responseXML;if(!responseXML||responseXML.documentElement.namespaceURI==XMLURI_PARSE_ERROR||(request.status!=200&&request.status!=0)){this._reportFailure();return;}
let documentElement=responseXML.documentElement;let elements=documentElement.getElementsByTagName("addon");let totalResults=elements.length;let parsedTotalResults=parseInt(documentElement.getAttribute("total_results")); if(parsedTotalResults>=totalResults)
totalResults=parsedTotalResults;let compatElements=documentElement.getElementsByTagName("addon_compatibility");let compatData=this._parseAddonCompatData(compatElements);aHandleResults(elements,totalResults,compatData);},false);this._request.send(null);}, _getLocalAddonIds:function AddonRepo_getLocalAddonIds(aCallback){let self=this;let localAddonIds={ids:null,sourceURIs:null};AddonManager.getAllAddons(function getLocalAddonIds_getAllAddons(aAddons){localAddonIds.ids=[a.id for each(a in aAddons)];if(localAddonIds.sourceURIs)
aCallback(localAddonIds);});AddonManager.getAllInstalls(function getLocalAddonIds_getAllInstalls(aInstalls){localAddonIds.sourceURIs=[];aInstalls.forEach(function(aInstall){if(aInstall.state!=AddonManager.STATE_AVAILABLE)
localAddonIds.sourceURIs.push(aInstall.sourceURI.spec);});if(localAddonIds.ids)
aCallback(localAddonIds);});}, _formatURLPref:function AddonRepo_formatURLPref(aPreference,aSubstitutions){let url=null;try{url=Services.prefs.getCharPref(aPreference);}catch(e){logger.warn("_formatURLPref: Couldn't get pref: "+aPreference);return null;}
url=url.replace(/%([A-Z_]+)%/g,function urlSubstitution(aMatch,aKey){return(aKey in aSubstitutions)?aSubstitutions[aKey]:aMatch;});return Services.urlFormatter.formatURL(url);},
findMatchingCompatOverride:function AddonRepo_findMatchingCompatOverride(aAddonVersion,aCompatOverrides,aAppVersion,aPlatformVersion){for(let override of aCompatOverrides){let appVersion=null;if(override.appID==TOOLKIT_ID)
appVersion=aPlatformVersion||Services.appinfo.platformVersion;else
appVersion=aAppVersion||Services.appinfo.version;if(Services.vc.compare(override.minVersion,aAddonVersion)<=0&&Services.vc.compare(aAddonVersion,override.maxVersion)<=0&&Services.vc.compare(override.appMinVersion,appVersion)<=0&&Services.vc.compare(appVersion,override.appMaxVersion)<=0){return override;}}
return null;},flush:function(){return AddonDatabase.flush();}};var AddonDatabase={ databaseOk:true,connectionPromise:null, DB:BLANK_DB(),get jsonFile(){return OS.Path.join(OS.Constants.Path.profileDir,FILE_DATABASE);},openConnection:function(){if(!this.connectionPromise){this.connectionPromise=Task.spawn(function*(){this.DB=BLANK_DB();let inputDB,schema;try{let data=yield OS.File.read(this.jsonFile,{encoding:"utf-8"})
inputDB=JSON.parse(data);if(!inputDB.hasOwnProperty("addons")||!Array.isArray(inputDB.addons)){throw new Error("No addons array.");}
if(!inputDB.hasOwnProperty("schema")){throw new Error("No schema specified.");}
schema=parseInt(inputDB.schema,10);if(!Number.isInteger(schema)||schema<DB_MIN_JSON_SCHEMA){throw new Error("Invalid schema value.");}}catch(e if e instanceof OS.File.Error&&e.becauseNoSuchFile){logger.debug("No "+FILE_DATABASE+" found."); this._saveDBToDisk();let dbSchema=0;try{dbSchema=Services.prefs.getIntPref(PREF_GETADDONS_DB_SCHEMA);}catch(e){}
if(dbSchema<DB_MIN_JSON_SCHEMA){let results=yield new Promise((resolve,reject)=>{AddonRepository_SQLiteMigrator.migrate(resolve);});if(results.length){yield this._insertAddons(results);}
Services.prefs.setIntPref(PREF_GETADDONS_DB_SCHEMA,DB_SCHEMA);}
return this.DB;}catch(e){logger.error("Malformed "+FILE_DATABASE+": "+e);this.databaseOk=false;return this.DB;}
Services.prefs.setIntPref(PREF_GETADDONS_DB_SCHEMA,DB_SCHEMA);

for(let addon of inputDB.addons){this._insertAddon(addon);}
return this.DB;}.bind(this));}
return this.connectionPromise;},get connection(){return this.openConnection();},shutdown:function AD_shutdown(aSkipFlush){this.databaseOk=true;if(!this.connectionPromise){return Promise.resolve();}
this.connectionPromise=null;if(aSkipFlush){return Promise.resolve();}else{return this.Writer.flush();}},delete:function AD_delete(aCallback){this.DB=BLANK_DB();this._deleting=this.Writer.flush().then(null,()=>{})
.then(()=>this.shutdown(true)).then(()=>OS.File.remove(this.jsonFile,{})).then(null,error=>logger.error("Unable to delete Addon Repository file "+
this.jsonFile,error)).then(()=>this._deleting=null).then(aCallback);return this._deleting;},toJSON:function AD_toJSON(){let json={schema:this.DB.schema,addons:[]}
for(let[,value]of this.DB.addons)
json.addons.push(value);return json;},get Writer(){delete this.Writer;this.Writer=new DeferredSave(this.jsonFile,()=>{return JSON.stringify(this);},DB_BATCH_TIMEOUT_MS);return this.Writer;},flush:function(){if(this._deleting){return this._deleting;}
return this.Writer.flush();},retrieveStoredData:function(){return this.openConnection().then(db=>db.addons);},repopulate:function AD_repopulate(aAddons,aCallback){this.DB.addons.clear();this.insertAddons(aAddons,function repopulate_insertAddons(){let now=Math.round(Date.now()/1000);logger.debug("Cache repopulated, setting "+PREF_METADATA_LASTUPDATE+" to "+now);Services.prefs.setIntPref(PREF_METADATA_LASTUPDATE,now);if(aCallback)
aCallback();});},insertAddons:Task.async(function*(aAddons,aCallback){yield this.openConnection();yield this._insertAddons(aAddons,aCallback);}),_insertAddons:Task.async(function*(aAddons,aCallback){for(let addon of aAddons){this._insertAddon(addon);}
yield this._saveDBToDisk();aCallback&&aCallback();}),_insertAddon:function AD__insertAddon(aAddon){let newAddon=this._parseAddon(aAddon);if(!newAddon||!newAddon.id||this.DB.addons.has(newAddon.id))
return;this.DB.addons.set(newAddon.id,newAddon);},_parseAddon:function(aObj){if(aObj instanceof AddonSearchResult)
return aObj;let id=aObj.id;if(!aObj.id)
return null;let addon=new AddonSearchResult(id);for(let[expectedProperty,]of Iterator(AddonSearchResult.prototype)){if(!(expectedProperty in aObj)||typeof(aObj[expectedProperty])==="function")
continue;let value=aObj[expectedProperty];try{switch(expectedProperty){case"sourceURI":addon.sourceURI=value?NetUtil.newURI(value):null;break;case"creator":addon.creator=value?this._makeDeveloper(value):null;break;case"updateDate":addon.updateDate=value?new Date(value):null;break;case"developers":if(!addon.developers)addon.developers=[];for(let developer of value){addon.developers.push(this._makeDeveloper(developer));}
break;case"screenshots":if(!addon.screenshots)addon.screenshots=[];for(let screenshot of value){addon.screenshots.push(this._makeScreenshot(screenshot));}
break;case"compatibilityOverrides":if(!addon.compatibilityOverrides)addon.compatibilityOverrides=[];for(let override of value){addon.compatibilityOverrides.push(this._makeCompatOverride(override));}
break;case"icons":if(!addon.icons)addon.icons={};for(let[size,url]of Iterator(aObj.icons)){addon.icons[size]=url;}
break;case"iconURL":break;default:addon[expectedProperty]=value;}}catch(ex){logger.warn("Error in parsing property value for "+expectedProperty+" | "+ex);}



delete aObj[expectedProperty];}


for(let remainingProperty of Object.keys(aObj)){switch(typeof(aObj[remainingProperty])){case"boolean":case"number":case"string":case"object": break;default:continue;}
if(!remainingProperty.startsWith("_"))
addon._unsupportedProperties[remainingProperty]=aObj[remainingProperty];}
return addon;},_saveDBToDisk:function(){return this.Writer.saveChanges().then(null,e=>logger.error("SaveDBToDisk failed",e));},_makeDeveloper:function(aObj){let name=aObj.name;let url=aObj.url;return new AddonManagerPrivate.AddonAuthor(name,url);},_makeScreenshot:function(aObj){let url=aObj.url;let width=aObj.width;let height=aObj.height;let thumbnailURL=aObj.thumbnailURL;let thumbnailWidth=aObj.thumbnailWidth;let thumbnailHeight=aObj.thumbnailHeight;let caption=aObj.caption;return new AddonManagerPrivate.AddonScreenshot(url,width,height,thumbnailURL,thumbnailWidth,thumbnailHeight,caption);},_makeCompatOverride:function(aObj){let type=aObj.type;let minVersion=aObj.minVersion;let maxVersion=aObj.maxVersion;let appID=aObj.appID;let appMinVersion=aObj.appMinVersion;let appMaxVersion=aObj.appMaxVersion;return new AddonManagerPrivate.AddonCompatibilityOverride(type,minVersion,maxVersion,appID,appMinVersion,appMaxVersion);},};