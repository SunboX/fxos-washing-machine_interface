Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");const Cc=Components.classes;const Ci=Components.interfaces;const Cr=Components.results;const DOWNLOAD_MANAGER_URL="chrome://mozapps/content/downloads/downloads.xul";const PREF_FLASH_COUNT="browser.download.manager.flashCount";function nsDownloadManagerUI(){}
nsDownloadManagerUI.prototype={classID:Components.ID("7dfdf0d1-aff6-4a34-bad1-d0fe74601642"), show:function show(aWindowContext,aDownload,aReason,aUsePrivateUI)
{if(!aReason)
aReason=Ci.nsIDownloadManagerUI.REASON_USER_INTERACTED; let window=this.recentWindow;if(window){window.focus();if(aReason==Ci.nsIDownloadManagerUI.REASON_USER_INTERACTED)
window.gUserInteracted=true;return;}
let parent=null;
try{if(aWindowContext)
parent=aWindowContext.getInterface(Ci.nsIDOMWindow);}catch(e){}
var params=Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);params.appendElement(aDownload,false); let reason=Cc["@mozilla.org/supports-PRInt16;1"].createInstance(Ci.nsISupportsPRInt16);reason.data=aReason;params.appendElement(reason,false);var ww=Cc["@mozilla.org/embedcomp/window-watcher;1"].getService(Ci.nsIWindowWatcher);ww.openWindow(parent,DOWNLOAD_MANAGER_URL,"Download:Manager","chrome,dialog=no,resizable",params);},get visible(){return(null!=this.recentWindow);},getAttention:function getAttention()
{if(!this.visible)
throw Cr.NS_ERROR_UNEXPECTED;var prefs=Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);let flashCount=2;try{flashCount=prefs.getIntPref(PREF_FLASH_COUNT);}catch(e){}
var win=this.recentWindow.QueryInterface(Ci.nsIDOMChromeWindow);win.getAttentionWithCycleCount(flashCount);}, get recentWindow(){var wm=Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);return wm.getMostRecentWindow("Download:Manager");}, QueryInterface:XPCOMUtils.generateQI([Ci.nsIDownloadManagerUI])};let components=[nsDownloadManagerUI];this.NSGetFactory=XPCOMUtils.generateNSGetFactory(components);