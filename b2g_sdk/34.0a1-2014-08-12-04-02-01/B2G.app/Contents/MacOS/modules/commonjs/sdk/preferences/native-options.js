'use strict';module.metadata={"stability":"unstable"};const{Cc,Ci,Cu}=require('chrome');const{on}=require('../system/events');const{id,preferencesBranch}=require('../self');const{localizeInlineOptions}=require('../l10n/prefs');const{AddonManager}=Cu.import("resource://gre/modules/AddonManager.jsm");const{defer}=require("sdk/core/promise");const DEFAULT_OPTIONS_URL='data:text/xml,<placeholder/>';const VALID_PREF_TYPES=['bool','boolint','integer','string','color','file','directory','control','menulist','radio'];function enable({preferences,id}){let enabled=defer();validate(preferences);setDefaults(preferences,preferencesBranch); AddonManager.getAddonByID(id,(addon)=>{on('addon-options-displayed',onAddonOptionsDisplayed,true);enabled.resolve({id:id});});function onAddonOptionsDisplayed({subject:doc,data}){if(data===id){let parent=doc.getElementById('detail-downloads').parentNode;injectOptions({preferences:preferences,preferencesBranch:preferencesBranch,document:doc,parent:parent,id:id});localizeInlineOptions(doc);}}
return enabled.promise;}
exports.enable=enable;function validate(preferences){for(let{name,title,type,label,options}of preferences){ if(!title)
throw Error("The '"+name+"' pref requires a title"); if(!~VALID_PREF_TYPES.indexOf(type))
throw Error("The '"+name+"' pref must be of valid type"); if(type==='control'&&!label)
throw Error("The '"+name+"' control requires a label"); if(type==='menulist'||type==='radio'){if(!options)
throw Error("The '"+name+"' pref requires options"); for(let item of options){if(!('value'in item)||!('label'in item))
throw Error("Each option requires both a value and a label");}}
}}
exports.validate=validate;function setDefaults(preferences,preferencesBranch){const branch=Cc['@mozilla.org/preferences-service;1'].getService(Ci.nsIPrefService).getDefaultBranch('extensions.'+preferencesBranch+'.');for(let{name,value}of preferences){switch(typeof value){case'boolean':branch.setBoolPref(name,value);break;case'number': if(value%1===0){branch.setIntPref(name,value);}
break;case'string':let str=Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);str.data=value;branch.setComplexValue(name,Ci.nsISupportsString,str);break;}}}
exports.setDefaults=setDefaults;function injectOptions({preferences,preferencesBranch,document,parent,id}){for(let{name,type,hidden,title,description,label,options,on,off}of preferences){if(hidden){continue;}
let setting=document.createElement('setting');setting.setAttribute('pref-name',name);setting.setAttribute('data-jetpack-id',id);setting.setAttribute('pref','extensions.'+preferencesBranch+'.'+name);setting.setAttribute('type',type);setting.setAttribute('title',title);setting.setAttribute('desc',description);if(type==='file'||type==='directory'){setting.setAttribute('fullpath','true');}
else if(type==='control'){let button=document.createElement('button');button.setAttribute('pref-name',name);button.setAttribute('data-jetpack-id',id);button.setAttribute('label',label);button.setAttribute('oncommand',"Services.obs.notifyObservers(null, '"+
id+"-cmdPressed', '"+name+"');");setting.appendChild(button);}
else if(type==='boolint'){setting.setAttribute('on',on);setting.setAttribute('off',off);}
else if(type==='menulist'){let menulist=document.createElement('menulist');let menupopup=document.createElement('menupopup');for(let{value,label}of options){let menuitem=document.createElement('menuitem');menuitem.setAttribute('value',value);menuitem.setAttribute('label',label);menupopup.appendChild(menuitem);}
menulist.appendChild(menupopup);setting.appendChild(menulist);}
else if(type==='radio'){let radiogroup=document.createElement('radiogroup');for(let{value,label}of options){let radio=document.createElement('radio');radio.setAttribute('value',value);radio.setAttribute('label',label);radiogroup.appendChild(radio);}
setting.appendChild(radiogroup);}
parent.appendChild(setting);}}
exports.injectOptions=injectOptions;