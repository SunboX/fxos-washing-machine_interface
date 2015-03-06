"use strict";const{Cc,Ci,Cu,Cr}=require("chrome");const DevToolsUtils=require("devtools/toolkit/DevToolsUtils.js");let DEFAULT_PROFILER_ENTRIES=1000000;let DEFAULT_PROFILER_INTERVAL=1;let DEFAULT_PROFILER_FEATURES=["js"];let gProfilerConsumers=0;let gProfilingStartTime=-1;Services.obs.addObserver(()=>gProfilingStartTime=Date.now(),"profiler-started",false);Services.obs.addObserver(()=>gProfilingStartTime=-1,"profiler-stopped",false);loader.lazyGetter(this,"nsIProfilerModule",()=>{return Cc["@mozilla.org/tools/profiler;1"].getService(Ci.nsIProfiler);});function ProfilerActor(){gProfilerConsumers++;this._observedEvents=new Set();}
ProfilerActor.prototype={actorPrefix:"profiler",disconnect:function(){for(let event of this._observedEvents){Services.obs.removeObserver(this,event);}
this._observedEvents=null;this.onStopProfiler();gProfilerConsumers--;checkProfilerConsumers();},onStartProfiler:function(request={}){nsIProfilerModule.StartProfiler((request.entries||DEFAULT_PROFILER_ENTRIES),(request.interval||DEFAULT_PROFILER_INTERVAL),(request.features||DEFAULT_PROFILER_FEATURES),(request.features||DEFAULT_PROFILER_FEATURES).length);return{started:true};},onStopProfiler:function(){

if(gProfilerConsumers==1){nsIProfilerModule.StopProfiler();}
return{started:false};},onIsActive:function(){let isActive=nsIProfilerModule.IsActive();let elapsedTime=isActive?getElapsedTime():undefined;return{isActive:isActive,currentTime:elapsedTime};},onGetProfile:function(){let profile=nsIProfilerModule.getProfileData();return{profile:profile,currentTime:getElapsedTime()};},onRegisterEventNotifications:function(request){let response=[];for(let event of request.events){if(this._observedEvents.has(event)){continue;}
Services.obs.addObserver(this,event,false);this._observedEvents.add(event);response.push(event);}
return{registered:response};},onUnregisterEventNotifications:function(request){let response=[];for(let event of request.events){if(!this._observedEvents.has(event)){continue;}
Services.obs.removeObserver(this,event);this._observedEvents.delete(event);response.push(event);}
return{unregistered:response};},observe:DevToolsUtils.makeInfallible(function(subject,topic,data){

subject=(subject&&!Cu.isXrayWrapper(subject)&&subject.wrappedJSObject)||subject;subject=JSON.parse(JSON.stringify(subject,cycleBreaker));data=(data&&!Cu.isXrayWrapper(data)&&data.wrappedJSObject)||data;data=JSON.parse(JSON.stringify(data,cycleBreaker));
let reply=details=>{this.conn.send({from:this.actorID,type:"eventNotification",subject:subject,topic:topic,data:data,details:details});};switch(topic){case"console-api-profiler":return void reply(this._handleConsoleEvent(subject,data));case"profiler-started":case"profiler-stopped":default:return void reply();}},"ProfilerActor.prototype.observe"),_handleConsoleEvent:function(subject,data){let args=subject.arguments;let profileLabel=args.length>0?args[0]+"":undefined;if(subject.action=="profile"){let{isActive,currentTime}=this.onIsActive();
if(!isActive){this.onStartProfiler();return{profileLabel:profileLabel,currentTime:0};}
return{profileLabel:profileLabel,currentTime:currentTime};}
if(subject.action=="profileEnd"){let details=this.onGetProfile();details.profileLabel=profileLabel;return details;}}};function cycleBreaker(key,value){if(key=="wrappedJSObject"){return undefined;}
return value;}
function getElapsedTime(){

if(gProfilingStartTime==-1){let profile=nsIProfilerModule.getProfileData();let lastSampleTime=findOldestSampleTime(profile);gProfilingStartTime=Date.now()-lastSampleTime;}
return Date.now()-gProfilingStartTime;}
function findOldestSampleTime(profile){let firstThreadSamples=profile.threads[0].samples;for(let i=firstThreadSamples.length-1;i>=0;i--){if("time"in firstThreadSamples[i]){return firstThreadSamples[i].time;}}}
function checkProfilerConsumers(){if(gProfilerConsumers<0){let msg="Somehow the number of started profilers is now negative.";DevToolsUtils.reportException("ProfilerActor",msg);}}
ProfilerActor.prototype.requestTypes={"startProfiler":ProfilerActor.prototype.onStartProfiler,"stopProfiler":ProfilerActor.prototype.onStopProfiler,"isActive":ProfilerActor.prototype.onIsActive,"getProfile":ProfilerActor.prototype.onGetProfile,"registerEventNotifications":ProfilerActor.prototype.onRegisterEventNotifications,"unregisterEventNotifications":ProfilerActor.prototype.onUnregisterEventNotifications};exports.register=function(handle){handle.addGlobalActor(ProfilerActor,"profilerActor");};exports.unregister=function(handle){handle.removeGlobalActor(ProfilerActor,"profilerActor");};