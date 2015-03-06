"use strict";let Services=require("Services");let promise=require("devtools/toolkit/deprecated-sync-thenables");let{Class}=require("sdk/core/heritage");let{EventTarget}=require("sdk/event/target");let events=require("sdk/event/core");let object=require("sdk/util/object");function promiseDone(err){console.error(err);return promise.reject(err);}
let types=Object.create(null);exports.types=types;let registeredTypes=new Map();let registeredLifetimes=new Map();types.getType=function(type){if(!type){return types.Primitive;}
if(typeof(type)!=="string"){return type;}
let reg=registeredTypes.get(type);if(reg)return reg;let sep=type.indexOf(":");if(sep>=0){let collection=type.substring(0,sep);let subtype=types.getType(type.substring(sep+1));if(collection==="array"){return types.addArrayType(subtype);}else if(collection==="nullable"){return types.addNullableType(subtype);}
if(registeredLifetimes.has(collection)){return types.addLifetimeType(collection,subtype);}
throw Error("Unknown collection type: "+collection);} 
let pieces=type.split("#",2);if(pieces.length>1){return types.addActorDetail(type,pieces[0],pieces[1]);} 
if(type==="longstring"){require("devtools/server/actors/string");return registeredTypes.get("longstring");}
throw Error("Unknown type: "+type);}
function identityWrite(v){if(v===undefined){throw Error("undefined passed where a value is required");}
return v;}
types.addType=function(name,typeObject={},options={}){if(registeredTypes.has(name)){throw Error("Type '"+name+"' already exists.");}
let type=object.merge({name:name,primitive:!(typeObject.read||typeObject.write),read:identityWrite,write:identityWrite},typeObject);registeredTypes.set(name,type);if(!options.thawed){Object.freeze(type);}
return type;};types.addArrayType=function(subtype){subtype=types.getType(subtype);let name="array:"+subtype.name;if(subtype.primitive){return types.addType(name);}
return types.addType(name,{category:"array",read:(v,ctx)=>[subtype.read(i,ctx)for(i of v)],write:(v,ctx)=>[subtype.write(i,ctx)for(i of v)]});};types.addDictType=function(name,specializations){return types.addType(name,{category:"dict",specializations:specializations,read:(v,ctx)=>{let ret={};for(let prop in v){if(prop in specializations){ret[prop]=types.getType(specializations[prop]).read(v[prop],ctx);}else{ret[prop]=v[prop];}}
return ret;},write:(v,ctx)=>{let ret={};for(let prop in v){if(prop in specializations){ret[prop]=types.getType(specializations[prop]).write(v[prop],ctx);}else{ret[prop]=v[prop];}}
return ret;}})}
types.addActorType=function(name){let type=types.addType(name,{_actor:true,category:"actor",read:(v,ctx,detail)=>{
if(ctx instanceof Actor){return ctx.conn.getActor(v);}


let actorID=typeof(v)==="string"?v:v.actor;let front=ctx.conn.getActor(actorID);if(front){front.form(v,detail,ctx);}else{front=new type.frontClass(ctx.conn,v,detail,ctx)
front.actorID=actorID;ctx.marshallPool().manage(front);}
return front;},write:(v,ctx,detail)=>{
if(v instanceof Actor){if(!v.actorID){ctx.marshallPool().manage(v);}
return v.form(detail);}
return v.actorID;},},{
thawed:true});return type;}
types.addNullableType=function(subtype){subtype=types.getType(subtype);return types.addType("nullable:"+subtype.name,{category:"nullable",read:(value,ctx)=>{if(value==null){return value;}
return subtype.read(value,ctx);},write:(value,ctx)=>{if(value==null){return value;}
return subtype.write(value,ctx);}});}
types.addActorDetail=function(name,actorType,detail){actorType=types.getType(actorType);if(!actorType._actor){throw Error("Details only apply to actor types, tried to add detail '"+detail+"'' to "+actorType.name+"\n");}
return types.addType(name,{_actor:true,category:"detail",read:(v,ctx)=>actorType.read(v,ctx,detail),write:(v,ctx)=>actorType.write(v,ctx,detail)});}
types.addLifetime=function(name,prop){if(registeredLifetimes.has(name)){throw Error("Lifetime '"+name+"' already registered.");}
registeredLifetimes.set(name,prop);}
types.addLifetimeType=function(lifetime,subtype){subtype=types.getType(subtype);if(!subtype._actor){throw Error("Lifetimes only apply to actor types, tried to apply lifetime '"+lifetime+"'' to "+subtype.name);}
let prop=registeredLifetimes.get(lifetime);return types.addType(lifetime+":"+subtype.name,{category:"lifetime",read:(value,ctx)=>subtype.read(value,ctx[prop]),write:(value,ctx)=>subtype.write(value,ctx[prop])})}
types.Primitive=types.addType("primitive");types.String=types.addType("string");types.Number=types.addType("number");types.Boolean=types.addType("boolean");types.JSON=types.addType("json");let Arg=Class({initialize:function(index,type){this.index=index;this.type=types.getType(type);},write:function(arg,ctx){return this.type.write(arg,ctx);},read:function(v,ctx,outArgs){outArgs[this.index]=this.type.read(v,ctx);},describe:function(){return{_arg:this.index,type:this.type.name,}}});exports.Arg=Arg;let Option=Class({extends:Arg,initialize:function(index,type){Arg.prototype.initialize.call(this,index,type)},write:function(arg,ctx,name){if(!arg){return undefined;}
let v=arg[name]||undefined;if(v===undefined){return undefined;}
return this.type.write(v,ctx);},read:function(v,ctx,outArgs,name){if(outArgs[this.index]===undefined){outArgs[this.index]={};}
if(v===undefined){return;}
outArgs[this.index][name]=this.type.read(v,ctx);},describe:function(){return{_option:this.index,type:this.type.name,}}});exports.Option=Option;let RetVal=Class({initialize:function(type){this.type=types.getType(type);},write:function(v,ctx){return this.type.write(v,ctx);},read:function(v,ctx){return this.type.read(v,ctx);},describe:function(){return{_retval:this.type.name}}});exports.RetVal=RetVal;function getPath(obj,path){for(let name of path){if(!(name in obj)){return undefined;}
obj=obj[name];}
return obj;}
function findPlaceholders(template,constructor,path=[],placeholders=[]){if(!template||typeof(template)!="object"){return placeholders;}
if(template instanceof constructor){placeholders.push({placeholder:template,path:[p for(p of path)]});return placeholders;}
for(let name in template){path.push(name);findPlaceholders(template[name],constructor,path,placeholders);path.pop();}
return placeholders;}
function describeTemplate(template){return JSON.parse(JSON.stringify(template,(key,value)=>{if(value.describe){return value.describe();}
return value;}));}
let Request=Class({initialize:function(template={}){this.type=template.type;this.template=template;this.args=findPlaceholders(template,Arg);},write:function(fnArgs,ctx){let str=JSON.stringify(this.template,(key,value)=>{if(value instanceof Arg){return value.write(value.index in fnArgs?fnArgs[value.index]:undefined,ctx,key);}
return value;});return JSON.parse(str);},read:function(packet,ctx){let fnArgs=[];for(let templateArg of this.args){let arg=templateArg.placeholder;let path=templateArg.path;let name=path[path.length-1];arg.read(getPath(packet,path),ctx,fnArgs,name);}
return fnArgs;},describe:function(){return describeTemplate(this.template);}});let Response=Class({initialize:function(template={}){this.template=template;let placeholders=findPlaceholders(template,RetVal);if(placeholders.length>1){throw Error("More than one RetVal specified in response");}
let placeholder=placeholders.shift();if(placeholder){this.retVal=placeholder.placeholder;this.path=placeholder.path;}},write:function(ret,ctx){return JSON.parse(JSON.stringify(this.template,function(key,value){if(value instanceof RetVal){return value.write(ret,ctx);}
return value;}));},read:function(packet,ctx){if(!this.retVal){return undefined;}
let v=getPath(packet,this.path);return this.retVal.read(v,ctx);},describe:function(){return describeTemplate(this.template);}});let Pool=Class({extends:EventTarget,initialize:function(conn){if(conn){this.conn=conn;}},parent:function(){return this.conn.poolFor(this.actorID)},marshallPool:function(){return this;},__poolMap:null,get _poolMap(){if(this.__poolMap)return this.__poolMap;this.__poolMap=new Map();this.conn.addActorPool(this);return this.__poolMap;},manage:function(actor){if(!actor.actorID){actor.actorID=this.conn.allocID(actor.actorPrefix||actor.typeName);}
this._poolMap.set(actor.actorID,actor);return actor;},unmanage:function(actor){this.__poolMap.delete(actor.actorID);},has:function(actorID)this.__poolMap&&this._poolMap.has(actorID), actor:function(actorID)this.__poolMap?this._poolMap.get(actorID):null,get:function(actorID)this.__poolMap?this._poolMap.get(actorID):null,isEmpty:function()!this.__poolMap||this._poolMap.size==0,destroy:function(){let parent=this.parent();if(parent){parent.unmanage(this);}
if(!this.__poolMap){return;}
for(let actor of this.__poolMap.values()){if(actor===this){continue;}
let destroy=actor.destroy;if(destroy){
actor.destroy=null;destroy.call(actor);actor.destroy=destroy;}};this.conn.removeActorPool(this,true);this.__poolMap.clear();this.__poolMap=null;},cleanup:function(){this.destroy();}});exports.Pool=Pool;let Actor=Class({extends:Pool, actorID:null,initialize:function(conn){Pool.prototype.initialize.call(this,conn);if(this._actorSpec&&this._actorSpec.events){for(let key of this._actorSpec.events.keys()){let name=key;let sendEvent=this._sendEvent.bind(this,name)
this.on(name,(...args)=>{sendEvent.apply(null,args);});}}},_sendEvent:function(name,...args){if(!this._actorSpec.events.has(name)){return;}
let request=this._actorSpec.events.get(name);let packet=request.write(args,this);packet.from=packet.from||this.actorID;this.conn.send(packet);},destroy:function(){Pool.prototype.destroy.call(this);this.actorID=null;},form:function(hint){return{actor:this.actorID}},writeError:function(err){console.error(err);if(err.stack){dump(err.stack);}
this.conn.send({from:this.actorID,error:"unknownError",message:err.toString()});},_queueResponse:function(create){let pending=this._pendingResponse||promise.resolve(null);let response=create(pending);this._pendingResponse=response;}});exports.Actor=Actor;exports.method=function(fn,spec={}){fn._methodSpec=Object.freeze(spec);if(spec.request)Object.freeze(spec.request);if(spec.response)Object.freeze(spec.response);return fn;}
let actorProto=function(actorProto){if(actorProto._actorSpec){throw new Error("actorProto called twice on the same actor prototype!");}
let protoSpec={methods:[],};for(let name of Object.getOwnPropertyNames(actorProto)){let desc=Object.getOwnPropertyDescriptor(actorProto,name);if(!desc.value){continue;}
if(desc.value._methodSpec){let frozenSpec=desc.value._methodSpec;let spec={};spec.name=frozenSpec.name||name;spec.request=Request(object.merge({type:spec.name},frozenSpec.request||undefined));spec.response=Response(frozenSpec.response||undefined);spec.telemetry=frozenSpec.telemetry;spec.release=frozenSpec.release;spec.oneway=frozenSpec.oneway;protoSpec.methods.push(spec);}} 
if(actorProto.events){protoSpec.events=new Map();for(let name in actorProto.events){let eventRequest=actorProto.events[name];Object.freeze(eventRequest);protoSpec.events.set(name,Request(object.merge({type:name},eventRequest)));}} 
actorProto.requestTypes=Object.create(null);protoSpec.methods.forEach(spec=>{let handler=function(packet,conn){try{let args=spec.request.read(packet,this);let ret=this[spec.name].apply(this,args);if(spec.oneway){return;}
let sendReturn=(ret)=>{let response=spec.response.write(ret,this);response.from=this.actorID;if(spec.release){try{this.destroy();}catch(e){this.writeError(e);return;}}
conn.send(response);};this._queueResponse(p=>{return p.then(()=>ret).then(sendReturn).then(null,this.writeError.bind(this));})}catch(e){this._queueResponse(p=>{return p.then(()=>this.writeError(e));});}};actorProto.requestTypes[spec.request.type]=handler;});actorProto._actorSpec=protoSpec;return actorProto;}
exports.ActorClass=function(proto){if(!proto.typeName){throw Error("Actor prototype must have a typeName member.");}
proto.extends=Actor;if(!registeredTypes.has(proto.typeName)){types.addActorType(proto.typeName);}
let cls=Class(actorProto(proto));registeredTypes.get(proto.typeName).actorSpec=proto._actorSpec;return cls;};let Front=Class({extends:Pool,actorID:null,initialize:function(conn=null,form=null,detail=null,context=null){Pool.prototype.initialize.call(this,conn);this._requests=[];if(form){this.actorID=form.actor;this.form(form,detail,context);}},destroy:function(){
while(this._requests&&this._requests.length>0){let deferred=this._requests.shift();deferred.reject(new Error("Connection closed"));}
Pool.prototype.destroy.call(this);this.actorID=null;},actor:function(){return promise.resolve(this.actorID)},toString:function(){return"[Front for "+this.typeName+"/"+this.actorID+"]"},form:function(form){},send:function(packet){if(packet.to){this.conn._transport.send(packet);}else{this.actor().then(actorID=>{packet.to=actorID;this.conn._transport.send(packet);});}},request:function(packet){let deferred=promise.defer();this._requests.push(deferred);this.send(packet);return deferred.promise;},onPacket:function(packet){ let type=packet.type||undefined;if(this._clientSpec.events&&this._clientSpec.events.has(type)){let event=this._clientSpec.events.get(packet.type);let args=event.request.read(packet,this);if(event.pre){event.pre.forEach((pre)=>pre.apply(this,args));}
events.emit.apply(null,[this,event.name].concat(args));return;}
if(this._requests.length===0){let msg="Unexpected packet "+this.actorID+", "+JSON.stringify(packet);let err=Error(msg);console.error(err);throw err;}
let deferred=this._requests.shift();if(packet.error){
 let message=(packet.error=="unknownError"&&packet.message)?"Protocol error: "+packet.message:packet.error;deferred.reject(message);}else{deferred.resolve(packet);}}});exports.Front=Front;exports.preEvent=function(eventName,fn){fn._preEvent=eventName;return fn;}
exports.custom=function(fn,options={}){fn._customFront=options;return fn;}
function prototypeOf(obj){return typeof(obj)==="function"?obj.prototype:obj;}
let frontProto=function(proto){let actorType=prototypeOf(proto.actorType);if(proto._actorSpec){throw new Error("frontProto called twice on the same front prototype!");}
proto._actorSpec=actorType._actorSpec;proto.typeName=actorType.typeName;let methods=proto._actorSpec.methods;methods.forEach(spec=>{let name=spec.name;
if(name in proto){let custom=proto[spec.name]._customFront;if(custom===undefined){throw Error("Existing method for "+spec.name+" not marked customFront while processing "+actorType.typeName+".");}
if(!custom.impl){return;}
name=custom.impl;}
proto[name]=function(...args){let histogram,startTime;if(spec.telemetry){if(spec.oneway){throw Error("Telemetry specified for a oneway request");}
let transportType=this.conn.localTransport?"LOCAL_":"REMOTE_";let histogramId="DEVTOOLS_DEBUGGER_RDP_"
+transportType+spec.telemetry+"_MS";try{histogram=Services.telemetry.getHistogramById(histogramId);startTime=new Date();}catch(ex){console.error(ex);spec.telemetry=false;}}
let packet=spec.request.write(args,this);if(spec.oneway){this.send(packet);return undefined;}
return this.request(packet).then(response=>{let ret=spec.response.read(response,this);if(histogram){histogram.add(+new Date-startTime);}
return ret;}).then(null,promiseDone);}
if(spec.release){let fn=proto[name];proto[name]=function(...args){return fn.apply(this,args).then(result=>{this.destroy();return result;})}}}); proto._clientSpec={};let events=proto._actorSpec.events;if(events){let preHandlers=new Map();for(let name of Object.getOwnPropertyNames(proto)){let desc=Object.getOwnPropertyDescriptor(proto,name);if(!desc.value){continue;}
if(desc.value._preEvent){let preEvent=desc.value._preEvent;if(!events.has(preEvent)){throw Error("preEvent for event that doesn't exist: "+preEvent);}
let handlers=preHandlers.get(preEvent);if(!handlers){handlers=[];preHandlers.set(preEvent,handlers);}
handlers.push(desc.value);}}
proto._clientSpec.events=new Map();for(let[name,request]of events){proto._clientSpec.events.set(request.type,{name:name,request:request,pre:preHandlers.get(name)});}}
return proto;}
exports.FrontClass=function(actorType,proto){proto.actorType=actorType;proto.extends=Front;let cls=Class(frontProto(proto));registeredTypes.get(cls.prototype.typeName).frontClass=cls;return cls;}
exports.dumpActorSpec=function(type){let actorSpec=type.actorSpec;let ret={category:"actor",typeName:type.name,methods:[],events:{}};for(let method of actorSpec.methods){ret.methods.push({name:method.name,release:method.release||undefined,oneway:method.oneway||undefined,request:method.request.describe(),response:method.response.describe()});}
if(actorSpec.events){for(let[name,request]of actorSpec.events){ret.events[name]=request.describe();}}
JSON.stringify(ret);return ret;}
exports.dumpProtocolSpec=function(){let ret={types:{},};for(let[name,type]of registeredTypes){type=types.getType(name);let category=type.category||undefined;if(category==="dict"){ret.types[name]={category:"dict",typeName:name,specializations:type.specializations}}else if(category==="actor"){ret.types[name]=exports.dumpActorSpec(type);}}
return ret;}