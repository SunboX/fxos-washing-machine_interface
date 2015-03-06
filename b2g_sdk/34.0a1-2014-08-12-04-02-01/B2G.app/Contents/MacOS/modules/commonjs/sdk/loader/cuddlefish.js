'use strict';module.metadata={"stability":"unstable"};
const{classes:Cc,Constructor:CC,interfaces:Ci,utils:Cu}=Components;const loaderURI=module.uri.replace("sdk/loader/cuddlefish.js","toolkit/loader.js");const xulappURI=module.uri.replace("loader/cuddlefish.js","system/xul-app.js");
const loaderSandbox=loadSandbox(loaderURI);const loaderModule=loaderSandbox.exports;const xulappSandbox=loadSandbox(xulappURI);const xulappModule=xulappSandbox.exports;const{override,load}=loaderModule;function incompatibility(module){let{metadata,id}=module;
if(!metadata||!("engines"in metadata))
return null;let{engines}=metadata;if(engines===null||typeof(engines)!=="object")
return new Error("Malformed engines' property in metadata");let applications=Object.keys(engines);let versionRange;applications.forEach(function(name){if(xulappModule.is(name)){versionRange=engines[name];

}});if(typeof(versionRange)==="string"){if(xulappModule.satisfiesVersion(versionRange))
return null;return new Error("Unsupported Application version: The module "+id+" currently supports only version "+versionRange+" of "+
xulappModule.name+".");}
return new Error("Unsupported Application: The module "+id+" currently supports only "+applications.join(", ")+".")}
function CuddlefishLoader(options){let{manifest}=options;options=override(options,{
modules:override({'toolkit/loader':loaderModule,'sdk/loader/cuddlefish':exports,'sdk/system/xul-app':xulappModule},options.modules),resolve:function resolve(id,requirer){let entry=requirer&&requirer in manifest&&manifest[requirer];let uri=null;
if(entry){let requirement=entry.requirements[id];
if(!requirement)
throw Error('Module: '+requirer+' has no authority to load: '
+id,requirer);uri=requirement;}else{
uri=loaderModule.resolve(id,requirer);}
return uri;},load:function(loader,module){let result;let error;


try{result=load(loader,module);}
catch(e){error=e;}
error=incompatibility(module)||error;if(error)
throw error;return result;}});let loader=loaderModule.Loader(options);loader.modules[loaderURI]=loaderSandbox;return loader;}
exports=override(loaderModule,{Loader:CuddlefishLoader});