'use strict';exports.method=function(func,spec){ var argSpecs=[];if(spec.request!=null){Object.keys(spec.request).forEach(function(name){var arg=spec.request[name];argSpecs[arg.index]=name;});}
return function(data){var args=(data==null)?[]:argSpecs.map(function(name){return data[name];});return func.apply(this,args);};};var Arg=exports.Arg=function(index,type){if(this==null){return new Arg(index,type);}
this.index=index;this.type=type;};var RetVal=exports.RetVal=function(type){if(this==null){return new RetVal(type);}
this.type=type;};