'use strict';const{browserWindows:windows}=require('../windows');const{tabs}=require('../windows/tabs-firefox');const{isPrivate}=require('../private-browsing');const{isWindowPBSupported}=require('../private-browsing/utils')
const{isPrivateBrowsingSupported}=require('sdk/self');const supportPrivateTabs=isPrivateBrowsingSupported&&isWindowPBSupported;function newTabWindow(options){return windows.open({tabs:[options],isPrivate:options.isPrivate});}
Object.defineProperties(tabs,{open:{value:function open(options){if(options.inNewWindow){newTabWindow(options);return undefined;}
let activeWindow=windows.activeWindow;let privateState=(supportPrivateTabs&&(options.isPrivate||isPrivate(activeWindow)))||false; if(activeWindow&&(!supportPrivateTabs||privateState===isPrivate(activeWindow))){activeWindow.tabs.open(options);}
else{ let window=getWindow(privateState);if(window){window.tabs.open(options);} 
else{newTabWindow(options);}}
return undefined;}}});function getWindow(privateState){for(let window of windows){if(privateState===isPrivate(window)){return window;}}
return null;}


module.exports=Object.create(tabs,{isPrototypeOf:{value:Object.prototype.isPrototypeOf}});