"use strict";module.metadata={"stability":"stable","engines":{"Firefox":"*"}};const{Class,mix}=require("./core/heritage");const{addCollectionProperty}=require("./util/collection");const{ns}=require("./core/namespace");const{validateOptions,getTypeOf}=require("./deprecated/api-utils");const{URL,isValidURI}=require("./url");const{WindowTracker,browserWindowIterator}=require("./deprecated/window-utils");const{isBrowser,getInnerId}=require("./window/utils");const{Ci}=require("chrome");const{MatchPattern}=require("./util/match-pattern");const{Worker}=require("./content/worker");const{EventTarget}=require("./event/target");const{emit}=require('./event/core');const{when}=require('./system/unload');const selection=require('./selection');const{contract:loaderContract}=require('./content/loader');const ITEM_CLASS="addon-context-menu-item";const TOPLEVEL_ITEM_CLASS="addon-context-menu-item-toplevel";const OVERFLOW_ITEM_CLASS="addon-context-menu-item-overflow";
const SEPARATOR_CLASS="addon-context-menu-separator";
const OVERFLOW_THRESH_DEFAULT=10;const OVERFLOW_THRESH_PREF="extensions.addon-sdk.context-menu.overflowThreshold";const OVERFLOW_MENU_LABEL="Add-ons";const OVERFLOW_MENU_CLASS="addon-content-menu-overflow-menu";const OVERFLOW_POPUP_CLASS="addon-content-menu-overflow-popup";

const NON_PAGE_CONTEXT_ELTS=[Ci.nsIDOMHTMLAnchorElement,Ci.nsIDOMHTMLAppletElement,Ci.nsIDOMHTMLAreaElement,Ci.nsIDOMHTMLButtonElement,Ci.nsIDOMHTMLCanvasElement,Ci.nsIDOMHTMLEmbedElement,Ci.nsIDOMHTMLImageElement,Ci.nsIDOMHTMLInputElement,Ci.nsIDOMHTMLMapElement,Ci.nsIDOMHTMLMediaElement,Ci.nsIDOMHTMLMenuElement,Ci.nsIDOMHTMLObjectElement,Ci.nsIDOMHTMLOptionElement,Ci.nsIDOMHTMLSelectElement,Ci.nsIDOMHTMLTextAreaElement,];let internal=ns();function getScheme(spec){try{return URL(spec).scheme;}
catch(e){return null;}}
let Context=Class({ adjustPopupNode:function adjustPopupNode(popupNode){return popupNode;}, isCurrent:function isCurrent(popupNode){return false;}});
let PageContext=Class({extends:Context,isCurrent:function isCurrent(popupNode){ if(!popupNode.ownerDocument.defaultView.getSelection().isCollapsed)
return false;
 while(!(popupNode instanceof Ci.nsIDOMDocument)){if(NON_PAGE_CONTEXT_ELTS.some(function(type)popupNode instanceof type))
return false;popupNode=popupNode.parentNode;}
return true;}});exports.PageContext=PageContext;let SelectionContext=Class({extends:Context,isCurrent:function isCurrent(popupNode){if(!popupNode.ownerDocument.defaultView.getSelection().isCollapsed)
return true;try{
let{selectionStart,selectionEnd}=popupNode;return!isNaN(selectionStart)&&!isNaN(selectionEnd)&&selectionStart!==selectionEnd;}
catch(e){return false;}}});exports.SelectionContext=SelectionContext;
let SelectorContext=Class({extends:Context,initialize:function initialize(selector){let options=validateOptions({selector:selector},{selector:{is:["string"],msg:"selector must be a string."}});internal(this).selector=options.selector;},adjustPopupNode:function adjustPopupNode(popupNode){let selector=internal(this).selector;while(!(popupNode instanceof Ci.nsIDOMDocument)){if(popupNode.mozMatchesSelector(selector))
return popupNode;popupNode=popupNode.parentNode;}
return null;},isCurrent:function isCurrent(popupNode){return!!this.adjustPopupNode(popupNode);}});exports.SelectorContext=SelectorContext;let URLContext=Class({extends:Context,initialize:function initialize(patterns){patterns=Array.isArray(patterns)?patterns:[patterns];try{internal(this).patterns=patterns.map(function(p)new MatchPattern(p));}
catch(err){throw new Error("Patterns must be a string, regexp or an array of "+"strings or regexps: "+err);}},isCurrent:function isCurrent(popupNode){let url=popupNode.ownerDocument.URL;return internal(this).patterns.some(function(p)p.test(url));}});exports.URLContext=URLContext;let PredicateContext=Class({extends:Context,initialize:function initialize(predicate){let options=validateOptions({predicate:predicate},{predicate:{is:["function"],msg:"predicate must be a function."}});internal(this).predicate=options.predicate;},isCurrent:function isCurrent(popupNode){return internal(this).predicate(populateCallbackNodeData(popupNode));}});exports.PredicateContext=PredicateContext;
let editableInputs={email:true,number:true,password:true,search:true,tel:true,text:true,textarea:true,url:true};function populateCallbackNodeData(node){let window=node.ownerDocument.defaultView;let data={};data.documentType=node.ownerDocument.contentType;data.documentURL=node.ownerDocument.location.href;data.targetName=node.nodeName.toLowerCase();data.targetID=node.id||null;if((data.targetName==='input'&&editableInputs[node.type])||data.targetName==='textarea'){data.isEditable=!node.readOnly&&!node.disabled;}
else{data.isEditable=node.isContentEditable;}
data.selectionText=selection.text;data.srcURL=node.src||null;data.value=node.value||null;while(!data.linkURL&&node){data.linkURL=node.href||null;node=node.parentNode;}
return data;}
function removeItemFromArray(array,item){return array.filter(function(i)i!==item);}
function stringOrNull(val)val?String(val):val;let baseItemRules={parentMenu:{is:["object","undefined"],ok:function(v){if(!v)
return true;return(v instanceof ItemContainer)||(v instanceof Menu);},msg:"parentMenu must be a Menu or not specified."},context:{is:["undefined","object","array"],ok:function(v){if(!v)
return true;let arr=Array.isArray(v)?v:[v];return arr.every(function(o)o instanceof Context);},msg:"The 'context' option must be a Context object or an array of "+"Context objects."},onMessage:{is:["function","undefined"]},contentScript:loaderContract.rules.contentScript,contentScriptFile:loaderContract.rules.contentScriptFile};let labelledItemRules=mix(baseItemRules,{label:{map:stringOrNull,is:["string"],ok:function(v)!!v,msg:"The item must have a non-empty string label."},image:{map:stringOrNull,is:["string","undefined","null"],ok:function(url){if(!url)
return true;return isValidURI(url);},msg:"Image URL validation failed"}});let itemRules=mix(labelledItemRules,{data:{map:stringOrNull,is:["string","undefined","null"]}});let menuRules=mix(labelledItemRules,{items:{is:["array","undefined"],ok:function(v){if(!v)
return true;return v.every(function(item){return item instanceof BaseItem;});},msg:"items must be an array, and each element in the array must be an "+"Item, Menu, or Separator."}});let ContextWorker=Class({implements:[Worker],anyContextListeners:function anyContextListeners(){return this.getSandbox().hasListenerFor("context");},


getMatchedContext:function getCurrentContexts(popupNode){let results=this.getSandbox().emitSync("context",popupNode);return results.reduce(function(val,result)val||result,null);},

fireClick:function fireClick(popupNode,clickedItemData){this.getSandbox().emitSync("click",popupNode,clickedItemData);}});
function hasMatchingContext(contexts,popupNode){for(let context in contexts){if(!context.isCurrent(popupNode))
return false;}
return true;}

function getCurrentWorkerContext(item,popupNode){let worker=getItemWorkerForWindow(item,popupNode.ownerDocument.defaultView);if(!worker||!worker.anyContextListeners())
return true;return worker.getMatchedContext(popupNode);}

function isItemVisible(item,popupNode,defaultVisibility){if(!item.context.length){let worker=getItemWorkerForWindow(item,popupNode.ownerDocument.defaultView);if(!worker||!worker.anyContextListeners())
return defaultVisibility;}
if(!hasMatchingContext(item.context,popupNode))
return false;let context=getCurrentWorkerContext(item,popupNode);if(typeof(context)==="string"&&context!="")
item.label=context;return!!context;}

function getItemWorkerForWindow(item,window){if(!item.contentScript&&!item.contentScriptFile)
return null;let id=getInnerId(window);let worker=internal(item).workerMap.get(id);if(worker)
return worker;worker=ContextWorker({window:window,contentScript:item.contentScript,contentScriptFile:item.contentScriptFile,onMessage:function(msg){emit(item,"message",msg);},onDetach:function(){internal(item).workerMap.delete(id);}});internal(item).workerMap.set(id,worker);return worker;}

function itemClicked(item,clickedItem,popupNode){let worker=getItemWorkerForWindow(item,popupNode.ownerDocument.defaultView);if(worker){let adjustedNode=popupNode;for(let context in item.context)
adjustedNode=context.adjustPopupNode(adjustedNode);worker.fireClick(adjustedNode,clickedItem.data);}
if(item.parentMenu)
itemClicked(item.parentMenu,clickedItem,popupNode);}
let BaseItem=Class({initialize:function initialize(){addCollectionProperty(this,"context");
 internal(this).workerMap=new Map();if("context"in internal(this).options&&internal(this).options.context){let contexts=internal(this).options.context;if(Array.isArray(contexts)){for(let context of contexts)
this.context.add(context);}
else{this.context.add(contexts);}}
let parentMenu=internal(this).options.parentMenu;if(!parentMenu)
parentMenu=contentContextMenu;parentMenu.addItem(this);Object.defineProperty(this,"contentScript",{enumerable:true,value:internal(this).options.contentScript});Object.defineProperty(this,"contentScriptFile",{enumerable:true,value:internal(this).options.contentScriptFile});},destroy:function destroy(){if(this.parentMenu)
this.parentMenu.removeItem(this);},get parentMenu(){return internal(this).parentMenu;},});let LabelledItem=Class({extends:BaseItem,implements:[EventTarget],initialize:function initialize(options){BaseItem.prototype.initialize.call(this);EventTarget.prototype.initialize.call(this,options);},destroy:function destroy(){for(let[,worker]of internal(this).workerMap)
worker.destroy();BaseItem.prototype.destroy.call(this);},get label(){return internal(this).options.label;},set label(val){internal(this).options.label=val;MenuManager.updateItem(this);},get image(){return internal(this).options.image;},set image(val){internal(this).options.image=val;MenuManager.updateItem(this);},get data(){return internal(this).options.data;},set data(val){internal(this).options.data=val;}});let Item=Class({extends:LabelledItem,initialize:function initialize(options){internal(this).options=validateOptions(options,itemRules);LabelledItem.prototype.initialize.call(this,options);},toString:function toString(){return"[object Item \""+this.label+"\"]";},get data(){return internal(this).options.data;},set data(val){internal(this).options.data=val;MenuManager.updateItem(this);},});exports.Item=Item;let ItemContainer=Class({initialize:function initialize(){internal(this).children=[];},destroy:function destroy(){ for(let item of internal(this).children)
item.destroy();},addItem:function addItem(item){let oldParent=item.parentMenu;
 if(oldParent)
internal(oldParent).children=removeItemFromArray(internal(oldParent).children,item);let after=null;let children=internal(this).children;if(children.length>0)
after=children[children.length-1];children.push(item);internal(item).parentMenu=this;
 if(oldParent)
MenuManager.moveItem(item,after);else
MenuManager.createItem(item,after);},removeItem:function removeItem(item){ if(item.parentMenu!==this)
return;MenuManager.removeItem(item);internal(this).children=removeItemFromArray(internal(this).children,item);internal(item).parentMenu=null;},get items(){return internal(this).children.slice(0);},set items(val){ if(!Array.isArray(val))
throw new Error(menuOptionRules.items.msg);for(let item of val){if(!(item instanceof BaseItem))
throw new Error(menuOptionRules.items.msg);} 
for(let item of internal(this).children)
this.removeItem(item);for(let item of val)
this.addItem(item);},});let Menu=Class({extends:LabelledItem,implements:[ItemContainer],initialize:function initialize(options){internal(this).options=validateOptions(options,menuRules);LabelledItem.prototype.initialize.call(this,options);ItemContainer.prototype.initialize.call(this);if(internal(this).options.items){for(let item of internal(this).options.items)
this.addItem(item);}},destroy:function destroy(){ItemContainer.prototype.destroy.call(this);LabelledItem.prototype.destroy.call(this);},toString:function toString(){return"[object Menu \""+this.label+"\"]";},});exports.Menu=Menu;let Separator=Class({extends:BaseItem,initialize:function initialize(options){internal(this).options=validateOptions(options,baseItemRules);BaseItem.prototype.initialize.call(this);},toString:function toString(){return"[object Separator]";}});exports.Separator=Separator;let contentContextMenu=ItemContainer();exports.contentContextMenu=contentContextMenu;when(function(){contentContextMenu.destroy();});
function countVisibleItems(nodes){return Array.reduce(nodes,function(sum,node){return node.hidden?sum:sum+1;},0);}
let MenuWrapper=Class({initialize:function initialize(winWrapper,items,contextMenu){this.winWrapper=winWrapper;this.window=winWrapper.window;this.items=items;this.contextMenu=contextMenu;this.populated=false;this.menuMap=new Map();
 this._updateItemVisibilities=this.updateItemVisibilities.bind(this);this.contextMenu.addEventListener("popupshowing",this._updateItemVisibilities,true);this._updateOverflowState=this.updateOverflowState.bind(this);this.contextMenu.addEventListener("popupshowing",this._updateOverflowState,false);},destroy:function destroy(){this.contextMenu.removeEventListener("popupshowing",this._updateOverflowState,false);this.contextMenu.removeEventListener("popupshowing",this._updateItemVisibilities,true);if(!this.populated)
return;
 let oldParent=null;for(let item of internal(this.items).children){let xulNode=this.getXULNodeForItem(item);oldParent=xulNode.parentNode;oldParent.removeChild(xulNode);}
if(oldParent)
this.onXULRemoved(oldParent);},get separator(){return this.contextMenu.querySelector("."+SEPARATOR_CLASS);},get overflowMenu(){return this.contextMenu.querySelector("."+OVERFLOW_MENU_CLASS);},get overflowPopup(){return this.contextMenu.querySelector("."+OVERFLOW_POPUP_CLASS);},get topLevelItems(){return this.contextMenu.querySelectorAll("."+TOPLEVEL_ITEM_CLASS);},get overflowItems(){return this.contextMenu.querySelectorAll("."+OVERFLOW_ITEM_CLASS);},getXULNodeForItem:function getXULNodeForItem(item){return this.menuMap.get(item);}, populate:function populate(menu){for(let i=0;i<internal(menu).children.length;i++){let item=internal(menu).children[i];let after=i===0?null:internal(menu).children[i-1];this.createItem(item,after);if(item instanceof Menu)
this.populate(item);}},
 setVisibility:function setVisibility(menu,popupNode,defaultVisibility){let anyVisible=false;for(let item of internal(menu).children){let visible=isItemVisible(item,popupNode,defaultVisibility);
if(visible&&(item instanceof Menu))
visible=this.setVisibility(item,popupNode,true);let xulNode=this.getXULNodeForItem(item);xulNode.hidden=!visible;anyVisible=anyVisible||visible;}
return anyVisible;}, insertIntoXUL:function insertIntoXUL(item,node,after){let menupopup=null;let before=null;let menu=item.parentMenu;if(menu===this.items){
 menupopup=this.overflowPopup;if(!menupopup)
menupopup=this.contextMenu;}
else{let xulNode=this.getXULNodeForItem(menu);menupopup=xulNode.firstChild;}
if(after){let afterNode=this.getXULNodeForItem(after);before=afterNode.nextSibling;}
else if(menupopup===this.contextMenu){let topLevel=this.topLevelItems;if(topLevel.length>0)
before=topLevel[topLevel.length-1].nextSibling;else
before=this.separator.nextSibling;}
menupopup.insertBefore(node,before);}, updateXULClass:function updateXULClass(xulNode){if(xulNode.parentNode==this.contextMenu)
xulNode.classList.add(TOPLEVEL_ITEM_CLASS);else
xulNode.classList.remove(TOPLEVEL_ITEM_CLASS);if(xulNode.parentNode==this.overflowPopup)
xulNode.classList.add(OVERFLOW_ITEM_CLASS);else
xulNode.classList.remove(OVERFLOW_ITEM_CLASS);}, createItem:function createItem(item,after){if(!this.populated)
return; if(!this.separator){let separator=this.window.document.createElement("menuseparator");separator.setAttribute("class",SEPARATOR_CLASS);
 let oldSeparator=this.window.document.getElementById("jetpack-context-menu-separator");if(oldSeparator&&oldSeparator.parentNode!=this.contextMenu)
oldSeparator=null;this.contextMenu.insertBefore(separator,oldSeparator);}
let type="menuitem";if(item instanceof Menu)
type="menu";else if(item instanceof Separator)
type="menuseparator";let xulNode=this.window.document.createElement(type);xulNode.setAttribute("class",ITEM_CLASS);if(item instanceof LabelledItem){xulNode.setAttribute("label",item.label);if(item.image){xulNode.setAttribute("image",item.image);if(item instanceof Menu)
xulNode.classList.add("menu-iconic");else
xulNode.classList.add("menuitem-iconic");}
if(item.data)
xulNode.setAttribute("value",item.data);let self=this;xulNode.addEventListener("command",function(event){ if(event.target!==xulNode)
return;itemClicked(item,item,self.contextMenu.triggerNode);},false);}
this.insertIntoXUL(item,xulNode,after);this.updateXULClass(xulNode);xulNode.data=item.data;if(item instanceof Menu){let menupopup=this.window.document.createElement("menupopup");xulNode.appendChild(menupopup);}
this.menuMap.set(item,xulNode);}, updateItem:function updateItem(item){if(!this.populated)
return;let xulNode=this.getXULNodeForItem(item); xulNode.setAttribute("label",item.label);if(item.image){xulNode.setAttribute("image",item.image);if(item instanceof Menu)
xulNode.classList.add("menu-iconic");else
xulNode.classList.add("menuitem-iconic");}
else{xulNode.removeAttribute("image");xulNode.classList.remove("menu-iconic");xulNode.classList.remove("menuitem-iconic");}
if(item.data)
xulNode.setAttribute("value",item.data);else
xulNode.removeAttribute("value");},
 moveItem:function moveItem(item,after){if(!this.populated)
return;let xulNode=this.getXULNodeForItem(item);let oldParent=xulNode.parentNode;this.insertIntoXUL(item,xulNode,after);this.updateXULClass(xulNode);this.onXULRemoved(oldParent);},removeItem:function removeItem(item){if(!this.populated)
return;let xulItem=this.getXULNodeForItem(item);let oldParent=xulItem.parentNode;oldParent.removeChild(xulItem);this.menuMap.delete(item);this.onXULRemoved(oldParent);},
 onXULRemoved:function onXULRemoved(parent){if(parent==this.contextMenu){let toplevel=this.topLevelItems; if(toplevel.length==0){let separator=this.separator;if(separator)
separator.parentNode.removeChild(separator);}}
else if(parent==this.overflowPopup){ if(parent.childNodes.length==0){let separator=this.separator;separator.parentNode.removeChild(separator);this.contextMenu.removeChild(parent.parentNode);}}},
 updateItemVisibilities:function updateItemVisibilities(event){try{if(event.type!="popupshowing")
return;if(event.target!=this.contextMenu)
return;if(internal(this.items).children.length==0)
return;if(!this.populated){this.populated=true;this.populate(this.items);}
let popupNode=event.target.triggerNode;this.setVisibility(this.items,popupNode,PageContext().isCurrent(popupNode));}
catch(e){console.exception(e);}},

 updateOverflowState:function updateOverflowState(event){try{if(event.type!="popupshowing")
return;if(event.target!=this.contextMenu)
return;

 let toplevel=this.topLevelItems;let overflow=this.overflowItems;let visibleCount=countVisibleItems(toplevel)+
countVisibleItems(overflow);if(visibleCount==0){let separator=this.separator;if(separator)
separator.hidden=true;let overflowMenu=this.overflowMenu;if(overflowMenu)
overflowMenu.hidden=true;}
else if(visibleCount>MenuManager.overflowThreshold){this.separator.hidden=false;let overflowPopup=this.overflowPopup;if(overflowPopup)
overflowPopup.parentNode.hidden=false;if(toplevel.length>0){ if(!overflowPopup){let overflowMenu=this.window.document.createElement("menu");overflowMenu.setAttribute("class",OVERFLOW_MENU_CLASS);overflowMenu.setAttribute("label",OVERFLOW_MENU_LABEL);this.contextMenu.insertBefore(overflowMenu,this.separator.nextSibling);overflowPopup=this.window.document.createElement("menupopup");overflowPopup.setAttribute("class",OVERFLOW_POPUP_CLASS);overflowMenu.appendChild(overflowPopup);}
for(let xulNode of toplevel){overflowPopup.appendChild(xulNode);this.updateXULClass(xulNode);}}}
else{this.separator.hidden=false;if(overflow.length>0){
 for(let xulNode of overflow){this.contextMenu.insertBefore(xulNode,xulNode.parentNode.parentNode);this.updateXULClass(xulNode);}
this.contextMenu.removeChild(this.overflowMenu);}}}
catch(e){console.exception(e);}}});let WindowWrapper=Class({initialize:function initialize(window){this.window=window;this.menus=[new MenuWrapper(this,contentContextMenu,window.document.getElementById("contentAreaContextMenu")),];},destroy:function destroy(){for(let menuWrapper of this.menus)
menuWrapper.destroy();},getMenuWrapperForItem:function getMenuWrapperForItem(item){let root=item.parentMenu;while(root.parentMenu)
root=root.parentMenu;for(let wrapper of this.menus){if(wrapper.items===root)
return wrapper;}
return null;}});let MenuManager={windowMap:new Map(),get overflowThreshold(){let prefs=require("./preferences/service");return prefs.get(OVERFLOW_THRESH_PREF,OVERFLOW_THRESH_DEFAULT);}, onTrack:function onTrack(window){if(!isBrowser(window))
return; if(this.windowMap.has(window)){console.warn("Already seen this window");return;}
let winWrapper=WindowWrapper(window);this.windowMap.set(window,winWrapper);},onUntrack:function onUntrack(window){if(!isBrowser(window))
return;let winWrapper=this.windowMap.get(window); if(!winWrapper)
return;winWrapper.destroy();this.windowMap.delete(window);}, createItem:function createItem(item,after){for(let[window,winWrapper]of this.windowMap){let menuWrapper=winWrapper.getMenuWrapperForItem(item);if(menuWrapper)
menuWrapper.createItem(item,after);}}, updateItem:function updateItem(item){for(let[window,winWrapper]of this.windowMap){let menuWrapper=winWrapper.getMenuWrapperForItem(item);if(menuWrapper)
menuWrapper.updateItem(item);}},
 moveItem:function moveItem(item,after){for(let[window,winWrapper]of this.windowMap){let menuWrapper=winWrapper.getMenuWrapperForItem(item);if(menuWrapper)
menuWrapper.moveItem(item,after);}},removeItem:function removeItem(item){for(let[window,winWrapper]of this.windowMap){let menuWrapper=winWrapper.getMenuWrapperForItem(item);if(menuWrapper)
menuWrapper.removeItem(item);}}};WindowTracker(MenuManager);