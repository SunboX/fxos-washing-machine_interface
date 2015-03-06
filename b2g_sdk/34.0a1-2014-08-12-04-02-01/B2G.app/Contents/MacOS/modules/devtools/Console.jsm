"use strict";this.EXPORTED_SYMBOLS=["console","ConsoleAPI"];const{classes:Cc,interfaces:Ci,utils:Cu}=Components;Cu.import("resource://gre/modules/XPCOMUtils.jsm");XPCOMUtils.defineLazyModuleGetter(this,"Services","resource://gre/modules/Services.jsm");let gTimerRegistry=new Map();function fmt(aStr,aMaxLen,aMinLen,aOptions){if(aMinLen==null){aMinLen=aMaxLen;}
if(aStr==null){aStr="";}
if(aStr.length>aMaxLen){if(aOptions&&aOptions.truncate=="start"){return"_"+aStr.substring(aStr.length-aMaxLen+1);}
else if(aOptions&&aOptions.truncate=="center"){let start=aStr.substring(0,(aMaxLen/2));let end=aStr.substring((aStr.length-(aMaxLen/2))+1);return start+"_"+end;}
else{return aStr.substring(0,aMaxLen-1)+"_";}}
if(aStr.length<aMinLen){let padding=Array(aMinLen-aStr.length+1).join(" ");aStr=(aOptions.align==="end")?padding+aStr:aStr+padding;}
return aStr;}
function getCtorName(aObj){if(aObj===null){return"null";}
if(aObj===undefined){return"undefined";}
if(aObj.constructor&&aObj.constructor.name){return aObj.constructor.name;}
 
return Object.prototype.toString.call(aObj).slice(8,-1);}
function stringify(aThing,aAllowNewLines){if(aThing===undefined){return"undefined";}
if(aThing===null){return"null";}
if(typeof aThing=="object"){let type=getCtorName(aThing);if(aThing instanceof Components.interfaces.nsIDOMNode&&aThing.tagName){return debugElement(aThing);}
type=(type=="Object"?"":type+" ");let json;try{json=JSON.stringify(aThing);}
catch(ex){ json="{"+Object.keys(aThing).join(":..,")+":.., "+"}";}
return type+json;}
if(typeof aThing=="function"){return aThing.toString().replace(/\s+/g," ");}
let str=aThing.toString();if(!aAllowNewLines){str=str.replace(/\n/g,"|");}
return str;}
function debugElement(aElement){return"<"+aElement.tagName+
(aElement.id?"#"+aElement.id:"")+
(aElement.className?"."+aElement.className.split(" ").join(" ."):"")+">";}
function log(aThing){if(aThing===null){return"null\n";}
if(aThing===undefined){return"undefined\n";}
if(typeof aThing=="object"){let reply="";let type=getCtorName(aThing);if(type=="Map"){reply+="Map\n";for(let[key,value]of aThing){reply+=logProperty(key,value);}}
else if(type=="Set"){let i=0;reply+="Set\n";for(let value of aThing){reply+=logProperty(''+i,value);i++;}}
else if(type.match("Error$")||(typeof aThing.name=="string"&&aThing.name.match("NS_ERROR_"))){reply+="  Message: "+aThing+"\n";if(aThing.stack){reply+="  Stack:\n";var frame=aThing.stack;while(frame){reply+="    "+frame+"\n";frame=frame.caller;}}}
else if(aThing instanceof Components.interfaces.nsIDOMNode&&aThing.tagName){reply+="  "+debugElement(aThing)+"\n";}
else{let keys=Object.getOwnPropertyNames(aThing);if(keys.length>0){reply+=type+"\n";keys.forEach(function(aProp){reply+=logProperty(aProp,aThing[aProp]);});}
else{reply+=type+"\n";let root=aThing;let logged=[];while(root!=null){let properties=Object.keys(root);properties.sort();properties.forEach(function(property){if(!(property in logged)){logged[property]=property;reply+=logProperty(property,aThing[property]);}});root=Object.getPrototypeOf(root);if(root!=null){reply+='  - prototype '+getCtorName(root)+'\n';}}}}
return reply;}
return"  "+aThing.toString()+"\n";}
function logProperty(aProp,aValue){let reply="";if(aProp=="stack"&&typeof value=="string"){let trace=parseStack(aValue);reply+=formatTrace(trace);}
else{reply+="    - "+aProp+" = "+stringify(aValue)+"\n";}
return reply;}
const LOG_LEVELS={"all":Number.MIN_VALUE,"debug":2,"log":3,"info":3,"trace":3,"timeEnd":3,"time":3,"group":3,"groupEnd":3,"dir":3,"dirxml":3,"warn":4,"error":5,"off":Number.MAX_VALUE,};function shouldLog(aLevel,aMaxLevel){return LOG_LEVELS[aMaxLevel]<=LOG_LEVELS[aLevel];}
function parseStack(aStack){let trace=[];aStack.split("\n").forEach(function(line){if(!line){return;}
let at=line.lastIndexOf("@");let posn=line.substring(at+1);trace.push({filename:posn.split(":")[0],lineNumber:posn.split(":")[1],functionName:line.substring(0,at)});});return trace;}
function getStack(aFrame,aMaxDepth=0){if(!aFrame){aFrame=Components.stack.caller;}
let trace=[];while(aFrame){trace.push({filename:aFrame.filename,lineNumber:aFrame.lineNumber,functionName:aFrame.name,language:aFrame.language,});if(aMaxDepth==trace.length){break;}
aFrame=aFrame.caller;}
return trace;}
function formatTrace(aTrace){let reply="";aTrace.forEach(function(frame){reply+=fmt(frame.filename,20,20,{truncate:"start"})+" "+
fmt(frame.lineNumber,5,5)+" "+
fmt(frame.functionName,75,0,{truncate:"center"})+"\n";});return reply;}
function startTimer(aName,aTimestamp){let key=aName.toString();if(!gTimerRegistry.has(key)){gTimerRegistry.set(key,aTimestamp||Date.now());}
return{name:aName,started:gTimerRegistry.get(key)};}
function stopTimer(aName,aTimestamp){let key=aName.toString();let duration=(aTimestamp||Date.now())-gTimerRegistry.get(key);gTimerRegistry.delete(key);return{name:aName,duration:duration};}
function dumpMessage(aConsole,aLevel,aMessage){aConsole.dump("console."+aLevel+": "+
aConsole.prefix+
aMessage+"\n");}
function createDumper(aLevel){return function(){if(!shouldLog(aLevel,this.maxLogLevel)){return;}
let args=Array.prototype.slice.call(arguments,0);let frame=getStack(Components.stack.caller,1)[0];sendConsoleAPIMessage(this,aLevel,frame,args);let data=args.map(function(arg){return stringify(arg,true);});dumpMessage(this,aLevel,data.join(" "));};}
function createMultiLineDumper(aLevel){return function(){if(!shouldLog(aLevel,this.maxLogLevel)){return;}
dumpMessage(this,aLevel,"");let args=Array.prototype.slice.call(arguments,0);let frame=getStack(Components.stack.caller,1)[0];sendConsoleAPIMessage(this,aLevel,frame,args);args.forEach(function(arg){this.dump(log(arg));},this);};}
function sendConsoleAPIMessage(aConsole,aLevel,aFrame,aArgs,aOptions={})
{let consoleEvent={ID:"jsm",innerID:aConsole.innerID||aFrame.filename,consoleID:aConsole.consoleID,level:aLevel,filename:aFrame.filename,lineNumber:aFrame.lineNumber,functionName:aFrame.functionName,timeStamp:Date.now(),arguments:aArgs,};consoleEvent.wrappedJSObject=consoleEvent;switch(aLevel){case"trace":consoleEvent.stacktrace=aOptions.stacktrace;break;case"time":case"timeEnd":consoleEvent.timer=aOptions.timer;break;case"group":case"groupCollapsed":case"groupEnd":try{consoleEvent.groupName=Array.prototype.join.call(aArgs," ");}
catch(ex){Cu.reportError(ex);Cu.reportError(ex.stack);return;}
break;}
Services.obs.notifyObservers(consoleEvent,"console-api-log-event",null);let ConsoleAPIStorage=Cc["@mozilla.org/consoleAPI-storage;1"].getService(Ci.nsIConsoleAPIStorage);ConsoleAPIStorage.recordEvent("jsm",consoleEvent);}
function ConsoleAPI(aConsoleOptions={}){
this.dump=aConsoleOptions.dump||dump;this.prefix=aConsoleOptions.prefix||"";this.maxLogLevel=aConsoleOptions.maxLogLevel||"all";this.innerID=aConsoleOptions.innerID||null;this.consoleID=aConsoleOptions.consoleID||"";for(let prop in this){if(typeof(this[prop])==="function"){this[prop]=this[prop].bind(this);}}}
ConsoleAPI.prototype={debug:createMultiLineDumper("debug"),log:createDumper("log"),info:createDumper("info"),warn:createDumper("warn"),error:createMultiLineDumper("error"),exception:createMultiLineDumper("error"),trace:function Console_trace(){if(!shouldLog("trace",this.maxLogLevel)){return;}
let args=Array.prototype.slice.call(arguments,0);let trace=getStack(Components.stack.caller);sendConsoleAPIMessage(this,"trace",trace[0],args,{stacktrace:trace});dumpMessage(this,"trace","\n"+formatTrace(trace));},clear:function Console_clear(){},dir:createMultiLineDumper("dir"),dirxml:createMultiLineDumper("dirxml"),group:createDumper("group"),groupEnd:createDumper("groupEnd"),time:function Console_time(){if(!shouldLog("time",this.maxLogLevel)){return;}
let args=Array.prototype.slice.call(arguments,0);let frame=getStack(Components.stack.caller,1)[0];let timer=startTimer(args[0]);sendConsoleAPIMessage(this,"time",frame,args,{timer:timer});dumpMessage(this,"time","'"+timer.name+"' @ "+(new Date()));},timeEnd:function Console_timeEnd(){if(!shouldLog("timeEnd",this.maxLogLevel)){return;}
let args=Array.prototype.slice.call(arguments,0);let frame=getStack(Components.stack.caller,1)[0];let timer=stopTimer(args[0]);sendConsoleAPIMessage(this,"timeEnd",frame,args,{timer:timer});dumpMessage(this,"timeEnd","'"+timer.name+"' "+timer.duration+"ms");},};this.console=new ConsoleAPI();this.ConsoleAPI=ConsoleAPI;