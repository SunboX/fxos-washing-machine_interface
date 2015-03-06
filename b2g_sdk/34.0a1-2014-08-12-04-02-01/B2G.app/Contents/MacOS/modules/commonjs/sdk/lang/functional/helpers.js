

"use strict";module.metadata={"stability":"unstable"}
const arity=f=>f.arity||f.length;exports.arity=arity;const name=f=>f.displayName||f.name;exports.name=name;const derive=(f,source)=>{f.displayName=name(source);f.arity=arity(source);return f;};exports.derive=derive;const invoke=(callee,params,self)=>callee.apply(self,params);exports.invoke=invoke;