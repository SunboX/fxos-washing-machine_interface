"use strict";const{Cc,Ci,Cr}=require("chrome");const{Input,start,stop,receive,outputs}=require("../event/utils");const{id:addonID}=require("../self");const{setImmediate}=require("../timers");const{notifyObservers}=Cc['@mozilla.org/observer-service;1'].getService(Ci.nsIObserverService);const NOT_AN_INPUT="OutputPort can be used only for sending messages";







const OutputPort=function({id,topic,sync}){this.id=id||topic;this.sync=!!sync;this.topic=topic||"sdk:"+addonID+":"+id;};
OutputPort.prototype=new Input();OutputPort.constructor=OutputPort;
OutputPort.prototype[start]=_=>{throw TypeError(NOT_AN_INPUT);};OutputPort.prototype[stop]=_=>{throw TypeError(NOT_AN_INPUT);};
OutputPort.receive=({topic,sync},message)=>{const type=typeof(message);const supported=message===null||type==="object"||type==="function";


if(!supported)
throw new TypeError("Unsupproted message type: `"+type+"`");

const subject=message===null?null:message instanceof Ci.nsISupports?message:message.wrappedJSObject?message:{wrappedJSObject:message};if(sync)
notifyObservers(subject,topic,null);else
setImmediate(notifyObservers,subject,topic,null);};OutputPort.prototype[receive]=OutputPort.receive;exports.OutputPort=OutputPort;