"use strict";module.metadata={"stability":"unstable","engines":{"Firefox":"*","Fennec":"*"}};const{modelFor}=require("./model/core");const{viewFor}=require("./view/core");const{isTab}=require("./tabs/utils");if(require("./system/xul-app").is("Fennec")){module.exports=require("./windows/tabs-fennec").tabs;}
else{module.exports=require("./tabs/tabs-firefox");}
const tabs=module.exports;
modelFor.when(isTab,view=>{for(let model of tabs){if(viewFor(model)===view)
return model;}
return null;});