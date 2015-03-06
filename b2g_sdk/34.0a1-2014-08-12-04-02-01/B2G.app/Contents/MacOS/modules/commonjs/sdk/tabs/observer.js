'use strict';module.metadata={"stability":"unstable"};const{EventEmitterTrait:EventEmitter}=require("../deprecated/events");const{DOMEventAssembler}=require("../deprecated/events/assembler");const{Trait}=require("../deprecated/light-traits");const{getActiveTab,getTabs,getTabContainer}=require("./utils");const{browserWindowIterator}=require("../deprecated/window-utils");const{isBrowser}=require('../window/utils');const{observer:windowObserver}=require("../windows/observer");const EVENTS={"TabOpen":"open","TabClose":"close","TabSelect":"select","TabMove":"move","TabPinned":"pinned","TabUnpinned":"unpinned"};
const observer=Trait.compose(DOMEventAssembler,EventEmitter).create({_emit:Trait.required,supportedEventsTypes:Object.keys(EVENTS),handleEvent:function handleEvent(event){this._emit(EVENTS[event.type],event.target,event);}});


var selectedTab=null;function onTabSelect(tab){if(selectedTab!==tab){if(selectedTab)observer._emit('deactivate',selectedTab);if(tab)observer._emit('activate',selectedTab=tab);}};observer.on('select',onTabSelect);
function onWindowOpen(chromeWindow){if(!isBrowser(chromeWindow))return;observer.observe(getTabContainer(chromeWindow));}
windowObserver.on("open",onWindowOpen);function onWindowClose(chromeWindow){if(!isBrowser(chromeWindow))return;
 if(getActiveTab(chromeWindow)==selectedTab){observer._emit("deactivate",selectedTab);selectedTab=null;}
observer.ignore(getTabContainer(chromeWindow));}
windowObserver.on("close",onWindowClose);
windowObserver.on("activate",function onWindowActivate(chromeWindow){if(!isBrowser(chromeWindow))return;observer._emit("select",getActiveTab(chromeWindow));});
for(let window of browserWindowIterator())onWindowOpen(window);exports.observer=observer;