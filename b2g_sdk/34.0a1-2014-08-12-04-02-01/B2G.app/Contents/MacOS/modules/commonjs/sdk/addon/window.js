"use strict";module.metadata={"stability":"experimental"};const{Ci,Cc}=require("chrome");const{make:makeWindow,getHiddenWindow}=require("../window/utils");const{create:makeFrame,getDocShell}=require("../frame/utils");const{defer}=require("../core/promise");const{when:unload}=require("../system/unload");const cfxArgs=require("../test/options");let addonPrincipal=Cc["@mozilla.org/systemprincipal;1"].createInstance(Ci.nsIPrincipal);let hiddenWindow=getHiddenWindow();if(cfxArgs.parseable){console.info("hiddenWindow document.documentURI:"+
hiddenWindow.document.documentURI);console.info("hiddenWindow document.readyState:"+
hiddenWindow.document.readyState);}

let frame=makeFrame(hiddenWindow.document,{nodeName:"iframe",namespaceURI:"http://www.w3.org/1999/xhtml",allowJavascript:true,allowPlugins:true})
let docShell=getDocShell(frame);let eventTarget=docShell.chromeEventHandler;
docShell.createAboutBlankContentViewer(addonPrincipal);

let window=docShell.contentViewer.DOMDocument.defaultView;window.location="data:application/vnd.mozilla.xul+xml;charset=utf-8,<window/>";let{promise,resolve}=defer();eventTarget.addEventListener("DOMContentLoaded",function handler(event){eventTarget.removeEventListener("DOMContentLoaded",handler,false);resolve();},false);exports.ready=promise;exports.window=window;unload(function(){window.close()
frame.parentNode.removeChild(frame);});