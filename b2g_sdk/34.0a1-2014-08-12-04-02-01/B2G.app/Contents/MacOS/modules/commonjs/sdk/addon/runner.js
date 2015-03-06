module.metadata={"stability":"experimental"};const{Cc,Ci,Cu}=require('chrome');const{isNative}=require('@loader/options');const{descriptor,Sandbox,evaluate,main,resolveURI}=require('toolkit/loader');const{once}=require('../system/events');const{exit,env,staticArgs}=require('../system');const{when:unload}=require('../system/unload');const{loadReason}=require('../self');const{rootURI,metadata}=require("@loader/options");const globals=require('../system/globals');const xulApp=require('../system/xul-app');const{id}=require('sdk/self');const appShellService=Cc['@mozilla.org/appshell/appShellService;1'].getService(Ci.nsIAppShellService);const{preferences}=metadata;const Startup=Cu.import("resource://gre/modules/sdk/system/Startup.js",{}).exports;function setDefaultPrefs(prefsURI){const prefs=Cc['@mozilla.org/preferences-service;1'].getService(Ci.nsIPrefService).QueryInterface(Ci.nsIPrefBranch2);const branch=prefs.getDefaultBranch('');const sandbox=Sandbox({name:prefsURI,prototype:{pref:function(key,val){switch(typeof val){case'boolean':branch.setBoolPref(key,val);break;case'number':if(val%1==0) 
branch.setIntPref(key,val);break;case'string':branch.setCharPref(key,val);break;}}}});evaluate(sandbox,prefsURI);}
function definePseudo(loader,id,exports){let uri=resolveURI(id,loader.mapping);loader.modules[uri]={exports:exports};}
function startup(reason,options)Startup.onceInitialized.then(()=>{ Object.defineProperties(options.loader.globals,descriptor(globals));
let{ready}=require('../addon/window');require('../l10n/loader').load(rootURI).then(null,function failure(error){if(!isNative)
console.info("Error while loading localization: "+error.message);}).then(function onLocalizationReady(data){
 definePseudo(options.loader,'@l10n/data',data?data:null);return ready;}).then(function(){run(options);}).then(null,console.exception);return void 0;});function run(options){try{
try{

if(options.main!=='sdk/test/runner'){require('../l10n/html').enable();}}
catch(error){console.exception(error);} 
if(preferences&&preferences.length>0){try{require('../preferences/native-options').enable({preferences:preferences,id:id});}
catch(error){console.exception(error);}}
else{

 try{require('../l10n/prefs').enable();}
catch(error){console.exception(error);}
 
if(options.prefsURI){ try{setDefaultPrefs(options.prefsURI);}
catch(err){}}}
let program=main(options.loader,options.main);if(typeof(program.onUnload)==='function')
unload(program.onUnload);if(typeof(program.main)==='function'){program.main({loadReason:loadReason,staticArgs:staticArgs},{print:function print(_){dump(_+'\n')},quit:exit});}}catch(error){console.exception(error);throw error;}}
exports.startup=startup;

if(env.CFX_COMMAND==='run'){unload(function(reason){if(reason==='shutdown')
exit(0);});}