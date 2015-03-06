"use strict";module.metadata={"stability":"unstable"};const prefs=require("../preferences/service");const{Cu,Cc,Ci}=require("chrome");const{Services}=Cu.import("resource://gre/modules/Services.jsm");const PREF_MATCH_OS_LOCALE="intl.locale.matchOS";const PREF_SELECTED_LOCALE="general.useragent.locale";const PREF_ACCEPT_LANGUAGES="intl.accept_languages";function getPreferedLocales(caseSensitve){let locales=[];function addLocale(locale){locale=locale.trim();if(!caseSensitve)
locale=locale.toLowerCase();if(locales.indexOf(locale)===-1)
locales.push(locale);}
 
if(prefs.get(PREF_MATCH_OS_LOCALE,false)){let localeService=Cc["@mozilla.org/intl/nslocaleservice;1"].getService(Ci.nsILocaleService);let osLocale=localeService.getLocaleComponentForUserAgent();addLocale(osLocale);}
let browserUiLocale=prefs.getLocalized(PREF_SELECTED_LOCALE,"")||prefs.get(PREF_SELECTED_LOCALE,"");if(browserUiLocale)
addLocale(browserUiLocale); let contentLocales=prefs.get(PREF_ACCEPT_LANGUAGES,"");if(contentLocales){ for(let locale of contentLocales.split(","))
addLocale(locale.replace(/(^\s+)|(\s+$)/g,""));} 
addLocale("en-US");return locales;}
exports.getPreferedLocales=getPreferedLocales;exports.findClosestLocale=function findClosestLocale(aLocales,aMatchLocales){aMatchLocales=aMatchLocales||getPreferedLocales(); let bestmatch=null; let bestmatchcount=0; let bestpartcount=0;for(let locale of aMatchLocales){let lparts=locale.split("-");for(let localized of aLocales){let found=localized.toLowerCase(); if(locale==found)
return localized;let fparts=found.split("-");if(bestmatch&&fparts.length<bestmatchcount)
continue; let maxmatchcount=Math.min(fparts.length,lparts.length);let matchcount=0;while(matchcount<maxmatchcount&&fparts[matchcount]==lparts[matchcount])
matchcount++;if(matchcount>bestmatchcount||(matchcount==bestmatchcount&&fparts.length<bestpartcount)){bestmatch=localized;bestmatchcount=matchcount;bestpartcount=fparts.length;}} 
if(bestmatch)
return bestmatch;}
return null;}