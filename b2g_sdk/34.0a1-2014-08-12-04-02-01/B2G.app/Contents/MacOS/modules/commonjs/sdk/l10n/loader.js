"use strict";module.metadata={"stability":"unstable"};const{Cc,Ci}=require("chrome");const{getPreferedLocales,findClosestLocale}=require("./locale");const{readURI}=require("../net/url");const{resolve}=require("../core/promise");function parseJsonURI(uri){return readURI(uri).then(JSON.parse).then(null,function(error){throw Error("Failed to parse locale file:\n"+uri+"\n"+error);});}

function getAvailableLocales(rootURI){let uri=rootURI+"locales.json";return parseJsonURI(uri).then(function(manifest){return"locales"in manifest&&Array.isArray(manifest.locales)?manifest.locales:[];});}
function getBestLocale(rootURI){ return getAvailableLocales(rootURI).then(function(availableLocales){ let preferedLocales=getPreferedLocales(); return findClosestLocale(availableLocales,preferedLocales);});}
exports.load=function load(rootURI){return getBestLocale(rootURI).then(function(bestMatchingLocale){ if(!bestMatchingLocale)
return resolve(null);let localeURI=rootURI+"locale/"+bestMatchingLocale+".json";

return parseJsonURI(localeURI).then(function(json){return{hash:json,bestMatchingLocale:bestMatchingLocale};});});}