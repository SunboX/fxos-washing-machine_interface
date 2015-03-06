"use strict";module.metadata={"stability":"experimental"};const{Ci}=require("chrome");const{open}=require("../event/dom");const{observe}=require("../event/chrome");const{filter,merge,map,expand}=require("../event/utils");const{windows}=require("../window/utils");const{events:windowEvents}=require("sdk/window/events");


let TYPES=["DOMContentLoaded","load","pageshow","pagehide"];let insert=observe("document-element-inserted");let windowCreate=merge([observe("content-document-global-created"),observe("chrome-document-global-created")]);let create=map(windowCreate,function({target,data,type}){return{target:target.document,type:type,data:data}});function streamEventsFrom({document}){

let stateChanges=TYPES.map(function(type){return open(document,type,{capture:true});}); return filter(merge(stateChanges),function({target}){return target instanceof Ci.nsIDOMDocument})}
exports.streamEventsFrom=streamEventsFrom;let opened=windows(null,{includePrivate:true});let state=merge(opened.map(streamEventsFrom));let futureReady=filter(windowEvents,function({type})
type==="DOMContentLoaded");let futureWindows=map(futureReady,function({target})target);let futureState=expand(futureWindows,streamEventsFrom);exports.events=merge([insert,create,state,futureState]);