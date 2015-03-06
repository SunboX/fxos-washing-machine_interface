"use strict";module.metadata={"stability":"unstable"};const{events}=require("../window/events");const{filter}=require("../event/utils");const{isBrowser}=require("../window/utils");



exports.events=filter(events,function({target})isBrowser(target));