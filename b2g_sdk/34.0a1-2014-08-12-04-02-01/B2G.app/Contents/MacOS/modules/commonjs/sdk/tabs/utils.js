'use strict';module.metadata={'stability':'unstable'};const{Ci}=require('chrome');const{defer}=require("../lang/functional");const{windows,isBrowser}=require('../window/utils');const{isPrivateBrowsingSupported}=require('../self');const{isGlobalPBSupported}=require('../private-browsing/utils');function getWindows()windows(null,{includePrivate:isPrivateBrowsingSupported||isGlobalPBSupported});const XUL_NS="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
const isXULTab=tab=>tab instanceof Ci.nsIDOMNode&&tab.nodeName==="tab"&&tab.namespaceURI===XUL_NS;exports.isXULTab=isXULTab;const isFennecTab=tab=>tab&&tab.QueryInterface&&Ci.nsIBrowserTab&&tab.QueryInterface(Ci.nsIBrowserTab)===tab;exports.isFennecTab=isFennecTab;const isTab=x=>isXULTab(x)||isFennecTab(x);exports.isTab=isTab;function activateTab(tab,window){let gBrowser=getTabBrowserForTab(tab); if(gBrowser){gBrowser.selectedTab=tab;}
else if(window&&window.BrowserApp){window.BrowserApp.selectTab(tab);}
return null;}
exports.activateTab=activateTab;function getTabBrowser(window){ return window.gBrowser||window.getBrowser();}
exports.getTabBrowser=getTabBrowser;function getTabContainer(window){return getTabBrowser(window).tabContainer;}
exports.getTabContainer=getTabContainer;function getTabs(window){if(arguments.length===0){return getWindows().filter(isBrowser).reduce((tabs,window)=>tabs.concat(getTabs(window)),[]);} 
if(window.BrowserApp)
return window.BrowserApp.tabs; return Array.filter(getTabContainer(window).children,function(t)!t.closing);}
exports.getTabs=getTabs;function getActiveTab(window){return getSelectedTab(window);}
exports.getActiveTab=getActiveTab;function getOwnerWindow(tab){ if(tab.ownerDocument)
return tab.ownerDocument.defaultView; return getWindowHoldingTab(tab);}
exports.getOwnerWindow=getOwnerWindow;function getWindowHoldingTab(rawTab){for(let window of getWindows()){ if(!window.BrowserApp)
continue;for(let tab of window.BrowserApp.tabs){if(tab===rawTab)
return window;}}
return null;}
function openTab(window,url,options){options=options||{};if(window.BrowserApp){return window.BrowserApp.addTab(url,{selected:options.inBackground?false:true,pinned:options.isPinned||false,isPrivate:options.isPrivate||false});} 
let newTab=window.gBrowser.addTab(url);if(!options.inBackground){activateTab(newTab);}
return newTab;};exports.openTab=openTab;function isTabOpen(tab){ return!!((tab.linkedBrowser)||getWindowHoldingTab(tab));}
exports.isTabOpen=isTabOpen;function closeTab(tab){let gBrowser=getTabBrowserForTab(tab);if(gBrowser){ if(!tab.parentNode)
return;return gBrowser.removeTab(tab);}
let window=getWindowHoldingTab(tab);if(window&&window.BrowserApp){ if(!tab.browser)
return;return window.BrowserApp.closeTab(tab);}
return null;}
exports.closeTab=closeTab;function getURI(tab){if(tab.browser) 
return tab.browser.currentURI.spec;return tab.linkedBrowser.currentURI.spec;}
exports.getURI=getURI;function getTabBrowserForTab(tab){let outerWin=getOwnerWindow(tab);if(outerWin)
return getOwnerWindow(tab).gBrowser;return null;}
exports.getTabBrowserForTab=getTabBrowserForTab;function getBrowserForTab(tab){if(tab.browser) 
return tab.browser;return tab.linkedBrowser;}
exports.getBrowserForTab=getBrowserForTab;function getTabId(tab){if(tab.browser) 
return tab.id
return String.split(tab.linkedPanel,'panel').pop();}
exports.getTabId=getTabId;function getTabForId(id){return getTabs().find(tab=>getTabId(tab)===id)||null;}
exports.getTabForId=getTabForId;function getTabTitle(tab){return getBrowserForTab(tab).contentDocument.title||tab.label||"";}
exports.getTabTitle=getTabTitle;function setTabTitle(tab,title){title=String(title);if(tab.browser)
tab.browser.contentDocument.title=title;tab.label=String(title);}
exports.setTabTitle=setTabTitle;function getTabContentDocument(tab){return getBrowserForTab(tab).contentDocument;}
exports.getTabContentDocument=getTabContentDocument;function getTabContentWindow(tab){return getBrowserForTab(tab).contentWindow;}
exports.getTabContentWindow=getTabContentWindow;function getAllTabContentWindows(){return getTabs().map(getTabContentWindow);}
exports.getAllTabContentWindows=getAllTabContentWindows;function getTabForContentWindow(window){return getTabs().find(tab=>getTabContentWindow(tab)===window.top)||null;}
exports.getTabForContentWindow=getTabForContentWindow;function getTabURL(tab){if(tab.browser) 
return String(tab.browser.currentURI.spec);return String(getBrowserForTab(tab).currentURI.spec);}
exports.getTabURL=getTabURL;function setTabURL(tab,url){url=String(url);if(tab.browser)
return tab.browser.loadURI(url);return getBrowserForTab(tab).loadURI(url);}



exports.setTabURL=defer(setTabURL);function getTabContentType(tab){return getBrowserForTab(tab).contentDocument.contentType;}
exports.getTabContentType=getTabContentType;function getSelectedTab(window){if(window.BrowserApp)
return window.BrowserApp.selectedTab;if(window.gBrowser)
return window.gBrowser.selectedTab;return null;}
exports.getSelectedTab=getSelectedTab;function getTabForBrowser(browser){for(let window of getWindows()){ if(!window.BrowserApp)
continue;for(let tab of window.BrowserApp.tabs){if(tab.browser===browser)
return tab;}}
return null;}
exports.getTabForBrowser=getTabForBrowser;function pin(tab){let gBrowser=getTabBrowserForTab(tab); if(gBrowser)gBrowser.pinTab(tab);}
exports.pin=pin;function unpin(tab){let gBrowser=getTabBrowserForTab(tab); if(gBrowser)gBrowser.unpinTab(tab);}
exports.unpin=unpin;function isPinned(tab)!!tab.pinned
exports.isPinned=isPinned;function reload(tab){let gBrowser=getTabBrowserForTab(tab); if(gBrowser)gBrowser.unpinTab(tab); else if(tab.browser)tab.browser.reload();}
exports.reload=reload
function getIndex(tab){let gBrowser=getTabBrowserForTab(tab); if(gBrowser){let document=getBrowserForTab(tab).contentDocument;return gBrowser.getBrowserIndexForDocument(document);} 
else{let window=getWindowHoldingTab(tab)
let tabs=window.BrowserApp.tabs;for(let i=tabs.length;i>=0;i--)
if(tabs[i]===tab)return i;}}
exports.getIndex=getIndex;function move(tab,index){let gBrowser=getTabBrowserForTab(tab); if(gBrowser)gBrowser.moveTabTo(tab,index);}
exports.move=move;