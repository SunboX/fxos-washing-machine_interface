"use strict";module.metadata={"stability":"experimental"};
const{add,iterator}=require("../sdk/lang/weak-set");const{curry}=require("../sdk/lang/functional");let id=0;const ports=new WeakMap();



const marshal=curry((manager,port)=>{if(!ports.has(port)){id=id+1;const handle={type:"MessagePort",id:id}; ports.set(port,handle);add(exports,port);port.onmessage=event=>{manager.sendAsyncMessage("sdk/port/message",{port:handle,message:event.data});};return handle;}
return ports.get(port);});exports.marshal=marshal;


const demarshal=curry((manager,{type,id})=>{if(type==="MessagePort"){for(let port of iterator(exports)){if(id===ports.get(port).id)
return port;}}
return null;});exports.demarshal=demarshal;