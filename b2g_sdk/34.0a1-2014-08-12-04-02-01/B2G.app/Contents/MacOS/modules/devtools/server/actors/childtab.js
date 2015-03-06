"use strict";let{TabActor}=require("devtools/server/actors/webbrowser");function ContentActor(connection,chromeGlobal)
{this._chromeGlobal=chromeGlobal;TabActor.call(this,connection,chromeGlobal);this.traits.reconfigure=false;}
ContentActor.prototype=Object.create(TabActor.prototype);ContentActor.prototype.constructor=ContentActor;Object.defineProperty(ContentActor.prototype,"docShell",{get:function(){return this._chromeGlobal.docShell;},enumerable:true,configurable:false});ContentActor.prototype.exit=function(){TabActor.prototype.exit.call(this);};

ContentActor.prototype.grip=function(){let response={'actor':this.actorID,'title':this.title,'url':this.url};let actorPool=new ActorPool(this.conn);this._createExtraActors(DebuggerServer.tabActorFactories,actorPool);if(!actorPool.isEmpty()){this._tabActorPool2=actorPool;this.conn.addActorPool(this._tabActorPool2);}
this._appendExtraActors(response);return response;};