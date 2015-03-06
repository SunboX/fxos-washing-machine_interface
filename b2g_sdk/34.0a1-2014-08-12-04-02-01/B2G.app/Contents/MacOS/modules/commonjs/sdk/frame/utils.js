'use strict';module.metadata={"stability":"experimental"};const{Ci}=require("chrome");const XUL='http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul';function eventTarget(frame){return getDocShell(frame).chromeEventHandler;}
exports.eventTarget=eventTarget;function getDocShell(frame){let{frameLoader}=frame.QueryInterface(Ci.nsIFrameLoaderOwner);return frameLoader&&frameLoader.docShell;}
exports.getDocShell=getDocShell;function create(target,options){target=target instanceof Ci.nsIDOMDocument?target.documentElement:target instanceof Ci.nsIDOMWindow?target.document.documentElement:target;options=options||{};let remote=options.remote||false;let namespaceURI=options.namespaceURI||XUL;let isXUL=namespaceURI===XUL;let nodeName=isXUL&&options.browser?'browser':'iframe';let document=target.ownerDocument;let frame=document.createElementNS(namespaceURI,nodeName); frame.setAttribute('type',options.type||'content');frame.setAttribute('src',options.uri||'about:blank');target.appendChild(frame); if(remote){if(isXUL){

frame.setAttribute('style','-moz-binding: none;');frame.setAttribute('remote','true');}
else{frame.QueryInterface(Ci.nsIMozBrowserFrame);frame.createRemoteFrameLoader(null);}}
if(!remote){let docShell=getDocShell(frame);docShell.allowAuth=options.allowAuth||false;docShell.allowJavascript=options.allowJavascript||false;docShell.allowPlugins=options.allowPlugins||false;

if("allowWindowControl"in docShell&&"allowWindowControl"in options)
docShell.allowWindowControl=!!options.allowWindowControl;}
return frame;}
exports.create=create;function swapFrameLoaders(from,to)
from.QueryInterface(Ci.nsIFrameLoaderOwner).swapFrameLoaders(to)
exports.swapFrameLoaders=swapFrameLoaders;