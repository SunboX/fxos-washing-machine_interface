"use strict";
if(typeof Components!="undefined"){Components.utils.importGlobalProperties(["URL"]);
this.exports={};}else if(typeof"module"=="undefined"||typeof"exports"=="undefined"){throw new Error("Please load this module using require()");}
let EXPORTED_SYMBOLS=["basename","dirname","join","normalize","split","toFileURI","fromFileURI",];let basename=function(path){return path.slice(path.lastIndexOf("/")+1);};exports.basename=basename;let dirname=function(path){let index=path.lastIndexOf("/");if(index==-1){return".";}
while(index>=0&&path[index]=="/"){--index;}
return path.slice(0,index+1);};exports.dirname=dirname;let join=function(...path){ let paths=[];for(let subpath of path){if(subpath==null){throw new TypeError("invalid path component");}
if(subpath.length!=0&&subpath[0]=="/"){paths=[subpath];}else{paths.push(subpath);}}
return paths.join("/");};exports.join=join;let normalize=function(path){let stack=[];let absolute;if(path.length>=0&&path[0]=="/"){absolute=true;}else{absolute=false;}
path.split("/").forEach(function(v){switch(v){case"":case".": break;case"..":if(stack.length==0){if(absolute){throw new Error("Path is ill-formed: attempting to go past root");}else{stack.push("..");}}else{if(stack[stack.length-1]==".."){stack.push("..");}else{stack.pop();}}
break;default:stack.push(v);}});let string=stack.join("/");return absolute?"/"+string:string;};exports.normalize=normalize;let split=function(path){return{absolute:path.length&&path[0]=="/",components:path.split("/")};};exports.split=split;let toFileURIExtraEncodings={';':'%3b','?':'%3F',"'":'%27','#':'%23'};let toFileURI=function toFileURI(path){let uri=encodeURI(this.normalize(path));
 let prefix="file://";uri=prefix+uri.replace(/[;?'#]/g,match=>toFileURIExtraEncodings[match]);return uri;};exports.toFileURI=toFileURI;let fromFileURI=function fromFileURI(uri){let url=new URL(uri);if(url.protocol!='file:'){throw new Error("fromFileURI expects a file URI");}
let path=this.normalize(decodeURIComponent(url.pathname));return path;};exports.fromFileURI=fromFileURI;if(typeof Components!="undefined"){this.EXPORTED_SYMBOLS=EXPORTED_SYMBOLS;for(let symbol of EXPORTED_SYMBOLS){this[symbol]=exports[symbol];}}