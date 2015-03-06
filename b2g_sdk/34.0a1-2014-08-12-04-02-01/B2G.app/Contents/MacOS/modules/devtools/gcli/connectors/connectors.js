'use strict';var Promise=require('../util/promise').Promise;function Connection(){}
Connection.prototype.on=function(event,action){if(!this._listeners){this._listeners={};}
if(!this._listeners[event]){this._listeners[event]=[];}
this._listeners[event].push(action);};Connection.prototype.off=function(event,action){if(!this._listeners){return;}
var actions=this._listeners[event];if(actions){this._listeners[event]=actions.filter(function(li){return li!==action;}.bind(this));}};Connection.prototype._emit=function(event,data){if(this._listeners==null||this._listeners[event]==null){return;}
var listeners=this._listeners[event];listeners.forEach(function(listener){ if(listeners!==this._listeners[event]){throw new Error('Listener list changed while emitting');}
try{listener.call(null,data);}
catch(ex){console.log('Error calling listeners to '+event);console.error(ex);}}.bind(this));};Connection.prototype.call=function(feature,data){throw new Error('Not implemented');};Connection.prototype.disconnect=function(){return Promise.resolve();};exports.Connection=Connection;function Connectors(){ this._registered={};}
Connectors.prototype.add=function(connector){this._registered[connector.name]=connector;};Connectors.prototype.remove=function(connector){var name=typeof connector==='string'?connector:connector.name;delete this._registered[name];};Connectors.prototype.getAll=function(){return Object.keys(this._registered).map(function(name){return this._registered[name];}.bind(this));};Connectors.prototype.get=function(name){if(name==null){name=Object.keys(this._registered)[0];}
return this._registered[name];};exports.Connectors=Connectors;