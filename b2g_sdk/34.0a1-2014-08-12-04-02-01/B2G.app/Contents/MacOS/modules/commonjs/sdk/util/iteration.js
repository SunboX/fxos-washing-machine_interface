'use strict';module.metadata={"stability":"experimental"};

const iteratorSymbol=(function(){try{for(var _ of Proxy.create({get:function(_,name){throw name;}}))
break;}catch(name){return name;}
throw new TypeError;})();exports.iteratorSymbol=iteratorSymbol;

function forInIterator(){for(let item of this)
yield item;}
exports.forInIterator=forInIterator;