"use strict";const Ci=Components.interfaces;const Cu=Components.utils;Cu.import("resource://gre/modules/XPCOMUtils.jsm");function debug(aMsg){}
function ActivityMessageConfigurator(){debug("ActivityMessageConfigurator");}
ActivityMessageConfigurator.prototype={get mustShowRunningApp(){debug("mustShowRunningApp returning true");return true;},classID:Components.ID("{d2296daa-c406-4c5e-b698-e5f2c1715798}"),QueryInterface:XPCOMUtils.generateQI([Ci.nsISystemMessagesConfigurator])}
this.NSGetFactory=XPCOMUtils.generateNSGetFactory([ActivityMessageConfigurator]);