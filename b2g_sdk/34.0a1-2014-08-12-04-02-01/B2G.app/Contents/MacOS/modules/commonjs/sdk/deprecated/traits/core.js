"use strict";module.metadata={"stability":"deprecated"};const getOwnPropertyNames=Object.getOwnPropertyNames,getOwnPropertyDescriptor=Object.getOwnPropertyDescriptor,hasOwn=Object.prototype.hasOwnProperty,_create=Object.create;function doPropertiesMatch(object1,object2,name){return name in object1?name in object2&&object1[name]===object2[name]:!(name in object2);}
function areSame(desc1,desc2){return('conflict'in desc1&&desc1.conflict&&'conflict'in desc2&&desc2.conflict)||(doPropertiesMatch(desc1,desc2,'get')&&doPropertiesMatch(desc1,desc2,'set')&&doPropertiesMatch(desc1,desc2,'value')&&doPropertiesMatch(desc1,desc2,'enumerable')&&doPropertiesMatch(desc1,desc2,'required')&&doPropertiesMatch(desc1,desc2,'conflict'));}
function Map(names){let map={};for(let name of names)
map[name]=true;return map;}
const ERR_CONFLICT='Remaining conflicting property: ',ERR_REQUIRED='Missing required property: ';const required={toString:function()'<Trait.required>'};exports.required=required;function Required(name){function required(){throw new Error(ERR_REQUIRED+name)}
return{get:required,set:required,required:true};}
function Conflict(name){function conflict(){throw new Error(ERR_CONFLICT+name)}
return{get:conflict,set:conflict,conflict:true};}
function trait(properties){let result={},keys=getOwnPropertyNames(properties);for(let key of keys){let descriptor=getOwnPropertyDescriptor(properties,key);result[key]=(required===descriptor.value)?Required(key):descriptor;}
return result;}
exports.Trait=exports.trait=trait;function compose(trait1,trait2){let traits=Array.slice(arguments,0),result={};for(let trait of traits){let keys=getOwnPropertyNames(trait);for(let key of keys){let descriptor=trait[key]; if(hasOwn.call(result,key)&&!result[key].required){if(descriptor.required)
continue;if(!areSame(descriptor,result[key]))
result[key]=Conflict(key);}else{result[key]=descriptor;}}}
return result;}
exports.compose=compose;function exclude(keys,trait){let exclusions=Map(keys),result={};keys=getOwnPropertyNames(trait);for(let key of keys){if(!hasOwn.call(exclusions,key)||trait[key].required)
result[key]=trait[key];else
result[key]=Required(key);}
return result;}
function override(){let traits=Array.slice(arguments,0),result={};for(let trait of traits){let keys=getOwnPropertyNames(trait);for(let key of keys){let descriptor=trait[key];if(!hasOwn.call(result,key)||result[key].required)
result[key]=descriptor;}}
return result;}
exports.override=override;function rename(map,trait){let result={},keys=getOwnPropertyNames(trait);for(let key of keys){ if(hasOwn.call(map,key)&&!trait[key].required){let alias=map[key];if(hasOwn.call(result,alias)&&!result[alias].required)
result[alias]=Conflict(alias);else
result[alias]=trait[key];if(!hasOwn.call(result,key))
result[key]=Required(key);}else{
 if(!hasOwn.call(result,key))
result[key]=trait[key]; else if(!trait[key].required)
result[key]=Conflict(key);}}
return result;}
function resolve(resolutions,trait){let renames={},exclusions=[],keys=getOwnPropertyNames(resolutions);for(let key of keys){ if(resolutions[key]) 
renames[key]=resolutions[key];else
 exclusions.push(key);}
return rename(renames,exclude(exclusions,trait));}
exports.resolve=resolve;function create(proto,trait){let properties={},keys=getOwnPropertyNames(trait);for(let key of keys){let descriptor=trait[key];if(descriptor.required&&!hasOwn.call(proto,key))
throw new Error(ERR_REQUIRED+key);else if(descriptor.conflict)
throw new Error(ERR_CONFLICT+key);else
properties[key]=descriptor;}
return _create(proto,properties);}
exports.create=create;