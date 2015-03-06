"use strict";module.metadata={"stability":"experimental","engines":{"Firefox":"> 28"}};const{Class}=require("../../core/heritage");const{EventTarget}=require("../../event/target");const{off,setListeners,emit}=require("../../event/core");const{Reactor,foldp,merges,send}=require("../../event/utils");const{Disposable}=require("../../core/disposable");const{InputPort}=require("../../input/system");const{OutputPort}=require("../../output/system");const{identify}=require("../id");const{pairs,object,map,each}=require("../../util/sequence");const{patch,diff}=require("diffpatcher/index");const{contract}=require("../../util/contract");const{id:addonID}=require("../../self");

const input=foldp(patch,{},new InputPort({id:"toolbar-changed"}));const output=new OutputPort({id:"toolbar-change"});
const titleToId=title=>("toolbar-"+addonID+"-"+title).toLowerCase().replace(/\s/g,"-").replace(/[^A-Za-z0-9_\-]/g,"");const validate=contract({title:{is:["string"],ok:x=>x.length>0,msg:"The `option.title` string must be provided"},items:{is:["undefined","object","array"],msg:"The `options.items` must be iterable sequence of items"},hidden:{is:["boolean","undefined"],msg:"The `options.hidden` must be boolean"}});let toolbars=new Map();const Toolbar=Class({extends:EventTarget,implements:[Disposable],initialize:function(params={}){const options=validate(params);const id=titleToId(options.title);if(toolbars.has(id))
throw Error("Toolbar with this id already exists: "+id);


const items=Object.freeze(options.items?[...options.items]:[]);const initial={id:id,title:options.title,

collapsed:!!options.hidden,items:items.map(identify)};this.id=id;this.items=items;toolbars.set(id,this);setListeners(this,params);
send(output,object([id,initial]));},get title(){const state=reactor.value[this.id];return state&&state.title;},get hidden(){const state=reactor.value[this.id];return state&&state.collapsed;},destroy:function(){send(output,object([this.id,null]));},


toJSON:function(){return{id:this.id,title:this.title,hidden:this.hidden,items:this.items};}});exports.Toolbar=Toolbar;identify.define(Toolbar,toolbar=>toolbar.id);const dispose=toolbar=>{toolbars.delete(toolbar.id);emit(toolbar,"detach");off(toolbar);};const reactor=new Reactor({onStep:(present,past)=>{const delta=diff(past,present);each(([id,update])=>{const toolbar=toolbars.get(id); if(!update)
dispose(toolbar); else if(!past[id])
emit(toolbar,"attach"); else
emit(toolbar,update.collapsed?"hide":"show",toolbar);},pairs(delta));}});reactor.run(input);