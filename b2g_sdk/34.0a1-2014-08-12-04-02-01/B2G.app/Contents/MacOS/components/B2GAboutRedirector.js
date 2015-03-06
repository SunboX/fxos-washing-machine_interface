const Cc=Components.classes;const Ci=Components.interfaces;Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");Components.utils.import("resource://gre/modules/Services.jsm");function debug(msg){}
function netErrorURL(){let uri="app://system.gaiamobile.org/net_error.html";try{uri=Services.prefs.getCharPref("b2g.neterror.url");}catch(e){}
return uri;}
let modules={certerror:{uri:"chrome://b2g/content/aboutCertError.xhtml",privileged:false,hide:true},neterror:{uri:netErrorURL(),privileged:false,hide:true}};function B2GAboutRedirector(){}
B2GAboutRedirector.prototype={QueryInterface:XPCOMUtils.generateQI([Ci.nsIAboutModule]),classID:Components.ID("{920400b1-cf8f-4760-a9c4-441417b15134}"),_getModuleInfo:function(aURI){let moduleName=aURI.path.replace(/[?#].*/,"").toLowerCase();return modules[moduleName];}, getURIFlags:function(aURI){let flags;let moduleInfo=this._getModuleInfo(aURI);if(moduleInfo.hide)
flags=Ci.nsIAboutModule.HIDE_FROM_ABOUTABOUT;return flags|Ci.nsIAboutModule.ALLOW_SCRIPT;},newChannel:function(aURI){let moduleInfo=this._getModuleInfo(aURI);var ios=Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);var channel=ios.newChannel(moduleInfo.uri,null,null);if(!moduleInfo.privileged){

 channel.owner=null;}
channel.originalURI=aURI;return channel;}};this.NSGetFactory=XPCOMUtils.generateNSGetFactory([B2GAboutRedirector]);