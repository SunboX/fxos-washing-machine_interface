"use strict";this.EXPORTED_SYMBOLS=["DownloadList","DownloadCombinedList","DownloadSummary",];const Cc=Components.classes;const Ci=Components.interfaces;const Cu=Components.utils;const Cr=Components.results;Cu.import("resource://gre/modules/XPCOMUtils.jsm");XPCOMUtils.defineLazyModuleGetter(this,"Promise","resource://gre/modules/Promise.jsm");XPCOMUtils.defineLazyModuleGetter(this,"Task","resource://gre/modules/Task.jsm");this.DownloadList=function()
{this._downloads=[];this._views=new Set();}
this.DownloadList.prototype={_downloads:null,getAll:function DL_getAll(){return Promise.resolve(Array.slice(this._downloads,0));},add:function DL_add(aDownload){this._downloads.push(aDownload);aDownload.onchange=this._change.bind(this,aDownload);this._notifyAllViews("onDownloadAdded",aDownload);return Promise.resolve();},remove:function DL_remove(aDownload){let index=this._downloads.indexOf(aDownload);if(index!=-1){this._downloads.splice(index,1);aDownload.onchange=null;this._notifyAllViews("onDownloadRemoved",aDownload);}
return Promise.resolve();},_change:function DL_change(aDownload){this._notifyAllViews("onDownloadChanged",aDownload);},_views:null,addView:function DL_addView(aView)
{this._views.add(aView);if("onDownloadAdded"in aView){for(let download of this._downloads){try{aView.onDownloadAdded(download);}catch(ex){Cu.reportError(ex);}}}
return Promise.resolve();},removeView:function DL_removeView(aView)
{this._views.delete(aView);return Promise.resolve();},_notifyAllViews:function(aMethodName,aDownload){for(let view of this._views){try{if(aMethodName in view){view[aMethodName](aDownload);}}catch(ex){Cu.reportError(ex);}}},removeFinished:function DL_removeFinished(aFilterFn){Task.spawn(function(){let list=yield this.getAll();for(let download of list){
if(download.stopped&&(!download.hasPartialData||download.error)&&(!aFilterFn||aFilterFn(download))){
yield this.remove(download);

download.finalize(true).then(null,Cu.reportError);}}}.bind(this)).then(null,Cu.reportError);},};this.DownloadCombinedList=function(aPublicList,aPrivateList)
{DownloadList.call(this);this._publicList=aPublicList;this._privateList=aPrivateList;aPublicList.addView(this).then(null,Cu.reportError);aPrivateList.addView(this).then(null,Cu.reportError);}
this.DownloadCombinedList.prototype={__proto__:DownloadList.prototype,_publicList:null,_privateList:null,add:function(aDownload)
{if(aDownload.source.isPrivate){return this._privateList.add(aDownload);}else{return this._publicList.add(aDownload);}},remove:function(aDownload)
{if(aDownload.source.isPrivate){return this._privateList.remove(aDownload);}else{return this._publicList.remove(aDownload);}}, onDownloadAdded:function(aDownload)
{this._downloads.push(aDownload);this._notifyAllViews("onDownloadAdded",aDownload);},onDownloadChanged:function(aDownload)
{this._notifyAllViews("onDownloadChanged",aDownload);},onDownloadRemoved:function(aDownload)
{let index=this._downloads.indexOf(aDownload);if(index!=-1){this._downloads.splice(index,1);}
this._notifyAllViews("onDownloadRemoved",aDownload);},};this.DownloadSummary=function()
{this._downloads=[];this._views=new Set();}
this.DownloadSummary.prototype={_downloads:null,_list:null,bindToList:function(aList)
{if(this._list){throw new Error("bindToList may be called only once.");}
return aList.addView(this).then(()=>{
this._list=aList;this._onListChanged();});},_views:null,addView:function(aView)
{this._views.add(aView);if("onSummaryChanged"in aView){try{aView.onSummaryChanged();}catch(ex){Cu.reportError(ex);}}
return Promise.resolve();},removeView:function(aView)
{this._views.delete(aView);return Promise.resolve();},allHaveStopped:true,progressTotalBytes:0,progressCurrentBytes:0,_onListChanged:function(){let allHaveStopped=true;let progressTotalBytes=0;let progressCurrentBytes=0;
for(let download of this._downloads){if(!download.stopped){allHaveStopped=false;progressTotalBytes+=download.hasProgress?download.totalBytes:download.currentBytes;progressCurrentBytes+=download.currentBytes;}}
if(this.allHaveStopped==allHaveStopped&&this.progressTotalBytes==progressTotalBytes&&this.progressCurrentBytes==progressCurrentBytes){return;}
this.allHaveStopped=allHaveStopped;this.progressTotalBytes=progressTotalBytes;this.progressCurrentBytes=progressCurrentBytes;for(let view of this._views){try{if("onSummaryChanged"in view){view.onSummaryChanged();}}catch(ex){Cu.reportError(ex);}}}, onDownloadAdded:function(aDownload)
{this._downloads.push(aDownload);if(this._list){this._onListChanged();}},onDownloadChanged:function(aDownload)
{this._onListChanged();},onDownloadRemoved:function(aDownload)
{let index=this._downloads.indexOf(aDownload);if(index!=-1){this._downloads.splice(index,1);}
this._onListChanged();},};