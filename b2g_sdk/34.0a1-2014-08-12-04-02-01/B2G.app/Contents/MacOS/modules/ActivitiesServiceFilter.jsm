"use strict"
this.EXPORTED_SYMBOLS=['ActivitiesServiceFilter'];this.ActivitiesServiceFilter={match:function(aValues,aFilters){function matchValue(aValue,aFilter,aFilterObj){if(aFilter!==null){switch(typeof(aFilter)){case'boolean':return aValue===aFilter;case'number':return Number(aValue)===aFilter;case'string':return String(aValue)===aFilter;default: return false;}}
if(('pattern'in aFilterObj)){var pattern=String(aFilterObj.pattern);var patternFlags='';if(('patternFlags'in aFilterObj)){patternFlags=String(aFilterObj.patternFlags);}
var re=new RegExp('^(?:'+pattern+')$',patternFlags);return re.test(aValue);}
if(('min'in aFilterObj)||('max'in aFilterObj)){if(('min'in aFilterObj)&&aFilterObj.min>aValue){return false;}
if(('max'in aFilterObj)&&aFilterObj.max<aValue){return false;}}
return true;} 
function matchObject(aValue,aFilterObj){let filters=('value'in aFilterObj)?(Array.isArray(aFilterObj.value)?aFilterObj.value:[aFilterObj.value]):[null];let values=Array.isArray(aValue)?aValue:[aValue];for(var filterId=0;filterId<filters.length;++filterId){for(var valueId=0;valueId<values.length;++valueId){if(matchValue(values[valueId],filters[filterId],aFilterObj)){return true;}}}
return false;}

let filtersMap={}
for(let filter in aFilters){ let filterObj=aFilters[filter];if(Array.isArray(filterObj)||typeof(filterObj)!=='object'){filterObj={required:false,value:filterObj}}
filtersMap[filter]={filter:filterObj,found:false};}
for(let prop in aValues){if(!(prop in filtersMap)){continue;}
if(Array.isArray(aValues[prop])&&aValues[prop].length==0){continue;}
if(!matchObject(aValues[prop],filtersMap[prop].filter)){return false;}
filtersMap[prop].found=true;}
for(let filter in filtersMap){if(filtersMap[filter].filter.required&&!filtersMap[filter].found){return false;}}
return true;}}