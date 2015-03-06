"use strict";module.metadata={"stability":"unstable"};const{validateOptions:valid}=require("../deprecated/api-utils");const method=require("method/core");




function contract(rules){const validator=(instance,options)=>{return valid(options||instance||{},rules);};validator.rules=rules
validator.properties=function(modelFor){return properties(modelFor,rules);}
return validator;}
exports.contract=contract





function properties(modelFor,rules){let descriptor=Object.keys(rules).reduce(function(descriptor,name){descriptor[name]={get:function(){return modelFor(this)[name]},set:function(value){let change={};change[name]=value;modelFor(this)[name]=valid(change,rules)[name];}}
return descriptor},{});return Object.create(Object.prototype,descriptor);}
exports.properties=properties;const validate=method("contract/validate");exports.validate=validate;