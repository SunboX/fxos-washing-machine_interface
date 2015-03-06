"use strict";module.metadata={"stability":"unstable"};const{Cc,Ci}=require("chrome");const{setTimeout}=require("../timers");const{platform}=require("../system");const{getMostRecentBrowserWindow,getOwnerBrowserWindow,getHiddenWindow,getScreenPixelsPerCSSPixel}=require("../window/utils");const{create:createFrame,swapFrameLoaders}=require("../frame/utils");const{window:addonWindow}=require("../addon/window");const{isNil}=require("../lang/type");const{data}=require('../self');const events=require("../system/events");const XUL_NS="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";function calculateRegion({position,width,height,defaultWidth,defaultHeight},rect){position=position||{};let x,y;let hasTop=!isNil(position.top);let hasRight=!isNil(position.right);let hasBottom=!isNil(position.bottom);let hasLeft=!isNil(position.left);let hasWidth=!isNil(width);let hasHeight=!isNil(height);
 if(!hasWidth)
width=defaultWidth;
 if(!hasHeight)
height=defaultHeight; x=(rect.right-width)/2;y=(rect.top+rect.bottom-height)/2;if(hasTop){y=rect.top+position.top;if(hasBottom&&!hasHeight)
height=rect.bottom-position.bottom-y;}
else if(hasBottom){y=rect.bottom-position.bottom-height;}
if(hasLeft){x=position.left;if(hasRight&&!hasWidth)
width=rect.right-position.right-x;}
else if(hasRight){x=rect.right-width-position.right;}
return{x:x,y:y,width:width,height:height};}
function open(panel,options,anchor){ if(!panel.openPopup)setTimeout(open,50,panel,options,anchor);else display(panel,options,anchor);}
exports.open=open;function isOpen(panel){return panel.state==="open"}
exports.isOpen=isOpen;function isOpening(panel){return panel.state==="showing"}
exports.isOpening=isOpening
function close(panel){

return panel.hidePopup&&panel.hidePopup();}
exports.close=close
function resize(panel,width,height){
 panel.firstChild.style.width=width+"px";panel.firstChild.style.height=height+"px";}
exports.resize=resize
function display(panel,options,anchor){let document=panel.ownerDocument;let x,y;let{width,height,defaultWidth,defaultHeight}=options;let popupPosition=null;
shimDefaultStyle(panel);if(!anchor){
 panel.style.margin="0";let viewportRect=document.defaultView.gBrowser.getBoundingClientRect();({x,y,width,height})=calculateRegion(options,viewportRect);}
else{
panel.style.margin="";let{CustomizableUI,window}=anchor.ownerDocument.defaultView;

if(CustomizableUI){let node=anchor;({anchor})=CustomizableUI.getWidget(anchor.id).forWindow(window);

 if(node!==anchor)
CustomizableUI.hidePanelForNode(anchor);}
width=width||defaultWidth;height=height||defaultHeight;let rect=anchor.getBoundingClientRect();let zoom=getScreenPixelsPerCSSPixel(window);let screenX=rect.left+window.mozInnerScreenX*zoom;let screenY=rect.top+window.mozInnerScreenY*zoom;
let horizontal,vertical;if(screenY>window.screen.availHeight/2+height)
vertical="top";else
vertical="bottom";if(screenY>window.screen.availWidth/2+width)
horizontal="left";else
horizontal="right";let verticalInverse=vertical=="top"?"bottom":"top";popupPosition=vertical+"center "+verticalInverse+horizontal;

panel.setAttribute("flip","both");}
 
panel.firstChild.style.width=width+"px";panel.firstChild.style.height=height+"px";panel.openPopup(anchor,popupPosition,x,y);}
exports.display=display;function shimDefaultStyle(panel){let document=panel.ownerDocument;



["panel-inner-arrowcontent","panel-arrowcontent"].forEach(function(value){let node=document.getAnonymousElementByAttribute(panel,"class",value);if(node)node.style.padding=0;});}
function show(panel,options,anchor){
 panel.setAttribute("noautofocus",!options.focus);let window=anchor&&getOwnerBrowserWindow(anchor);let{document}=window?window:getMostRecentBrowserWindow();attach(panel,document);open(panel,options,anchor);}
exports.show=show
function setupPanelFrame(frame){frame.setAttribute("flex",1);frame.setAttribute("transparent","transparent");frame.setAttribute("autocompleteenabled",true);if(platform==="darwin"){frame.style.borderRadius="6px";frame.style.padding="1px";}}
function make(document){document=document||getMostRecentBrowserWindow().document;let panel=document.createElementNS(XUL_NS,"panel");panel.setAttribute("type","arrow");


attach(panel,document);let frameOptions={allowJavascript:true,allowPlugins:true,allowAuth:true,allowWindowControl:false,
browser:false,
uri:"data:text/plain;charset=utf-8,"};let backgroundFrame=createFrame(addonWindow,frameOptions);setupPanelFrame(backgroundFrame);let viewFrame=createFrame(panel,frameOptions);setupPanelFrame(viewFrame);function onDisplayChange({type,target}){
 if(target!==this)return;try{swapFrameLoaders(backgroundFrame,viewFrame);}
catch(error){console.exception(error);}
events.emit(type,{subject:panel});}
function onContentReady({target,type}){if(target===getContentDocument(panel)){style(panel);events.emit(type,{subject:panel});}}
function onContentLoad({target,type}){if(target===getContentDocument(panel))
events.emit(type,{subject:panel});}
function onContentChange({subject,type}){let document=subject;if(document===getContentDocument(panel)&&document.defaultView)
events.emit(type,{subject:panel});}
function onPanelStateChange({type}){events.emit(type,{subject:panel})}
panel.addEventListener("popupshowing",onDisplayChange,false);panel.addEventListener("popuphiding",onDisplayChange,false);panel.addEventListener("popupshown",onPanelStateChange,false);panel.addEventListener("popuphidden",onPanelStateChange,false);

panel.addEventListener("DOMContentLoaded",onContentReady,true);backgroundFrame.addEventListener("DOMContentLoaded",onContentReady,true);panel.addEventListener("load",onContentLoad,true);backgroundFrame.addEventListener("load",onContentLoad,true);events.on("document-element-inserted",onContentChange);panel.backgroundFrame=backgroundFrame;
panel.onContentChange=onContentChange;return panel;}
exports.make=make;function attach(panel,document){document=document||getMostRecentBrowserWindow().document;let container=document.getElementById("mainPopupSet");if(container!==panel.parentNode){detach(panel);document.getElementById("mainPopupSet").appendChild(panel);}}
exports.attach=attach;function detach(panel){if(panel.parentNode)panel.parentNode.removeChild(panel);}
exports.detach=detach;function dispose(panel){panel.backgroundFrame.parentNode.removeChild(panel.backgroundFrame);panel.backgroundFrame=null;events.off("document-element-inserted",panel.onContentChange);panel.onContentChange=null;detach(panel);}
exports.dispose=dispose;function style(panel){try{let document=panel.ownerDocument;let contentDocument=getContentDocument(panel);let window=document.defaultView;let node=document.getAnonymousElementByAttribute(panel,"class","panel-arrowcontent")||document.getAnonymousElementByAttribute(panel,"class","panel-inner-arrowcontent");let{color,fontFamily,fontSize,fontWeight}=window.getComputedStyle(node);let style=contentDocument.createElement("style");style.id="sdk-panel-style";style.textContent="body { "+"color: "+color+";"+"font-family: "+fontFamily+";"+"font-weight: "+fontWeight+";"+"font-size: "+fontSize+";"+"}";let container=contentDocument.head?contentDocument.head:contentDocument.documentElement;if(container.firstChild)
container.insertBefore(style,container.firstChild);else
container.appendChild(style);}
catch(error){console.error("Unable to apply panel style");console.exception(error);}}
exports.style=style;let getContentFrame=panel=>(isOpen(panel)||isOpening(panel))?panel.firstChild:panel.backgroundFrame
exports.getContentFrame=getContentFrame;function getContentDocument(panel)getContentFrame(panel).contentDocument
exports.getContentDocument=getContentDocument;function setURL(panel,url){getContentFrame(panel).setAttribute("src",url?data.url(url):url);}
exports.setURL=setURL;function allowContextMenu(panel,allow){if(allow){panel.setAttribute("context","contentAreaContextMenu");}
else{panel.removeAttribute("context");}}
exports.allowContextMenu=allowContextMenu;