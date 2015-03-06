"use strict";const Services=require("Services");const{Cc,Ci,Cu,components,ChromeWorker}=require("chrome");const{ActorPool}=require("devtools/server/actors/common");const{DebuggerServer}=require("devtools/server/main");const DevToolsUtils=require("devtools/toolkit/DevToolsUtils");const{dbg_assert,dumpn,update}=DevToolsUtils;const{SourceMapConsumer,SourceMapGenerator}=require("source-map");const promise=require("promise");const Debugger=require("Debugger");const xpcInspector=require("xpcInspector");const mapURIToAddonID=require("./utils/map-uri-to-addon-id");const{defer,resolve,reject,all}=require("devtools/toolkit/deprecated-sync-thenables");const{CssLogic}=require("devtools/styleinspector/css-logic");DevToolsUtils.defineLazyGetter(this,"NetUtil",()=>{return Cu.import("resource://gre/modules/NetUtil.jsm",{}).NetUtil;});let TYPED_ARRAY_CLASSES=["Uint8Array","Uint8ClampedArray","Uint16Array","Uint32Array","Int8Array","Int16Array","Int32Array","Float32Array","Float64Array"];let OBJECT_PREVIEW_MAX_ITEMS=10;function BreakpointStore(){this._size=0;


this._wholeLineBreakpoints=Object.create(null);


this._breakpoints=Object.create(null);}
BreakpointStore.prototype={_size:null,get size(){return this._size;},addBreakpoint:function(aBreakpoint){let{url,line,column}=aBreakpoint;if(column!=null){if(!this._breakpoints[url]){this._breakpoints[url]=[];}
if(!this._breakpoints[url][line]){this._breakpoints[url][line]=[];}
if(!this._breakpoints[url][line][column]){this._breakpoints[url][line][column]=aBreakpoint;this._size++;}
return this._breakpoints[url][line][column];}else{if(!this._wholeLineBreakpoints[url]){this._wholeLineBreakpoints[url]=[];}
if(!this._wholeLineBreakpoints[url][line]){this._wholeLineBreakpoints[url][line]=aBreakpoint;this._size++;}
return this._wholeLineBreakpoints[url][line];}},removeBreakpoint:function({url,line,column}){if(column!=null){if(this._breakpoints[url]){if(this._breakpoints[url][line]){if(this._breakpoints[url][line][column]){delete this._breakpoints[url][line][column];this._size--;





if(Object.keys(this._breakpoints[url][line]).length===0){delete this._breakpoints[url][line];}}}}}else{if(this._wholeLineBreakpoints[url]){if(this._wholeLineBreakpoints[url][line]){delete this._wholeLineBreakpoints[url][line];this._size--;}}}},getBreakpoint:function(aLocation){let{url,line,column}=aLocation;dbg_assert(url!=null);dbg_assert(line!=null);var foundBreakpoint=this.hasBreakpoint(aLocation);if(foundBreakpoint==null){throw new Error("No breakpoint at url = "+url
+", line = "+line
+", column = "+column);}
return foundBreakpoint;},hasBreakpoint:function(aLocation){let{url,line,column}=aLocation;dbg_assert(url!=null);dbg_assert(line!=null);for(let bp of this.findBreakpoints(aLocation)){


return bp;}
return null;},findBreakpoints:function*(aSearchParams={}){if(aSearchParams.column!=null){dbg_assert(aSearchParams.line!=null);}
if(aSearchParams.line!=null){dbg_assert(aSearchParams.url!=null);}
for(let url of this._iterUrls(aSearchParams.url)){for(let line of this._iterLines(url,aSearchParams.line)){
if(aSearchParams.column==null&&this._wholeLineBreakpoints[url]&&this._wholeLineBreakpoints[url][line]){yield this._wholeLineBreakpoints[url][line];}
for(let column of this._iterColumns(url,line,aSearchParams.column)){yield this._breakpoints[url][line][column];}}}},_iterUrls:function*(aUrl){if(aUrl){if(this._breakpoints[aUrl]||this._wholeLineBreakpoints[aUrl]){yield aUrl;}}else{for(let url of Object.keys(this._wholeLineBreakpoints)){yield url;}
for(let url of Object.keys(this._breakpoints)){if(url in this._wholeLineBreakpoints){continue;}
yield url;}}},_iterLines:function*(aUrl,aLine){if(aLine!=null){if((this._wholeLineBreakpoints[aUrl]&&this._wholeLineBreakpoints[aUrl][aLine])||(this._breakpoints[aUrl]&&this._breakpoints[aUrl][aLine])){yield aLine;}}else{const wholeLines=this._wholeLineBreakpoints[aUrl]?Object.keys(this._wholeLineBreakpoints[aUrl]):[];const columnLines=this._breakpoints[aUrl]?Object.keys(this._breakpoints[aUrl]):[];const lines=wholeLines.concat(columnLines).sort();let lastLine;for(let line of lines){if(line===lastLine){continue;}
yield line;lastLine=line;}}},_iterColumns:function*(aUrl,aLine,aColumn){if(!this._breakpoints[aUrl]||!this._breakpoints[aUrl][aLine]){return;}
if(aColumn!=null){if(this._breakpoints[aUrl][aLine][aColumn]){yield aColumn;}}else{for(let column in this._breakpoints[aUrl][aLine]){yield column;}}},};exports.BreakpointStore=BreakpointStore;function EventLoopStack({thread,connection,hooks}){this._hooks=hooks;this._thread=thread;this._connection=connection;}
EventLoopStack.prototype={get size(){return xpcInspector.eventLoopNestLevel;},get lastPausedUrl(){let url=null;if(this.size>0){try{url=xpcInspector.lastNestRequestor.url}catch(e){
dumpn(e);}}
return url;},get lastConnection(){return xpcInspector.lastNestRequestor._connection;},push:function(){return new EventLoop({thread:this._thread,connection:this._connection,hooks:this._hooks});}};function EventLoop({thread,connection,hooks}){this._thread=thread;this._hooks=hooks;this._connection=connection;this.enter=this.enter.bind(this);this.resolve=this.resolve.bind(this);}
EventLoop.prototype={entered:false,resolved:false,get url(){return this._hooks.url;},enter:function(){let nestData=this._hooks.preNest?this._hooks.preNest():null;this.entered=true;xpcInspector.enterNestedEventLoop(this);if(xpcInspector.eventLoopNestLevel>0){const{resolved}=xpcInspector.lastNestRequestor;if(resolved){xpcInspector.exitNestedEventLoop();}}
dbg_assert(this._thread.state==="running","Should be in the running state");if(this._hooks.postNest){this._hooks.postNest(nestData);}},resolve:function(){if(!this.entered){throw new Error("Can't resolve an event loop before it has been entered!");}
if(this.resolved){throw new Error("Already resolved this nested event loop!");}
this.resolved=true;if(this===xpcInspector.lastNestRequestor){xpcInspector.exitNestedEventLoop();return true;}
return false;},};function ThreadActor(aParent,aGlobal)
{this._state="detached";this._frameActors=[];this._parent=aParent;this._dbg=null;this._gripDepth=0;this._threadLifetimePool=null;this._tabClosed=false;this._options={useSourceMaps:false,autoBlackBox:false};
this._hiddenBreakpoints=new Map();this.global=aGlobal;this._allEventsListener=this._allEventsListener.bind(this);this.onNewGlobal=this.onNewGlobal.bind(this);this.onNewSource=this.onNewSource.bind(this);this.uncaughtExceptionHook=this.uncaughtExceptionHook.bind(this);this.onDebuggerStatement=this.onDebuggerStatement.bind(this);this.onNewScript=this.onNewScript.bind(this);}
ThreadActor.breakpointStore=new BreakpointStore();ThreadActor.prototype={_gripDepth:null,actorPrefix:"context",get dbg(){if(!this._dbg){this._dbg=this._parent.makeDebugger();this._dbg.uncaughtExceptionHook=this.uncaughtExceptionHook;this._dbg.onDebuggerStatement=this.onDebuggerStatement;this._dbg.onNewScript=this.onNewScript;this._dbg.on("newGlobal",this.onNewGlobal);this._dbg.enabled=this._state!="detached";}
return this._dbg;},get globalDebugObject(){return this.dbg.makeGlobalObjectReference(this._parent.window);},get state(){return this._state;},get attached()this.state=="attached"||this.state=="running"||this.state=="paused",get breakpointStore(){return ThreadActor.breakpointStore;},get threadLifetimePool(){if(!this._threadLifetimePool){this._threadLifetimePool=new ActorPool(this.conn);this.conn.addActorPool(this._threadLifetimePool);this._threadLifetimePool.objectActors=new WeakMap();}
return this._threadLifetimePool;},get sources(){if(!this._sources){this._sources=new ThreadSources(this,this._options,this._allowSource,this.onNewSource);}
return this._sources;},get youngestFrame(){if(this.state!="paused"){return null;}
return this.dbg.getNewestFrame();},_prettyPrintWorker:null,get prettyPrintWorker(){if(!this._prettyPrintWorker){this._prettyPrintWorker=new ChromeWorker("resource://gre/modules/devtools/server/actors/pretty-print-worker.js");this._prettyPrintWorker.addEventListener("error",this._onPrettyPrintError,false);if(dumpn.wantLogging){this._prettyPrintWorker.addEventListener("message",this._onPrettyPrintMsg,false);const postMsg=this._prettyPrintWorker.postMessage;this._prettyPrintWorker.postMessage=data=>{dumpn("Sending message to prettyPrintWorker: "
+JSON.stringify(data,null,2)+"\n");return postMsg.call(this._prettyPrintWorker,data);};}}
return this._prettyPrintWorker;},_onPrettyPrintError:function({message,filename,lineno}){reportError(new Error(message+" @ "+filename+":"+lineno));},_onPrettyPrintMsg:function({data}){dumpn("Received message from prettyPrintWorker: "
+JSON.stringify(data,null,2)+"\n");},_threadPauseEventLoops:null,_pushThreadPause:function(){if(!this._threadPauseEventLoops){this._threadPauseEventLoops=[];}
const eventLoop=this._nestedEventLoops.push();this._threadPauseEventLoops.push(eventLoop);eventLoop.enter();},_popThreadPause:function(){const eventLoop=this._threadPauseEventLoops.pop();dbg_assert(eventLoop,"Should have an event loop.");eventLoop.resolve();},clearDebuggees:function(){if(this._dbg){this.dbg.removeAllDebuggees();}
this._sources=null;},onNewGlobal:function(aGlobal){this.conn.send({from:this.actorID,type:"newGlobal",hostAnnotations:aGlobal.hostAnnotations});},disconnect:function(){dumpn("in ThreadActor.prototype.disconnect");if(this._state=="paused"){this.onResume();}
this.clearDebuggees();this.conn.removeActorPool(this._threadLifetimePool);this._threadLifetimePool=null;if(this._prettyPrintWorker){this._prettyPrintWorker.removeEventListener("error",this._onPrettyPrintError,false);this._prettyPrintWorker.removeEventListener("message",this._onPrettyPrintMsg,false);this._prettyPrintWorker.terminate();this._prettyPrintWorker=null;}
if(!this._dbg){return;}
this._dbg.enabled=false;this._dbg=null;},exit:function(){this.disconnect();this._state="exited";}, onAttach:function(aRequest){if(this.state==="exited"){return{type:"exited"};}
if(this.state!=="detached"){return{error:"wrongState",message:"Current state is "+this.state};}
this._state="attached";update(this._options,aRequest.options||{});this._nestedEventLoops=new EventLoopStack({hooks:this._parent,connection:this.conn,thread:this});this.dbg.addDebuggees();this.dbg.enabled=true;try{let packet=this._paused();if(!packet){return{error:"notAttached"};}
packet.why={type:"attached"};this._restoreBreakpoints();

this.conn.send(packet);this._pushThreadPause();
return null;}catch(e){reportError(e);return{error:"notAttached",message:e.toString()};}},onDetach:function(aRequest){this.disconnect();this._state="detached";dumpn("ThreadActor.prototype.onDetach: returning 'detached' packet");return{type:"detached"};},onReconfigure:function(aRequest){if(this.state=="exited"){return{error:"wrongState"};}
update(this._options,aRequest.options||{});this._sources=null;return{};},_pauseAndRespond:function(aFrame,aReason,onPacket=function(k){return k;}){try{let packet=this._paused(aFrame);if(!packet){return undefined;}
packet.why=aReason;this.sources.getOriginalLocation(packet.frame.where).then(aOrigPosition=>{packet.frame.where=aOrigPosition;resolve(onPacket(packet)).then(null,error=>{reportError(error);return{error:"unknownError",message:error.message+"\n"+error.stack};}).then(packet=>{this.conn.send(packet);});});this._pushThreadPause();}catch(e){reportError(e,"Got an exception during TA__pauseAndRespond: ");}


return this._tabClosed?null:undefined;},_forceCompletion:function(aRequest){
return{error:"notImplemented",message:"forced completion is not yet implemented."};},_makeOnEnterFrame:function({pauseAndRespond}){return aFrame=>{const generatedLocation=getFrameLocation(aFrame);let{url}=this.synchronize(this.sources.getOriginalLocation(generatedLocation));return this.sources.isBlackBoxed(url)?undefined:pauseAndRespond(aFrame);};},_makeOnPop:function({thread,pauseAndRespond,createValueGrip}){return function(aCompletion){const generatedLocation=getFrameLocation(this);const{url}=thread.synchronize(thread.sources.getOriginalLocation(generatedLocation));if(thread.sources.isBlackBoxed(url)){return undefined;}

this.reportedPop=true;return pauseAndRespond(this,aPacket=>{aPacket.why.frameFinished={};if(!aCompletion){aPacket.why.frameFinished.terminated=true;}else if(aCompletion.hasOwnProperty("return")){aPacket.why.frameFinished.return=createValueGrip(aCompletion.return);}else if(aCompletion.hasOwnProperty("yield")){aPacket.why.frameFinished.return=createValueGrip(aCompletion.yield);}else{aPacket.why.frameFinished.throw=createValueGrip(aCompletion.throw);}
return aPacket;});};},_makeOnStep:function({thread,pauseAndRespond,startFrame,startLocation,steppingType}){if(steppingType==="break"){return function(){return pauseAndRespond(this);};}
return function(){const generatedLocation=getFrameLocation(this);const newLocation=thread.synchronize(thread.sources.getOriginalLocation(generatedLocation));



 
if(newLocation.url==null||thread.sources.isBlackBoxed(newLocation.url)){return undefined;} 
if(this!==startFrame||startLocation.url!==newLocation.url||startLocation.line!==newLocation.line){return pauseAndRespond(this);}

return undefined;};},_makeSteppingHooks:function(aStartLocation,steppingType){


const steppingHookState={pauseAndRespond:(aFrame,onPacket=(k)=>k)=>{return this._pauseAndRespond(aFrame,{type:"resumeLimit"},onPacket);},createValueGrip:this.createValueGrip.bind(this),thread:this,startFrame:this.youngestFrame,startLocation:aStartLocation,steppingType:steppingType};return{onEnterFrame:this._makeOnEnterFrame(steppingHookState),onPop:this._makeOnPop(steppingHookState),onStep:this._makeOnStep(steppingHookState)};},_handleResumeLimit:function(aRequest){let steppingType=aRequest.resumeLimit.type;if(["break","step","next","finish"].indexOf(steppingType)==-1){return reject({error:"badParameterType",message:"Unknown resumeLimit type"});}
const generatedLocation=getFrameLocation(this.youngestFrame);return this.sources.getOriginalLocation(generatedLocation).then(originalLocation=>{const{onEnterFrame,onPop,onStep}=this._makeSteppingHooks(originalLocation,steppingType);
let stepFrame=this._getNextStepFrame(this.youngestFrame);if(stepFrame){switch(steppingType){case"step":this.dbg.onEnterFrame=onEnterFrame;case"break":case"next":if(stepFrame.script){stepFrame.onStep=onStep;}
stepFrame.onPop=onPop;break;case"finish":stepFrame.onPop=onPop;}}
return true;});},_clearSteppingHooks:function(aFrame){if(aFrame&&aFrame.live){while(aFrame){aFrame.onStep=undefined;aFrame.onPop=undefined;aFrame=aFrame.older;}}},_maybeListenToEvents:function(aRequest){let events=aRequest.pauseOnDOMEvents;if(this.global&&events&&(events=="*"||(Array.isArray(events)&&events.length))){this._pauseOnDOMEvents=events;let els=Cc["@mozilla.org/eventlistenerservice;1"].getService(Ci.nsIEventListenerService);els.addListenerForAllEvents(this.global,this._allEventsListener,true);}},onResume:function(aRequest){if(this._state!=="paused"){return{error:"wrongState",message:"Can't resume when debuggee isn't paused. Current state is '"
+this._state+"'"};}

if(this._nestedEventLoops.size&&this._nestedEventLoops.lastPausedUrl&&(this._nestedEventLoops.lastPausedUrl!==this._parent.url||this._nestedEventLoops.lastConnection!==this.conn)){return{error:"wrongOrder",message:"trying to resume in the wrong order.",lastPausedUrl:this._nestedEventLoops.lastPausedUrl};}
if(aRequest&&aRequest.forceCompletion){return this._forceCompletion(aRequest);}
let resumeLimitHandled;if(aRequest&&aRequest.resumeLimit){resumeLimitHandled=this._handleResumeLimit(aRequest)}else{this._clearSteppingHooks(this.youngestFrame);resumeLimitHandled=resolve(true);}
return resumeLimitHandled.then(()=>{if(aRequest){this._options.pauseOnExceptions=aRequest.pauseOnExceptions;this._options.ignoreCaughtExceptions=aRequest.ignoreCaughtExceptions;this.maybePauseOnExceptions();this._maybeListenToEvents(aRequest);}
let packet=this._resumed();this._popThreadPause();return packet;},error=>{return error instanceof Error?{error:"unknownError",message:DevToolsUtils.safeErrorString(error)}

:error;});},synchronize:function(aPromise){let needNest=true;let eventLoop;let returnVal;aPromise.then((aResolvedVal)=>{needNest=false;returnVal=aResolvedVal;}).then(null,(aError)=>{reportError(aError,"Error inside synchronize:");}).then(()=>{if(eventLoop){eventLoop.resolve();}});if(needNest){eventLoop=this._nestedEventLoops.push();eventLoop.enter();}
return returnVal;},maybePauseOnExceptions:function(){if(this._options.pauseOnExceptions){this.dbg.onExceptionUnwind=this.onExceptionUnwind.bind(this);}},_allEventsListener:function(event){if(this._pauseOnDOMEvents=="*"||this._pauseOnDOMEvents.indexOf(event.type)!=-1){for(let listener of this._getAllEventListeners(event.target)){if(event.type==listener.type||this._pauseOnDOMEvents=="*"){this._breakOnEnter(listener.script);}}}},_getAllEventListeners:function(eventTarget){let els=Cc["@mozilla.org/eventlistenerservice;1"].getService(Ci.nsIEventListenerService);let targets=els.getEventTargetChainFor(eventTarget);let listeners=[];for(let target of targets){let handlers=els.getListenerInfoFor(target);for(let handler of handlers){

if(!handler||!handler.listenerObject||!handler.type)
continue;let l=Object.create(null);l.type=handler.type;let listener=handler.listenerObject;let listenerDO=this.globalDebugObject.makeDebuggeeValue(listener);if(listenerDO.class=="Object"||listenerDO.class=="XULElement"){
if(!listenerDO.unwrap()){continue;}
let heDesc;while(!heDesc&&listenerDO){heDesc=listenerDO.getOwnPropertyDescriptor("handleEvent");listenerDO=listenerDO.proto;}
if(heDesc&&heDesc.value){listenerDO=heDesc.value;}}

while(listenerDO.isBoundFunction){listenerDO=listenerDO.boundTargetFunction;}
l.script=listenerDO.script;
if(!l.script)
continue;listeners.push(l);}}
return listeners;},_breakOnEnter:function(script){let offsets=script.getAllOffsets();for(let line=0,n=offsets.length;line<n;line++){if(offsets[line]){let location={url:script.url,line:line};let resp=this._createAndStoreBreakpoint(location);dbg_assert(!resp.actualLocation,"No actualLocation should be returned");if(resp.error){reportError(new Error("Unable to set breakpoint on event listener"));return;}
let bp=this.breakpointStore.getBreakpoint(location);let bpActor=bp.actor;dbg_assert(bp,"Breakpoint must exist");dbg_assert(bpActor,"Breakpoint actor must be created");this._hiddenBreakpoints.set(bpActor.actorID,bpActor);break;}}},_getNextStepFrame:function(aFrame){let stepFrame=aFrame.reportedPop?aFrame.older:aFrame;if(!stepFrame||!stepFrame.script){stepFrame=null;}
return stepFrame;},onClientEvaluate:function(aRequest){if(this.state!=="paused"){return{error:"wrongState",message:"Debuggee must be paused to evaluate code."};}
let frame=this._requestFrame(aRequest.frame);if(!frame){return{error:"unknownFrame",message:"Evaluation frame not found"};}
if(!frame.environment){return{error:"notDebuggee",message:"cannot access the environment of this frame."};}
let youngest=this.youngestFrame;let resumedPacket=this._resumed();this.conn.send(resumedPacket); let completion=frame.eval(aRequest.expression);let packet=this._paused(youngest);packet.why={type:"clientEvaluated",frameFinished:this.createProtocolCompletionValue(completion)};return packet;},onFrames:function(aRequest){if(this.state!=="paused"){return{error:"wrongState",message:"Stack frames are only available while the debuggee is paused."};}
let start=aRequest.start?aRequest.start:0;let count=aRequest.count;let frame=this.youngestFrame;let i=0;while(frame&&(i<start)){frame=frame.older;i++;}

let frames=[];let promises=[];for(;frame&&(!count||i<(start+count));i++,frame=frame.older){let form=this._createFrameActor(frame).form();form.depth=i;frames.push(form);let promise=this.sources.getOriginalLocation(form.where).then((aOrigLocation)=>{form.where=aOrigLocation;let source=this.sources.source({url:form.where.url});if(source){form.source=source.form();}});promises.push(promise);}
return all(promises).then(function(){return{frames:frames};});},onReleaseMany:function(aRequest){if(!aRequest.actors){return{error:"missingParameter",message:"no actors were specified"};}
let res;for each(let actorID in aRequest.actors){let actor=this.threadLifetimePool.get(actorID);if(!actor){if(!res){res={error:"notReleasable",message:"Only thread-lifetime actors can be released."};}
continue;}
actor.onRelease();}
return res?res:{};},onSetBreakpoint:function(aRequest){if(this.state!=="paused"){return{error:"wrongState",message:"Breakpoints can only be set while the debuggee is paused."};}
let{url:originalSource,line:originalLine,column:originalColumn}=aRequest.location;let locationPromise=this.sources.getGeneratedLocation(aRequest.location);return locationPromise.then(({url,line,column})=>{if(line==null||line<0){return{error:"noScript",message:"Requested setting a breakpoint on "
+url+":"+line
+(column!=null?":"+column:"")
+" but there is no Debugger.Script at that location"};}
let response=this._createAndStoreBreakpoint({url:url,line:line,column:column,condition:aRequest.condition});

let originalLocation=this.sources.getOriginalLocation({url:url,line:line,column:column});return all([response,originalLocation]).then(([aResponse,{url,line}])=>{if(aResponse.actualLocation){let actualOrigLocation=this.sources.getOriginalLocation(aResponse.actualLocation);return actualOrigLocation.then(({url,line,column})=>{if(url!==originalSource||line!==originalLine||column!==originalColumn){aResponse.actualLocation={url:url,line:line,column:column};}
return aResponse;});}
if(url!==originalSource||line!==originalLine){aResponse.actualLocation={url:url,line:line};}
return aResponse;});});},_createAndStoreBreakpoint:function(aLocation){
this.breakpointStore.addBreakpoint(aLocation);return this._setBreakpoint(aLocation);},_setBreakpoint:function(aLocation){let actor;let storedBp=this.breakpointStore.getBreakpoint(aLocation);if(storedBp.actor){actor=storedBp.actor;actor.condition=aLocation.condition;}else{storedBp.actor=actor=new BreakpointActor(this,{url:aLocation.url,line:aLocation.line,column:aLocation.column,condition:aLocation.condition});this.threadLifetimePool.addActor(actor);} 
let scripts=this.dbg.findScripts(aLocation);if(scripts.length==0){


return{actor:actor.actorID};} 
let scriptsAndOffsetMappings=new Map();for(let script of scripts){this._findClosestOffsetMappings(aLocation,script,scriptsAndOffsetMappings);}
if(scriptsAndOffsetMappings.size>0){for(let[script,mappings]of scriptsAndOffsetMappings){for(let offsetMapping of mappings){script.setBreakpoint(offsetMapping.offset,actor);}
actor.addScript(script,this);}
return{actor:actor.actorID};} 
let scripts=this.dbg.findScripts({url:aLocation.url,line:aLocation.line,innermost:true});let actualLocation;let found=false;for(let script of scripts){let offsets=script.getAllOffsets();for(let line=aLocation.line;line<offsets.length;++line){if(offsets[line]){for(let offset of offsets[line]){script.setBreakpoint(offset,actor);}
actor.addScript(script,this);if(!actualLocation){actualLocation={url:aLocation.url,line:line};}
found=true;break;}}}
if(found){let existingBp=this.breakpointStore.hasBreakpoint(actualLocation);if(existingBp&&existingBp.actor){actor.onDelete();this.breakpointStore.removeBreakpoint(aLocation);return{actor:existingBp.actor.actorID,actualLocation:actualLocation};}else{actor.location=actualLocation;this.breakpointStore.addBreakpoint({actor:actor,url:actualLocation.url,line:actualLocation.line,column:actualLocation.column});this.breakpointStore.removeBreakpoint(aLocation);return{actor:actor.actorID,actualLocation:actualLocation};}}
return{error:"noCodeAtLineColumn",actor:actor.actorID};},_findClosestOffsetMappings:function(aTargetLocation,aScript,aScriptsAndOffsetMappings){if(aTargetLocation.column==null){let offsetMappings=aScript.getLineOffsets(aTargetLocation.line).map(o=>({line:aTargetLocation.line,offset:o}));if(offsetMappings.length){aScriptsAndOffsetMappings.set(aScript,offsetMappings);}
return;}
let offsetMappings=aScript.getAllColumnOffsets().filter(({lineNumber})=>lineNumber===aTargetLocation.line);


let closestDistance=Infinity;if(aScriptsAndOffsetMappings.size){for(let mappings of aScriptsAndOffsetMappings.values()){closestDistance=Math.abs(aTargetLocation.column-mappings[0].columnNumber);break;}}
for(let mapping of offsetMappings){let currentDistance=Math.abs(aTargetLocation.column-mapping.columnNumber);if(currentDistance>closestDistance){continue;}else if(currentDistance<closestDistance){closestDistance=currentDistance;aScriptsAndOffsetMappings.clear();aScriptsAndOffsetMappings.set(aScript,[mapping]);}else{if(!aScriptsAndOffsetMappings.has(aScript)){aScriptsAndOffsetMappings.set(aScript,[]);}
aScriptsAndOffsetMappings.get(aScript).push(mapping);}}},_discoverSources:function(){const sourcesToScripts=new Map();for(let s of this.dbg.findScripts()){if(s.source){sourcesToScripts.set(s.source,s);}}
return all([this.sources.sourcesForScript(script)
for(script of sourcesToScripts.values())]);},onSources:function(aRequest){return this._discoverSources().then(()=>{return{sources:[s.form()for(s of this.sources.iter())]};});},disableAllBreakpoints:function(){for(let bp of this.breakpointStore.findBreakpoints()){if(bp.actor){bp.actor.removeScripts();}}},onInterrupt:function(aRequest){if(this.state=="exited"){return{type:"exited"};}else if(this.state=="paused"){return{type:"paused",why:{type:"alreadyPaused"}};}else if(this.state!="running"){return{error:"wrongState",message:"Received interrupt request in "+this.state+" state."};}
try{let packet=this._paused();if(!packet){return{error:"notInterrupted"};}
packet.why={type:"interrupted"};

this.conn.send(packet);this._pushThreadPause();
return null;}catch(e){reportError(e);return{error:"notInterrupted",message:e.toString()};}},onEventListeners:function(aRequest){if(!this.global){return{error:"notImplemented",message:"eventListeners request is only supported in content debugging"};}
let els=Cc["@mozilla.org/eventlistenerservice;1"].getService(Ci.nsIEventListenerService);let nodes=this.global.document.getElementsByTagName("*");nodes=[this.global].concat([].slice.call(nodes));let listeners=[];for(let node of nodes){let handlers=els.getListenerInfoFor(node);for(let handler of handlers){let listenerForm=Object.create(null);let listener=handler.listenerObject;
if(!listener||!handler.type){continue;}
let selector=node.tagName?CssLogic.findCssSelector(node):"window";let nodeDO=this.globalDebugObject.makeDebuggeeValue(node);listenerForm.node={selector:selector,object:this.createValueGrip(nodeDO)};listenerForm.type=handler.type;listenerForm.capturing=handler.capturing;listenerForm.allowsUntrusted=handler.allowsUntrusted;listenerForm.inSystemEventGroup=handler.inSystemEventGroup;let handlerName="on"+listenerForm.type;listenerForm.isEventHandler=false;if(typeof node.hasAttribute!=="undefined"){listenerForm.isEventHandler=!!node.hasAttribute(handlerName);}
if(!!node[handlerName]){listenerForm.isEventHandler=!!node[handlerName];}
let listenerDO=this.globalDebugObject.makeDebuggeeValue(listener);if(listenerDO.class=="Object"||listenerDO.class=="XULElement"){
if(!listenerDO.unwrap()){continue;}
let heDesc;while(!heDesc&&listenerDO){heDesc=listenerDO.getOwnPropertyDescriptor("handleEvent");listenerDO=listenerDO.proto;}
if(heDesc&&heDesc.value){listenerDO=heDesc.value;}}

while(listenerDO.isBoundFunction){listenerDO=listenerDO.boundTargetFunction;}
listenerForm.function=this.createValueGrip(listenerDO);listeners.push(listenerForm);}}
return{listeners:listeners};},_requestFrame:function(aFrameID){if(!aFrameID){return this.youngestFrame;}
if(this._framePool.has(aFrameID)){return this._framePool.get(aFrameID).frame;}
return undefined;},_paused:function(aFrame){



if(this.state==="paused"){return undefined;}
this.dbg.onEnterFrame=undefined;this.dbg.onExceptionUnwind=undefined;if(aFrame){aFrame.onStep=undefined;aFrame.onPop=undefined;}

if(this.global&&!this.global.toString().contains("Sandbox")){let els=Cc["@mozilla.org/eventlistenerservice;1"].getService(Ci.nsIEventListenerService);els.removeListenerForAllEvents(this.global,this._allEventsListener,true);for(let[,bp]of this._hiddenBreakpoints){bp.onDelete();}
this._hiddenBreakpoints.clear();}
this._state="paused";
dbg_assert(!this._pausePool,"No pause pool should exist yet");this._pausePool=new ActorPool(this.conn);this.conn.addActorPool(this._pausePool);
this._pausePool.threadActor=this;dbg_assert(!this._pauseActor,"No pause actor should exist yet");this._pauseActor=new PauseActor(this._pausePool);this._pausePool.addActor(this._pauseActor);let poppedFrames=this._updateFrames();let packet={from:this.actorID,type:"paused",actor:this._pauseActor.actorID};if(aFrame){packet.frame=this._createFrameActor(aFrame).form();}
if(poppedFrames){packet.poppedFrames=poppedFrames;}
return packet;},_resumed:function(){this._state="running";this.conn.removeActorPool(this._pausePool);this._pausePool=null;this._pauseActor=null;return{from:this.actorID,type:"resumed"};},_updateFrames:function(){let popped=[];let framePool=new ActorPool(this.conn);let frameList=[];for each(let frameActor in this._frameActors){if(frameActor.frame.live){framePool.addActor(frameActor);frameList.push(frameActor);}else{popped.push(frameActor.actorID);}}

if(this._framePool){this.conn.removeActorPool(this._framePool);}
this._frameActors=frameList;this._framePool=framePool;this.conn.addActorPool(framePool);return popped;},_createFrameActor:function(aFrame){if(aFrame.actor){return aFrame.actor;}
let actor=new FrameActor(aFrame,this);this._frameActors.push(actor);this._framePool.addActor(actor);aFrame.actor=actor;return actor;},createEnvironmentActor:function(aEnvironment,aPool){if(!aEnvironment){return undefined;}
if(aEnvironment.actor){return aEnvironment.actor;}
let actor=new EnvironmentActor(aEnvironment,this);aPool.addActor(actor);aEnvironment.actor=actor;return actor;},createValueGrip:function(aValue,aPool=false){if(!aPool){aPool=this._pausePool;}
switch(typeof aValue){case"boolean":return aValue;case"string":if(this._stringIsLong(aValue)){return this.longStringGrip(aValue,aPool);}
return aValue;case"number":if(aValue===Infinity){return{type:"Infinity"};}else if(aValue===-Infinity){return{type:"-Infinity"};}else if(Number.isNaN(aValue)){return{type:"NaN"};}else if(!aValue&&1/aValue===-Infinity){return{type:"-0"};}
return aValue;case"undefined":return{type:"undefined"};case"object":if(aValue===null){return{type:"null"};}
return this.objectGrip(aValue,aPool);default:dbg_assert(false,"Failed to provide a grip for: "+aValue);return null;}},createProtocolCompletionValue:function(aCompletion){let protoValue={};if(aCompletion==null){protoValue.terminated=true;}else if("return"in aCompletion){protoValue.return=this.createValueGrip(aCompletion.return);}else if("throw"in aCompletion){protoValue.throw=this.createValueGrip(aCompletion.throw);}else{protoValue.return=this.createValueGrip(aCompletion.yield);}
return protoValue;},objectGrip:function(aValue,aPool){if(!aPool.objectActors){aPool.objectActors=new WeakMap();}
if(aPool.objectActors.has(aValue)){return aPool.objectActors.get(aValue).grip();}else if(this.threadLifetimePool.objectActors.has(aValue)){return this.threadLifetimePool.objectActors.get(aValue).grip();}
let actor=new PauseScopedObjectActor(aValue,this);aPool.addActor(actor);aPool.objectActors.set(aValue,actor);return actor.grip();},pauseObjectGrip:function(aValue){if(!this._pausePool){throw"Object grip requested while not paused.";}
return this.objectGrip(aValue,this._pausePool);},threadObjectGrip:function(aActor){
aActor.registeredPool.objectActors.delete(aActor.obj);this.threadLifetimePool.addActor(aActor);this.threadLifetimePool.objectActors.set(aActor.obj,aActor);},onThreadGrips:function(aRequest){if(this.state!="paused"){return{error:"wrongState"};}
if(!aRequest.actors){return{error:"missingParameter",message:"no actors were specified"};}
for(let actorID of aRequest.actors){let actor=this._pausePool.get(actorID);if(actor){this.threadObjectGrip(actor);}}
return{};},longStringGrip:function(aString,aPool){if(!aPool.longStringActors){aPool.longStringActors={};}
if(aPool.longStringActors.hasOwnProperty(aString)){return aPool.longStringActors[aString].grip();}
let actor=new LongStringActor(aString,this);aPool.addActor(actor);aPool.longStringActors[aString]=actor;return actor.grip();},pauseLongStringGrip:function(aString){return this.longStringGrip(aString,this._pausePool);},threadLongStringGrip:function(aString){return this.longStringGrip(aString,this._threadLifetimePool);},_stringIsLong:function(aString){return aString.length>=DebuggerServer.LONG_STRING_LENGTH;},uncaughtExceptionHook:function(aException){dumpn("Got an exception: "+aException.message+"\n"+aException.stack);},onDebuggerStatement:function(aFrame){
const generatedLocation=getFrameLocation(aFrame);const{url}=this.synchronize(this.sources.getOriginalLocation(generatedLocation));return this.sources.isBlackBoxed(url)||aFrame.onStep?undefined:this._pauseAndRespond(aFrame,{type:"debuggerStatement"});},onExceptionUnwind:function(aFrame,aValue){let willBeCaught=false;for(let frame=aFrame;frame!=null;frame=frame.older){if(frame.script.isInCatchScope(frame.offset)){willBeCaught=true;break;}}
if(willBeCaught&&this._options.ignoreCaughtExceptions){return undefined;}
const generatedLocation=getFrameLocation(aFrame);const{url}=this.synchronize(this.sources.getOriginalLocation(generatedLocation));if(this.sources.isBlackBoxed(url)){return undefined;}
try{let packet=this._paused(aFrame);if(!packet){return undefined;}
packet.why={type:"exception",exception:this.createValueGrip(aValue)};this.conn.send(packet);this._pushThreadPause();}catch(e){reportError(e,"Got an exception during TA_onExceptionUnwind: ");}
return undefined;},onNewScript:function(aScript,aGlobal){this._addScript(aScript);
for(let s of aScript.getChildScripts()){this._addScript(s);}
this.sources.sourcesForScript(aScript);},onNewSource:function(aSource){this.conn.send({from:this.actorID,type:"newSource",source:aSource.form()});},_allowSource:function(aSourceUrl){if(!aSourceUrl)
return false;if(aSourceUrl.indexOf("chrome://")==0){return false;}
if(aSourceUrl.indexOf("about:")==0){return false;}
return true;},_restoreBreakpoints:function(){if(this.breakpointStore.size===0){return;}
for(let s of this.dbg.findScripts()){this._addScript(s);}},_addScript:function(aScript){if(!this._allowSource(aScript.url)){return false;}
let endLine=aScript.startLine+aScript.lineCount-1;for(let bp of this.breakpointStore.findBreakpoints({url:aScript.url})){

if(!bp.actor.scripts.length&&bp.line>=aScript.startLine&&bp.line<=endLine){this._setBreakpoint(bp);}}
return true;},onPrototypesAndProperties:function(aRequest){let result={};for(let actorID of aRequest.actors){
let actor=this.conn.getActor(actorID);if(!actor){return{from:this.actorID,error:"noSuchActor"};}
let handler=actor.onPrototypeAndProperties;if(!handler){return{from:this.actorID,error:"unrecognizedPacketType",message:('Actor "'+actorID+'" does not recognize the packet type '+'"prototypeAndProperties"')};}
result[actorID]=handler.call(actor,{});}
return{from:this.actorID,actors:result};}};ThreadActor.prototype.requestTypes={"attach":ThreadActor.prototype.onAttach,"detach":ThreadActor.prototype.onDetach,"reconfigure":ThreadActor.prototype.onReconfigure,"resume":ThreadActor.prototype.onResume,"clientEvaluate":ThreadActor.prototype.onClientEvaluate,"frames":ThreadActor.prototype.onFrames,"interrupt":ThreadActor.prototype.onInterrupt,"eventListeners":ThreadActor.prototype.onEventListeners,"releaseMany":ThreadActor.prototype.onReleaseMany,"setBreakpoint":ThreadActor.prototype.onSetBreakpoint,"sources":ThreadActor.prototype.onSources,"threadGrips":ThreadActor.prototype.onThreadGrips,"prototypesAndProperties":ThreadActor.prototype.onPrototypesAndProperties};exports.ThreadActor=ThreadActor;function PauseActor(aPool)
{this.pool=aPool;}
PauseActor.prototype={actorPrefix:"pause"};function PauseScopedActor()
{}
PauseScopedActor.withPaused=function(aMethod){return function(){if(this.isPaused()){return aMethod.apply(this,arguments);}else{return this._wrongState();}};};PauseScopedActor.prototype={isPaused:function(){

return this.threadActor?this.threadActor.state==="paused":true;},_wrongState:function(){return{error:"wrongState",message:this.constructor.name+" actors can only be accessed while the thread is paused."};}};function resolveURIToLocalPath(aURI){switch(aURI.scheme){case"jar":case"file":return aURI;case"chrome":let resolved=Cc["@mozilla.org/chrome/chrome-registry;1"].getService(Ci.nsIChromeRegistry).convertChromeURL(aURI);return resolveURIToLocalPath(resolved);case"resource":resolved=Cc["@mozilla.org/network/protocol;1?name=resource"].getService(Ci.nsIResProtocolHandler).resolveURI(aURI);aURI=Services.io.newURI(resolved,null,null);return resolveURIToLocalPath(aURI);default:return null;}}
function SourceActor({url,thread,sourceMap,generatedSource,text,contentType}){this._threadActor=thread;this._url=url;this._sourceMap=sourceMap;this._generatedSource=generatedSource;this._text=text;this._contentType=contentType;this.onSource=this.onSource.bind(this);this._invertSourceMap=this._invertSourceMap.bind(this);this._saveMap=this._saveMap.bind(this);this._getSourceText=this._getSourceText.bind(this);this._mapSourceToAddon();if(this.threadActor.sources.isPrettyPrinted(this.url)){this._init=this.onPrettyPrint({indent:this.threadActor.sources.prettyPrintIndent(this.url)}).then(null,error=>{DevToolsUtils.reportException("SourceActor",error);});}else{this._init=null;}}
SourceActor.prototype={constructor:SourceActor,actorPrefix:"source",_oldSourceMap:null,_init:null,_addonID:null,_addonPath:null,get threadActor()this._threadActor,get url()this._url,get addonID()this._addonID,get addonPath()this._addonPath,get prettyPrintWorker(){return this.threadActor.prettyPrintWorker;},form:function(){return{actor:this.actorID,url:this._url,addonID:this._addonID,addonPath:this._addonPath,isBlackBoxed:this.threadActor.sources.isBlackBoxed(this.url),isPrettyPrinted:this.threadActor.sources.isPrettyPrinted(this.url)
};},disconnect:function(){if(this.registeredPool&&this.registeredPool.sourceActors){delete this.registeredPool.sourceActors[this.actorID];}},_mapSourceToAddon:function(){try{var nsuri=Services.io.newURI(this._url.split(" -> ").pop(),null,null);}
catch(e){ return;}
let localURI=resolveURIToLocalPath(nsuri);let id={};if(localURI&&mapURIToAddonID(localURI,id)){this._addonID=id.value;if(localURI instanceof Ci.nsIJARURI){ this._addonPath=localURI.JAREntry;}
else if(localURI instanceof Ci.nsIFileURL){
 let target=localURI.file;let path=target.leafName;
 let root=target.parent;let file=root.parent;while(file&&mapURIToAddonID(Services.io.newFileURI(file),{})){path=root.leafName+"/"+path;root=file;file=file.parent;}
if(!file){const error=new Error("Could not find the root of the add-on for "+this._url);DevToolsUtils.reportException("SourceActor.prototype._mapSourceToAddon",error)
return;}
this._addonPath=path;}}},_getSourceText:function(){const toResolvedContent=t=>resolve({content:t,contentType:this._contentType});let sc;if(this._sourceMap&&(sc=this._sourceMap.sourceContentFor(this._url))){return toResolvedContent(sc);}
if(this._text){return toResolvedContent(this._text);}


let sourceFetched=fetch(this._url,{loadFromCache:!this._sourceMap}); sourceFetched.then(({contentType})=>{this._contentType=contentType;});return sourceFetched;},onSource:function(){return resolve(this._init).then(this._getSourceText).then(({content,contentType})=>{return{from:this.actorID,source:this.threadActor.createValueGrip(content,this.threadActor.threadLifetimePool),contentType:contentType};}).then(null,aError=>{reportError(aError,"Got an exception during SA_onSource: ");return{"from":this.actorID,"error":"loadSourceError","message":"Could not load the source for "+this._url+".\n"
+DevToolsUtils.safeErrorString(aError)};});},onPrettyPrint:function({indent}){this.threadActor.sources.prettyPrint(this._url,indent);return this._getSourceText().then(this._sendToPrettyPrintWorker(indent)).then(this._invertSourceMap).then(this._saveMap).then(()=>{

this._init=null;}).then(this.onSource).then(null,error=>{this.onDisablePrettyPrint();return{from:this.actorID,error:"prettyPrintError",message:DevToolsUtils.safeErrorString(error)};});},_sendToPrettyPrintWorker:function(aIndent){return({content})=>{const deferred=promise.defer();const id=Math.random();const onReply=({data})=>{if(data.id!==id){return;}
this.prettyPrintWorker.removeEventListener("message",onReply,false);if(data.error){deferred.reject(new Error(data.error));}else{deferred.resolve(data);}};this.prettyPrintWorker.addEventListener("message",onReply,false);this.prettyPrintWorker.postMessage({id:id,url:this._url,indent:aIndent,source:content});return deferred.promise;};},_invertSourceMap:function({code,mappings}){const generator=new SourceMapGenerator({file:this._url});return DevToolsUtils.yieldingEach(mappings,m=>{let mapping={generated:{line:m.generatedLine,column:m.generatedColumn}};if(m.source){mapping.source=m.source;mapping.original={line:m.originalLine,column:m.originalColumn};mapping.name=m.name;}
generator.addMapping(mapping);}).then(()=>{generator.setSourceContent(this._url,code);const consumer=SourceMapConsumer.fromSourceMap(generator);

const getOrigPos=consumer.originalPositionFor.bind(consumer);const getGenPos=consumer.generatedPositionFor.bind(consumer);consumer.originalPositionFor=({line,column})=>{const location=getGenPos({line:line,column:column,source:this._url});location.source=this._url;return location;};consumer.generatedPositionFor=({line,column})=>getOrigPos({line:line,column:column});return{code:code,map:consumer};});},_saveMap:function({map}){if(this._sourceMap){ this._oldSourceMap=this._sourceMap;this._sourceMap=SourceMapGenerator.fromSourceMap(this._sourceMap);this._sourceMap.applySourceMap(map,this._url);this._sourceMap=SourceMapConsumer.fromSourceMap(this._sourceMap);this._threadActor.sources.saveSourceMap(this._sourceMap,this._generatedSource);}else{this._sourceMap=map;this._threadActor.sources.saveSourceMap(this._sourceMap,this._url);}},onDisablePrettyPrint:function(){this._sourceMap=this._oldSourceMap;this.threadActor.sources.saveSourceMap(this._sourceMap,this._generatedSource||this._url);this.threadActor.sources.disablePrettyPrint(this._url);return this.onSource();},onBlackBox:function(aRequest){this.threadActor.sources.blackBox(this.url);let packet={from:this.actorID};if(this.threadActor.state=="paused"&&this.threadActor.youngestFrame&&this.threadActor.youngestFrame.script.url==this.url){packet.pausedInSource=true;}
return packet;},onUnblackBox:function(aRequest){this.threadActor.sources.unblackBox(this.url);return{from:this.actorID};}};SourceActor.prototype.requestTypes={"source":SourceActor.prototype.onSource,"blackbox":SourceActor.prototype.onBlackBox,"unblackbox":SourceActor.prototype.onUnblackBox,"prettyPrint":SourceActor.prototype.onPrettyPrint,"disablePrettyPrint":SourceActor.prototype.onDisablePrettyPrint};function isObject(aValue){const type=typeof aValue;return type=="object"?aValue!==null:type=="function";}
function createBuiltinStringifier(aCtor){return aObj=>aCtor.prototype.toString.call(aObj.unsafeDereference());}
function errorStringify(aObj){let name=DevToolsUtils.getProperty(aObj,"name");if(name===""||name===undefined){name=aObj.class;}else if(isObject(name)){name=stringify(name);}
let message=DevToolsUtils.getProperty(aObj,"message");if(isObject(message)){message=stringify(message);}
if(message===""||message===undefined){return name;}
return name+": "+message;}
function stringify(aObj){if(aObj.class=="DeadObject"){const error=new Error("Dead object encountered.");DevToolsUtils.reportException("stringify",error);return"<dead object>";}
const stringifier=stringifiers[aObj.class]||stringifiers.Object;return stringifier(aObj);}
let seen=null;let stringifiers={Error:errorStringify,EvalError:errorStringify,RangeError:errorStringify,ReferenceError:errorStringify,SyntaxError:errorStringify,TypeError:errorStringify,URIError:errorStringify,Boolean:createBuiltinStringifier(Boolean),Function:createBuiltinStringifier(Function),Number:createBuiltinStringifier(Number),RegExp:createBuiltinStringifier(RegExp),String:createBuiltinStringifier(String),Object:obj=>"[object "+obj.class+"]",Array:obj=>{
const topLevel=!seen;if(topLevel){seen=new Set();}else if(seen.has(obj)){return"";}
seen.add(obj);const len=DevToolsUtils.getProperty(obj,"length");let string="";

if(typeof len=="number"&&len>0){for(let i=0;i<len;i++){const desc=obj.getOwnPropertyDescriptor(i);if(desc){const{value}=desc;if(value!=null){string+=isObject(value)?stringify(value):value;}}
if(i<len-1){string+=",";}}}
if(topLevel){seen=null;}
return string;},DOMException:obj=>{const message=DevToolsUtils.getProperty(obj,"message")||"<no message>";const result=(+DevToolsUtils.getProperty(obj,"result")).toString(16);const code=DevToolsUtils.getProperty(obj,"code");const name=DevToolsUtils.getProperty(obj,"name")||"<unknown>";return'[Exception... "'+message+'" '+'code: "'+code+'" '+'nsresult: "0x'+result+' ('+name+')"]';}};function ObjectActor(aObj,aThreadActor)
{dbg_assert(!aObj.optimizedOut,"Should not create object actors for optimized out values!");this.obj=aObj;this.threadActor=aThreadActor;}
ObjectActor.prototype={actorPrefix:"obj",grip:function(){this.threadActor._gripDepth++;let g={"type":"object","class":this.obj.class,"actor":this.actorID,"extensible":this.obj.isExtensible(),"frozen":this.obj.isFrozen(),"sealed":this.obj.isSealed()};if(this.obj.class!="DeadObject"){let raw=this.obj.unsafeDereference();
if(Cu){raw=Cu.unwaiveXrays(raw);}
if(!DevToolsUtils.isSafeJSObject(raw)){raw=null;}
let previewers=DebuggerServer.ObjectActorPreviewers[this.obj.class]||DebuggerServer.ObjectActorPreviewers.Object;for(let fn of previewers){try{if(fn(this,g,raw)){break;}}catch(e){DevToolsUtils.reportException("ObjectActor.prototype.grip previewer function",e);}}}
this.threadActor._gripDepth--;return g;},release:function(){if(this.registeredPool.objectActors){this.registeredPool.objectActors.delete(this.obj);}
this.registeredPool.removeActor(this);},onDefinitionSite:function OA_onDefinitionSite(aRequest){if(this.obj.class!="Function"){return{from:this.actorID,error:"objectNotFunction",message:this.actorID+" is not a function."};}
if(!this.obj.script){return{from:this.actorID,error:"noScript",message:this.actorID+" has no Debugger.Script"};}
const generatedLocation={url:this.obj.script.url,line:this.obj.script.startLine,column:0};return this.threadActor.sources.getOriginalLocation(generatedLocation).then(({url,line,column})=>{return{from:this.actorID,url:url,line:line,column:column};});},onOwnPropertyNames:function(aRequest){return{from:this.actorID,ownPropertyNames:this.obj.getOwnPropertyNames()};},onPrototypeAndProperties:function(aRequest){let ownProperties=Object.create(null);let names;try{names=this.obj.getOwnPropertyNames();}catch(ex){return{from:this.actorID,prototype:this.threadActor.createValueGrip(null),ownProperties:ownProperties,safeGetterValues:Object.create(null)};}
for(let name of names){ownProperties[name]=this._propertyDescriptor(name);}
return{from:this.actorID,prototype:this.threadActor.createValueGrip(this.obj.proto),ownProperties:ownProperties,safeGetterValues:this._findSafeGetterValues(ownProperties)};},_findSafeGetterValues:function(aOwnProperties,aLimit=0)
{let safeGetterValues=Object.create(null);let obj=this.obj;let level=0,i=0;while(obj){let getters=this._findSafeGetters(obj);for(let name of getters){
if(name in safeGetterValues||(obj!=this.obj&&name in aOwnProperties)){continue;}
let desc=null,getter=null;try{desc=obj.getOwnPropertyDescriptor(name);getter=desc.get;}catch(ex){}
if(!getter){obj._safeGetters=null;continue;}
let result=getter.call(this.obj);if(result&&!("throw"in result)){let getterValue=undefined;if("return"in result){getterValue=result.return;}else if("yield"in result){getterValue=result.yield;}

if(getterValue!==undefined){safeGetterValues[name]={getterValue:this.threadActor.createValueGrip(getterValue),getterPrototypeLevel:level,enumerable:desc.enumerable,writable:level==0?desc.writable:true,};if(aLimit&&++i==aLimit){break;}}}}
if(aLimit&&i==aLimit){break;}
obj=obj.proto;level++;}
return safeGetterValues;},_findSafeGetters:function(aObject)
{if(aObject._safeGetters){return aObject._safeGetters;}
let getters=new Set();let names=[];try{names=aObject.getOwnPropertyNames()}catch(ex){
}
for(let name of names){let desc=null;try{desc=aObject.getOwnPropertyDescriptor(name);}catch(e){
}
if(!desc||desc.value!==undefined||!("get"in desc)){continue;}
if(DevToolsUtils.hasSafeGetter(desc)){getters.add(name);}}
aObject._safeGetters=getters;return getters;},onPrototype:function(aRequest){return{from:this.actorID,prototype:this.threadActor.createValueGrip(this.obj.proto)};},onProperty:function(aRequest){if(!aRequest.name){return{error:"missingParameter",message:"no property name was specified"};}
return{from:this.actorID,descriptor:this._propertyDescriptor(aRequest.name)};},onDisplayString:function(aRequest){const string=stringify(this.obj);return{from:this.actorID,displayString:this.threadActor.createValueGrip(string)};},_propertyDescriptor:function(aName,aOnlyEnumerable){let desc;try{desc=this.obj.getOwnPropertyDescriptor(aName);}catch(e){

return{configurable:false,writable:false,enumerable:false,value:e.name};}
if(!desc||aOnlyEnumerable&&!desc.enumerable){return undefined;}
let retval={configurable:desc.configurable,enumerable:desc.enumerable};if("value"in desc){retval.writable=desc.writable;retval.value=this.threadActor.createValueGrip(desc.value);}else{if("get"in desc){retval.get=this.threadActor.createValueGrip(desc.get);}
if("set"in desc){retval.set=this.threadActor.createValueGrip(desc.set);}}
return retval;},onDecompile:function(aRequest){if(this.obj.class!=="Function"){return{error:"objectNotFunction",message:"decompile request is only valid for object grips "+"with a 'Function' class."};}
return{from:this.actorID,decompiledCode:this.obj.decompile(!!aRequest.pretty)};},onParameterNames:function(aRequest){if(this.obj.class!=="Function"){return{error:"objectNotFunction",message:"'parameterNames' request is only valid for object "+"grips with a 'Function' class."};}
return{parameterNames:this.obj.parameterNames};},onRelease:function(aRequest){this.release();return{};},onScope:function(aRequest){if(this.obj.class!=="Function"){return{error:"objectNotFunction",message:"scope request is only valid for object grips with a"+" 'Function' class."};}
let envActor=this.threadActor.createEnvironmentActor(this.obj.environment,this.registeredPool);if(!envActor){return{error:"notDebuggee",message:"cannot access the environment of this function."};}
return{from:this.actorID,scope:envActor.form()};}};ObjectActor.prototype.requestTypes={"definitionSite":ObjectActor.prototype.onDefinitionSite,"parameterNames":ObjectActor.prototype.onParameterNames,"prototypeAndProperties":ObjectActor.prototype.onPrototypeAndProperties,"prototype":ObjectActor.prototype.onPrototype,"property":ObjectActor.prototype.onProperty,"displayString":ObjectActor.prototype.onDisplayString,"ownPropertyNames":ObjectActor.prototype.onOwnPropertyNames,"decompile":ObjectActor.prototype.onDecompile,"release":ObjectActor.prototype.onRelease,"scope":ObjectActor.prototype.onScope,};exports.ObjectActor=ObjectActor;DebuggerServer.ObjectActorPreviewers={String:[function({obj,threadActor},aGrip){let result=genericObjectPreviewer("String",String,obj,threadActor);let length=DevToolsUtils.getProperty(obj,"length");if(!result||typeof length!="number"){return false;}
aGrip.preview={kind:"ArrayLike",length:length};if(threadActor._gripDepth>1){return true;}
let items=aGrip.preview.items=[];const max=Math.min(result.value.length,OBJECT_PREVIEW_MAX_ITEMS);for(let i=0;i<max;i++){let value=threadActor.createValueGrip(result.value[i]);items.push(value);}
return true;}],Boolean:[function({obj,threadActor},aGrip){let result=genericObjectPreviewer("Boolean",Boolean,obj,threadActor);if(result){aGrip.preview=result;return true;}
return false;}],Number:[function({obj,threadActor},aGrip){let result=genericObjectPreviewer("Number",Number,obj,threadActor);if(result){aGrip.preview=result;return true;}
return false;}],Function:[function({obj,threadActor},aGrip){if(obj.name){aGrip.name=obj.name;}
if(obj.displayName){aGrip.displayName=obj.displayName.substr(0,500);}
if(obj.parameterNames){aGrip.parameterNames=obj.parameterNames;}

let userDisplayName;try{userDisplayName=obj.getOwnPropertyDescriptor("displayName");}catch(e){
dumpn(e);}
if(userDisplayName&&typeof userDisplayName.value=="string"&&userDisplayName.value){aGrip.userDisplayName=threadActor.createValueGrip(userDisplayName.value);}
return true;}],RegExp:[function({obj,threadActor},aGrip){if(!obj.proto||obj.proto.class!="RegExp"){return false;}
let str=RegExp.prototype.toString.call(obj.unsafeDereference());aGrip.displayString=threadActor.createValueGrip(str);return true;}],Date:[function({obj,threadActor},aGrip){if(!obj.proto||obj.proto.class!="Date"){return false;}
let time=Date.prototype.getTime.call(obj.unsafeDereference());aGrip.preview={timestamp:threadActor.createValueGrip(time),};return true;}],Array:[function({obj,threadActor},aGrip){let length=DevToolsUtils.getProperty(obj,"length");if(typeof length!="number"){return false;}
aGrip.preview={kind:"ArrayLike",length:length,};if(threadActor._gripDepth>1){return true;}
let raw=obj.unsafeDereference();let items=aGrip.preview.items=[];for(let i=0;i<length;++i){




let desc=Object.getOwnPropertyDescriptor(Cu.waiveXrays(raw),i);if(desc&&!desc.get&&!desc.set){let value=Cu.unwaiveXrays(desc.value);value=makeDebuggeeValueIfNeeded(obj,value);items.push(threadActor.createValueGrip(value));}else{items.push(null);}
if(items.length==OBJECT_PREVIEW_MAX_ITEMS){break;}}
return true;}], Set:[function({obj,threadActor},aGrip){let size=DevToolsUtils.getProperty(obj,"size");if(typeof size!="number"){return false;}
aGrip.preview={kind:"ArrayLike",length:size,};if(threadActor._gripDepth>1){return true;}
let raw=obj.unsafeDereference();let items=aGrip.preview.items=[];





for(let item of Cu.waiveXrays(Set.prototype.values.call(raw))){item=Cu.unwaiveXrays(item);item=makeDebuggeeValueIfNeeded(obj,item);items.push(threadActor.createValueGrip(item));if(items.length==OBJECT_PREVIEW_MAX_ITEMS){break;}}
return true;}], Map:[function({obj,threadActor},aGrip){let size=DevToolsUtils.getProperty(obj,"size");if(typeof size!="number"){return false;}
aGrip.preview={kind:"MapLike",size:size,};if(threadActor._gripDepth>1){return true;}
let raw=obj.unsafeDereference();let entries=aGrip.preview.entries=[];







for(let keyValuePair of Cu.waiveXrays(Map.prototype.entries.call(raw))){let key=Cu.unwaiveXrays(keyValuePair[0]);let value=Cu.unwaiveXrays(keyValuePair[1]);key=makeDebuggeeValueIfNeeded(obj,key);value=makeDebuggeeValueIfNeeded(obj,value);entries.push([threadActor.createValueGrip(key),threadActor.createValueGrip(value)]);if(entries.length==OBJECT_PREVIEW_MAX_ITEMS){break;}}
return true;}], DOMStringMap:[function({obj,threadActor},aGrip,aRawObj){if(!aRawObj){return false;}
let keys=obj.getOwnPropertyNames();aGrip.preview={kind:"MapLike",size:keys.length,};if(threadActor._gripDepth>1){return true;}
let entries=aGrip.preview.entries=[];for(let key of keys){let value=makeDebuggeeValueIfNeeded(obj,aRawObj[key]);entries.push([key,threadActor.createValueGrip(value)]);if(entries.length==OBJECT_PREVIEW_MAX_ITEMS){break;}}
return true;}],};function genericObjectPreviewer(aClassName,aClass,aObj,aThreadActor){if(!aObj.proto||aObj.proto.class!=aClassName){return null;}
let raw=aObj.unsafeDereference();let v=null;try{v=aClass.prototype.valueOf.call(raw);}catch(ex){return null;}
if(v!==null){v=aThreadActor.createValueGrip(makeDebuggeeValueIfNeeded(aObj,v));return{value:v};}
return null;}
DebuggerServer.ObjectActorPreviewers.Object=[function TypedArray({obj,threadActor},aGrip){if(TYPED_ARRAY_CLASSES.indexOf(obj.class)==-1){return false;}
let length=DevToolsUtils.getProperty(obj,"length");if(typeof length!="number"){return false;}
aGrip.preview={kind:"ArrayLike",length:length,};if(threadActor._gripDepth>1){return true;}
let raw=obj.unsafeDereference();let global=Cu.getGlobalForObject(DebuggerServer);let classProto=global[obj.class].prototype;
let safeView=Cu.cloneInto(classProto.subarray.call(raw,0,OBJECT_PREVIEW_MAX_ITEMS),global);let items=aGrip.preview.items=[];for(let i=0;i<safeView.length;i++){items.push(safeView[i]);}
return true;},function Error({obj,threadActor},aGrip){switch(obj.class){case"Error":case"EvalError":case"RangeError":case"ReferenceError":case"SyntaxError":case"TypeError":case"URIError":let name=DevToolsUtils.getProperty(obj,"name");let msg=DevToolsUtils.getProperty(obj,"message");let stack=DevToolsUtils.getProperty(obj,"stack");let fileName=DevToolsUtils.getProperty(obj,"fileName");let lineNumber=DevToolsUtils.getProperty(obj,"lineNumber");let columnNumber=DevToolsUtils.getProperty(obj,"columnNumber");aGrip.preview={kind:"Error",name:threadActor.createValueGrip(name),message:threadActor.createValueGrip(msg),stack:threadActor.createValueGrip(stack),fileName:threadActor.createValueGrip(fileName),lineNumber:threadActor.createValueGrip(lineNumber),columnNumber:threadActor.createValueGrip(columnNumber),};return true;default:return false;}},function CSSMediaRule({obj,threadActor},aGrip,aRawObj){if(isWorker||!aRawObj||!(aRawObj instanceof Ci.nsIDOMCSSMediaRule)){return false;}
aGrip.preview={kind:"ObjectWithText",text:threadActor.createValueGrip(aRawObj.conditionText),};return true;},function CSSStyleRule({obj,threadActor},aGrip,aRawObj){if(isWorker||!aRawObj||!(aRawObj instanceof Ci.nsIDOMCSSStyleRule)){return false;}
aGrip.preview={kind:"ObjectWithText",text:threadActor.createValueGrip(aRawObj.selectorText),};return true;},function ObjectWithURL({obj,threadActor},aGrip,aRawObj){if(isWorker||!aRawObj||!(aRawObj instanceof Ci.nsIDOMCSSImportRule||aRawObj instanceof Ci.nsIDOMCSSStyleSheet||aRawObj instanceof Ci.nsIDOMLocation||aRawObj instanceof Ci.nsIDOMWindow)){return false;}
let url;if(aRawObj instanceof Ci.nsIDOMWindow&&aRawObj.location){url=aRawObj.location.href;}else if(aRawObj.href){url=aRawObj.href;}else{return false;}
aGrip.preview={kind:"ObjectWithURL",url:threadActor.createValueGrip(url),};return true;},function ArrayLike({obj,threadActor},aGrip,aRawObj){if(isWorker||!aRawObj||obj.class!="DOMStringList"&&obj.class!="DOMTokenList"&&!(aRawObj instanceof Ci.nsIDOMMozNamedAttrMap||aRawObj instanceof Ci.nsIDOMCSSRuleList||aRawObj instanceof Ci.nsIDOMCSSValueList||aRawObj instanceof Ci.nsIDOMFileList||aRawObj instanceof Ci.nsIDOMFontFaceList||aRawObj instanceof Ci.nsIDOMMediaList||aRawObj instanceof Ci.nsIDOMNodeList||aRawObj instanceof Ci.nsIDOMStyleSheetList)){return false;}
if(typeof aRawObj.length!="number"){return false;}
aGrip.preview={kind:"ArrayLike",length:aRawObj.length,};if(threadActor._gripDepth>1){return true;}
let items=aGrip.preview.items=[];for(let i=0;i<aRawObj.length&&items.length<OBJECT_PREVIEW_MAX_ITEMS;i++){let value=makeDebuggeeValueIfNeeded(obj,aRawObj[i]);items.push(threadActor.createValueGrip(value));}
return true;}, function CSSStyleDeclaration({obj,threadActor},aGrip,aRawObj){if(isWorker||!aRawObj||!(aRawObj instanceof Ci.nsIDOMCSSStyleDeclaration)){return false;}
aGrip.preview={kind:"MapLike",size:aRawObj.length,};let entries=aGrip.preview.entries=[];for(let i=0;i<OBJECT_PREVIEW_MAX_ITEMS&&i<aRawObj.length;i++){let prop=aRawObj[i];let value=aRawObj.getPropertyValue(prop);entries.push([prop,threadActor.createValueGrip(value)]);}
return true;},function DOMNode({obj,threadActor},aGrip,aRawObj){if(isWorker||obj.class=="Object"||!aRawObj||!(aRawObj instanceof Ci.nsIDOMNode)){return false;}
let preview=aGrip.preview={kind:"DOMNode",nodeType:aRawObj.nodeType,nodeName:aRawObj.nodeName,};if(aRawObj instanceof Ci.nsIDOMDocument&&aRawObj.location){preview.location=threadActor.createValueGrip(aRawObj.location.href);}else if(aRawObj instanceof Ci.nsIDOMDocumentFragment){preview.childNodesLength=aRawObj.childNodes.length;if(threadActor._gripDepth<2){preview.childNodes=[];for(let node of aRawObj.childNodes){let actor=threadActor.createValueGrip(obj.makeDebuggeeValue(node));preview.childNodes.push(actor);if(preview.childNodes.length==OBJECT_PREVIEW_MAX_ITEMS){break;}}}}else if(aRawObj instanceof Ci.nsIDOMElement){if(aRawObj instanceof Ci.nsIDOMHTMLElement){preview.nodeName=preview.nodeName.toLowerCase();}
let i=0;preview.attributes={};preview.attributesLength=aRawObj.attributes.length;for(let attr of aRawObj.attributes){preview.attributes[attr.nodeName]=threadActor.createValueGrip(attr.value);if(++i==OBJECT_PREVIEW_MAX_ITEMS){break;}}}else if(aRawObj instanceof Ci.nsIDOMAttr){preview.value=threadActor.createValueGrip(aRawObj.value);}else if(aRawObj instanceof Ci.nsIDOMText||aRawObj instanceof Ci.nsIDOMComment){preview.textContent=threadActor.createValueGrip(aRawObj.textContent);}
return true;}, function DOMEvent({obj,threadActor},aGrip,aRawObj){if(isWorker||!aRawObj||!(aRawObj instanceof Ci.nsIDOMEvent)){return false;}
let preview=aGrip.preview={kind:"DOMEvent",type:aRawObj.type,properties:Object.create(null),};if(threadActor._gripDepth<2){let target=obj.makeDebuggeeValue(aRawObj.target);preview.target=threadActor.createValueGrip(target);}
let props=[];if(aRawObj instanceof Ci.nsIDOMMouseEvent){props.push("buttons","clientX","clientY","layerX","layerY");}else if(aRawObj instanceof Ci.nsIDOMKeyEvent){let modifiers=[];if(aRawObj.altKey){modifiers.push("Alt");}
if(aRawObj.ctrlKey){modifiers.push("Control");}
if(aRawObj.metaKey){modifiers.push("Meta");}
if(aRawObj.shiftKey){modifiers.push("Shift");}
preview.eventKind="key";preview.modifiers=modifiers;props.push("key","charCode","keyCode");}else if(aRawObj instanceof Ci.nsIDOMTransitionEvent||aRawObj instanceof Ci.nsIDOMAnimationEvent){props.push("animationName","pseudoElement");}else if(aRawObj instanceof Ci.nsIDOMClipboardEvent){props.push("clipboardData");}
for(let prop of props){let value=aRawObj[prop];if(value&&(typeof value=="object"||typeof value=="function")){if(threadActor._gripDepth>1){continue;}
value=obj.makeDebuggeeValue(value);}
preview.properties[prop]=threadActor.createValueGrip(value);}
if(!props.length){let i=0;for(let prop in aRawObj){let value=aRawObj[prop];if(prop=="target"||prop=="type"||value===null||typeof value=="function"){continue;}
if(value&&typeof value=="object"){if(threadActor._gripDepth>1){continue;}
value=obj.makeDebuggeeValue(value);}
preview.properties[prop]=threadActor.createValueGrip(value);if(++i==OBJECT_PREVIEW_MAX_ITEMS){break;}}}
return true;}, function DOMException({obj,threadActor},aGrip,aRawObj){if(isWorker||!aRawObj||!(aRawObj instanceof Ci.nsIDOMDOMException)){return false;}
aGrip.preview={kind:"DOMException",name:threadActor.createValueGrip(aRawObj.name),message:threadActor.createValueGrip(aRawObj.message),code:threadActor.createValueGrip(aRawObj.code),result:threadActor.createValueGrip(aRawObj.result),filename:threadActor.createValueGrip(aRawObj.filename),lineNumber:threadActor.createValueGrip(aRawObj.lineNumber),columnNumber:threadActor.createValueGrip(aRawObj.columnNumber),};return true;},function GenericObject(aObjectActor,aGrip){let{obj,threadActor}=aObjectActor;if(aGrip.preview||aGrip.displayString||threadActor._gripDepth>1){return false;}
let i=0,names=[];let preview=aGrip.preview={kind:"Object",ownProperties:Object.create(null),};try{names=obj.getOwnPropertyNames();}catch(ex){
}
preview.ownPropertiesLength=names.length;for(let name of names){let desc=aObjectActor._propertyDescriptor(name,true);if(!desc){continue;}
preview.ownProperties[name]=desc;if(++i==OBJECT_PREVIEW_MAX_ITEMS){break;}}
if(i<OBJECT_PREVIEW_MAX_ITEMS){preview.safeGetterValues=aObjectActor._findSafeGetterValues(preview.ownProperties,OBJECT_PREVIEW_MAX_ITEMS-i);}
return true;},];function PauseScopedObjectActor()
{ObjectActor.apply(this,arguments);}
PauseScopedObjectActor.prototype=Object.create(PauseScopedActor.prototype);update(PauseScopedObjectActor.prototype,ObjectActor.prototype);update(PauseScopedObjectActor.prototype,{constructor:PauseScopedObjectActor,actorPrefix:"pausedobj",onOwnPropertyNames:PauseScopedActor.withPaused(ObjectActor.prototype.onOwnPropertyNames),onPrototypeAndProperties:PauseScopedActor.withPaused(ObjectActor.prototype.onPrototypeAndProperties),onPrototype:PauseScopedActor.withPaused(ObjectActor.prototype.onPrototype),onProperty:PauseScopedActor.withPaused(ObjectActor.prototype.onProperty),onDecompile:PauseScopedActor.withPaused(ObjectActor.prototype.onDecompile),onDisplayString:PauseScopedActor.withPaused(ObjectActor.prototype.onDisplayString),onParameterNames:PauseScopedActor.withPaused(ObjectActor.prototype.onParameterNames),onThreadGrip:PauseScopedActor.withPaused(function(aRequest){this.threadActor.threadObjectGrip(this);return{};}),onRelease:PauseScopedActor.withPaused(function(aRequest){if(this.registeredPool!==this.threadActor.threadLifetimePool){return{error:"notReleasable",message:"Only thread-lifetime actors can be released."};}
this.release();return{};}),});update(PauseScopedObjectActor.prototype.requestTypes,{"threadGrip":PauseScopedObjectActor.prototype.onThreadGrip,});function LongStringActor(aString)
{this.string=aString;this.stringLength=aString.length;}
LongStringActor.prototype={actorPrefix:"longString",disconnect:function(){

if(this.registeredPool&&this.registeredPool.longStringActors){delete this.registeredPool.longStringActors[this.actorID];}},grip:function(){return{"type":"longString","initial":this.string.substring(0,DebuggerServer.LONG_STRING_INITIAL_LENGTH),"length":this.stringLength,"actor":this.actorID};},onSubstring:function(aRequest){return{"from":this.actorID,"substring":this.string.substring(aRequest.start,aRequest.end)};},onRelease:function(){

if(this.registeredPool.longStringActors){delete this.registeredPool.longStringActors[this.actorID];}
this.registeredPool.removeActor(this);return{};},};LongStringActor.prototype.requestTypes={"substring":LongStringActor.prototype.onSubstring,"release":LongStringActor.prototype.onRelease};exports.LongStringActor=LongStringActor;function FrameActor(aFrame,aThreadActor)
{this.frame=aFrame;this.threadActor=aThreadActor;}
FrameActor.prototype={actorPrefix:"frame",_frameLifetimePool:null,get frameLifetimePool(){if(!this._frameLifetimePool){this._frameLifetimePool=new ActorPool(this.conn);this.conn.addActorPool(this._frameLifetimePool);}
return this._frameLifetimePool;},disconnect:function(){this.conn.removeActorPool(this._frameLifetimePool);this._frameLifetimePool=null;},form:function(){let form={actor:this.actorID,type:this.frame.type};if(this.frame.type==="call"){form.callee=this.threadActor.createValueGrip(this.frame.callee);}
if(this.frame.environment){let envActor=this.threadActor.createEnvironmentActor(this.frame.environment,this.frameLifetimePool);form.environment=envActor.form();}
form.this=this.threadActor.createValueGrip(this.frame.this);form.arguments=this._args();if(this.frame.script){form.where=getFrameLocation(this.frame);}
if(!this.frame.older){form.oldest=true;}
return form;},_args:function(){if(!this.frame.arguments){return[];}
return[this.threadActor.createValueGrip(arg)
for each(arg in this.frame.arguments)];},onPop:function(aRequest){ if(typeof this.frame.pop!="function"){return{error:"notImplemented",message:"Popping frames is not yet implemented."};}
while(this.frame!=this.threadActor.dbg.getNewestFrame()){this.threadActor.dbg.getNewestFrame().pop();}
this.frame.pop(aRequest.completionValue);
return{from:this.actorID};}};FrameActor.prototype.requestTypes={"pop":FrameActor.prototype.onPop,};function BreakpointActor(aThreadActor,{url,line,column,condition})
{this.scripts=[];this.threadActor=aThreadActor;this.location={url:url,line:line,column:column};this.condition=condition;}
BreakpointActor.prototype={actorPrefix:"breakpoint",condition:null,addScript:function(aScript,aThreadActor){this.threadActor=aThreadActor;this.scripts.push(aScript);},removeScripts:function(){for(let script of this.scripts){script.clearBreakpoint(this);}
this.scripts=[];},isValidCondition:function(aFrame){if(!this.condition){return true;}
var res=aFrame.eval(this.condition);return res.return;},hit:function(aFrame){
let{url}=this.threadActor.synchronize(this.threadActor.sources.getOriginalLocation({url:this.location.url,line:this.location.line,column:this.location.column}));if(this.threadActor.sources.isBlackBoxed(url)||aFrame.onStep||!this.isValidCondition(aFrame)){return undefined;}
let reason={};if(this.threadActor._hiddenBreakpoints.has(this.actorID)){reason.type="pauseOnDOMEvents";}else{reason.type="breakpoint";reason.actors=[this.actorID];}
return this.threadActor._pauseAndRespond(aFrame,reason);},onDelete:function(aRequest){this.threadActor.breakpointStore.removeBreakpoint(this.location);this.threadActor.threadLifetimePool.removeActor(this);this.removeScripts();return{from:this.actorID};}};BreakpointActor.prototype.requestTypes={"delete":BreakpointActor.prototype.onDelete};function EnvironmentActor(aEnvironment,aThreadActor)
{this.obj=aEnvironment;this.threadActor=aThreadActor;}
EnvironmentActor.prototype={actorPrefix:"environment",form:function(){let form={actor:this.actorID};if(this.obj.type=="declarative"){form.type=this.obj.callee?"function":"block";}else{form.type=this.obj.type;}
if(this.obj.parent){form.parent=(this.threadActor.createEnvironmentActor(this.obj.parent,this.registeredPool).form());}
if(this.obj.type=="object"||this.obj.type=="with"){form.object=this.threadActor.createValueGrip(this.obj.object);}
if(this.obj.callee){form.function=this.threadActor.createValueGrip(this.obj.callee);}
if(this.obj.type=="declarative"){form.bindings=this._bindings();}
return form;},_bindings:function(){let bindings={arguments:[],variables:{}};
if(typeof this.obj.getVariable!="function"){return bindings;}
let parameterNames;if(this.obj.callee){parameterNames=this.obj.callee.parameterNames;}
for each(let name in parameterNames){let arg={};let value=this.obj.getVariable(name);if(value&&value.optimizedOut){continue;}

let desc={value:value,configurable:false,writable:true,enumerable:true};let descForm={enumerable:true,configurable:desc.configurable};if("value"in desc){descForm.value=this.threadActor.createValueGrip(desc.value);descForm.writable=desc.writable;}else{descForm.get=this.threadActor.createValueGrip(desc.get);descForm.set=this.threadActor.createValueGrip(desc.set);}
arg[name]=descForm;bindings.arguments.push(arg);}
for each(let name in this.obj.names()){if(bindings.arguments.some(function exists(element){return!!element[name];})){continue;}
let value=this.obj.getVariable(name);if(value&&(value.optimizedOut||value.missingArguments)){continue;}

let desc={value:value,configurable:false,writable:true,enumerable:true};let descForm={enumerable:true,configurable:desc.configurable};if("value"in desc){descForm.value=this.threadActor.createValueGrip(desc.value);descForm.writable=desc.writable;}else{descForm.get=this.threadActor.createValueGrip(desc.get||undefined);descForm.set=this.threadActor.createValueGrip(desc.set||undefined);}
bindings.variables[name]=descForm;}
return bindings;},onAssign:function(aRequest){
try{this.obj.setVariable(aRequest.name,aRequest.value);}catch(e if e instanceof Debugger.DebuggeeWouldRun){return{error:"threadWouldRun",cause:e.cause?e.cause:"setter",message:"Assigning a value would cause the debuggee to run"};}
return{from:this.actorID};},onBindings:function(aRequest){return{from:this.actorID,bindings:this._bindings()};}};EnvironmentActor.prototype.requestTypes={"assign":EnvironmentActor.prototype.onAssign,"bindings":EnvironmentActor.prototype.onBindings};exports.EnvironmentActor=EnvironmentActor;Debugger.Script.prototype.toString=function(){let output="";if(this.url){output+=this.url;}
if(typeof this.startLine!="undefined"){output+=":"+this.startLine;if(this.lineCount&&this.lineCount>1){output+="-"+(this.startLine+this.lineCount-1);}}
if(this.strictMode){output+=":strict";}
return output;};Object.defineProperty(Debugger.Frame.prototype,"line",{configurable:true,get:function(){if(this.script){return this.script.getOffsetLine(this.offset);}else{return null;}}});function ChromeDebuggerActor(aConnection,aParent)
{ThreadActor.call(this,aParent);}
ChromeDebuggerActor.prototype=Object.create(ThreadActor.prototype);update(ChromeDebuggerActor.prototype,{constructor:ChromeDebuggerActor,actorPrefix:"chromeDebugger",_allowSource:aSourceURL=>!!aSourceURL});exports.ChromeDebuggerActor=ChromeDebuggerActor;function AddonThreadActor(aConnect,aParent){ThreadActor.call(this,aParent);}
AddonThreadActor.prototype=Object.create(ThreadActor.prototype);update(AddonThreadActor.prototype,{constructor:AddonThreadActor,actorPrefix:"addonThread",_allowSource:function(aSourceURL){ if(!aSourceURL){return false;}
if(aSourceURL=="resource://gre/modules/addons/XPIProvider.jsm"){return false;}
return true;},});exports.AddonThreadActor=AddonThreadActor;function ThreadSources(aThreadActor,aOptions,aAllowPredicate,aOnNewSource){this._thread=aThreadActor;this._useSourceMaps=aOptions.useSourceMaps;this._autoBlackBox=aOptions.autoBlackBox;this._allow=aAllowPredicate;this._onNewSource=aOnNewSource; this._sourceMapsByGeneratedSource=Object.create(null); this._sourceMapsByOriginalSource=Object.create(null); this._sourceActors=Object.create(null); this._generatedUrlsByOriginalUrl=Object.create(null);}
ThreadSources._blackBoxedSources=new Set(["self-hosted"]);ThreadSources._prettyPrintedSources=new Map();const MINIFIED_SOURCE_REGEXP=/\bmin\.js$/;ThreadSources.prototype={source:function({url,sourceMap,generatedSource,text,contentType}){if(!this._allow(url)){return null;}
if(url in this._sourceActors){return this._sourceActors[url];}
if(this._autoBlackBox&&this._isMinifiedURL(url)){this.blackBox(url);}
let actor=new SourceActor({url:url,thread:this._thread,sourceMap:sourceMap,generatedSource:generatedSource,text:text,contentType:contentType});this._thread.threadLifetimePool.addActor(actor);this._sourceActors[url]=actor;try{this._onNewSource(actor);}catch(e){reportError(e);}
return actor;},_isMinifiedURL:function(aURL){try{let url=Services.io.newURI(aURL,null,null).QueryInterface(Ci.nsIURL);return MINIFIED_SOURCE_REGEXP.test(url.fileName);}catch(e){
return MINIFIED_SOURCE_REGEXP.test(aURL);}},_sourceForScript:function(aScript){const spec={url:aScript.url};



if(aScript.url){try{const url=Services.io.newURI(aScript.url,null,null).QueryInterface(Ci.nsIURL);if(url.fileExtension==="js"){spec.contentType="text/javascript";
if(aScript.source.text!="[no source]"){spec.text=aScript.source.text;}}}catch(ex){}}
return this.source(spec);},sourcesForScript:function(aScript){if(!this._useSourceMaps||!aScript.sourceMapURL){return resolve([this._sourceForScript(aScript)].filter(isNotNull));}
return this.sourceMap(aScript).then((aSourceMap)=>{return[this.source({url:s,sourceMap:aSourceMap,generatedSource:aScript.url})
for(s of aSourceMap.sources)];}).then(null,(e)=>{reportError(e);delete this._sourceMapsByGeneratedSource[aScript.url];return[this._sourceForScript(aScript)];}).then(ss=>ss.filter(isNotNull));},sourceMap:function(aScript){dbg_assert(aScript.sourceMapURL,"Script should have a sourceMapURL");let sourceMapURL=this._normalize(aScript.sourceMapURL,aScript.url);let map=this._fetchSourceMap(sourceMapURL,aScript.url).then(aSourceMap=>this.saveSourceMap(aSourceMap,aScript.url));this._sourceMapsByGeneratedSource[aScript.url]=map;return map;},saveSourceMap:function(aSourceMap,aGeneratedSource){if(!aSourceMap){delete this._sourceMapsByGeneratedSource[aGeneratedSource];return null;}
this._sourceMapsByGeneratedSource[aGeneratedSource]=resolve(aSourceMap);for(let s of aSourceMap.sources){this._generatedUrlsByOriginalUrl[s]=aGeneratedSource;this._sourceMapsByOriginalSource[s]=resolve(aSourceMap);}
return aSourceMap;},_fetchSourceMap:function(aAbsSourceMapURL,aScriptURL){return fetch(aAbsSourceMapURL,{loadFromCache:false}).then(({content})=>{let map=new SourceMapConsumer(content);this._setSourceMapRoot(map,aAbsSourceMapURL,aScriptURL);return map;});},_setSourceMapRoot:function(aSourceMap,aAbsSourceMapURL,aScriptURL){const base=this._dirname(aAbsSourceMapURL.indexOf("data:")===0?aScriptURL:aAbsSourceMapURL);aSourceMap.sourceRoot=aSourceMap.sourceRoot?this._normalize(aSourceMap.sourceRoot,base):base;},_dirname:function(aPath){return Services.io.newURI(".",null,Services.io.newURI(aPath,null,null)).spec;},getOriginalLocation:function({url,line,column}){if(url in this._sourceMapsByGeneratedSource){column=column||0;return this._sourceMapsByGeneratedSource[url].then((aSourceMap)=>{let{source:aSourceURL,line:aLine,column:aColumn}=aSourceMap.originalPositionFor({line:line,column:column});return{url:aSourceURL,line:aLine,column:aColumn};}).then(null,error=>{if(!DevToolsUtils.reportingDisabled){DevToolsUtils.reportException("ThreadSources.prototype.getOriginalLocation",error);}
return{url:null,line:null,column:null};});} 
return resolve({url:url,line:line,column:column});},getGeneratedLocation:function({url,line,column}){if(url in this._sourceMapsByOriginalSource){return this._sourceMapsByOriginalSource[url].then((aSourceMap)=>{let{line:aLine,column:aColumn}=aSourceMap.generatedPositionFor({source:url,line:line,column:column==null?Infinity:column});return{url:this._generatedUrlsByOriginalUrl[url],line:aLine,column:aColumn};});} 
return resolve({url:url,line:line,column:column});},isBlackBoxed:function(aURL){return ThreadSources._blackBoxedSources.has(aURL);},blackBox:function(aURL){ThreadSources._blackBoxedSources.add(aURL);},unblackBox:function(aURL){ThreadSources._blackBoxedSources.delete(aURL);},isPrettyPrinted:function(aURL){return ThreadSources._prettyPrintedSources.has(aURL);},prettyPrint:function(aURL,aIndent){ThreadSources._prettyPrintedSources.set(aURL,aIndent);},prettyPrintIndent:function(aURL){return ThreadSources._prettyPrintedSources.get(aURL);},disablePrettyPrint:function(aURL){ThreadSources._prettyPrintedSources.delete(aURL);},_normalize:function(...aURLs){dbg_assert(aURLs.length>1,"Should have more than 1 URL");let base=Services.io.newURI(aURLs.pop(),null,null);let url;while((url=aURLs.pop())){base=Services.io.newURI(url,null,base);}
return base.spec;},iter:function*(){for(let url in this._sourceActors){yield this._sourceActors[url];}}};exports.ThreadSources=ThreadSources;
function getOffsetColumn(aOffset,aScript){let bestOffsetMapping=null;for(let offsetMapping of aScript.getAllColumnOffsets()){if(!bestOffsetMapping||(offsetMapping.offset<=aOffset&&offsetMapping.offset>bestOffsetMapping.offset)){bestOffsetMapping=offsetMapping;}}
if(!bestOffsetMapping){


reportError(new Error("Could not find a column for offset "+aOffset
+" in the script "+aScript));return 0;}
return bestOffsetMapping.columnNumber;}
function getFrameLocation(aFrame){if(!aFrame||!aFrame.script){return{url:null,line:null,column:null};}
return{url:aFrame.script.url,line:aFrame.script.getOffsetLine(aFrame.offset),column:getOffsetColumn(aFrame.offset,aFrame.script)}}
function isNotNull(aThing){return aThing!==null;}
function fetch(aURL,aOptions={loadFromCache:true}){let deferred=defer();let scheme;let url=aURL.split(" -> ").pop();let charset;let contentType;try{scheme=Services.io.extractScheme(url);}catch(e){

url="file://"+url;scheme=Services.io.extractScheme(url);}
switch(scheme){case"file":case"chrome":case"resource":try{NetUtil.asyncFetch(url,function onFetch(aStream,aStatus,aRequest){if(!components.isSuccessCode(aStatus)){deferred.reject(new Error("Request failed with status code = "
+aStatus
+" after NetUtil.asyncFetch for url = "
+url));return;}
let source=NetUtil.readInputStreamToString(aStream,aStream.available());contentType=aRequest.contentType;deferred.resolve(source);aStream.close();});}catch(ex){deferred.reject(ex);}
break;default:let channel;try{channel=Services.io.newChannel(url,null,null);}catch(e if e.name=="NS_ERROR_UNKNOWN_PROTOCOL"){
url="file:///"+url;channel=Services.io.newChannel(url,null,null);}
let chunks=[];let streamListener={onStartRequest:function(aRequest,aContext,aStatusCode){if(!components.isSuccessCode(aStatusCode)){deferred.reject(new Error("Request failed with status code = "
+aStatusCode
+" in onStartRequest handler for url = "
+url));}},onDataAvailable:function(aRequest,aContext,aStream,aOffset,aCount){chunks.push(NetUtil.readInputStreamToString(aStream,aCount));},onStopRequest:function(aRequest,aContext,aStatusCode){if(!components.isSuccessCode(aStatusCode)){deferred.reject(new Error("Request failed with status code = "
+aStatusCode
+" in onStopRequest handler for url = "
+url));return;}
charset=channel.contentCharset;contentType=channel.contentType;deferred.resolve(chunks.join(""));}};channel.loadFlags=aOptions.loadFromCache?channel.LOAD_FROM_CACHE:channel.LOAD_BYPASS_CACHE;channel.asyncOpen(streamListener,null);break;}
return deferred.promise.then(source=>{return{content:convertToUnicode(source,charset),contentType:contentType};});}
function convertToUnicode(aString,aCharset=null){let converter=Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);try{converter.charset=aCharset||"UTF-8";return converter.ConvertToUnicode(aString);}catch(e){return aString;}}
let oldReportError=reportError;reportError=function(aError,aPrefix=""){dbg_assert(aError instanceof Error,"Must pass Error objects to reportError");let msg=aPrefix+aError.message+":\n"+aError.stack;oldReportError(msg);dumpn(msg);}
function makeDebuggeeValueIfNeeded(obj,value){if(value&&(typeof value=="object"||typeof value=="function")){return obj.makeDebuggeeValue(value);}
return value;}
function getInnerId(window){return window.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils).currentInnerWindowID;};exports.register=function(handle){ThreadActor.breakpointStore=new BreakpointStore();ThreadSources._blackBoxedSources=new Set(["self-hosted"]);ThreadSources._prettyPrintedSources=new Map();};exports.unregister=function(handle){ThreadActor.breakpointStore=null;ThreadSources._blackBoxedSources.clear();ThreadSources._prettyPrintedSources.clear();};