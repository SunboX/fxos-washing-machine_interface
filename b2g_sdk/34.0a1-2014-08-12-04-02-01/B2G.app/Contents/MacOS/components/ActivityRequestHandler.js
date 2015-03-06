"use strict";const Ci=Components.interfaces;const Cu=Components.utils;Cu.import("resource://gre/modules/XPCOMUtils.jsm");Cu.import("resource://gre/modules/Services.jsm");XPCOMUtils.defineLazyServiceGetter(this,"cpmm","@mozilla.org/childprocessmessagemanager;1","nsISyncMessageSender");function debug(aMsg){}
function ActivityRequestHandler(){debug("ActivityRequestHandler");


}
ActivityRequestHandler.prototype={init:function arh_init(aWindow){this._window=aWindow;},__init:function arh___init(aId,aOptions){this._id=aId;this._options=aOptions;},get source(){

return Cu.cloneInto(this._options,this._window);},postResult:function arh_postResult(aResult){cpmm.sendAsyncMessage("Activity:PostResult",{"id":this._id,"result":aResult});Services.obs.notifyObservers(null,"activity-success",this._id);},postError:function arh_postError(aError){cpmm.sendAsyncMessage("Activity:PostError",{"id":this._id,"error":aError});Services.obs.notifyObservers(null,"activity-error",this._id);},classID:Components.ID("{9326952a-dbe3-4d81-a51f-d9c160d96d6b}"),QueryInterface:XPCOMUtils.generateQI([Ci.nsIDOMGlobalPropertyInitializer])}
this.NSGetFactory=XPCOMUtils.generateNSGetFactory([ActivityRequestHandler]);