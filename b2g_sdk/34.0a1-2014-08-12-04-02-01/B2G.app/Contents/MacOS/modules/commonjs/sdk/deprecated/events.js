"use strict";module.metadata={"stability":"deprecated"};const ERROR_TYPE='error',UNCAUGHT_ERROR='An error event was dispatched for which there was'
+' no listener.',BAD_LISTENER='The event listener must be a function.';const eventEmitter={on:function on(type,listener){if('function'!==typeof listener)
throw new Error(BAD_LISTENER);let listeners=this._listeners(type);if(0>listeners.indexOf(listener))
listeners.push(listener);
return this._public||this;},once:function once(type,listener){this.on(type,function selfRemovableListener(){this.removeListener(type,selfRemovableListener);listener.apply(this,arguments);});},removeListener:function removeListener(type,listener){if('function'!==typeof listener)
throw new Error(BAD_LISTENER);let listeners=this._listeners(type),index=listeners.indexOf(listener);if(0<=index)
listeners.splice(index,1);
return this._public||this;},_events:null,_listeners:function listeners(type){let events=this._events||(this._events={});return(events.hasOwnProperty(type)&&events[type])||(events[type]=[]);},_emit:function _emit(type,event){let args=Array.slice(arguments);
args.unshift(this._public||this);return this._emitOnObject.apply(this,args);},_emitOnObject:function _emitOnObject(targetObj,type,event){let listeners=this._listeners(type).slice(0);if(type===ERROR_TYPE&&!listeners.length)
console.exception(event);if(!listeners.length)
return false;let params=Array.slice(arguments,2);for(let listener of listeners){try{listener.apply(targetObj,params);}catch(e){
if(type!==ERROR_TYPE)
this._emit(ERROR_TYPE,e);else
console.exception("Exception in error event listener "+e);}}
return true;},_removeAllListeners:function _removeAllListeners(type){if(typeof type=="undefined"){this._events=null;return this;}
this._listeners(type).splice(0);return this;}};exports.EventEmitter=require("./traits").Trait.compose(eventEmitter);exports.EventEmitterTrait=require('./light-traits').Trait(eventEmitter);