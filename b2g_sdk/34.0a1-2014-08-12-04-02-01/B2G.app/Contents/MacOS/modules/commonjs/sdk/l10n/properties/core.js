"use strict";const{Cu}=require("chrome");const{newURI}=require('../../url/utils')
const{getRulesForLocale}=require("../plural-rules");const{getPreferedLocales}=require('../locale');const{rootURI}=require("@loader/options");const{Services}=Cu.import("resource://gre/modules/Services.jsm",{});const baseURI=rootURI+"locale/";const preferedLocales=getPreferedLocales(true);function getLocaleURL(locale){ try{let uri=newURI(locale);if(uri.scheme=='chrome')
return uri.spec;}
catch(_){} 
return baseURI+locale+".properties";}
function getKey(locale,key){let bundle=Services.strings.createBundle(getLocaleURL(locale));try{return bundle.GetStringFromName(key)+"";}
catch(_){}
return undefined;}
function get(key,n,locales){ let locale=locales.shift();let localized;if(typeof n=='number'){if(n==0){localized=getKey(locale,key+'[zero]');}
else if(n==1){localized=getKey(locale,key+'[one]');}
else if(n==2){localized=getKey(locale,key+'[two]');}
if(!localized){ let pluralForm=(getRulesForLocale(locale.split("-")[0].toLowerCase())||getRulesForLocale("en"))(n);localized=getKey(locale,key+'['+pluralForm+']');}
if(!localized){localized=getKey(locale,key+'[other]');}}
if(!localized){localized=getKey(locale,key);}
if(!localized){localized=getKey(locale,key+'[other]');}
if(localized){return localized;} 
if(locales.length)
return get(key,n,locales);return undefined;}
exports.get=function(k,n)get(k,n,Array.slice(preferedLocales));