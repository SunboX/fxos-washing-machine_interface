"use strict";





this.EXPORTED_SYMBOLS=["WorkerDebuggerLoader","worker"];


function resolveId(id,baseId){return baseId+"/../"+id;};function normalizeId(id){

let[_,root,path]=id.match(/^(\w+:\/\/\/?|\/)?(.*)/);let stack=[];path.split("/").forEach(function(component){switch(component){case"":case".":break;case"..":if(stack.length===0){if(root!==undefined){throw new Error("can't convert absolute id "+id+" to "+"normalized id because it's going past root!");}else{stack.push("..");}}else{if(stack[stack.length]==".."){stack.push("..");}else{stack.pop();}}
break;default:stack.push(component);break;}});return(root?root:"")+stack.join("/");}
function createModule(id){return Object.create(null,{
id:{configurable:false,enumerable:true,value:id,writable:false},
exports:{configurable:false,enumerable:true,value:Object.create(null),writable:true}});};








function WorkerDebuggerLoader(options){function resolveURL(url){let found=false;for(let[path,baseURL]of paths){if(url.startsWith(path)){found=true;url=url.replace(path,baseURL);break;}}
if(!found){throw new Error("can't resolve relative URL "+url+" to absolute "+"URL!");}
return url.endsWith(".js")?url:url+".js";}
function loadModule(module,url){

let prototype=Object.create(globals);prototype.Components={};prototype.require=createRequire(module);prototype.exports=module.exports;prototype.module=module;let sandbox=createSandbox(url,prototype);try{loadInSandbox(url,sandbox);}catch(error){if(String(error)==="Error opening input stream (invalid filename?)"){throw new Error("can't load module "+module.id+" with url "+url+"!");}
throw error;}

if(typeof module.exports==="object"&&module.exports!==null){Object.freeze(module.exports);}};function createRequire(requirer){return function require(id){if(id===undefined){throw new Error("can't require module without id!");}

let module=modules[id];if(module===undefined){
if(id.startsWith(".")){if(requirer===undefined){throw new Error("can't require top-level module with relative id "+
id+"!");}
id=resolve(id,requirer.id);}
id=normalizeId(id);let url=id;if(url.match(/^\w+:\/\//)===null){url=resolveURL(id);}
module=modules[url];if(module===undefined){


module=modules[url]=createModule(id);try{loadModule(module,url);}catch(error){


delete modules[url];throw error;}
Object.freeze(module);}}
return module.exports;};}
let createSandbox=options.createSandbox;let globals=options.globals||Object.create(null);let loadInSandbox=options.loadInSandbox;

let modules=options.modules||{};for(let id in modules){let module=createModule(id);module.exports=Object.freeze(modules[id]);modules[id]=module;}

let paths=options.paths||{};paths=Object.keys(paths).sort((a,b)=>b.length-a.length).map(path=>[path,paths[path]]);let resolve=options.resolve||resolveId;this.require=createRequire();}
this.WorkerDebuggerLoader=WorkerDebuggerLoader;const chrome={CC:undefined,Cc:undefined,ChromeWorker:undefined,Cm:undefined,Ci:undefined,Cu:undefined,Cr:undefined,components:undefined};
if(typeof Components==="object"){const{Constructor:CC,classes:Cc,manager:Cm,interfaces:Ci,results:Cr,utils:Cu}=Components;const principal=CC('@mozilla.org/systemprincipal;1','nsIPrincipal')();const createSandbox=function(name,prototype){return Cu.Sandbox(principal,{invisibleToDebugger:true,sandboxName:name,sandboxPrototype:prototype,wantComponents:false,wantXrays:false});};const loadSubScript=Cc['@mozilla.org/moz/jssubscript-loader;1'].getService(Ci.mozIJSSubScriptLoader).loadSubScript;const loadInSandbox=function(url,sandbox){loadSubScript(url,sandbox,"UTF-8");};
let sandbox=Cu.Sandbox(principal,{});Cu.evalInSandbox("Components.utils.import('resource://gre/modules/jsdebugger.jsm');"+"addDebuggerToGlobal(this);",sandbox);const Debugger=sandbox.Debugger;const Timer=Cu.import("resource://gre/modules/Timer.jsm",{});const xpcInspector=Cc["@mozilla.org/jsinspector;1"].getService(Ci.nsIJSInspector);this.worker=new WorkerDebuggerLoader({createSandbox:createSandbox,globals:{"isWorker":true,"reportError":Cu.reportError,},loadInSandbox:loadInSandbox,modules:{"Services":{},"chrome":chrome,"promise":Promise,"Debugger":Debugger,"xpcInspector":xpcInspector,"Timer":Object.create(Timer)},paths:{"":"resource://gre/modules/commonjs/","devtools":"resource:///modules/devtools","devtools/server":"resource://gre/modules/devtools/server","devtools/toolkit":"resource://gre/modules/devtools","source-map":"resource://gre/modules/devtools/source-map","xpcshell-test":"resource://test",}});}