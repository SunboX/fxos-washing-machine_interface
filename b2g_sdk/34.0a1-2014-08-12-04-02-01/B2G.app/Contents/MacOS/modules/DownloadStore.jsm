"use strict";this.EXPORTED_SYMBOLS=["DownloadStore",];const Cc=Components.classes;const Ci=Components.interfaces;const Cu=Components.utils;const Cr=Components.results;Cu.import("resource://gre/modules/XPCOMUtils.jsm");XPCOMUtils.defineLazyModuleGetter(this,"Downloads","resource://gre/modules/Downloads.jsm");XPCOMUtils.defineLazyModuleGetter(this,"OS","resource://gre/modules/osfile.jsm")
XPCOMUtils.defineLazyModuleGetter(this,"Task","resource://gre/modules/Task.jsm");XPCOMUtils.defineLazyGetter(this,"gTextDecoder",function(){return new TextDecoder();});XPCOMUtils.defineLazyGetter(this,"gTextEncoder",function(){return new TextEncoder();});this.DownloadStore=function(aList,aPath)
{this.list=aList;this.path=aPath;}
this.DownloadStore.prototype={list:null,path:"",onsaveitem:()=>true,load:function DS_load()
{return Task.spawn(function task_DS_load(){let bytes;try{bytes=yield OS.File.read(this.path);}catch(ex if ex instanceof OS.File.Error&&ex.becauseNoSuchFile){return;}
let storeData=JSON.parse(gTextDecoder.decode(bytes));for(let downloadData of storeData.list){try{let download=yield Downloads.createDownload(downloadData);try{if(!download.succeeded&&!download.canceled&&!download.error){
download.start();}else{

yield download.refresh();}}finally{yield this.list.add(download);}}catch(ex){Cu.reportError(ex);}}}.bind(this));},save:function DS_save()
{return Task.spawn(function task_DS_save(){let downloads=yield this.list.getAll();let storeData={list:[]};let atLeastOneDownload=false;for(let download of downloads){try{if(!this.onsaveitem(download)){continue;}
storeData.list.push(download.toSerializable());atLeastOneDownload=true;}catch(ex){
Cu.reportError(ex);}}
if(atLeastOneDownload){let bytes=gTextEncoder.encode(JSON.stringify(storeData));yield OS.File.writeAtomic(this.path,bytes,{tmpPath:this.path+".tmp"});}else{try{yield OS.File.remove(this.path);}catch(ex if ex instanceof OS.File.Error&&(ex.becauseNoSuchFile||ex.becauseAccessDenied)){
}}}.bind(this));},};