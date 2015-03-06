"use strict";module.metadata={"stability":"experimental"};const{Cc,Ci}=require("chrome");const io=Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService);const SHEET_TYPE={"agent":"AGENT_SHEET","user":"USER_SHEET","author":"AUTHOR_SHEET"};function getDOMWindowUtils(window){return window.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);};function loadSheet(window,url,type){if(!(type&&type in SHEET_TYPE))
type="author";type=SHEET_TYPE[type];if(!(url instanceof Ci.nsIURI))
url=io.newURI(url,null,null);let winUtils=getDOMWindowUtils(window);try{winUtils.loadSheet(url,winUtils[type]);}
catch(e){};};exports.loadSheet=loadSheet;function removeSheet(window,url,type){if(!(type&&type in SHEET_TYPE))
type="author";type=SHEET_TYPE[type];if(!(url instanceof Ci.nsIURI))
url=io.newURI(url,null,null);let winUtils=getDOMWindowUtils(window);try{winUtils.removeSheet(url,winUtils[type]);}
catch(e){};};exports.removeSheet=removeSheet;function isTypeValid(type){return type in SHEET_TYPE;}
exports.isTypeValid=isTypeValid;