"use strict";this.EXPORTED_SYMBOLS=["define","require"];const console=(function(){const tempScope={};Components.utils.import("resource://gre/modules/devtools/Console.jsm",tempScope);return tempScope.console;})();this.define=function define(moduleName,deps,payload){if(typeof moduleName!="string"){throw new Error("Error: Module name is not a string");}
if(arguments.length==2){payload=deps;}
else{payload.deps=deps;}
if(define.debugDependencies){console.log("define: "+moduleName+" -> "+payload.toString().slice(0,40).replace(/\n/,'\\n').replace(/\r/,'\\r')+"...");}
if(moduleName in define.modules){throw new Error("Error: Redefining module: "+moduleName);} 
payload.__uncompiled=true;define.modules[moduleName]=payload;}
define.modules={};define.debugDependencies=false;function Domain(){this.modules={};if(define.debugDependencies){this.depth="";}}
Domain.prototype.require=function(config,deps,callback){if(arguments.length<=2){callback=deps;deps=config;config=undefined;}
if(Array.isArray(deps)){var params=deps.map(function(dep){return this.lookup(dep);},this);if(callback){callback.apply(null,params);}
return undefined;}
else{return this.lookup(deps);}};Domain.prototype.lookup=function(moduleName){if(moduleName in this.modules){var module=this.modules[moduleName];if(define.debugDependencies){console.log(this.depth+" Using module: "+moduleName);}
return module;}
if(!(moduleName in define.modules)){throw new Error("Missing module: "+moduleName);}
var module=define.modules[moduleName];if(define.debugDependencies){console.log(this.depth+" Compiling module: "+moduleName);}
if(module.__uncompiled){if(define.debugDependencies){this.depth+=".";}
var exports={};try{var params=module.deps.map((dep)=>{if(dep==="require"){return this.require.bind(this);}
if(dep==="exports"){return exports;}
if(dep==="module"){return{id:moduleName,uri:""};}
return this.lookup(dep);});var reply=module.apply(null,params);module=(reply!==undefined)?reply:exports;}
catch(ex){dump("Error using module '"+moduleName+"' - "+ex+"\n");throw ex;}
if(define.debugDependencies){this.depth=this.depth.slice(0,-1);}} 
this.modules[moduleName]=module;return module;};define.Domain=Domain;define.globalDomain=new Domain();this.require=define.globalDomain.require.bind(define.globalDomain);