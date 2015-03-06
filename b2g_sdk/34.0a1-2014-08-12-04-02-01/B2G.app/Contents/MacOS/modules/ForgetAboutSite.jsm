Components.utils.import("resource://gre/modules/Services.jsm");Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");Components.utils.import("resource://gre/modules/NetUtil.jsm");Components.utils.import("resource://gre/modules/Task.jsm");XPCOMUtils.defineLazyModuleGetter(this,"PlacesUtils","resource://gre/modules/PlacesUtils.jsm");XPCOMUtils.defineLazyModuleGetter(this,"Downloads","resource://gre/modules/Downloads.jsm");this.EXPORTED_SYMBOLS=["ForgetAboutSite"];function hasRootDomain(str,aDomain)
{let index=str.indexOf(aDomain);if(index==-1)
return false;if(str==aDomain)
return true;

let prevChar=str[index-1];return(index==(str.length-aDomain.length))&&(prevChar=="."||prevChar=="/");}
const Cc=Components.classes;const Ci=Components.interfaces;const Cu=Components.utils;this.ForgetAboutSite={removeDataFromDomain:function CRH_removeDataFromDomain(aDomain)
{PlacesUtils.history.removePagesFromHost(aDomain,true); let(cs=Cc["@mozilla.org/netwerk/cache-storage-service;1"].getService(Ci.nsICacheStorageService)){
try{cs.clear();}catch(ex){Cu.reportError("Exception thrown while clearing the cache: "+
ex.toString());}} 
let(imageCache=Cc["@mozilla.org/image/tools;1"].getService(Ci.imgITools).getImgCacheForDocument(null)){try{imageCache.clearCache(false);}catch(ex){Cu.reportError("Exception thrown while clearing the image cache: "+
ex.toString());}} 
let(cm=Cc["@mozilla.org/cookiemanager;1"].getService(Ci.nsICookieManager2)){let enumerator=cm.getCookiesFromHost(aDomain);while(enumerator.hasMoreElements()){let cookie=enumerator.getNext().QueryInterface(Ci.nsICookie);cm.remove(cookie.host,cookie.name,cookie.path,false);}} 
const phInterface=Ci.nsIPluginHost;const FLAG_CLEAR_ALL=phInterface.FLAG_CLEAR_ALL;let(ph=Cc["@mozilla.org/plugin/host;1"].getService(phInterface)){let tags=ph.getPluginTags();for(let i=0;i<tags.length;i++){try{ph.clearSiteData(tags[i],aDomain,FLAG_CLEAR_ALL,-1);}catch(e){}}} 
let useJSTransfer=false;try{Services.downloads.activeDownloadCount;}catch(ex){useJSTransfer=true;}
if(useJSTransfer){Task.spawn(function(){let list=yield Downloads.getList(Downloads.ALL);list.removeFinished(download=>hasRootDomain(NetUtil.newURI(download.source.url).host,aDomain));}).then(null,Cu.reportError);}
else{let(dm=Cc["@mozilla.org/download-manager;1"].getService(Ci.nsIDownloadManager)){ for(let enumerator of[dm.activeDownloads,dm.activePrivateDownloads]){while(enumerator.hasMoreElements()){let dl=enumerator.getNext().QueryInterface(Ci.nsIDownload);if(hasRootDomain(dl.source.host,aDomain)){dl.cancel();dl.remove();}}}
function deleteAllLike(db){

let stmt=db.createStatement("DELETE FROM moz_downloads "+"WHERE source LIKE ?1 ESCAPE '/' "+"AND state NOT IN (?2, ?3, ?4)");let pattern=stmt.escapeStringForLIKE(aDomain,"/");stmt.bindByIndex(0,"%"+pattern+"%");stmt.bindByIndex(1,Ci.nsIDownloadManager.DOWNLOAD_DOWNLOADING);stmt.bindByIndex(2,Ci.nsIDownloadManager.DOWNLOAD_PAUSED);stmt.bindByIndex(3,Ci.nsIDownloadManager.DOWNLOAD_QUEUED);try{stmt.execute();}
finally{stmt.finalize();}} 
deleteAllLike(dm.DBConnection);deleteAllLike(dm.privateDBConnection);
 let os=Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);os.notifyObservers(null,"download-manager-remove-download",null);}} 
let(lm=Cc["@mozilla.org/login-manager;1"].getService(Ci.nsILoginManager)){ try{let logins=lm.getAllLogins();for(let i=0;i<logins.length;i++)
if(hasRootDomain(logins[i].hostname,aDomain))
lm.removeLogin(logins[i]);}

catch(ex if ex.message.indexOf("User canceled Master Password entry")!=-1){} 
let disabledHosts=lm.getAllDisabledHosts();for(let i=0;i<disabledHosts.length;i++)
if(hasRootDomain(disabledHosts[i],aDomain))
lm.setLoginSavingEnabled(disabledHosts,true);} 
let(pm=Cc["@mozilla.org/permissionmanager;1"].getService(Ci.nsIPermissionManager)){ let enumerator=pm.enumerator;while(enumerator.hasMoreElements()){let perm=enumerator.getNext().QueryInterface(Ci.nsIPermission);if(hasRootDomain(perm.host,aDomain))
pm.remove(perm.host,perm.type);}} 
let(qm=Cc["@mozilla.org/dom/quota/manager;1"].getService(Ci.nsIQuotaManager)){ let caUtils={};let scriptLoader=Cc["@mozilla.org/moz/jssubscript-loader;1"].getService(Ci.mozIJSSubScriptLoader);scriptLoader.loadSubScript("chrome://global/content/contentAreaUtils.js",caUtils);let httpURI=caUtils.makeURI("http://"+aDomain);let httpsURI=caUtils.makeURI("https://"+aDomain);qm.clearStoragesForURI(httpURI);qm.clearStoragesForURI(httpsURI);}
function onContentPrefsRemovalFinished(){Services.obs.notifyObservers(null,"browser:purge-domain-data",aDomain);} 
let cps2=Cc["@mozilla.org/content-pref/service;1"].getService(Ci.nsIContentPrefService2);cps2.removeBySubdomain(aDomain,null,{handleCompletion:function()onContentPrefsRemovalFinished(),handleError:function(){}});
 let np=Cc["@mozilla.org/network/predictor;1"].getService(Ci.nsINetworkPredictor);np.reset();}};