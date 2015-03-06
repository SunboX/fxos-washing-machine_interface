'use strict';const{Cc,Ci,Cr}=require('chrome'),{Trait}=require('../deprecated/traits'),{List}=require('../deprecated/list'),{EventEmitter}=require('../deprecated/events'),{WindowTabs,WindowTabTracker}=require('./tabs-firefox'),{WindowDom}=require('./dom'),{WindowLoader}=require('./loader'),{isBrowser,getWindowDocShell,windows:windowIterator,isWindowPrivate}=require('../window/utils'),{Options}=require('../tabs/common'),apiUtils=require('../deprecated/api-utils'),unload=require('../system/unload'),windowUtils=require('../deprecated/window-utils'),{WindowTrackerTrait}=windowUtils,{ns}=require('../core/namespace'),{observer:windowObserver}=require('./observer');const{windowNS}=require('../window/namespace');const{isPrivateBrowsingSupported}=require('../self');const{ignoreWindow,isPrivate}=require('sdk/private-browsing/utils');const{viewFor}=require('../view/core');const BrowserWindowTrait=Trait.compose(EventEmitter,WindowDom.resolve({close:'_close'}),WindowTabs,WindowTabTracker,WindowLoader,Trait.compose({_emit:Trait.required,_close:Trait.required,_load:Trait.required,constructor:function BrowserWindow(options){
windows.push(this); this.on('error',console.exception.bind(console));if('onOpen'in options)
this.on('open',options.onOpen);if('onClose'in options)
this.on('close',options.onClose);if('onActivate'in options)
this.on('activate',options.onActivate);if('onDeactivate'in options)
this.on('deactivate',options.onDeactivate);if('window'in options)
this._window=options.window;if('tabs'in options){this._tabOptions=Array.isArray(options.tabs)?options.tabs.map(Options):[Options(options.tabs)];}
else if('url'in options){this._tabOptions=[Options(options.url)];}
for(let tab of this._tabOptions){tab.inNewWindow=true;}
this._isPrivate=isPrivateBrowsingSupported&&!!options.isPrivate;this._load();windowNS(this._public).window=this._window;isPrivate.implement(this._public,window=>isWindowPrivate(getChromeWindow(window)));viewFor.implement(this._public,getChromeWindow);return this;},destroy:function()this._onUnload(),_tabOptions:[],_onLoad:function(){try{this._initWindowTabTracker();this._loaded=true;}
catch(e){this._emit('error',e);}
this._emitOnObject(browserWindows,'open',this._public);},_onUnload:function(){if(!this._window)
return;if(this._loaded)
this._destroyWindowTabTracker();this._emitOnObject(browserWindows,'close',this._public);this._window=null;windowNS(this._public).window=null;windows.splice(windows.indexOf(this),1);this._removeAllListeners();},close:function close(callback){if(callback)this.on('close',callback);return this._close();}}));function getRegisteredWindow(chromeWindow){for(let window of windows){if(chromeWindow===window._window)
return window;}
return null;}
function BrowserWindow(options){let window=null;if("window"in options)
window=getRegisteredWindow(options.window);return(window||BrowserWindowTrait(options))._public;}
BrowserWindow.prototype=BrowserWindowTrait.prototype;exports.BrowserWindow=BrowserWindow;const windows=[];const browser=ns();function onWindowActivation(chromeWindow,event){if(!isBrowser(chromeWindow))return;let window=getRegisteredWindow(chromeWindow);if(window)
window._emit(event.type,window._public);else
window=BrowserWindowTrait({window:chromeWindow});browser(browserWindows).internals._emit(event.type,window._public);}
windowObserver.on("activate",onWindowActivation);windowObserver.on("deactivate",onWindowActivation);const browserWindows=Trait.resolve({toString:null}).compose(List.resolve({constructor:'_initList'}),EventEmitter.resolve({toString:null}),WindowTrackerTrait.resolve({constructor:'_initTracker',toString:null}),Trait.compose({_emit:Trait.required,_add:Trait.required,_remove:Trait.required,constructor:function BrowserWindows(){browser(this._public).internals=this;this._trackedWindows=[];this._initList();this._initTracker();unload.ensure(this,"_destructor");},_destructor:function _destructor(){this._removeAllListeners('open');this._removeAllListeners('close');this._removeAllListeners('activate');this._removeAllListeners('deactivate');this._clear();delete browser(this._public).internals;},get activeWindow(){let window=windowUtils.activeBrowserWindow; if(ignoreWindow(window))
window=windowIterator()[0];return window?BrowserWindow({window:window}):null;},open:function open(options){if(typeof options==="string"){options={tabs:[Options(options)],isPrivate:isPrivateBrowsingSupported&&options.isPrivate};}
return BrowserWindow(options);},_onTrack:function _onTrack(chromeWindow){if(!isBrowser(chromeWindow))return;let window=BrowserWindow({window:chromeWindow});this._add(window);this._emit('open',window);},_onUntrack:function _onUntrack(chromeWindow){if(!isBrowser(chromeWindow))return;let window=BrowserWindow({window:chromeWindow});this._remove(window);this._emit('close',window);
window.destroy();}}).resolve({toString:null}))();function getChromeWindow(window){return windowNS(window).window;}
exports.browserWindows=browserWindows;