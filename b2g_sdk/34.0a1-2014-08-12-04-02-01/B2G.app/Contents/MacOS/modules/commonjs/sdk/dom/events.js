"use strict";module.metadata={"stability":"unstable"};
function singularify(text){return text[text.length-1]==="s"?text.substr(0,text.length-1):text;}




function getInitializerName(category){return"init"+singularify(category);}
function on(element,type,listener,capture){capture=capture||false;element.addEventListener(type,listener,capture);}
exports.on=on;function once(element,type,listener,capture){on(element,type,function selfRemovableListener(event){removeListener(element,type,selfRemovableListener,capture);listener.apply(this,arguments);},capture);}
exports.once=once;function removeListener(element,type,listener,capture){element.removeEventListener(type,listener,capture);}
exports.removeListener=removeListener;function emit(element,type,{category,initializer,settings}){category=category||"UIEvents";initializer=initializer||getInitializerName(category);let document=element.ownerDocument;let event=document.createEvent(category);event[initializer].apply(event,[type].concat(settings));element.dispatchEvent(event);};exports.emit=emit;
const removed=element=>{return new Promise(resolve=>{const{MutationObserver}=element.ownerDocument.defaultView;const observer=new MutationObserver(mutations=>{for(let mutation of mutations){for(let node of mutation.removedNodes||[]){if(node===element){observer.disconnect();resolve(element);}}}});observer.observe(element.parentNode,{childList:true});});};exports.removed=removed;const when=(element,eventName,capture=false)=>new Promise(resolve=>{const listener=event=>{element.removeEventListener(eventName,listener,capture);resolve(event);};element.addEventListener(eventName,listener,capture);});exports.when=when;