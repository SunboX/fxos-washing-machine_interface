const{classes:Cc,interfaces:Ci,results:Cr,utils:Cu,Constructor:CC}=Components;Cu.import("resource://gre/modules/Services.jsm");Cu.import("resource://gre/modules/FileUtils.jsm");Cu.import("resource://gre/modules/Promise.jsm");this.EXPORTED_SYMBOLS=["WebappOSUtils"];function computeHash(aString){let converter=Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);converter.charset="UTF-8";let result={};let data=converter.convertToByteArray(aString,result);let hasher=Cc["@mozilla.org/security/hash;1"].createInstance(Ci.nsICryptoHash);hasher.init(hasher.MD5);hasher.update(data,data.length);let hash=hasher.finish(false);function toHexString(charCode){return("0"+charCode.toString(16)).slice(-2);}
return[toHexString(hash.charCodeAt(i))for(i in hash)].join("");}
this.WebappOSUtils={getUniqueName:function(aApp){return this.sanitizeStringForFilename(aApp.name).toLowerCase()+"-"+
computeHash(aApp.manifestURL);},getLaunchTarget:function(aApp){let uniqueName=this.getUniqueName(aApp);let mwaUtils=Cc["@mozilla.org/widget/mac-web-app-utils;1"].createInstance(Ci.nsIMacWebAppUtils);try{let path;if(path=mwaUtils.pathForAppWithIdentifier(uniqueName)){return[uniqueName,path];}}catch(ex){} 
try{let path;if((path=mwaUtils.pathForAppWithIdentifier(aApp.origin))&&this.isOldInstallPathValid(aApp,path)){return[aApp.origin,path];}}catch(ex){}
return[null,null];},getInstallPath:function(aApp){ return aApp.basePath+"/"+aApp.id; throw new Error("Unsupported apps platform");},getPackagePath:function(aApp){let packagePath=this.getInstallPath(aApp);
return packagePath;},launch:function(aApp){let uniqueName=this.getUniqueName(aApp);let[launchIdentifier,path]=this.getLaunchTarget(aApp);if(!launchIdentifier){return false;}
let mwaUtils=Cc["@mozilla.org/widget/mac-web-app-utils;1"].createInstance(Ci.nsIMacWebAppUtils);try{mwaUtils.launchAppWithIdentifier(launchIdentifier);}catch(e){return false;}
return true;},uninstall:function(aApp){let[,path]=this.getLaunchTarget(aApp);if(!path){return Promise.reject("App not found");}
let deferred=Promise.defer();let mwaUtils=Cc["@mozilla.org/widget/mac-web-app-utils;1"].createInstance(Ci.nsIMacWebAppUtils);mwaUtils.trashApp(path,(aResult)=>{if(aResult==Cr.NS_OK){deferred.resolve(true);}else{deferred.reject("Error moving the app to the Trash: "+aResult);}});return deferred.promise;},isOldInstallPathValid:function(aApp,aInstallPath){

if(aApp.origin.startsWith("app")){return false;}

return true;},isLaunchable:function(aApp){let uniqueName=this.getUniqueName(aApp);if(!this.getInstallPath(aApp)){return false;}
return true;},sanitizeStringForFilename:function(aPossiblyBadFilenameString){return aPossiblyBadFilenameString.replace(/[^a-z0-9_\-]/gi,"");}}