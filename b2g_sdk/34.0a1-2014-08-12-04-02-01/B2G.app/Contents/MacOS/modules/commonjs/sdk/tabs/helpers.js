'use strict';module.metadata={'stability':'unstable'};const{getTabForContentWindow,getTabForBrowser:getRawTabForBrowser}=require('./utils');const{Tab}=require('./tab');const{rawTabNS}=require('./namespace');function getTabForWindow(win){let tab=getTabForContentWindow(win);if(!tab)
return null;return getTabForRawTab(tab)||Tab({tab:tab});}
exports.getTabForWindow=getTabForWindow;function getTabForRawTab(rawTab){let tab=rawTabNS(rawTab).tab;if(tab){return tab;}
return null;}
exports.getTabForRawTab=getTabForRawTab;function getTabForBrowser(browser){return getTabForRawTab(getRawTabForBrowser(browser));}
exports.getTabForBrowser=getTabForBrowser;