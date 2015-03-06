'use strict';var host=require('../util/host');var Promise=require('../util/promise').Promise;var Status=require('./types').Status;var Conversion=require('./types').Conversion;exports.items=[{item:'type',name:'url',getSpec:function(){return'url';},stringify:function(value,context){if(value==null){return'';}
return value.href;},parse:function(arg,context){var conversion;try{var url=host.createUrl(arg.text);conversion=new Conversion(url,arg);}
catch(ex){var predictions=[];var status=Status.ERROR;if(arg.text.indexOf('://')===-1){['http','https'].forEach(function(scheme){try{var http=host.createUrl(scheme+'://'+arg.text);predictions.push({name:http.href,value:http});}
catch(ex){}}.bind(this)); if(context.environment.window){try{var base=context.environment.window.location.href;var localized=host.createUrl(arg.text,base);predictions.push({name:localized.href,value:localized});}
catch(ex){}}}
if(predictions.length>0){status=Status.INCOMPLETE;}
conversion=new Conversion(undefined,arg,status,ex.message,predictions);}
return Promise.resolve(conversion);}}];