"use strict";module.metadata={"stability":"experimental","engines":{"Firefox":"> 28"}};const{Cu}=require("chrome");const{CustomizableUI}=Cu.import('resource:///modules/CustomizableUI.jsm',{});const{subscribe,send,Reactor,foldp,lift,merges}=require("../../event/utils");const{InputPort}=require("../../input/system");const{OutputPort}=require("../../output/system");const{Interactive}=require("../../input/browser");const{CustomizationInput}=require("../../input/customizable-ui");const{pairs,map,isEmpty,object,each,keys,values}=require("../../util/sequence");const{curry,flip}=require("../../lang/functional");const{patch,diff}=require("diffpatcher/index");const prefs=require("../../preferences/service");const{getByOuterId}=require("../../window/utils");const XUL_NS="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";const PREF_ROOT="extensions.sdk-toolbar-collapsed.";



const output=new OutputPort({id:"toolbar-changed"});const syncoutput=new OutputPort({id:"toolbar-change",sync:true});
const Toolbars=foldp(patch,{},merges([new InputPort({id:"toolbar-changed"}),new InputPort({id:"toolbar-change"})]));const State=lift((toolbars,windows,customizable)=>({windows:windows,toolbars:toolbars,customizable:customizable}),Toolbars,Interactive,new CustomizationInput());const collapseToolbar=event=>{const toolbar=event.target.parentNode;toolbar.collapsed=true;};const parseAttribute=x=>x==="true"?true:x==="false"?false:x===""?null:x;


const attributesChanged=mutations=>{const delta=mutations.reduce((changes,{attributeName,target})=>{const id=target.id;const field=attributeName==="toolbarname"?"title":attributeName;let change=changes[id]||(changes[id]={});change[field]=parseAttribute(target.getAttribute(attributeName));return changes;},{});
const updates=diff(reactor.value,patch(reactor.value,delta));if(!isEmpty(pairs(updates))){
send(syncoutput,updates);}};

const addView=curry((options,{document})=>{let view=document.createElementNS(XUL_NS,"toolbar");view.setAttribute("id",options.id);view.setAttribute("collapsed",options.collapsed);view.setAttribute("toolbarname",options.title);view.setAttribute("pack","end");view.setAttribute("customizable","false");view.setAttribute("style","padding: 2px 0; max-height: 40px;");view.setAttribute("mode","icons");view.setAttribute("iconsize","small");view.setAttribute("context","toolbar-context-menu");view.setAttribute("class","toolbar-primary chromeclass-toolbar");let label=document.createElementNS(XUL_NS,"label");label.setAttribute("value",options.title);label.setAttribute("collapsed","true");view.appendChild(label);let closeButton=document.createElementNS(XUL_NS,"toolbarbutton");closeButton.setAttribute("id","close-"+options.id);closeButton.setAttribute("class","close-icon");closeButton.setAttribute("customizable",false);closeButton.addEventListener("command",collapseToolbar);view.appendChild(closeButton);

 let toolbar=document.createElementNS(XUL_NS,"toolbar");toolbar.setAttribute("id","inner-"+options.id);toolbar.setAttribute("defaultset",options.items.join(","));toolbar.setAttribute("customizable","true");toolbar.setAttribute("style","-moz-appearance: none; overflow: hidden");toolbar.setAttribute("mode","icons");toolbar.setAttribute("iconsize","small");toolbar.setAttribute("context","toolbar-context-menu");toolbar.setAttribute("flex","1");view.insertBefore(toolbar,closeButton);const observer=new document.defaultView.MutationObserver(attributesChanged);observer.observe(view,{attributes:true,attributeFilter:["collapsed","toolbarname"]});const toolbox=document.getElementById("navigator-toolbox");toolbox.appendChild(view);});const viewAdd=curry(flip(addView));const removeView=curry((id,{document})=>{const view=document.getElementById(id);if(view)view.remove();});const updateView=curry((id,{title,collapsed,isCustomizing},{document})=>{const view=document.getElementById(id);if(!view)
return;if(title)
view.setAttribute("toolbarname",title);if(collapsed!==void(0))
view.setAttribute("collapsed",Boolean(collapsed));if(isCustomizing!==void(0)){view.querySelector("label").collapsed=!isCustomizing;view.querySelector("toolbar").style.visibility=isCustomizing?"hidden":"visible";}});const viewUpdate=curry(flip(updateView));const registerToolbar=state=>{CustomizableUI.registerArea("inner-"+state.id,{type:CustomizableUI.TYPE_TOOLBAR,legacy:true,defaultPlacements:[...state.items]});};const unregisterToolbar=CustomizableUI.unregisterArea;const reactor=new Reactor({onStep:(present,past)=>{const delta=diff(past,present);each(([id,update])=>{

if(update===null){unregisterToolbar("inner-"+id);each(removeView(id),values(past.windows));send(output,object([id,null]));}
else if(past.toolbars[id]){
if(update.collapsed!==void(0))
prefs.set(PREF_ROOT+id,update.collapsed);each(updateView(id,update),values(past.windows));send(output,object([id,update]));}



else if(update.id){
const state=patch(update,{collapsed:prefs.get(PREF_ROOT+id,update.collapsed),});
registerToolbar(state);each(addView(state),values(past.windows));send(output,object([state.id,state]));}},pairs(delta.toolbars));each(window=>{if(window)
each(viewAdd(window),values(past.toolbars));},values(delta.windows));each(([id,isCustomizing])=>{each(viewUpdate(getByOuterId(id),{isCustomizing:!!isCustomizing}),keys(present.toolbars));},pairs(delta.customizable))},onEnd:state=>{each(id=>{unregisterToolbar("inner-"+id);each(removeView(id),values(state.windows));},keys(state.toolbars));}});reactor.run(State);