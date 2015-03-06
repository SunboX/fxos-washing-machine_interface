


this.EXPORTED_SYMBOLS=["RemoteSecurityUI"];const Ci=Components.interfaces;const Cc=Components.classes;const Cu=Components.utils;Cu.import("resource://gre/modules/XPCOMUtils.jsm");function RemoteSecurityUI()
{this._SSLStatus=null;this._state=0;}
RemoteSecurityUI.prototype={QueryInterface:XPCOMUtils.generateQI([Ci.nsISSLStatusProvider,Ci.nsISecureBrowserUI]), get SSLStatus(){return this._SSLStatus;}, get state(){return this._state;},get tooltipText(){return"";},_update:function(aStatus,aState){this._SSLStatus=aStatus;this._state=aState;}};