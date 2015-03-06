"use strict";const{resolveURI,Require,unload,override,descriptor}=require('../../toolkit/loader');const{ensure}=require('../system/unload');const addonWindow=require('../addon/window');const{PlainTextConsole}=require('sdk/console/plain-text');let defaultGlobals=override(require('../system/globals'),{console:console});function CustomLoader(module,globals,packaging,overrides={}){let options=packaging||require("@loader/options");options=override(options,{id:overrides.id||options.id,globals:override(defaultGlobals,globals||{}),modules:override(override(options.modules||{},overrides.modules||{}),{'sdk/addon/window':addonWindow})});let loaderModule=options.isNative?'../../toolkit/loader':'../loader/cuddlefish';let{Loader}=require(loaderModule);let loader=Loader(options);let wrapper=Object.create(loader,descriptor({require:Require(loader,module),sandbox:function(id){let requirement=loader.resolve(id,module.id);if(!requirement)
requirement=id;let uri=resolveURI(requirement,loader.mapping);return loader.sandboxes[uri];},unload:function(reason){unload(loader,reason);}}));ensure(wrapper);return wrapper;};exports.Loader=CustomLoader;function HookedPlainTextConsole(hook,print,innerID){this.log=hook.bind(null,"log",innerID);this.info=hook.bind(null,"info",innerID);this.warn=hook.bind(null,"warn",innerID);this.error=hook.bind(null,"error",innerID);this.debug=hook.bind(null,"debug",innerID);this.exception=hook.bind(null,"exception",innerID);this.time=hook.bind(null,"time",innerID);this.timeEnd=hook.bind(null,"timeEnd",innerID);this.__exposedProps__={log:"rw",info:"rw",warn:"rw",error:"rw",debug:"rw",exception:"rw",time:"rw",timeEnd:"rw"};}


exports.LoaderWithHookedConsole=function(module,callback){let messages=[];function hook(type,innerID,msg){messages.push({type:type,msg:msg,innerID:innerID});if(callback)
callback(type,msg,innerID);}
return{loader:CustomLoader(module,{console:new HookedPlainTextConsole(hook,null,null)},null,{modules:{'sdk/console/plain-text':{PlainTextConsole:HookedPlainTextConsole.bind(null,hook)}}}),messages:messages};}

exports.LoaderWithHookedConsole2=function(module,callback){let messages=[];return{loader:CustomLoader(module,{console:new PlainTextConsole(function(msg){messages.push(msg);if(callback)
callback(msg);})}),messages:messages};}


exports.LoaderWithFilteredConsole=function(module,callback){function hook(type,innerID,msg){if(callback&&callback(type,msg,innerID)==false)
return;console[type](msg);}
return CustomLoader(module,{console:new HookedPlainTextConsole(hook,null,null)},null,{modules:{'sdk/console/plain-text':{PlainTextConsole:HookedPlainTextConsole.bind(null,hook)}}});}