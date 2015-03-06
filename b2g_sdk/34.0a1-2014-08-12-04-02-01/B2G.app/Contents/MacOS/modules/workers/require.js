(function(exports){"use strict";if(exports.require){ return;}
let require=(function(){let modules=new Map();let paths={_map:new Map(),get regexp(){if(this._regexp){return this._regexp;}
let objectURLs=[];for(let[objectURL,_]of this._map){objectURLs.push(objectURL);}
return this._regexp=new RegExp(objectURLs.join("|"),"g");},_regexp:null,set:function(url,path){this._regexp=null; this._map.set(url,path);},get:function(url){return this._map.get(url);},substitute:function(source){let map=this._map;return source.replace(this.regexp,function(url){return map.get(url)||url;},"g");}};Object.defineProperty(Error.prototype,"moduleStack",{get:function(){return paths.substitute(this.stack);}});Object.defineProperty(Error.prototype,"moduleName",{get:function(){return paths.substitute(this.fileName);}});return function require(path){if(typeof path!="string"||path.indexOf("://")==-1){throw new TypeError("The argument to require() must be a string uri, got "+path);} 
let uri;if(path.lastIndexOf(".")<=path.lastIndexOf("/")){uri=path+".js";}else{uri=path;} 
let exports=Object.create(null); let module={id:path,uri:uri,exports:exports};
if(modules.has(path)){return modules.get(path).exports;}
modules.set(path,module);let name=":"+path;let objectURL;try{ let xhr=new XMLHttpRequest();xhr.open("GET",uri,false);xhr.responseType="text";xhr.send();let source=xhr.responseText;if(source==""){ throw new Error("Could not find module "+path);}



source="require._tmpModules[\""+name+"\"] = "+"function(exports, require, module) {"+
source+"\n}\n";let blob=new Blob([(new TextEncoder()).encode(source)],{type:"application/javascript"});objectURL=URL.createObjectURL(blob);paths.set(objectURL,path);importScripts(objectURL);require._tmpModules[name].call(null,exports,require,module);}catch(ex){
modules.delete(path);throw ex;}finally{if(objectURL){URL.revokeObjectURL(objectURL);}
delete require._tmpModules[name];}
Object.freeze(module.exports);Object.freeze(module);return module.exports;};})();require._tmpModules=Object.create(null);Object.freeze(require);Object.defineProperty(exports,"require",{value:require,enumerable:true,configurable:false});})(this);