"use strict";module.metadata={"stability":"unstable"};let usingJSON=false;let hash={},bestMatchingLocale=null;try{let data=require("@l10n/data");hash=data.hash;bestMatchingLocale=data.bestMatchingLocale;usingJSON=true;}
catch(e){}
exports.usingJSON=usingJSON;exports.get=function get(k){return k in hash?hash[k]:null;}
exports.locale=function locale(){return bestMatchingLocale;}
exports.language=function language(){return bestMatchingLocale?bestMatchingLocale.split("-")[0].toLowerCase():null;}