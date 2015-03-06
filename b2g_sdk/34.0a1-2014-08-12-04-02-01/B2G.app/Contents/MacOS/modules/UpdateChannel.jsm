
this.EXPORTED_SYMBOLS=["UpdateChannel"];const Cu=Components.utils;Cu.import("resource://gre/modules/Services.jsm");this.UpdateChannel={get:function UpdateChannel_get(aIncludePartners=true){let channel="default";let defaults=Services.prefs.getDefaultBranch(null);try{channel=defaults.getCharPref("app.update.channel");}catch(e){}
if(aIncludePartners){try{let partners=Services.prefs.getChildList("app.partner.").sort();if(partners.length){channel+="-cck";partners.forEach(function(prefName){channel+="-"+Services.prefs.getCharPref(prefName);});}}catch(e){Cu.reportError(e);}}
return channel;}};