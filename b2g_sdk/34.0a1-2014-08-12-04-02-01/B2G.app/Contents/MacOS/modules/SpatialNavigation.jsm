
"use strict";this.EXPORTED_SYMBOLS=["SpatialNavigation"];var SpatialNavigation={init:function(browser,callback){browser.addEventListener("keydown",function(event){_onInputKeyPress(event,callback);},true);}};const Cc=Components.classes;const Ci=Components.interfaces;const Cu=Components.utils;Cu["import"]("resource://gre/modules/Services.jsm",this);let eventListenerService=Cc["@mozilla.org/eventlistenerservice;1"].getService(Ci.nsIEventListenerService);let focusManager=Cc["@mozilla.org/focus-manager;1"].getService(Ci.nsIFocusManager);let windowMediator=Cc['@mozilla.org/appshell/window-mediator;1'].getService(Ci.nsIWindowMediator);function dump(a){Services.console.logStringMessage("SpatialNavigation: "+a);}
function dumpRect(desc,rect){dump(desc+" "+Math.round(rect.left)+" "+Math.round(rect.top)+" "+
Math.round(rect.right)+" "+Math.round(rect.bottom)+" width:"+
Math.round(rect.width)+" height:"+Math.round(rect.height));}
function dumpNodeCoord(desc,node){let rect=node.getBoundingClientRect();dump(desc+" "+node.tagName+" x:"+Math.round(rect.left+rect.width/2)+" y:"+Math.round(rect.top+rect.height/2));}
const kAlt="alt";const kShift="shift";const kCtrl="ctrl";const kNone="none";function _onInputKeyPress(event,callback){if(!PrefObserver['enabled']){return;}

var key=event.which||event.keyCode;if(key!=PrefObserver['keyCodeDown']&&key!=PrefObserver['keyCodeRight']&&key!=PrefObserver['keyCodeUp']&&key!=PrefObserver['keyCodeLeft']&&key!=PrefObserver['keyCodeReturn']){return;}
if(key==PrefObserver['keyCodeReturn']){


if(event.target instanceof Ci.nsIDOMHTMLSelectElement&&event.target.click){event.target.click();event.stopPropagation();event.preventDefault();return;}else{
return;}}
if(!event.altKey&&PrefObserver['modifierAlt']||!event.shiftKey&&PrefObserver['modifierShift']||!event.crtlKey&&PrefObserver['modifierCtrl']){return;}
let currentlyFocused=event.target;let currentlyFocusedWindow=currentlyFocused.ownerDocument.defaultView;let bestElementToFocus=null;
if(currentlyFocused instanceof Ci.nsIDOMHTMLBodyElement){focusManager.moveFocus(currentlyFocusedWindow,null,focusManager.MOVEFOCUS_FIRST,0);event.stopPropagation();event.preventDefault();return;}
if((currentlyFocused instanceof Ci.nsIDOMHTMLInputElement&&currentlyFocused.mozIsTextField(false))||currentlyFocused instanceof Ci.nsIDOMHTMLTextAreaElement){if(currentlyFocused.selectionEnd-currentlyFocused.selectionStart!=0){return;}
if(currentlyFocused.textLength>0){if(key==PrefObserver['keyCodeRight']||key==PrefObserver['keyCodeDown']){if(currentlyFocused.textLength!=currentlyFocused.selectionEnd){return;}}else if(currentlyFocused.selectionStart!=0){return;}}}
let windowUtils=currentlyFocusedWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);let cssPageRect=_getRootBounds(windowUtils);let searchRect=_getSearchRect(currentlyFocused,key,cssPageRect);let nodes={};nodes.length=0;let searchRectOverflows=false;while(!bestElementToFocus&&!searchRectOverflows){switch(key){case PrefObserver['keyCodeLeft']:case PrefObserver['keyCodeRight']:{if(searchRect.top<cssPageRect.top&&searchRect.bottom>cssPageRect.bottom){searchRectOverflows=true;}
break;}
case PrefObserver['keyCodeUp']:case PrefObserver['keyCodeDown']:{if(searchRect.left<cssPageRect.left&&searchRect.right>cssPageRect.right){searchRectOverflows=true;}
break;}}
nodes=windowUtils.nodesFromRect(searchRect.left,searchRect.top,0,searchRect.width,searchRect.height,0,true,false);
switch(key){case PrefObserver['keyCodeLeft']:case PrefObserver['keyCodeRight']:{searchRect.top=searchRect.top-(searchRect.height/2);searchRect.bottom=searchRect.top+(searchRect.height*2);searchRect.height=searchRect.height*2;break;}
case PrefObserver['keyCodeUp']:case PrefObserver['keyCodeDown']:{searchRect.left=searchRect.left-(searchRect.width/2);searchRect.right=searchRect.left+(searchRect.width*2);searchRect.width=searchRect.width*2;break;}}
bestElementToFocus=_getBestToFocus(nodes,key,currentlyFocused);}
if(bestElementToFocus===null){return;}
focusManager.setFocus(bestElementToFocus,focusManager.FLAG_SHOWRING);if((bestElementToFocus instanceof Ci.nsIDOMHTMLInputElement&&bestElementToFocus.mozIsTextField(false))||bestElementToFocus instanceof Ci.nsIDOMHTMLTextAreaElement){bestElementToFocus.selectionStart=0;bestElementToFocus.selectionEnd=bestElementToFocus.textLength;}
if(callback!=undefined){callback(bestElementToFocus);}
event.preventDefault();event.stopPropagation();}
function _getRootBounds(windowUtils){let cssPageRect=windowUtils.getRootBounds();let scrollX={};let scrollY={};windowUtils.getScrollXY(false,scrollX,scrollY);let cssPageRectCopy={};cssPageRectCopy.right=cssPageRect.right-scrollX.value;cssPageRectCopy.left=cssPageRect.left-scrollX.value;cssPageRectCopy.top=cssPageRect.top-scrollY.value;cssPageRectCopy.bottom=cssPageRect.bottom-scrollY.value;cssPageRectCopy.width=cssPageRect.width;cssPageRectCopy.height=cssPageRect.height;return cssPageRectCopy;}

function _getBestToFocus(nodes,key,currentlyFocused){let best=null;let bestDist;let bestMid;let nodeMid;let currentlyFocusedMid=_getMidpoint(currentlyFocused);let currentlyFocusedRect=currentlyFocused.getBoundingClientRect();for(let i=0;i<nodes.length;i++){ if(!_canFocus(nodes[i])||nodes[i]===currentlyFocused){continue;}
 
nodeMid=_getMidpoint(nodes[i]);switch(key){case PrefObserver['keyCodeLeft']:if(nodeMid.x>=(currentlyFocusedMid.x-currentlyFocusedRect.width/2)){continue;}
break;case PrefObserver['keyCodeRight']:if(nodeMid.x<=(currentlyFocusedMid.x+currentlyFocusedRect.width/2)){continue;}
break;case PrefObserver['keyCodeUp']:if(nodeMid.y>=(currentlyFocusedMid.y-currentlyFocusedRect.height/2)){continue;}
break;case PrefObserver['keyCodeDown']:if(nodeMid.y<=(currentlyFocusedMid.y+currentlyFocusedRect.height/2)){continue;}
break;}
if(!best){bestDist=_spatialDistanceOfCorner(currentlyFocused,nodes[i],key);if(bestDist>=0){best=nodes[i];}
continue;}

let curDist=_spatialDistanceOfCorner(currentlyFocused,nodes[i],key);if((curDist>bestDist)||curDist===-1){continue;}
else if(curDist===bestDist){let midCurDist=_spatialDistance(currentlyFocused,nodes[i]);let midBestDist=_spatialDistance(currentlyFocused,best);if(midCurDist>midBestDist)
continue;}
best=nodes[i];bestDist=curDist;}
return best;}
function _getMidpoint(node){let mid={};let box=node.getBoundingClientRect();mid.x=box.left+(box.width/2);mid.y=box.top+(box.height/2);return mid;}
function _canFocus(node){if(node instanceof Ci.nsIDOMHTMLLinkElement||node instanceof Ci.nsIDOMHTMLAnchorElement){return true;}
if((node instanceof Ci.nsIDOMHTMLButtonElement||node instanceof Ci.nsIDOMHTMLInputElement||node instanceof Ci.nsIDOMHTMLLinkElement||node instanceof Ci.nsIDOMHTMLOptGroupElement||node instanceof Ci.nsIDOMHTMLSelectElement||node instanceof Ci.nsIDOMHTMLTextAreaElement)&&node.disabled===false){return true;}
return false;}

function _getSearchRect(currentlyFocused,key,cssPageRect){let currentlyFocusedRect=currentlyFocused.getBoundingClientRect();let newRect={};newRect.left=currentlyFocusedRect.left;newRect.top=currentlyFocusedRect.top;newRect.right=currentlyFocusedRect.right;newRect.bottom=currentlyFocusedRect.bottom;newRect.width=currentlyFocusedRect.width;newRect.height=currentlyFocusedRect.height;switch(key){case PrefObserver['keyCodeLeft']:newRect.right=newRect.left;newRect.left=cssPageRect.left;newRect.width=newRect.right-newRect.left;newRect.bottom=cssPageRect.bottom;newRect.top=cssPageRect.top;newRect.height=newRect.bottom-newRect.top;break;case PrefObserver['keyCodeRight']:newRect.left=newRect.right;newRect.right=cssPageRect.right;newRect.width=newRect.right-newRect.left;newRect.bottom=cssPageRect.bottom;newRect.top=cssPageRect.top;newRect.height=newRect.bottom-newRect.top;break;case PrefObserver['keyCodeUp']:newRect.bottom=newRect.top;newRect.top=cssPageRect.top;newRect.height=newRect.bottom-newRect.top;newRect.right=cssPageRect.right;newRect.left=cssPageRect.left;newRect.width=newRect.right-newRect.left;break;case PrefObserver['keyCodeDown']:newRect.top=newRect.bottom;newRect.bottom=cssPageRect.bottom;newRect.height=newRect.bottom-newRect.top;newRect.right=cssPageRect.right;newRect.left=cssPageRect.left;newRect.width=newRect.right-newRect.left;break;}
return newRect;}
function _spatialDistance(a,b){let mida=_getMidpoint(a);let midb=_getMidpoint(b);return Math.round(Math.pow(mida.x-midb.x,2)+
Math.pow(mida.y-midb.y,2));}
function _spatialDistanceOfCorner(from,to,key){let fromRect=from.getBoundingClientRect();let toRect=to.getBoundingClientRect();let fromMid=_getMidpoint(from);let toMid=_getMidpoint(to);let hDistance=0;let vDistance=0;switch(key){case PrefObserver['keyCodeLeft']:

 if((fromMid.x-toMid.x)<0||toRect.right>=fromRect.right)
return-1;hDistance=Math.abs(fromRect.left-toRect.right);if(toRect.bottom<=fromRect.top){vDistance=fromRect.top-toRect.bottom;}
else if(fromRect.bottom<=toRect.top){vDistance=toRect.top-fromRect.bottom;}
else{vDistance=0;}
break;case PrefObserver['keyCodeRight']:if((toMid.x-fromMid.x)<0||toRect.left<=fromRect.left)
return-1;hDistance=Math.abs(toRect.left-fromRect.right);if(toRect.bottom<=fromRect.top){vDistance=fromRect.top-toRect.bottom;}
else if(fromRect.bottom<=toRect.top){vDistance=toRect.top-fromRect.bottom;}
else{vDistance=0;}
break;case PrefObserver['keyCodeUp']:if((fromMid.y-toMid.y)<0||toRect.bottom>=fromRect.bottom)
return-1;vDistance=Math.abs(fromRect.top-toRect.bottom);if(fromRect.right<=toRect.left){hDistance=toRect.left-fromRect.right;}
else if(toRect.right<=fromRect.left){hDistance=fromRect.left-toRect.right;}
else{hDistance=0;}
break;case PrefObserver['keyCodeDown']:if((toMid.y-fromMid.y)<0||toRect.top<=fromRect.top)
return-1;vDistance=Math.abs(toRect.top-fromRect.bottom);if(fromRect.right<=toRect.left){hDistance=toRect.left-fromRect.right;}
else if(toRect.right<=fromRect.left){hDistance=fromRect.left-toRect.right;}
else{hDistance=0;}
break;}
return Math.round(Math.pow(hDistance,2)+
Math.pow(vDistance,2));}
var PrefObserver={register:function(){this.prefService=Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService);this._branch=this.prefService.getBranch("snav.");this._branch.QueryInterface(Ci.nsIPrefBranch2);this._branch.addObserver("",this,false); this.observe(null,"nsPref:changed","enabled");this.observe(null,"nsPref:changed","xulContentEnabled");this.observe(null,"nsPref:changed","keyCode.modifier");this.observe(null,"nsPref:changed","keyCode.right");this.observe(null,"nsPref:changed","keyCode.up");this.observe(null,"nsPref:changed","keyCode.down");this.observe(null,"nsPref:changed","keyCode.left");this.observe(null,"nsPref:changed","keyCode.return");},observe:function(aSubject,aTopic,aData){if(aTopic!="nsPref:changed"){return;}
switch(aData){case"enabled":try{this.enabled=this._branch.getBoolPref("enabled");}catch(e){this.enabled=false;}
break;case"xulContentEnabled":try{this.xulContentEnabled=this._branch.getBoolPref("xulContentEnabled");}catch(e){this.xulContentEnabled=false;}
break;case"keyCode.modifier":{let keyCodeModifier;try{keyCodeModifier=this._branch.getCharPref("keyCode.modifier"); this.modifierAlt=false;this.modifierShift=false;this.modifierCtrl=false;if(keyCodeModifier!=this.kNone){let mods=keyCodeModifier.split(/\++/);for(let i=0;i<mods.length;i++){let mod=mods[i].toLowerCase();if(mod==="")
continue;else if(mod==kAlt)
this.modifierAlt=true;else if(mod==kShift)
this.modifierShift=true;else if(mod==kCtrl)
this.modifierCtrl=true;else{keyCodeModifier=kNone;break;}}}}catch(e){}
break;}
case"keyCode.up":try{this.keyCodeUp=this._branch.getIntPref("keyCode.up");}catch(e){this.keyCodeUp=Ci.nsIDOMKeyEvent.DOM_VK_UP;}
break;case"keyCode.down":try{this.keyCodeDown=this._branch.getIntPref("keyCode.down");}catch(e){this.keyCodeDown=Ci.nsIDOMKeyEvent.DOM_VK_DOWN;}
break;case"keyCode.left":try{this.keyCodeLeft=this._branch.getIntPref("keyCode.left");}catch(e){this.keyCodeLeft=Ci.nsIDOMKeyEvent.DOM_VK_LEFT;}
break;case"keyCode.right":try{this.keyCodeRight=this._branch.getIntPref("keyCode.right");}catch(e){this.keyCodeRight=Ci.nsIDOMKeyEvent.DOM_VK_RIGHT;}
break;case"keyCode.return":try{this.keyCodeReturn=this._branch.getIntPref("keyCode.return");}catch(e){this.keyCodeReturn=Ci.nsIDOMKeyEvent.DOM_VK_RETURN;}
break;}}};PrefObserver.register();