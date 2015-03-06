this.EXPORTED_SYMBOLS=["DownloadTaskbarProgress",];const Cc=Components.classes;const Ci=Components.interfaces;const Cu=Components.utils;const Cr=Components.results;Cu.import("resource://gre/modules/XPCOMUtils.jsm");XPCOMUtils.defineLazyModuleGetter(this,"Services","resource://gre/modules/Services.jsm");const kTaskbarIDWin="@mozilla.org/windows-taskbar;1";const kTaskbarIDMac="@mozilla.org/widget/macdocksupport;1";this.DownloadTaskbarProgress={init:function DTP_init()
{if(DownloadTaskbarProgressUpdater){DownloadTaskbarProgressUpdater._init();}},onBrowserWindowLoad:function DTP_onBrowserWindowLoad(aWindow)
{this.init();if(!DownloadTaskbarProgressUpdater){return;}
if(!DownloadTaskbarProgressUpdater._activeTaskbarProgress){DownloadTaskbarProgressUpdater._setActiveWindow(aWindow,false);}},onDownloadWindowLoad:function DTP_onDownloadWindowLoad(aWindow)
{if(!DownloadTaskbarProgressUpdater){return;}
DownloadTaskbarProgressUpdater._setActiveWindow(aWindow,true);},get activeTaskbarProgress(){if(!DownloadTaskbarProgressUpdater){return null;}
return DownloadTaskbarProgressUpdater._activeTaskbarProgress;},get activeWindowIsDownloadWindow(){if(!DownloadTaskbarProgressUpdater){return null;}
return DownloadTaskbarProgressUpdater._activeWindowIsDownloadWindow;},get taskbarState(){if(!DownloadTaskbarProgressUpdater){return null;}
return DownloadTaskbarProgressUpdater._taskbarState;},};var DownloadTaskbarProgressUpdater={_initialized:false,_taskbar:null,_dm:null,_init:function DTPU_init()
{if(this._initialized){return;}
this._initialized=true;if(kTaskbarIDWin in Cc){this._taskbar=Cc[kTaskbarIDWin].getService(Ci.nsIWinTaskbar);if(!this._taskbar.available){ DownloadTaskbarProgressUpdater=null;return;}}else if(kTaskbarIDMac in Cc){this._activeTaskbarProgress=Cc[kTaskbarIDMac].getService(Ci.nsITaskbarProgress);}else{DownloadTaskbarProgressUpdater=null;return;}
this._taskbarState=Ci.nsITaskbarProgress.STATE_NO_PROGRESS;this._dm=Cc["@mozilla.org/download-manager;1"].getService(Ci.nsIDownloadManager);this._dm.addPrivacyAwareListener(this);this._os=Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);this._os.addObserver(this,"quit-application-granted",false);this._updateStatus();
},_uninit:function DTPU_uninit(){this._dm.removeListener(this);this._os.removeObserver(this,"quit-application-granted");this._activeTaskbarProgress=null;this._initialized=false;},_activeTaskbarProgress:null, _activeWindowIsDownloadWindow:false,_setActiveWindow:function DTPU_setActiveWindow(aWindow,aIsDownloadWindow)
{}, _taskbarState:null,_totalSize:0,_totalTransferred:0,_shouldSetState:function DTPU_shouldSetState()
{return true;},_updateTaskbar:function DTPU_updateTaskbar()
{if(!this._activeTaskbarProgress){return;}
if(this._shouldSetState()){this._activeTaskbarProgress.setProgressState(this._taskbarState,this._totalTransferred,this._totalSize);} 
else{this._clearTaskbar();}},_clearTaskbar:function DTPU_clearTaskbar()
{if(this._activeTaskbarProgress){this._activeTaskbarProgress.setProgressState(Ci.nsITaskbarProgress.STATE_NO_PROGRESS);}},_updateStatus:function DTPU_updateStatus()
{let numActive=this._dm.activeDownloadCount+this._dm.activePrivateDownloadCount;let totalSize=0,totalTransferred=0;if(numActive==0){this._taskbarState=Ci.nsITaskbarProgress.STATE_NO_PROGRESS;}
else{let numPaused=0,numScanning=0;[this._dm.activeDownloads,this._dm.activePrivateDownloads].forEach(function(downloads){while(downloads.hasMoreElements()){let download=downloads.getNext().QueryInterface(Ci.nsIDownload); if(download.percentComplete!=-1){totalSize+=download.size;totalTransferred+=download.amountTransferred;} 
if(download.state==this._dm.DOWNLOAD_PAUSED){numPaused++;}else if(download.state==this._dm.DOWNLOAD_SCANNING){numScanning++;}}}.bind(this));

 if(numActive==numPaused){if(totalSize==0){this._taskbarState=Ci.nsITaskbarProgress.STATE_NO_PROGRESS;totalTransferred=0;}
else{this._taskbarState=Ci.nsITaskbarProgress.STATE_PAUSED;}}
 
else if(totalSize==0||numActive==numScanning){this._taskbarState=Ci.nsITaskbarProgress.STATE_INDETERMINATE;totalSize=0;totalTransferred=0;} 
else{this._taskbarState=Ci.nsITaskbarProgress.STATE_NORMAL;}}
this._totalSize=totalSize;this._totalTransferred=totalTransferred;},_onActiveWindowUnload:function DTPU_onActiveWindowUnload(aTaskbarProgress)
{if(this._activeTaskbarProgress==aTaskbarProgress){let windowMediator=Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);let windows=windowMediator.getEnumerator(null);let newActiveWindow=null;if(windows.hasMoreElements()){newActiveWindow=windows.getNext().QueryInterface(Ci.nsIDOMWindow);}
 
this._setActiveWindow(newActiveWindow,false);}},onProgressChange:function DTPU_onProgressChange()
{this._updateStatus();this._updateTaskbar();},onDownloadStateChange:function DTPU_onDownloadStateChange()
{this._updateStatus();this._updateTaskbar();},onSecurityChange:function(){},onStateChange:function(){},observe:function DTPU_observe(aSubject,aTopic,aData){if(aTopic=="quit-application-granted"){this._uninit();}}};