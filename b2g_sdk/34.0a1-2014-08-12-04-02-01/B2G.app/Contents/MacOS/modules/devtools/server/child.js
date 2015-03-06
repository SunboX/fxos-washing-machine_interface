"use strict";let chromeGlobal=this;
(function(){let Cu=Components.utils;let{devtools}=Cu.import("resource://gre/modules/devtools/Loader.jsm",{});const DevToolsUtils=devtools.require("devtools/toolkit/DevToolsUtils.js");const{DebuggerServer,ActorPool}=Cu.import("resource://gre/modules/devtools/dbg-server.jsm",{});if(!DebuggerServer.initialized){DebuggerServer.init();}

 
DebuggerServer.addChildActors();let conn;let onConnect=DevToolsUtils.makeInfallible(function(msg){removeMessageListener("debug:connect",onConnect);let mm=msg.target;conn=DebuggerServer.connectToParent(msg.data.prefix,mm);let actor=new DebuggerServer.ContentActor(conn,chromeGlobal);let actorPool=new ActorPool(conn);actorPool.addActor(actor);conn.addActorPool(actorPool);sendAsyncMessage("debug:actor",{actor:actor.grip()});});addMessageListener("debug:connect",onConnect);let onDisconnect=DevToolsUtils.makeInfallible(function(msg){removeMessageListener("debug:disconnect",onDisconnect);

conn.close();conn=null;});addMessageListener("debug:disconnect",onDisconnect);})();