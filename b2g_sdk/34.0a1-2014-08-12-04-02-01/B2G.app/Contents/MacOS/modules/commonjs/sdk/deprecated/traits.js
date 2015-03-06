"use strict";module.metadata={"stability":"deprecated"};const{compose:_compose,override:_override,resolve:_resolve,trait:_trait,required,}=require('./traits/core');const defineProperties=Object.defineProperties,freeze=Object.freeze,create=Object.create;function _create(proto,trait){let properties={},keys=Object.getOwnPropertyNames(trait);for(let key of keys){let descriptor=trait[key];if(descriptor.required&&!Object.prototype.hasOwnProperty.call(proto,key))
throw new Error('Missing required property: '+key);else if(descriptor.conflict)
throw new Error('Remaining conflicting property: '+key);else
properties[key]=descriptor;}
return Object.create(proto,properties);}
let TraitProto=Object.prototype;function Get(key)this[key]
function Set(key,value)this[key]=value
function TraitDescriptor(object)
('function'==typeof object&&(object.prototype==TraitProto||object.prototype instanceof Trait))?object._trait(TraitDescriptor):_trait(object)
function Public(instance,trait){let result={},keys=Object.getOwnPropertyNames(trait);for(let key of keys){if('_'===key.charAt(0)&&'__iterator__'!==key)
continue;let property=trait[key],descriptor={configurable:property.configurable,enumerable:property.enumerable};if(property.get)
descriptor.get=property.get.bind(instance);if(property.set)
descriptor.set=property.set.bind(instance);if('value'in property){let value=property.value;if('function'===typeof value){descriptor.value=property.value.bind(instance);descriptor.writable=property.writable;}else{descriptor.get=Get.bind(instance,key);descriptor.set=Set.bind(instance,key);}}
result[key]=descriptor;}
return result;}
function Composition(trait){function Trait(){let self=_create({},trait);self._public=create(Trait.prototype,Public(self,trait));delete self._public.constructor;if(Object===self.constructor)
self.constructor=Trait;else
return self.constructor.apply(self,arguments)||self._public;return self._public;}
defineProperties(Trait,{prototype:{value:freeze(create(TraitProto,{constructor:{value:constructor,writable:true}}))}, displayName:{value:(trait.constructor||constructor).name},compose:{value:compose,enumerable:true},override:{value:override,enumerable:true},resolve:{value:resolve,enumerable:true},required:{value:required,enumerable:true},_trait:{value:function _trait(caller)
caller===TraitDescriptor?trait:undefined}});return freeze(Trait);}
function compose(){let traits=Array.slice(arguments,0);traits.push(this);return Composition(_compose.apply(null,traits.map(TraitDescriptor)));}
function override(){let traits=Array.slice(arguments,0);traits.push(this);return Composition(_override.apply(null,traits.map(TraitDescriptor)));}
function resolve(resolutions)
Composition(_resolve(resolutions,TraitDescriptor(this)))
const Trait=Composition({_public:{value:null,configurable:true,writable:true},toString:{value:function()'[object '+this.constructor.name+']'}});TraitProto=Trait.prototype;exports.Trait=Trait;