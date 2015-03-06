"use strict";module.metadata={"stability":"experimental"};const method=require("method/core");




let dispatcher=hint=>{const base=method(hint);let implementations=new Map();


let dispatch=(value,...rest)=>{for(let[predicate,implementation]of implementations){if(predicate(value))
return implementation(value,...rest);}
return base(value,...rest);};dispatch.define=base.define;dispatch.implement=base.implement;dispatch.toString=base.toString;
dispatch.when=(predicate,implementation)=>{if(implementations.has(predicate))
throw TypeError("Already implemented for the given predicate");implementations.set(predicate,implementation);};return dispatch;};exports.dispatcher=dispatcher;