"use strict";module.metadata={"stability":"unstable"};const{Ci}=require("chrome");let{emit}=require("./core");let{when:unload}=require("../system/unload");let listeners=new Map();let getWindowFrom=x=>x instanceof Ci.nsIDOMWindow?x:x instanceof Ci.nsIDOMDocument?x.defaultView:x instanceof Ci.nsIDOMNode?x.ownerDocument.defaultView:null;function removeFromListeners(){listeners.delete(this);}

function open(target,type,options){let output={};let capture=options&&options.capture?true:false;let listener=(event)=>emit(output,"data",event);

let window=getWindowFrom(target);

 if(!window)
throw new Error("Unable to obtain the owner window from the target given.");let cleaners=listeners.get(window)||[];cleaners.push(()=>target.removeEventListener(type,listener,capture));listeners.set(window,cleaners);
 window.addEventListener("DOMWindowClose",removeFromListeners);target.addEventListener(type,listener,capture);return output;}
unload(()=>{for(let[window,cleaners]of listeners){cleaners.forEach(callback=>callback())}
listeners.clear();});exports.open=open;