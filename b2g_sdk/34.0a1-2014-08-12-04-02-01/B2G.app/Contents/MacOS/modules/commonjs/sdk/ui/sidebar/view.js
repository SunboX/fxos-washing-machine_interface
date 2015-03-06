'use strict';module.metadata={'stability':'unstable','engines':{'Firefox':'*'}};const{models,buttons,views,viewsFor,modelFor}=require('./namespace');const{isBrowser,getMostRecentBrowserWindow,windows,isWindowPrivate}=require('../../window/utils');const{setStateFor}=require('../state');const{defer}=require('../../core/promise');const{isPrivateBrowsingSupported,data}=require('../../self');const XUL_NS="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";const WEB_PANEL_BROWSER_ID='web-panels-browser';const resolveURL=(url)=>url?data.url(url):url;function create(window,details){let id=makeID(details.id);let{document}=window;if(document.getElementById(id))
throw new Error('The ID "'+details.id+'" seems already used.');let menuitem=document.createElementNS(XUL_NS,'menuitem');menuitem.setAttribute('id',id);menuitem.setAttribute('label',details.title);menuitem.setAttribute('sidebarurl',resolveURL(details.sidebarurl));menuitem.setAttribute('checked','false');menuitem.setAttribute('type','checkbox');menuitem.setAttribute('group','sidebar');menuitem.setAttribute('autoCheck','false');document.getElementById('viewSidebarMenu').appendChild(menuitem);return menuitem;}
exports.create=create;function dispose(menuitem){menuitem.parentNode.removeChild(menuitem);}
exports.dispose=dispose;function updateTitle(sidebar,title){let button=buttons.get(sidebar);for(let window of windows(null,{includePrivate:true})){let{document}=window; if(button){setStateFor(button,window,{label:title});} 
let mi=document.getElementById(makeID(sidebar.id));if(mi){mi.setAttribute('label',title)} 
if(isSidebarShowing(window,sidebar)){document.getElementById('sidebar-title').setAttribute('value',title);}}}
exports.updateTitle=updateTitle;function updateURL(sidebar,url){let eleID=makeID(sidebar.id);url=resolveURL(url);for(let window of windows(null,{includePrivate:true})){ let mi=window.document.getElementById(eleID);if(mi){mi.setAttribute('sidebarurl',url)} 
if(isSidebarShowing(window,sidebar)){showSidebar(window,sidebar,url);}}}
exports.updateURL=updateURL;function isSidebarShowing(window,sidebar){let win=window||getMostRecentBrowserWindow(); if(!win){return false;} 
let sb=win.document.getElementById('sidebar');let sidebarTitle=win.document.getElementById('sidebar-title');if(!(sb&&sidebarTitle)){return false;} 
let sbb=win.document.getElementById('sidebar-box');if(!sbb||sbb.hidden){return false;}
if(sidebarTitle.value==modelFor(sidebar).title){let url=resolveURL(modelFor(sidebar).url); if(win.gWebPanelURI==url){return true;} 
let ele=sb.contentDocument&&sb.contentDocument.getElementById(WEB_PANEL_BROWSER_ID);if(!ele){return false;}
if(ele.getAttribute('cachedurl')==url){return true;}
if(ele&&ele.contentWindow&&ele.contentWindow.location==url){return true;}} 
return false;}
exports.isSidebarShowing=isSidebarShowing;function showSidebar(window,sidebar,newURL){window=window||getMostRecentBrowserWindow();let{promise,resolve,reject}=defer();let model=modelFor(sidebar);if(!newURL&&isSidebarShowing(window,sidebar)){resolve({});}
else if(!isPrivateBrowsingSupported&&isWindowPrivate(window)){reject(Error('You cannot show a sidebar on private windows'));}
else{sidebar.once('show',resolve);let menuitem=window.document.getElementById(makeID(model.id));menuitem.setAttribute('checked',true);window.openWebPanel(model.title,resolveURL(newURL||model.url));}
return promise;}
exports.showSidebar=showSidebar;function hideSidebar(window,sidebar){window=window||getMostRecentBrowserWindow();let{promise,resolve,reject}=defer();if(!isSidebarShowing(window,sidebar)){reject(Error('The sidebar is already hidden'));}
else{sidebar.once('hide',resolve);
let{document}=window;let sidebarEle=document.getElementById('sidebar');let sidebarTitle=document.getElementById('sidebar-title');let sidebarBox=document.getElementById('sidebar-box');let sidebarSplitter=document.getElementById('sidebar-splitter');let commandID=sidebarBox.getAttribute('sidebarcommand');let sidebarBroadcaster=document.getElementById(commandID);sidebarBox.hidden=true;sidebarSplitter.hidden=true;sidebarEle.setAttribute('src','about:blank');sidebarBroadcaster.removeAttribute('checked');sidebarBox.setAttribute('sidebarcommand','');sidebarTitle.value='';sidebarBox.hidden=true;sidebarSplitter.hidden=true;window.gBrowser.selectedBrowser.focus();}
return promise;}
exports.hideSidebar=hideSidebar;function makeID(id){return'jetpack-sidebar-'+id;}