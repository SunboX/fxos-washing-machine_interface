(function(factory){ if(this.module&&module.id.indexOf("event-emitter")>=0){ factory.call(this,require,exports,module);}else{ const Cu=Components.utils;const{devtools}=Cu.import("resource://gre/modules/devtools/Loader.jsm",{});this.isWorker=false;this.promise=Cu.import("resource://gre/modules/Promise.jsm",{}).Promise;factory.call(this,devtools.require,this,{exports:this});this.EXPORTED_SYMBOLS=["EventEmitter"];}}).call(this,function(require,exports,module){this.EventEmitter=function EventEmitter(){};module.exports=EventEmitter;const{Cu,components}=require("chrome");const Services=require("Services");const promise=require("promise");EventEmitter.decorate=function EventEmitter_decorate(aObjectToDecorate){let emitter=new EventEmitter();aObjectToDecorate.on=emitter.on.bind(emitter);aObjectToDecorate.off=emitter.off.bind(emitter);aObjectToDecorate.once=emitter.once.bind(emitter);aObjectToDecorate.emit=emitter.emit.bind(emitter);};EventEmitter.prototype={on:function EventEmitter_on(aEvent,aListener){if(!this._eventEmitterListeners)
this._eventEmitterListeners=new Map();if(!this._eventEmitterListeners.has(aEvent)){this._eventEmitterListeners.set(aEvent,[]);}
this._eventEmitterListeners.get(aEvent).push(aListener);},once:function EventEmitter_once(aEvent,aListener){let deferred=promise.defer();let handler=(aEvent,aFirstArg)=>{this.off(aEvent,handler);if(aListener){aListener.apply(null,arguments);}
deferred.resolve(aFirstArg);};handler._originalListener=aListener;this.on(aEvent,handler);return deferred.promise;},off:function EventEmitter_off(aEvent,aListener){if(!this._eventEmitterListeners)
return;let listeners=this._eventEmitterListeners.get(aEvent);if(listeners){this._eventEmitterListeners.set(aEvent,listeners.filter(l=>{return l!==aListener&&l._originalListener!==aListener;}));}},emit:function EventEmitter_emit(aEvent){this.logEvent(aEvent,arguments);if(!this._eventEmitterListeners||!this._eventEmitterListeners.has(aEvent)){return;}
let originalListeners=this._eventEmitterListeners.get(aEvent);for(let listener of this._eventEmitterListeners.get(aEvent)){
if(!this._eventEmitterListeners){break;}

if(originalListeners===this._eventEmitterListeners.get(aEvent)||this._eventEmitterListeners.get(aEvent).some(function(l)l===listener)){try{listener.apply(null,arguments);}
catch(ex){let msg=ex+": "+ex.stack;Cu.reportError(msg);dump(msg+"\n");}}}},logEvent:function(aEvent,args){let logging=isWorker?true:Services.prefs.getBoolPref("devtools.dump.emit");if(logging){let caller,func,path;if(!isWorker){caller=components.stack.caller.caller;func=caller.name;let file=caller.filename;if(file.contains(" -> ")){file=caller.filename.split(/ -> /)[1];}
path=file+":"+caller.lineNumber;}
let argOut="(";if(args.length===1){argOut+=aEvent;}
let out="EMITTING: ";try{for(let i=1;i<args.length;i++){if(i===1){argOut="("+aEvent+", ";}else{argOut+=", ";}
let arg=args[i];argOut+=arg;if(arg&&arg.nodeName){argOut+=" ("+arg.nodeName;if(arg.id){argOut+="#"+arg.id;}
if(arg.className){argOut+="."+arg.className;}
argOut+=")";}}}catch(e){}
argOut+=")";out+="emit"+argOut+" from "+func+"() -> "+path+"\n";dump(out);}},};});