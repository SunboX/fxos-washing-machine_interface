"use strict";module.metadata={"stability":"stable"};const json=require("./l10n/json/core");const{get:getKey}=require("./l10n/core");const properties=require("./l10n/properties/core");const{getRulesForLocale}=require("./l10n/plural-rules");let pluralMappingFunction=getRulesForLocale(json.language())||getRulesForLocale("en");exports.get=function get(k){
 if(typeof k!=="string")
throw new Error("First argument of localization method should be a string");let n=arguments[1];let localized=getKey(k,n)||k;

if(arguments.length<=1)
return localized;let args=Array.slice(arguments);let placeholders=[null,...args.slice(typeof(n)==="number"?2:1)];if(typeof localized=="object"&&"other"in localized){
let n=arguments[1];
 
if(n===0&&"zero"in localized)
localized=localized["zero"];else if(n===1&&"one"in localized)
localized=localized["one"];else if(n===2&&"two"in localized)
localized=localized["two"];else{let pluralForm=pluralMappingFunction(n);if(pluralForm in localized)
localized=localized[pluralForm];else
 localized=localized["other"];}
args=[null,n];}


let offset=1;if(placeholders.length>1){args=placeholders;}
localized=localized.replace(/%(\d*)[sd]/g,(v,n)=>{let rv=args[n!=""?n:offset];offset++;return rv;});return localized;}