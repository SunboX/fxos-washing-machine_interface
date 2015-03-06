"use strict";
if(typeof Components!="undefined"){
this.exports={};const Cu=Components.utils;const Ci=Components.interfaces;const Cc=Components.classes;Cu.import("resource://gre/modules/Services.jsm",this);}
let EXPORTED_SYMBOLS=["LOG","clone","Config","Constants","Type","HollowStructure","OSError","Library","declareFFI","declareLazy","declareLazyFFI","normalizeToPointer","projectValue","isTypedArray","defineLazyGetter","offsetBy","OS"];let Config={DEBUG:false,TEST:false};exports.Config=Config;if(typeof Components!="undefined"){
 Cu.import("resource://gre/modules/ctypes.jsm");Cc["@mozilla.org/net/osfileconstantsservice;1"].getService(Ci.nsIOSFileConstantsService).init();}
exports.Constants=OS.Constants;
let defineLazyGetter=function defineLazyGetter(object,name,getter){Object.defineProperty(object,name,{configurable:true,get:function lazy(){delete this[name];let value=getter.call(this);Object.defineProperty(object,name,{value:value});return value;}});};exports.defineLazyGetter=defineLazyGetter;let gLogger;if(typeof window!="undefined"&&window.console&&console.log){gLogger=console.log.bind(console,"OS");}else{gLogger=function(...args){dump("OS "+args.join(" ")+"\n");};}
let stringifyArg=function stringifyArg(arg){if(typeof arg==="string"){return arg;}
if(arg&&typeof arg==="object"){let argToString=""+arg;if(argToString==="[object Object]"){return JSON.stringify(arg);}else{return argToString;}}
return arg;};let LOG=function(...args){if(!Config.DEBUG){ return;}
let logFunc=gLogger;if(Config.TEST&&typeof Components!="undefined"){ logFunc=function logFunc(...args){let message=["TEST","OS"].concat(args).join(" ");Services.console.logStringMessage(message+"\n");};}
logFunc.apply(null,[stringifyArg(arg)for(arg of args)]);};exports.LOG=LOG;let clone=function(object,refs=[]){let result={};let refer=function refer(result,key,object){Object.defineProperty(result,key,{enumerable:true,get:function(){return object[key];},set:function(value){object[key]=value;}});};for(let k in object){if(refs.indexOf(k)<0){result[k]=object[k];}else{refer(result,k,object);}}
return result;};exports.clone=clone;function Type(name,implementation){if(!(typeof name=="string")){throw new TypeError("Type expects as first argument a name, got: "
+name);}
if(!(implementation instanceof ctypes.CType)){throw new TypeError("Type expects as second argument a ctypes.CType"+", got: "+implementation);}
Object.defineProperty(this,"name",{value:name});Object.defineProperty(this,"implementation",{value:implementation});}
Type.prototype={toMsg:function default_toMsg(value){return value;},fromMsg:function default_fromMsg(msg){return msg;},importFromC:function default_importFromC(value){return value;},get in_ptr(){delete this.in_ptr;let ptr_t=new PtrType("[in] "+this.name+"*",this.implementation.ptr,this);Object.defineProperty(this,"in_ptr",{get:function(){return ptr_t;}});return ptr_t;},get out_ptr(){delete this.out_ptr;let ptr_t=new PtrType("[out] "+this.name+"*",this.implementation.ptr,this);Object.defineProperty(this,"out_ptr",{get:function(){return ptr_t;}});return ptr_t;},get inout_ptr(){delete this.inout_ptr;let ptr_t=new PtrType("[inout] "+this.name+"*",this.implementation.ptr,this);Object.defineProperty(this,"inout_ptr",{get:function(){return ptr_t;}});return ptr_t;},releaseWith:function releaseWith(finalizer){let parent=this;let type=this.withName("[auto "+this.name+", "+finalizer+"] ");type.importFromC=function importFromC(value,operation){return ctypes.CDataFinalizer(parent.importFromC(value,operation),finalizer);};return type;},releaseWithLazy:function releaseWithLazy(getFinalizer){let parent=this;let type=this.withName("[auto "+this.name+", (lazy)] ");type.importFromC=function importFromC(value,operation){return ctypes.CDataFinalizer(parent.importFromC(value,operation),getFinalizer());};return type;},withName:function withName(name){return Object.create(this,{name:{value:name}});},cast:function cast(value){return ctypes.cast(value,this.implementation);},get size(){return this.implementation.size;}};let isTypedArray=function isTypedArray(obj){return typeof obj=="object"&&"byteOffset"in obj;};exports.isTypedArray=isTypedArray;function PtrType(name,implementation,targetType){Type.call(this,name,implementation);if(targetType==null||!targetType instanceof Type){throw new TypeError("targetType must be an instance of Type");}
Object.defineProperty(this,"targetType",{value:targetType});}
PtrType.prototype=Object.create(Type.prototype);PtrType.prototype.toMsg=function ptr_toMsg(value){if(value==null){return null;}
if(typeof value=="string"){return{string:value};}
let normalized;if(isTypedArray(value)){ normalized=Type.uint8_t.in_ptr.implementation(value.buffer);if(value.byteOffset!=0){normalized=offsetBy(normalized,value.byteOffset);}}else if("addressOfElement"in value){ normalized=value.addressOfElement(0);}else if("isNull"in value){ normalized=value;}else{throw new TypeError("Value "+value+" cannot be converted to a pointer");}
let cast=Type.uintptr_t.cast(normalized);return{ptr:cast.value.toString()};};PtrType.prototype.fromMsg=function ptr_fromMsg(msg){if(msg==null){return null;}
if("string"in msg){return msg.string;}
if("ptr"in msg){let address=ctypes.uintptr_t(msg.ptr);return this.cast(address);}
throw new TypeError("Message "+msg.toSource()+" does not represent a pointer");};exports.Type=Type;let projectLargeInt=function projectLargeInt(x){let str=x.toString();let rv=parseInt(str,10);if(rv.toString()!==str){throw new TypeError("Number "+str+" cannot be projected to a double");}
return rv;};let projectLargeUInt=function projectLargeUInt(x){return projectLargeInt(x);};let projectValue=function projectValue(x){if(!(x instanceof ctypes.CData)){return x;}
if(!("value"in x)){ throw new TypeError("Number "+x.toSource()+" has no field |value|");}
return x.value;};function projector(type,signed){LOG("Determining best projection for",type,"(size: ",type.size,")",signed?"signed":"unsigned");if(type instanceof Type){type=type.implementation;}
if(!type.size){throw new TypeError("Argument is not a proper C type");} 
if(type.size==8



||type==ctypes.size_t
||type==ctypes.ssize_t||type==ctypes.intptr_t||type==ctypes.uintptr_t||type==ctypes.off_t){if(signed){LOG("Projected as a large signed integer");return projectLargeInt;}else{LOG("Projected as a large unsigned integer");return projectLargeUInt;}}
LOG("Projected as a regular number");return projectValue;};exports.projectValue=projectValue;Type.uintn_t=function uintn_t(size){switch(size){case 1:return Type.uint8_t;case 2:return Type.uint16_t;case 4:return Type.uint32_t;case 8:return Type.uint64_t;default:throw new Error("Cannot represent unsigned integers of "+size+" bytes");}};Type.intn_t=function intn_t(size){switch(size){case 1:return Type.int8_t;case 2:return Type.int16_t;case 4:return Type.int32_t;case 8:return Type.int64_t;default:throw new Error("Cannot represent integers of "+size+" bytes");}};Type.void_t=new Type("void",ctypes.void_t);Type.voidptr_t=new PtrType("void*",ctypes.voidptr_t,Type.void_t);

["in_ptr","out_ptr","inout_ptr"].forEach(function(key){Object.defineProperty(Type.void_t,key,{value:Type.voidptr_t});});function IntType(name,implementation,signed){Type.call(this,name,implementation);this.importFromC=projector(implementation,signed);this.project=this.importFromC;};IntType.prototype=Object.create(Type.prototype);IntType.prototype.toMsg=function toMsg(value){if(typeof value=="number"){return value;}
return this.project(value);};Type.char=new Type("char",ctypes.char);Type.jschar=new Type("jschar",ctypes.jschar);Type.cstring=Type.char.in_ptr.withName("[in] C string");Type.wstring=Type.jschar.in_ptr.withName("[in] wide string");Type.out_cstring=Type.char.out_ptr.withName("[out] C string");Type.out_wstring=Type.jschar.out_ptr.withName("[out] wide string");Type.int8_t=new IntType("int8_t",ctypes.int8_t,true);Type.uint8_t=new IntType("uint8_t",ctypes.uint8_t,false);Type.int16_t=new IntType("int16_t",ctypes.int16_t,true);Type.uint16_t=new IntType("uint16_t",ctypes.uint16_t,false);Type.int32_t=new IntType("int32_t",ctypes.int32_t,true);Type.uint32_t=new IntType("uint32_t",ctypes.uint32_t,false);Type.int64_t=new IntType("int64_t",ctypes.int64_t,true);Type.uint64_t=new IntType("uint64_t",ctypes.uint64_t,false);Type.int=Type.intn_t(ctypes.int.size).withName("int");Type.unsigned_int=Type.intn_t(ctypes.unsigned_int.size).withName("unsigned int");Type.long=Type.intn_t(ctypes.long.size).withName("long");Type.unsigned_long=Type.intn_t(ctypes.unsigned_long.size).withName("unsigned long");Type.uintptr_t=Type.uintn_t(ctypes.uintptr_t.size).withName("uintptr_t");Type.bool=Type.int.withName("bool");Type.bool.importFromC=function projectBool(x){return!!(x.value);};Type.uid_t=Type.int.withName("uid_t");Type.gid_t=Type.int.withName("gid_t");Type.off_t=new IntType("off_t",ctypes.off_t,true);Type.size_t=new IntType("size_t",ctypes.size_t,false);Type.ssize_t=new IntType("ssize_t",ctypes.ssize_t,true);Type.uencoder=new Type("uencoder",ctypes.StructType("uencoder"));Type.udecoder=new Type("udecoder",ctypes.StructType("udecoder"));function HollowStructure(name,size){if(!name){throw new TypeError("HollowStructure expects a name");}
if(!size||size<0){throw new TypeError("HollowStructure expects a (positive) size");}

this.offset_to_field_info=[]; this.name=name; this.size=size;this._paddings=0;}
HollowStructure.prototype={add_field_at:function add_field_at(offset,name,type){if(offset==null){throw new TypeError("add_field_at requires a non-null offset");}
if(!name){throw new TypeError("add_field_at requires a non-null name");}
if(!type){throw new TypeError("add_field_at requires a non-null type");}
if(type instanceof Type){type=type.implementation;}
if(this.offset_to_field_info[offset]){throw new Error("HollowStructure "+this.name+" already has a field at offset "+offset);}
if(offset+type.size>this.size){throw new Error("HollowStructure "+this.name+" cannot place a value of type "+type+" at offset "+offset+" without exceeding its size of "+this.size);}
let field={name:name,type:type};this.offset_to_field_info[offset]=field;},_makePaddingField:function makePaddingField(size){let field=({});field["padding_"+this._paddings]=ctypes.ArrayType(ctypes.uint8_t,size);this._paddings++;return field;},getType:function getType(){
let struct=[];let i=0;while(i<this.size){let currentField=this.offset_to_field_info[i];if(!currentField){
 let padding_length=1;while(i+padding_length<this.size&&!this.offset_to_field_info[i+padding_length]){++padding_length;} 
struct.push(this._makePaddingField(padding_length)); i+=padding_length;}else{ for(let j=1;j<currentField.type.size;++j){let candidateField=this.offset_to_field_info[i+j];if(candidateField){throw new Error("Fields "+currentField.name+" and "+candidateField.name+" overlap at position "+(i+j));}} 
let field=({});field[currentField.name]=currentField.type;struct.push(field); i+=currentField.type.size;}}
let result=new Type(this.name,ctypes.StructType(this.name,struct));if(result.implementation.size!=this.size){throw new Error("Wrong size for type "+this.name+": expected "+this.size+", found "+result.implementation.size+" ("+result.implementation.toSource()+")");}
return result;}};exports.HollowStructure=HollowStructure;function Library(name,...candidates){this.name=name;this._candidates=candidates;};Library.prototype=Object.freeze({get library(){let library;delete this.library;for(let candidate of this._candidates){try{library=ctypes.open(candidate);break;}catch(ex){LOG("Could not open library",candidate,ex);}}
this._candidates=null;if(library){Object.defineProperty(this,"library",{value:library});Object.freeze(this);return library;}
let error=new Error("Could not open library "+this.name);Object.defineProperty(this,"library",{get:function(){throw error;}});Object.freeze(this);throw error;},declareLazyFFI:function(object,field,...args){let lib=this;Object.defineProperty(object,field,{get:function(){delete this[field];let ffi=declareFFI(lib.library,...args);if(ffi){return this[field]=ffi;}
return undefined;},configurable:true,enumerable:true});},declareLazy:function(object,field,...args){let lib=this;Object.defineProperty(object,field,{get:function(){delete this[field];let ffi=lib.library.declare(...args);if(ffi){return this[field]=ffi;}
return undefined;},configurable:true,enumerable:true});},toString:function(){return"[Library "+this.name+"]";}});exports.Library=Library;let declareFFI=function declareFFI(lib,symbol,abi,returnType){LOG("Attempting to declare FFI ",symbol); if(typeof symbol!="string"){throw new TypeError("declareFFI expects as first argument a string");}
abi=abi||ctypes.default_abi;if(Object.prototype.toString.call(abi)!="[object CABI]"){
throw new TypeError("declareFFI expects as second argument an abi or null");}
if(!returnType.importFromC){throw new TypeError("declareFFI expects as third argument an instance of Type");}
let signature=[symbol,abi];let argtypes=[];for(let i=3;i<arguments.length;++i){let current=arguments[i];if(!current){throw new TypeError("Missing type for argument "+(i-3)+" of symbol "+symbol);}
if(!current.implementation){throw new TypeError("Missing implementation for argument "+(i-3)
+" of symbol "+symbol
+" ( "+current.name+" )");}
signature.push(current.implementation);}
try{let fun=lib.declare.apply(lib,signature);let result=function ffi(...args){for(let i=0;i<args.length;i++){if(typeof args[i]=="undefined"){throw new TypeError("Argument "+i+" of "+symbol+" is undefined");}}
let result=fun.apply(fun,args);return returnType.importFromC(result,symbol);};LOG("Function",symbol,"declared");return result;}catch(x){LOG("Could not declare function ",symbol,x);return null;}};exports.declareFFI=declareFFI;function declareLazyFFI(object,field,...declareFFIArgs){Object.defineProperty(object,field,{get:function(){delete this[field];let ffi=declareFFI(...declareFFIArgs);if(ffi){return this[field]=ffi;}
return undefined;},configurable:true,enumerable:true});}
exports.declareLazyFFI=declareLazyFFI;function declareLazy(object,field,lib,...declareArgs){Object.defineProperty(object,field,{get:function(){delete this[field];try{let ffi=lib.declare(...declareArgs);return this[field]=ffi;}catch(ex){ return undefined;}},configurable:true});}
exports.declareLazy=declareLazy;let gOffsetByType;let offsetBy=function offsetBy(pointer,length){if(length===undefined||length<0){throw new TypeError("offsetBy expects a positive number");}
if(!("isNull"in pointer)){throw new TypeError("offsetBy expects a pointer");}
if(length==0){return pointer;}
let type=pointer.constructor;let size=type.targetType.size;if(size==0||size==null){throw new TypeError("offsetBy cannot be applied to a pointer without size");}
let bytes=length*size;if(!gOffsetByType||gOffsetByType.size<=bytes){gOffsetByType=ctypes.uint8_t.array(bytes*2);}
let addr=ctypes.cast(pointer,gOffsetByType.ptr).contents.addressOfElement(bytes);return ctypes.cast(addr,type);};exports.offsetBy=offsetBy;function normalizeToPointer(candidate,bytes){if(!candidate){throw new TypeError("Expecting  a Typed Array or a C pointer");}
let ptr;if("isNull"in candidate){if(candidate.isNull()){throw new TypeError("Expecting a non-null pointer");}
ptr=Type.uint8_t.out_ptr.cast(candidate);if(bytes==null){throw new TypeError("C pointer missing bytes indication.");}}else if(isTypedArray(candidate)){ ptr=Type.uint8_t.out_ptr.implementation(candidate.buffer);if(bytes==null){bytes=candidate.byteLength;}else if(candidate.byteLength<bytes){throw new TypeError("Buffer is too short. I need at least "+
bytes+" bytes but I have only "+
candidate.byteLength+"bytes");}}else{throw new TypeError("Expecting  a Typed Array or a C pointer");}
return{ptr:ptr,bytes:bytes};};exports.normalizeToPointer=normalizeToPointer;function OSError(operation,path=""){Error.call(this);this.operation=operation;this.path=path;}
OSError.prototype=Object.create(Error.prototype);exports.OSError=OSError;


exports.OS={Constants:exports.Constants,Shared:{LOG:LOG,clone:clone,Type:Type,HollowStructure:HollowStructure,Error:OSError,declareFFI:declareFFI,projectValue:projectValue,isTypedArray:isTypedArray,defineLazyGetter:defineLazyGetter,offsetBy:offsetBy}};Object.defineProperty(exports.OS.Shared,"DEBUG",{get:function(){return Config.DEBUG;},set:function(x){return Config.DEBUG=x;}});Object.defineProperty(exports.OS.Shared,"TEST",{get:function(){return Config.TEST;},set:function(x){return Config.TEST=x;}});if(typeof Components!="undefined"){this.EXPORTED_SYMBOLS=EXPORTED_SYMBOLS;for(let symbol of EXPORTED_SYMBOLS){this[symbol]=exports[symbol];}}