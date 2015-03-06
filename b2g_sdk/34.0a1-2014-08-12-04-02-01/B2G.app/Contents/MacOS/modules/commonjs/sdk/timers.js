'use strict';module.metadata={"stability":"stable"};const{CC,Cc,Ci}=require("chrome");const{when:unload}=require("./system/unload");const{TYPE_ONE_SHOT,TYPE_REPEATING_SLACK}=Ci.nsITimer;const Timer=CC("@mozilla.org/timer;1","nsITimer");const timers=Object.create(null);const threadManager=Cc["@mozilla.org/thread-manager;1"].getService(Ci.nsIThreadManager);const prefBranch=Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).QueryInterface(Ci.nsIPrefBranch);let MIN_DELAY=4;try{MIN_DELAY=prefBranch.getIntPref("dom.min_timeout_value");}finally{}
let lastID=0;
function setTimer(type,callback,delay,...args){let id=++lastID;let timer=timers[id]=Timer();timer.initWithCallback({notify:function notify(){try{if(type===TYPE_ONE_SHOT)
delete timers[id];callback.apply(null,args);}
catch(error){console.exception(error);}}},Math.max(delay||MIN_DELAY),type);return id;}
function unsetTimer(id){let timer=timers[id];delete timers[id];if(timer)timer.cancel();}
let immediates=new Map();let dispatcher=_=>{dispatcher.scheduled=false;


let ids=[id for([id]of immediates)];for(let id of ids){let immediate=immediates.get(id);if(immediate){immediates.delete(id);try{immediate();}
catch(error){console.exception(error);}}}}
function setImmediate(callback,...params){let id=++lastID;immediates.set(id,_=>callback.apply(callback,params)); if(!dispatcher.scheduled){dispatcher.scheduled=true;threadManager.currentThread.dispatch(dispatcher,Ci.nsIThread.DISPATCH_NORMAL);}
return id;}
function clearImmediate(id){immediates.delete(id);}
exports.setImmediate=setImmediate.bind(null);exports.clearImmediate=clearImmediate.bind(null);exports.setTimeout=setTimer.bind(null,TYPE_ONE_SHOT);exports.setInterval=setTimer.bind(null,TYPE_REPEATING_SLACK);exports.clearTimeout=unsetTimer.bind(null);exports.clearInterval=unsetTimer.bind(null);unload(function(){immediates.clear();Object.keys(timers).forEach(unsetTimer)});