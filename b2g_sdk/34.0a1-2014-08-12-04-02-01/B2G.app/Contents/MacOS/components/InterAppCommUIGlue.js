"use strict"
const Cc=Components.classes;const Ci=Components.interfaces;const Cu=Components.utils;Cu.import("resource://gre/modules/XPCOMUtils.jsm");Cu.import("resource://gre/modules/Services.jsm");Cu.import("resource://gre/modules/Promise.jsm");XPCOMUtils.defineLazyModuleGetter(this,"SystemAppProxy","resource://gre/modules/SystemAppProxy.jsm");const DEBUG=false;function debug(aMsg){dump("-- InterAppCommUIGlue: "+Date.now()+": "+aMsg+"\n");}
function InterAppCommUIGlue(){
this._deferreds={};SystemAppProxy.addEventListener("mozIACContentEvent",function(aEvent){let detail=aEvent.detail;if(detail.type!="inter-app-comm-permission"){return;}
if(DEBUG){debug("mozIACContentEvent: "+JSON.stringify(detail));}
let callerID=detail.chromeEventID;let deferred=this._deferreds[callerID];if(!deferred){if(DEBUG){debug("Error! Cannot find the deferred for callerID: "+callerID);}
return;}
delete this._deferreds[callerID];deferred.resolve({callerID:callerID,keyword:detail.keyword,manifestURL:detail.manifestURL,selectedApps:detail.peers});}.bind(this));}
InterAppCommUIGlue.prototype={selectApps:function(aCallerID,aPubAppManifestURL,aKeyword,aAppsToSelect){let deferred=Promise.defer();this._deferreds[aCallerID]=deferred;SystemAppProxy._sendCustomEvent("mozIACChromeEvent",{type:"inter-app-comm-permission",chromeEventID:aCallerID,manifestURL:aPubAppManifestURL,keyword:aKeyword,peers:aAppsToSelect});

SystemAppProxy._sendCustomEvent("mozIACContentEvent",{type:"inter-app-comm-permission",chromeEventID:aCallerID,manifestURL:aPubAppManifestURL,keyword:aKeyword,peers:aAppsToSelect});return deferred.promise;},classID:Components.ID("{879ee66c-e246-11e3-9910-74d02b97e723}"),QueryInterface:XPCOMUtils.generateQI([Ci.nsIInterAppCommUIGlue])};this.NSGetFactory=XPCOMUtils.generateNSGetFactory([InterAppCommUIGlue]);