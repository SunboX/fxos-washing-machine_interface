"use strict";module.metadata={"stability":"experimental"};



const{complement,flip,identity}=require("../lang/functional");const{iteratorSymbol}=require("../util/iteration");const{isArray,isArguments,isMap,isSet,isString,isBoolean,isNumber}=require("../lang/type");const Sequence=function Sequence(iterator){if(iterator.isGenerator&&iterator.isGenerator())
this[iteratorSymbol]=iterator;else
throw TypeError("Expected generator argument");};exports.Sequence=Sequence;const polymorphic=dispatch=>x=>x===null?dispatch.null(null):x===void(0)?dispatch.void(void(0)):isArray(x)?(dispatch.array||dispatch.indexed)(x):isString(x)?(dispatch.string||dispatch.indexed)(x):isArguments(x)?(dispatch.arguments||dispatch.indexed)(x):isMap(x)?dispatch.map(x):isSet(x)?dispatch.set(x):isNumber(x)?dispatch.number(x):isBoolean(x)?dispatch.boolean(x):dispatch.default(x);const nogen=function*(){};const empty=()=>new Sequence(nogen);exports.empty=empty;const seq=polymorphic({null:empty,void:empty,array:identity,string:identity,arguments:identity,map:identity,set:identity,default:x=>x instanceof Sequence?x:new Sequence(x)});exports.seq=seq;const string=(...etc)=>"".concat(...etc);exports.string=string;const object=(...pairs)=>{let result={};for(let[key,value]of pairs)
result[key]=value;return result;};exports.object=object;


const fromEnumerator=getEnumerator=>seq(function*(){const enumerator=getEnumerator();while(enumerator.hasMoreElements())
yield enumerator.getNext();});exports.fromEnumerator=fromEnumerator;const pairs=polymorphic({null:empty,void:empty,map:identity,indexed:indexed=>seq(function*(){const count=indexed.length;let index=0;while(index<count){yield[index,indexed[index]];index=index+1;}}),default:object=>seq(function*(){for(let key of Object.keys(object))
yield[key,object[key]];})});exports.pairs=pairs;const keys=polymorphic({null:empty,void:empty,indexed:indexed=>seq(function*(){const count=indexed.length;let index=0;while(index<count){yield index;index=index+1;}}),map:map=>seq(function*(){for(let[key,_]of map)
yield key;}),default:object=>seq(function*(){for(let key of Object.keys(object))
yield key;})});exports.keys=keys;const values=polymorphic({null:empty,void:empty,set:identity,indexed:indexed=>seq(function*(){const count=indexed.length;let index=0;while(index<count){yield indexed[index];index=index+1;}}),map:map=>seq(function*(){for(let[_,value]of map)yield value;}),default:object=>seq(function*(){for(let key of Object.keys(object))yield object[key];})});exports.values=values;
const iterate=(f,x)=>seq(function*(){let state=x;while(true){yield state;state=f(state);}});exports.iterate=iterate;const filter=(p,sequence)=>seq(function*(){if(sequence!==null&&sequence!==void(0)){for(let item of sequence){if(p(item))
yield item;}}});exports.filter=filter;



const map=(f,...sequences)=>seq(function*(){const count=sequences.length; if(count===1){let[sequence]=sequences;if(sequence!==null&&sequence!==void(0)){for(let item of sequence)
yield f(item);}}
else{
let args=[];let inputs=[];let index=0;while(index<count){inputs[index]=sequences[index][iteratorSymbol]();index=index+1;}


let done=false;while(!done){let index=0;let value=void(0);while(index<count&&!done){({done,value})=inputs[index].next();if(!done){args[index]=value;index=index+1;}}

if(!done)
yield f(...args);}}});exports.map=map;
const reductions=(...params)=>{const count=params.length;let hasInitial=false;let f,initial,source;if(count===2){([f,source])=params;}
else if(count===3){([f,initial,source])=params;hasInitial=true;}
else{throw Error("Invoked with wrong number of arguments: "+count);}
const sequence=seq(source);return seq(function*(){let started=hasInitial;let result=void(0);if(hasInitial)
yield(result=initial);for(let item of sequence){
if(!started){started=true;yield(result=item);}
else{yield(result=f(result,item));}}

if(!started)
yield f();});};exports.reductions=reductions;






const reduce=(...args)=>{const xs=reductions(...args);let x;for(x of xs)void(0);return x;};exports.reduce=reduce;const each=(f,sequence)=>{for(let x of seq(sequence))void(f(x));};exports.each=each;const inc=x=>x+1;const count=polymorphic({null:_=>0,void:_=>0,indexed:indexed=>indexed.length,map:map=>map.size,set:set=>set.size,default:xs=>reduce(inc,0,xs)});exports.count=count;const isEmpty=sequence=>{if(sequence===null||sequence===void(0))
return true;for(let _ of sequence)
return false;
return true;};exports.isEmpty=isEmpty;const and=(a,b)=>a&&b;
const isEvery=(p,sequence)=>{if(sequence!==null&&sequence!==void(0)){for(let item of sequence){if(!p(item))
return false;}}
return true;};exports.isEvery=isEvery;const some=(p,sequence)=>{if(sequence!==null&&sequence!==void(0)){for(let item of sequence){if(p(item))
return true;}}
return null;};exports.some=some;
const take=(n,sequence)=>n<=0?empty():seq(function*(){let count=n;for(let item of sequence){yield item;count=count-1;if(count===0)break;}});exports.take=take;
const takeWhile=(p,sequence)=>seq(function*(){for(let item of sequence){if(!p(item))
break;yield item;}});exports.takeWhile=takeWhile;
const drop=(n,sequence)=>seq(function*(){if(sequence!==null&&sequence!==void(0)){let count=n;for(let item of sequence){if(count>0)
count=count-1;else
yield item;}}});exports.drop=drop;
const dropWhile=(p,sequence)=>seq(function*(){let keep=false;for(let item of sequence){keep=keep||!p(item);if(keep)yield item;}});exports.dropWhile=dropWhile;
const concat=(...sequences)=>seq(function*(){for(let sequence of sequences)
for(let item of sequence)
yield item;});exports.concat=concat;const first=sequence=>{if(sequence!==null&&sequence!==void(0)){for(let item of sequence)
return item;}
return null;};exports.first=first;const rest=sequence=>drop(1,sequence);exports.rest=rest;const nth=(xs,n,notFound)=>{if(n>=0){if(isArray(xs)||isArguments(xs)||isString(xs)){return n<xs.length?xs[n]:notFound;}
else if(xs!==null&&xs!==void(0)){let count=n;for(let x of xs){if(count<=0)
return x;count=count-1;}}}
return notFound;};exports.nth=nth;
const last=polymorphic({null:_=>null,void:_=>null,indexed:indexed=>indexed[indexed.length-1],map:xs=>reduce((_,x)=>x,xs),set:xs=>reduce((_,x)=>x,xs),default:xs=>reduce((_,x)=>x,xs)});exports.last=last;
const dropLast=flip((xs,n=1)=>seq(function*(){let ys=[];for(let x of xs){ys.push(x);if(ys.length>n)
yield ys.shift();}}));exports.dropLast=dropLast;


const distinct=sequence=>seq(function*(){let items=new Set();for(let item of sequence){if(!items.has(item)){items.add(item);yield item;}}});exports.distinct=distinct;

const remove=(p,xs)=>filter(complement(p),xs);exports.remove=remove;

const mapcat=(f,sequence)=>seq(function*(){const sequences=map(f,sequence);for(let sequence of sequences)
for(let item of sequence)
yield item;});exports.mapcat=mapcat;