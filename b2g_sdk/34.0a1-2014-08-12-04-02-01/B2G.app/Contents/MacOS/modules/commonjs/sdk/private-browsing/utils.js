'use strict';module.metadata={"stability":"unstable"};const{Cc,Ci,Cu}=require('chrome');const{defer}=require('../lang/functional');const{emit,on,once,off}=require('../event/core');const{when:unload}=require('../system/unload');const events=require('../system/events');const{deprecateFunction}=require('../util/deprecate');const{isOneOf,is,satisfiesVersion,version}=require('../system/xul-app');const{isWindowPrivate}=require('../window/utils');const{isPrivateBrowsingSupported}=require('../self');const{dispatcher}=require("../util/dispatcher");let deferredEmit=defer(emit);let pbService;let PrivateBrowsingUtils;if(isOneOf(['Firefox','Fennec'])){ try{pbService=Cc["@mozilla.org/privatebrowsing;1"].getService(Ci.nsIPrivateBrowsingService);

 if(!('privateBrowsingEnabled'in pbService))
pbService=undefined;}
catch(e){}
try{PrivateBrowsingUtils=Cu.import('resource://gre/modules/PrivateBrowsingUtils.jsm',{}).PrivateBrowsingUtils;}
catch(e){}}
let isGlobalPBSupported=exports.isGlobalPBSupported=!!pbService&&is('Firefox');let isWindowPBSupported=exports.isWindowPBSupported=!pbService&&!!PrivateBrowsingUtils&&is('Firefox');let isTabPBSupported=exports.isTabPBSupported=!pbService&&!!PrivateBrowsingUtils&&is('Fennec')&&satisfiesVersion(version,'>=20.0*');function isPermanentPrivateBrowsing(){return!!(PrivateBrowsingUtils&&PrivateBrowsingUtils.permanentPrivateBrowsing);}
exports.isPermanentPrivateBrowsing=isPermanentPrivateBrowsing;function ignoreWindow(window){return!isPrivateBrowsingSupported&&isWindowPrivate(window)&&!isGlobalPBSupported;}
exports.ignoreWindow=ignoreWindow;function onChange(){deferredEmit(exports,pbService.privateBrowsingEnabled?'start':'stop');}
if(isGlobalPBSupported){events.on('private-browsing-transition-complete',onChange);}


let setMode=defer(function setMode(value){value=!!value; return pbService&&(pbService.privateBrowsingEnabled=value);});exports.setMode=deprecateFunction(setMode,'require("sdk/private-browsing").activate and '+'require("sdk/private-browsing").deactivate '+'are deprecated.');let getMode=function getMode(chromeWin){if(chromeWin!==undefined&&isWindowPrivate(chromeWin))
return true; return isGlobalPrivateBrowsing();};exports.getMode=getMode;function isGlobalPrivateBrowsing(){return pbService?pbService.privateBrowsingEnabled:false;}
const isPrivate=dispatcher("isPrivate");isPrivate.when(isPermanentPrivateBrowsing,_=>true);isPrivate.when(x=>x instanceof Ci.nsIDOMWindow,isWindowPrivate);isPrivate.when(x=>Ci.nsIPrivateBrowsingChannel&&x instanceof Ci.nsIPrivateBrowsingChannel,x=>x.isChannelPrivate);isPrivate.define(isGlobalPrivateBrowsing);exports.isPrivate=isPrivate;exports.on=on.bind(null,exports);unload(function()off(exports));