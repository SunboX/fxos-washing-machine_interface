Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");const Ci=Components.interfaces;const Cr=Components.results;const Cc=Components.classes;function nsWebHandlerApp(){}
nsWebHandlerApp.prototype={ classDescription:"A web handler for protocols and content",classID:Components.ID("8b1ae382-51a9-4972-b930-56977a57919d"),contractID:"@mozilla.org/uriloader/web-handler-app;1",_name:null,_detailedDescription:null,_uriTemplate:null, get name(){return this._name;},set name(aName){this._name=aName;},get detailedDescription(){return this._detailedDescription;},set detailedDescription(aDesc){this._detailedDescription=aDesc;},equals:function(aHandlerApp){if(!aHandlerApp)
throw Cr.NS_ERROR_NULL_POINTER;if(aHandlerApp instanceof Ci.nsIWebHandlerApp&&aHandlerApp.uriTemplate&&this.uriTemplate&&aHandlerApp.uriTemplate==this.uriTemplate)
return true;return false;},launchWithURI:function nWHA__launchWithURI(aURI,aWindowContext){

 var escapedUriSpecToHandle=encodeURIComponent(aURI.spec); var uriSpecToSend=this.uriTemplate.replace("%s",escapedUriSpecToHandle);var ioService=Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);var uriToSend=ioService.newURI(uriSpecToSend,null,null); if(aWindowContext){ var channel=ioService.newChannelFromURI(uriToSend);channel.loadFlags=Ci.nsIChannel.LOAD_DOCUMENT_URI; var uriLoader=Cc["@mozilla.org/uriloader;1"].getService(Ci.nsIURILoader);



uriLoader.openURI(channel,Ci.nsIURILoader.IS_CONTENT_PREFERRED,aWindowContext);return;} 
var windowMediator=Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator); var browserDOMWin=windowMediator.getMostRecentWindow("navigator:browser").QueryInterface(Ci.nsIDOMChromeWindow).browserDOMWindow;









 browserDOMWin.openURI(uriToSend,null, Ci.nsIBrowserDOMWindow.OPEN_DEFAULTWINDOW,Ci.nsIBrowserDOMWindow.OPEN_NEW);return;}, get uriTemplate(){return this._uriTemplate;},set uriTemplate(aURITemplate){this._uriTemplate=aURITemplate;}, QueryInterface:XPCOMUtils.generateQI([Ci.nsIWebHandlerApp,Ci.nsIHandlerApp])};this.NSGetFactory=XPCOMUtils.generateNSGetFactory([nsWebHandlerApp]);