Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");const Cc=Components.classes;const Ci=Components.interfaces;


function ContentAreaDropListener(){};ContentAreaDropListener.prototype={classID:Components.ID("{1f34bc80-1bc7-11d6-a384-d705dd0746fc}"),QueryInterface:XPCOMUtils.generateQI([Ci.nsIDroppedLinkHandler,Ci.nsISupports]),_getDropURL:function(dt)
{let types=dt.types;for(let t=0;t<types.length;t++){let type=types[t];switch(type){case"text/uri-list":var url=dt.getData("URL").replace(/^\s+|\s+$/g,"");return[url,url];case"text/plain":case"text/x-moz-text-internal":var url=dt.getData(type).replace(/^\s+|\s+$/g,"");return[url,url];case"text/x-moz-url":return dt.getData(type).split("\n");}}


let file=dt.mozGetDataAt("application/x-moz-file",0);if(file instanceof Ci.nsIFile){let ioService=Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);let fileHandler=ioService.getProtocolHandler("file").QueryInterface(Ci.nsIFileProtocolHandler);return[fileHandler.getURLSpecFromFile(file),file.leafName];}
return[];},_validateURI:function(dataTransfer,uriString,disallowInherit)
{if(!uriString)
return"";


uriString=uriString.replace(/^\s*|\s*$/g,'');let uri;let ioService=Cc["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);try{ uri=ioService.newURI(uriString,null,null);}catch(ex){}
if(!uri)
return uriString;let secMan=Cc["@mozilla.org/scriptsecuritymanager;1"].getService(Ci.nsIScriptSecurityManager);let sourceNode=dataTransfer.mozSourceNode;let flags=secMan.STANDARD;if(disallowInherit)
flags|=secMan.DISALLOW_INHERIT_PRINCIPAL; let principal=sourceNode?sourceNode.nodePrincipal:secMan.getSimpleCodebasePrincipal(ioService.newURI("file:///",null,null));secMan.checkLoadURIStrWithPrincipal(principal,uriString,flags);return uriString;},canDropLink:function(aEvent,aAllowSameDocument)
{if(this._eventTargetIsDisabled(aEvent))
return false;let dataTransfer=aEvent.dataTransfer;let types=dataTransfer.types;if(!types.contains("application/x-moz-file")&&!types.contains("text/x-moz-url")&&!types.contains("text/uri-list")&&!types.contains("text/x-moz-text-internal")&&!types.contains("text/plain"))
return false;if(aAllowSameDocument)
return true;let sourceNode=dataTransfer.mozSourceNode;if(!sourceNode)
return true; let sourceDocument=sourceNode.ownerDocument;let eventDocument=aEvent.originalTarget.ownerDocument;if(sourceDocument==eventDocument)
return false;
if(sourceDocument&&eventDocument){let sourceRoot=sourceDocument.defaultView.top;if(sourceRoot&&sourceRoot==eventDocument.defaultView.top)
return false;}
return true;},dropLink:function(aEvent,aName,aDisallowInherit)
{aName.value="";if(this._eventTargetIsDisabled(aEvent))
return"";let dataTransfer=aEvent.dataTransfer;let[url,name]=this._getDropURL(dataTransfer);try{url=this._validateURI(dataTransfer,url,aDisallowInherit);}catch(ex){aEvent.stopPropagation();aEvent.preventDefault();throw ex;}
if(name)
aName.value=name;return url;},_eventTargetIsDisabled:function(aEvent)
{let ownerDoc=aEvent.originalTarget.ownerDocument;if(!ownerDoc||!ownerDoc.defaultView)
return false;return ownerDoc.defaultView.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIDOMWindowUtils).isNodeDisabledForEvents(aEvent.originalTarget);}};var components=[ContentAreaDropListener];this.NSGetFactory=XPCOMUtils.generateNSGetFactory(components);