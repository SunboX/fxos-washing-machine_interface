"use strict";module.metadata={"stability":"deprecated"};

var owns=Function.prototype.call.bind(Object.prototype.hasOwnProperty);function equivalentDescriptors(actual,expected){return(actual.conflict&&expected.conflict)||(actual.required&&expected.required)||equalDescriptors(actual,expected);}
function equalDescriptors(actual,expected){return actual.get===expected.get&&actual.set===expected.set&&actual.value===expected.value&&!!actual.enumerable===!!expected.enumerable&&!!actual.configurable===!!expected.configurable&&!!actual.writable===!!expected.writable;}

function throwConflictPropertyError(name){throw new Error("Remaining conflicting property: `"+name+"`");}
function throwRequiredPropertyError(name){throw new Error("Missing required property: `"+name+"`");}
function RequiredPropertyDescriptor(name){



var accessor=throwRequiredPropertyError.bind(null,name);return{get:accessor,set:accessor,required:true};}
function ConflictPropertyDescriptor(name){var accessor=throwConflictPropertyError.bind(null,name);return{get:accessor,set:accessor,conflict:true};}
function isRequiredProperty(object,name){return!!object[name].required;}
function isConflictProperty(object,name){return!!object[name].conflict;}
function isBuiltInMethod(name,source){var target=Object.prototype[name];return target==source||
(String(target)===String(source)&&target.name===source.name);}
function overrideBuiltInMethods(target,source){if(isBuiltInMethod("toString",target.toString)){Object.defineProperty(target,"toString",{value:source.toString,configurable:true,enumerable:false});}
if(isBuiltInMethod("constructor",target.constructor)){Object.defineProperty(target,"constructor",{value:source.constructor,configurable:true,enumerable:false});}}
function exclude(names,trait){var map={};Object.keys(trait).forEach(function(name){if(!~names.indexOf(name)||isRequiredProperty(trait,name))
map[name]={value:trait[name],enumerable:true};
else
map[name]={value:RequiredPropertyDescriptor(name),enumerable:true};});return Object.create(Trait.prototype,map);}
function rename(renames,trait){var map={};


Object.keys(trait).forEach(function(name){var alias;if(owns(renames,name)&&!isRequiredProperty(trait,name)){alias=renames[name];

if(owns(map,alias)&&!map[alias].value.required){map[alias]={value:ConflictPropertyDescriptor(alias),enumerable:true};}
else{map[alias]={value:trait[name],enumerable:true};}




if(!owns(map,name)){map[name]={value:RequiredPropertyDescriptor(name),enumerable:true};}}


else{if(!owns(map,name)){map[name]={value:trait[name],enumerable:true};}


else if(!isRequiredProperty(trait,name)){map[name]={value:ConflictPropertyDescriptor(name),enumerable:true};}}});return Object.create(Trait.prototype,map);}
function resolve(resolutions,trait){var renames={};var exclusions=[];
Object.keys(resolutions).forEach(function(name){
if(resolutions[name])
renames[name]=resolutions[name];
else
exclusions.push(name);});
return rename(renames,exclude(exclusions,trait));}
function trait(object){var map;var trait=object;if(!(object instanceof Trait)){




map={};
Object.keys(object).forEach(function(name){

if(Trait.required==Object.getOwnPropertyDescriptor(object,name).value){map[name]={value:RequiredPropertyDescriptor(name),enumerable:true};}
else{map[name]={value:Object.getOwnPropertyDescriptor(object,name),enumerable:true};}});trait=Object.create(Trait.prototype,map);}
return trait;}
function compose(trait1,trait2){
var map={};Array.prototype.forEach.call(arguments,function(trait){Object.keys(trait).forEach(function(name){
if(owns(map,name)&&!map[name].value.required){




if(!isRequiredProperty(trait,name)&&!equivalentDescriptors(map[name].value,trait[name])){map[name]={value:ConflictPropertyDescriptor(name),enumerable:true};}}



else{map[name]={value:trait[name],enumerable:true};}});});return Object.create(Trait.prototype,map);}
function defineProperties(object,properties){



var verifiedProperties={};
Object.keys(properties).forEach(function(name){

if(isRequiredProperty(properties,name)){if(!(name in object))
throwRequiredPropertyError(name);}
else if(isConflictProperty(properties,name)){throwConflictPropertyError(name);}

else{verifiedProperties[name]=properties[name];}});
return Object.defineProperties(object,verifiedProperties);}
function create(prototype,properties){var object=Object.create(prototype);
overrideBuiltInMethods(object,Trait.prototype);


return defineProperties(object,properties);}
function Trait(trait1,trait2){



return trait2===undefined?trait(trait1):compose.apply(null,arguments);}
Object.freeze(Object.defineProperties(Trait.prototype,{toString:{value:function toString(){return"[object "+this.constructor.name+"]";}},create:{value:function createTrait(prototype){return create(undefined===prototype?Object.prototype:prototype,this);},enumerable:true},resolve:{value:function resolveTrait(resolutions){return resolve(resolutions,this);},enumerable:true}}));Trait.compose=Object.freeze(compose);Object.freeze(compose.prototype);Trait.required=Object.freeze(Object.create(Object.prototype,{toString:{value:Object.freeze(function toString(){return"<Trait.required>";})}}));Object.freeze(Trait.required.toString.prototype);exports.Trait=Object.freeze(Trait);