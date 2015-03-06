'use strict';module.metadata={'stability':'stable','engines':{'Firefox':'*','Fennec':'*'}};const{isBrowser}=require('./window/utils');const{modelFor}=require('./model/core');const{viewFor}=require('./view/core');if(require('./system/xul-app').is('Fennec')){module.exports=require('./windows/fennec');}
else{module.exports=require('./windows/firefox');}
const browsers=module.exports.browserWindows;modelFor.when(isBrowser,view=>{for(let model of browsers){if(viewFor(model)===view)
return model;}
return null;});