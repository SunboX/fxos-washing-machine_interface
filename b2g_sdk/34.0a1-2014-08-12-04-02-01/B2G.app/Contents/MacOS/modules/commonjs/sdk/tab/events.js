"use strict";
module.metadata={"stability":"experimental"};const{Ci}=require("chrome");const{windows,isInteractive}=require("../window/utils");const{events}=require("../browser/events");const{open}=require("../event/dom");const{filter,map,merge,expand}=require("../event/utils");const isFennec=require("sdk/system/xul-app").is("Fennec");



const TYPES=["TabOpen","TabClose","TabSelect","TabMove","TabPinned","TabUnpinned"];
function tabEventsFor(window){

let channels=TYPES.map(function(type)open(window,type));return merge(channels);}
let readyEvents=filter(events,function(e)e.type==="DOMContentLoaded");let futureWindows=map(readyEvents,function(e)e.target);

let eventsFromFuture=expand(futureWindows,tabEventsFor);

let interactiveWindows=windows("navigator:browser",{includePrivate:true}).filter(isInteractive);let eventsFromInteractive=merge(interactiveWindows.map(tabEventsFor));
let allEvents=merge([eventsFromInteractive,eventsFromFuture]);exports.events=map(allEvents,function(event){return!isFennec?event:{type:event.type,target:event.target.ownerDocument.defaultView.BrowserApp.getTabForBrowser(event.target)};});