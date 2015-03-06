"use strict";module.metadata={"stability":"unstable"};const create=Object.create;const prototypeOf=Object.getPrototypeOf;function ns(){const map=new WeakMap();return function namespace(target){if(!target)
return target;
if(!map.has(target))
map.set(target,create(namespace(prototypeOf(target)||null)));return map.get(target);};};
exports.ns=ns;exports.Namespace=ns;