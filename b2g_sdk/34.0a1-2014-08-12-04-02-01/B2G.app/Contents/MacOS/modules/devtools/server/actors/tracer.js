"use strict";const{Cu}=require("chrome");const{DebuggerServer}=require("devtools/server/main");const{DevToolsUtils}=Cu.import("resource://gre/modules/devtools/DevToolsUtils.jsm",{});const Debugger=require("Debugger");
if(!Object.getOwnPropertyDescriptor(Debugger.Frame.prototype,"depth")){Debugger.Frame.prototype._depth=null;Object.defineProperty(Debugger.Frame.prototype,"depth",{get:function(){if(this._depth===null){if(!this.older){this._depth=0;}else{const increment=this.script&&this.script.url=="self-hosted"?0:1;this._depth=increment+this.older.depth;}}
return this._depth;}});}
const{setTimeout}=require("sdk/timers");const BUFFER_SEND_DELAY=50;const MAX_ARGUMENTS=3;const MAX_PROPERTIES=3;const TRACE_TYPES=new Set(["time","return","throw","yield","name","location","callsite","parameterNames","arguments","depth"]);function TracerActor(aConn,aParent)
{this._dbg=null;this._parent=aParent;this._attached=false;this._activeTraces=new MapStack();this._totalTraces=0;this._startTime=0;this._sequence=0;this._bufferSendTimer=null;this._buffer=[];

this._requestsForTraceType=Object.create(null);for(let type of TRACE_TYPES){this._requestsForTraceType[type]=0;}
this.onEnterFrame=this.onEnterFrame.bind(this);this.onExitFrame=this.onExitFrame.bind(this);}
TracerActor.prototype={actorPrefix:"trace",get attached(){return this._attached;},get idle(){return this._attached&&this._activeTraces.size===0;},get tracing(){return this._attached&&this._activeTraces.size>0;},get dbg(){if(!this._dbg){this._dbg=this._parent.makeDebugger();this._dbg.onEnterFrame=this.onEnterFrame;}
return this._dbg;},_send:function(aPacket){this._buffer.push(aPacket);if(this._bufferSendTimer===null){this._bufferSendTimer=setTimeout(()=>{this.conn.send({from:this.actorID,type:"traces",traces:this._buffer.splice(0,this._buffer.length)});this._bufferSendTimer=null;},BUFFER_SEND_DELAY);}},onAttach:function(aRequest){if(this.attached){return{error:"wrongState",message:"Already attached to a client"};}
this.dbg.addDebuggees();this._attached=true;return{type:"attached",traceTypes:Object.keys(this._requestsForTraceType).filter(k=>!!this._requestsForTraceType[k])};},onDetach:function(){while(this.tracing){this.onStopTrace();}
this._dbg=null;this._attached=false;return{type:"detached"};},onStartTrace:function(aRequest){for(let traceType of aRequest.trace){if(!TRACE_TYPES.has(traceType)){return{error:"badParameterType",message:"No such trace type: "+traceType};}}
if(this.idle){this.dbg.enabled=true;this._sequence=0;this._startTime=Date.now();}
for(let traceType of aRequest.trace){this._requestsForTraceType[traceType]++;}
this._totalTraces++;let name=aRequest.name||"Trace "+this._totalTraces;this._activeTraces.push(name,aRequest.trace);return{type:"startedTrace",why:"requested",name:name};},onStopTrace:function(aRequest){if(!this.tracing){return{error:"wrongState",message:"No active traces"};}
let stoppedTraceTypes,name;if(aRequest&&aRequest.name){name=aRequest.name;if(!this._activeTraces.has(name)){return{error:"noSuchTrace",message:"No active trace with name: "+name};}
stoppedTraceTypes=this._activeTraces.delete(name);}else{name=this._activeTraces.peekKey();stoppedTraceTypes=this._activeTraces.pop();}
for(let traceType of stoppedTraceTypes){this._requestsForTraceType[traceType]--;}
if(this.idle){this.dbg.enabled=false;}
return{type:"stoppedTrace",why:"requested",name};},onEnterFrame:function(aFrame){if(aFrame.script&&aFrame.script.url=="self-hosted"){return;}
let packet={type:"enteredFrame",sequence:this._sequence++};if(this._requestsForTraceType.name){packet.name=aFrame.callee?aFrame.callee.displayName||"(anonymous function)":"("+aFrame.type+")";}
if(this._requestsForTraceType.location&&aFrame.script){


packet.location={url:aFrame.script.url,line:aFrame.script.getOffsetLine(aFrame.offset),column:getOffsetColumn(aFrame.offset,aFrame.script)};}
if(this._requestsForTraceType.callsite&&aFrame.older&&aFrame.older.script){let older=aFrame.older;packet.callsite={url:older.script.url,line:older.script.getOffsetLine(older.offset),column:getOffsetColumn(older.offset,older.script)};}
if(this._requestsForTraceType.time){packet.time=Date.now()-this._startTime;}
if(this._requestsForTraceType.parameterNames&&aFrame.callee){packet.parameterNames=aFrame.callee.parameterNames;}
if(this._requestsForTraceType.arguments&&aFrame.arguments){packet.arguments=[];let i=0;for(let arg of aFrame.arguments){if(i++>MAX_ARGUMENTS){break;}
packet.arguments.push(createValueSnapshot(arg,true));}}
if(this._requestsForTraceType.depth){packet.depth=aFrame.depth;}
const onExitFrame=this.onExitFrame;aFrame.onPop=function(aCompletion){onExitFrame(this,aCompletion);};this._send(packet);},onExitFrame:function(aFrame,aCompletion){let packet={type:"exitedFrame",sequence:this._sequence++,};if(!aCompletion){packet.why="terminated";}else if(aCompletion.hasOwnProperty("return")){packet.why="return";}else if(aCompletion.hasOwnProperty("yield")){packet.why="yield";}else{packet.why="throw";}
if(this._requestsForTraceType.time){packet.time=Date.now()-this._startTime;}
if(this._requestsForTraceType.depth){packet.depth=aFrame.depth;}
if(aCompletion){if(this._requestsForTraceType.return&&"return"in aCompletion){packet.return=createValueSnapshot(aCompletion.return,true);}
else if(this._requestsForTraceType.throw&&"throw"in aCompletion){packet.throw=createValueSnapshot(aCompletion.throw,true);}
else if(this._requestsForTraceType.yield&&"yield"in aCompletion){packet.yield=createValueSnapshot(aCompletion.yield,true);}}
this._send(packet);}};TracerActor.prototype.requestTypes={"attach":TracerActor.prototype.onAttach,"detach":TracerActor.prototype.onDetach,"startTrace":TracerActor.prototype.onStartTrace,"stopTrace":TracerActor.prototype.onStopTrace};exports.register=function(handle){handle.addTabActor(TracerActor,"traceActor");};exports.unregister=function(handle){handle.removeTabActor(TracerActor,"traceActor");};function MapStack()
{
this._stack=[];this._map=Object.create(null);}
MapStack.prototype={get size(){return this._stack.length;},peekKey:function(){return this._stack[this.size-1];},has:function(aKey){return Object.prototype.hasOwnProperty.call(this._map,aKey);},get:function(aKey){return this._map[aKey]||undefined;},push:function(aKey,aValue){this.delete(aKey);this._stack.push(aKey);this._map[aKey]=aValue;},pop:function(){let key=this.peekKey();let value=this.get(key);this._stack.pop();delete this._map[key];return value;},delete:function(aKey){let value=this.get(aKey);if(this.has(aKey)){let keyIndex=this._stack.lastIndexOf(aKey);this._stack.splice(keyIndex,1);delete this._map[aKey];}
return value;}};
function getOffsetColumn(aOffset,aScript){return 0;}

function createValueSnapshot(aValue,aDetailed=false){switch(typeof aValue){case"boolean":return aValue;case"string":if(aValue.length>=DebuggerServer.LONG_STRING_LENGTH){return{type:"longString",initial:aValue.substring(0,DebuggerServer.LONG_STRING_INITIAL_LENGTH),length:aValue.length};}
return aValue;case"number":if(aValue===Infinity){return{type:"Infinity"};}else if(aValue===-Infinity){return{type:"-Infinity"};}else if(Number.isNaN(aValue)){return{type:"NaN"};}else if(!aValue&&1/aValue===-Infinity){return{type:"-0"};}
return aValue;case"undefined":return{type:"undefined"};case"object":if(aValue===null){return{type:"null"};}
return aDetailed?detailedObjectSnapshot(aValue):objectSnapshot(aValue);default:DevToolsUtils.reportException("TracerActor",new Error("Failed to provide a grip for: "+aValue));return null;}}
function objectSnapshot(aObject){return{"type":"object","class":aObject.class,};}
function detailedObjectSnapshot(aObject){let desc=objectSnapshot(aObject);let ownProperties=desc.ownProperties=Object.create(null);if(aObject.class=="DeadObject"){return desc;}
let i=0;for(let name of aObject.getOwnPropertyNames()){if(i++>MAX_PROPERTIES){break;}
let desc=propertySnapshot(name,aObject);if(desc){ownProperties[name]=desc;}}
return desc;}
function propertySnapshot(aName,aObject){let desc;try{desc=aObject.getOwnPropertyDescriptor(aName);}catch(e){

return{configurable:false,writable:false,enumerable:false,value:e.name};}

if(!desc||typeof desc.value=="object"&&desc.value!==null||!("value"in desc)){return undefined;}
return{configurable:desc.configurable,enumerable:desc.enumerable,writable:desc.writable,value:createValueSnapshot(desc.value)};}