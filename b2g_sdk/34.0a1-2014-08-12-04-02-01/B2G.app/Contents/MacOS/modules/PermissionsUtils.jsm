


this.EXPORTED_SYMBOLS=["PermissionsUtils"];const{classes:Cc,interfaces:Ci,utils:Cu,results:Cr}=Components;Cu.import("resource://gre/modules/Services.jsm");let gImportedPrefBranches=new Set();function importPrefBranch(aPrefBranch,aPermission,aAction){let list=Services.prefs.getChildList(aPrefBranch,{});for(let pref of list){let hosts="";try{hosts=Services.prefs.getCharPref(pref);}catch(e){}
if(!hosts)
continue;hosts=hosts.split(",");for(let host of hosts){let uri=null;try{uri=Services.io.newURI("http://"+host,null,null);}catch(e){try{uri=Services.io.newURI(host,null,null);}catch(e2){}}
try{Services.perms.add(uri,aPermission,aAction);}catch(e){}}
Services.prefs.setCharPref(pref,"");}}
this.PermissionsUtils={importFromPrefs:function(aPrefBranch,aPermission){if(!aPrefBranch.endsWith("."))
aPrefBranch+=".";if(gImportedPrefBranches.has(aPrefBranch))
return;importPrefBranch(aPrefBranch+"whitelist.add",aPermission,Services.perms.ALLOW_ACTION);importPrefBranch(aPrefBranch+"blacklist.add",aPermission,Services.perms.DENY_ACTION);gImportedPrefBranches.add(aPrefBranch);}};