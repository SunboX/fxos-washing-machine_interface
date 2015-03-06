"use strict";exports.createExtraActors=function createExtraActors(aFactories,aPool){for(let name in aFactories){let actor=this._extraActors[name];if(!actor){actor=aFactories[name].bind(null,this.conn,this);actor.prototype=aFactories[name].prototype;actor.parentID=this.actorID;this._extraActors[name]=actor;}
aPool.addActor(actor);}}
exports.appendExtraActors=function appendExtraActors(aObject){for(let name in this._extraActors){let actor=this._extraActors[name];aObject[name]=actor.actorID;}}
function ActorPool(aConnection)
{this.conn=aConnection;this._cleanups={};this._actors={};}
ActorPool.prototype={addActor:function AP_addActor(aActor){aActor.conn=this.conn;if(!aActor.actorID){let prefix=aActor.actorPrefix;if(typeof aActor=="function"){ prefix=aActor.prototype.actorPrefix||aActor.prototype.typeName;}
aActor.actorID=this.conn.allocID(prefix||undefined);}
if(aActor.registeredPool){aActor.registeredPool.removeActor(aActor);}
aActor.registeredPool=this;this._actors[aActor.actorID]=aActor;if(aActor.disconnect){this._cleanups[aActor.actorID]=aActor;}},get:function AP_get(aActorID){return this._actors[aActorID]||undefined;},has:function AP_has(aActorID){return aActorID in this._actors;},isEmpty:function AP_isEmpty(){return Object.keys(this._actors).length==0;},removeActor:function AP_remove(aActor){delete this._actors[aActor.actorID];delete this._cleanups[aActor.actorID];},unmanage:function(aActor){return this.removeActor(aActor);},cleanup:function AP_cleanup(){for each(let actor in this._cleanups){actor.disconnect();}
this._cleanups={};}}
exports.ActorPool=ActorPool;