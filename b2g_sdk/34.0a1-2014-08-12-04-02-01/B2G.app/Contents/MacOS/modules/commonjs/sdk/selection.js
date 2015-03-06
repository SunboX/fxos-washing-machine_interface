"use strict";module.metadata={"stability":"stable","engines":{"Firefox":"*"}};const{Ci,Cc}=require("chrome"),{setTimeout}=require("./timers"),{emit,off}=require("./event/core"),{Class,obscure}=require("./core/heritage"),{EventTarget}=require("./event/target"),{ns}=require("./core/namespace"),{when:unload}=require("./system/unload"),{ignoreWindow}=require('./private-browsing/utils'),{getTabs,getTabContentWindow,getTabForContentWindow,getAllTabContentWindows}=require('./tabs/utils'),winUtils=require("./window/utils"),events=require("./system/events"),{iteratorSymbol,forInIterator}=require("./util/iteration");const HTML=0x01,TEXT=0x02,DOM=0x03;

const ERR_CANNOT_CHANGE_SELECTION="It isn't possible to change the selection, as there isn't currently a selection";const selections=ns();const Selection=Class({initialize:function initialize(rangeNumber){



Object.defineProperties(this,{rangeNumber:{enumerable:false,configurable:false,value:rangeNumber}});},get text(){return getSelection(TEXT,this.rangeNumber);},set text(value){setSelection(TEXT,value,this.rangeNumber);},get html(){return getSelection(HTML,this.rangeNumber);},set html(value){setSelection(HTML,value,this.rangeNumber);},get isContiguous(){
let count=0;for(let sel in selectionIterator)
if(++count>1)
break;return count===1;}});const selectionListener={notifySelectionChanged:function(document,selection,reason){if(!["SELECTALL","KEYPRESS","MOUSEUP"].some(function(type)reason&Ci.nsISelectionListener[type+"_REASON"])||selection.toString()=="")
return;this.onSelect();},onSelect:function(){emit(module.exports,"select");}}
function*forOfIterator(){let selection=getSelection(DOM);let count=0;if(selection)
count=selection.rangeCount||(getElementWithSelection()?1:0);for(let i=0;i<count;i++){let sel=Selection(i);if(sel.text)
yield Selection(i);}}
const selectionIteratorOptions={__iterator__:forInIterator}
selectionIteratorOptions[iteratorSymbol]=forOfIterator;const selectionIterator=obscure(selectionIteratorOptions);function getFocusedWindow(){let window=winUtils.getFocusedWindow();return ignoreWindow(window)?null:window;}
function getFocusedElement(){let element=winUtils.getFocusedElement();if(!element||ignoreWindow(element.ownerDocument.defaultView))
return null;return element;}
function getSelection(type,rangeNumber){let window,selection;try{window=getFocusedWindow();selection=window.getSelection();}
catch(e){return null;} 
if(type==DOM){return selection;}
else if(type==TEXT){let range=safeGetRange(selection,rangeNumber);if(range)
return range.toString();let node=getElementWithSelection();if(!node)
return null;return node.value.substring(node.selectionStart,node.selectionEnd);}
else if(type==HTML){let range=safeGetRange(selection,rangeNumber);
if(!range)
return null;let node=window.document.createElement("span");node.appendChild(range.cloneContents());return node.innerHTML;}
throw new Error("Type "+type+" is unrecognized.");}
function setSelection(type,val,rangeNumber){let window,selection;try{window=getFocusedWindow();selection=window.getSelection();}
catch(e){throw new Error(ERR_CANNOT_CHANGE_SELECTION);}
let range=safeGetRange(selection,rangeNumber);if(range){let fragment;if(type===HTML)
fragment=range.createContextualFragment(val);else{fragment=range.createContextualFragment("");fragment.textContent=val;}
range.deleteContents();range.insertNode(fragment);}
else{let node=getElementWithSelection();if(!node)
throw new Error(ERR_CANNOT_CHANGE_SELECTION);let{value,selectionStart,selectionEnd}=node;let newSelectionEnd=selectionStart+val.length;node.value=value.substring(0,selectionStart)+
val+
value.substring(selectionEnd,value.length);node.setSelectionRange(selectionStart,newSelectionEnd);}}
function safeGetRange(selection,rangeNumber){try{let{rangeCount}=selection;let range=null;if(typeof rangeNumber==="undefined")
rangeNumber=0;else
rangeCount=rangeNumber+1;for(;rangeNumber<rangeCount;rangeNumber++){range=selection.getRangeAt(rangeNumber);if(range&&range.toString())
break;range=null;}
return range;}
catch(e){return null;}}
function getElementWithSelection(){let element=getFocusedElement();if(!element)
return null;try{

 let{value,selectionStart,selectionEnd}=element;let hasSelection=typeof value==="string"&&!isNaN(selectionStart)&&!isNaN(selectionEnd)&&selectionStart!==selectionEnd;return hasSelection?element:null;}
catch(err){return null;}}
function addSelectionListener(window){let selection=window.getSelection(); if("selection"in selections(window)&&selections(window).selection===selection)
return;

 if(selection instanceof Ci.nsISelectionPrivate)
selection.addSelectionListener(selectionListener);

 window.addEventListener("select",selectionListener.onSelect,true);selections(window).selection=selection;};function removeSelectionListener(window){if(!("selection"in selections(window)))
return;let selection=window.getSelection();let isSameSelection=selection===selections(window).selection;

if(selection instanceof Ci.nsISelectionPrivate&&isSameSelection)
selection.removeSelectionListener(selectionListener);window.removeEventListener("select",selectionListener.onSelect,true);delete selections(window).selection;};function onContent(event){let window=event.subject.defaultView; 
if(window&&getTabForContentWindow(window)&&!ignoreWindow(window)){addSelectionListener(window);}}


events.on("document-element-inserted",onContent,true);getAllTabContentWindows().forEach(addSelectionListener);


function onShown(event){let window=event.subject.defaultView;if(!window)
return; if("selection"in selections(window)){let currentSelection=window.getSelection();let{selection}=selections(window);




if(currentSelection instanceof Ci.nsISelectionPrivate&&currentSelection!==selection){window.addEventListener("select",selectionListener.onSelect,true);currentSelection.addSelectionListener(selectionListener);selections(window).selection=currentSelection;}}}
events.on("document-shown",onShown,true);unload(function(){getAllTabContentWindows().forEach(removeSelectionListener);events.off("document-element-inserted",onContent);events.off("document-shown",onShown);off(exports);});const selection=Class({extends:EventTarget,implements:[Selection,selectionIterator]})();module.exports=selection;