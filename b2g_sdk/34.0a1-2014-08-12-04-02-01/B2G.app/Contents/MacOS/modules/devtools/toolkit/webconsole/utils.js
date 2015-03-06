"use strict";const{Cc,Ci,Cu,components}=require("chrome");Cu.import("resource://gre/modules/XPCOMUtils.jsm");loader.lazyImporter(this,"Services","resource://gre/modules/Services.jsm");loader.lazyImporter(this,"LayoutHelpers","resource://gre/modules/devtools/LayoutHelpers.jsm");loader.lazyImporter(this,"gDevTools","resource:///modules/devtools/gDevTools.jsm");loader.lazyImporter(this,"devtools","resource://gre/modules/devtools/Loader.jsm");loader.lazyImporter(this,"VariablesView","resource:///modules/devtools/VariablesView.jsm");loader.lazyImporter(this,"DevToolsUtils","resource://gre/modules/devtools/DevToolsUtils.jsm");const REGEX_MATCH_FUNCTION_NAME=/^\(?function\s+([^(\s]+)\s*\(/;const REGEX_MATCH_FUNCTION_ARGS=/^\(?function\s*[^\s(]*\s*\((.+?)\)/;const CONSOLE_ENTRY_THRESHOLD=5



const MAX_AUTOCOMPLETE_ATTEMPTS=exports.MAX_AUTOCOMPLETE_ATTEMPTS=100000;const MAX_AUTOCOMPLETIONS=exports.MAX_AUTOCOMPLETIONS=1500;let WebConsoleUtils={unwrap:function WCU_unwrap(aObject)
{try{return XPCNativeWrapper.unwrap(aObject);}
catch(ex){return aObject;}},supportsString:function WCU_supportsString(aString)
{let str=Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);str.data=aString;return str;},cloneObject:function WCU_cloneObject(aObject,aRecursive,aFilter)
{if(typeof aObject!="object"){return aObject;}
let temp;if(Array.isArray(aObject)){temp=[];Array.forEach(aObject,function(aValue,aIndex){if(!aFilter||aFilter(aIndex,aValue,aObject)){temp.push(aRecursive?WCU_cloneObject(aValue):aValue);}});}
else{temp={};for(let key in aObject){let value=aObject[key];if(aObject.hasOwnProperty(key)&&(!aFilter||aFilter(key,value,aObject))){temp[key]=aRecursive?WCU_cloneObject(value):value;}}}
return temp;},copyTextStyles:function WCU_copyTextStyles(aFrom,aTo)
{let win=aFrom.ownerDocument.defaultView;let style=win.getComputedStyle(aFrom);aTo.style.fontFamily=style.getPropertyCSSValue("font-family").cssText;aTo.style.fontSize=style.getPropertyCSSValue("font-size").cssText;aTo.style.fontWeight=style.getPropertyCSSValue("font-weight").cssText;aTo.style.fontStyle=style.getPropertyCSSValue("font-style").cssText;},getInnerWindowId:function WCU_getInnerWindowId(aWindow)
{return aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils).currentInnerWindowID;},getInnerWindowIDsForFrames:function WCU_getInnerWindowIDsForFrames(aWindow)
{let innerWindowID=this.getInnerWindowId(aWindow);let ids=[innerWindowID];if(aWindow.frames){for(let i=0;i<aWindow.frames.length;i++){let frame=aWindow.frames[i];ids=ids.concat(this.getInnerWindowIDsForFrames(frame));}}
return ids;},getOuterWindowId:function WCU_getOuterWindowId(aWindow)
{return aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils).outerWindowID;},abbreviateSourceURL:function WCU_abbreviateSourceURL(aSourceURL,aOptions={})
{if(!aOptions.onlyCropQuery&&aSourceURL.substr(0,5)=="data:"){let commaIndex=aSourceURL.indexOf(",");if(commaIndex>-1){aSourceURL="data:"+aSourceURL.substring(commaIndex+1);}}
let hookIndex=aSourceURL.indexOf("?");if(hookIndex>-1){aSourceURL=aSourceURL.substring(0,hookIndex);}
let hashIndex=aSourceURL.indexOf("#");if(hashIndex>-1){aSourceURL=aSourceURL.substring(0,hashIndex);}
if(aSourceURL[aSourceURL.length-1]=="/"){aSourceURL=aSourceURL.replace(/\/+$/,"");}
if(!aOptions.onlyCropQuery){let slashIndex=aSourceURL.lastIndexOf("/");if(slashIndex>-1){aSourceURL=aSourceURL.substring(slashIndex+1);}}
return aSourceURL;},isNativeFunction:function WCU_isNativeFunction(aFunction)
{return typeof aFunction=="function"&&!("prototype"in aFunction);},isNonNativeGetter:function WCU_isNonNativeGetter(aObject,aProp)
{if(typeof aObject!="object"){return false;}
let desc=this.getPropertyDescriptor(aObject,aProp);return desc&&desc.get&&!this.isNativeFunction(desc.get);},getPropertyDescriptor:function WCU_getPropertyDescriptor(aObject,aProp)
{let desc=null;while(aObject){try{if((desc=Object.getOwnPropertyDescriptor(aObject,aProp))){break;}}
catch(ex if(ex.name=="NS_ERROR_XPC_BAD_CONVERT_JS"||ex.name=="NS_ERROR_XPC_BAD_OP_ON_WN_PROTO"||ex.name=="TypeError")){}
try{aObject=Object.getPrototypeOf(aObject);}
catch(ex if(ex.name=="TypeError")){return desc;}}
return desc;},propertiesSort:function WCU_propertiesSort(a,b)
{let aNumber=parseFloat(a.name);let bNumber=parseFloat(b.name);if(!isNaN(aNumber)&&isNaN(bNumber)){return-1;}
else if(isNaN(aNumber)&&!isNaN(bNumber)){return 1;}
else if(!isNaN(aNumber)&&!isNaN(bNumber)){return aNumber-bNumber;}
else if(a.name<b.name){return-1;}
else if(a.name>b.name){return 1;}
else{return 0;}},createValueGrip:function WCU_createValueGrip(aValue,aObjectWrapper)
{switch(typeof aValue){case"boolean":return aValue;case"string":return aObjectWrapper(aValue);case"number":if(aValue===Infinity){return{type:"Infinity"};}
else if(aValue===-Infinity){return{type:"-Infinity"};}
else if(Number.isNaN(aValue)){return{type:"NaN"};}
else if(!aValue&&1/aValue===-Infinity){return{type:"-0"};}
return aValue;case"undefined":return{type:"undefined"};case"object":if(aValue===null){return{type:"null"};}
case"function":return aObjectWrapper(aValue);default:Cu.reportError("Failed to provide a grip for value of "+typeof aValue
+": "+aValue);return null;}},isIteratorOrGenerator:function WCU_isIteratorOrGenerator(aObject)
{if(aObject===null){return false;}
if(typeof aObject=="object"){if(typeof aObject.__iterator__=="function"||aObject.constructor&&aObject.constructor.name=="Iterator"){return true;}
try{let str=aObject.toString();if(typeof aObject.next=="function"&&str.indexOf("[object Generator")==0){return true;}}
catch(ex){return false;}}
return false;},isMixedHTTPSRequest:function WCU_isMixedHTTPSRequest(aRequest,aLocation)
{try{let requestURI=Services.io.newURI(aRequest,null,null);let contentURI=Services.io.newURI(aLocation,null,null);return(contentURI.scheme=="https"&&requestURI.scheme!="https");}
catch(ex){return false;}},getFunctionName:function WCF_getFunctionName(aFunction)
{let name=null;if(aFunction.name){name=aFunction.name;}
else{let desc;try{desc=aFunction.getOwnPropertyDescriptor("displayName");}
catch(ex){}
if(desc&&typeof desc.value=="string"){name=desc.value;}}
if(!name){try{let str=(aFunction.toString()||aFunction.toSource())+"";name=(str.match(REGEX_MATCH_FUNCTION_NAME)||[])[1];}
catch(ex){}}
return name;},getObjectClassName:function WCU_getObjectClassName(aObject)
{if(aObject===null){return"null";}
if(aObject===undefined){return"undefined";}
let type=typeof aObject;if(type!="object"){return type.charAt(0).toUpperCase()+type.substr(1);}
let className;try{className=((aObject+"").match(/^\[object (\S+)\]$/)||[])[1];if(!className){className=((aObject.constructor+"").match(/^\[object (\S+)\]$/)||[])[1];}
if(!className&&typeof aObject.constructor=="function"){className=this.getFunctionName(aObject.constructor);}}
catch(ex){}
return className;},isActorGrip:function WCU_isActorGrip(aGrip)
{return aGrip&&typeof(aGrip)=="object"&&aGrip.actor;},_usageCount:0,get usageCount(){if(WebConsoleUtils._usageCount<CONSOLE_ENTRY_THRESHOLD){WebConsoleUtils._usageCount=Services.prefs.getIntPref("devtools.selfxss.count")
if(Services.prefs.getBoolPref("devtools.chrome.enabled")){WebConsoleUtils.usageCount=CONSOLE_ENTRY_THRESHOLD;}}
return WebConsoleUtils._usageCount;},set usageCount(newUC){if(newUC<=CONSOLE_ENTRY_THRESHOLD){WebConsoleUtils._usageCount=newUC;Services.prefs.setIntPref("devtools.selfxss.count",newUC);}},pasteHandlerGen:function WCU_pasteHandlerGen(inputField,notificationBox){let handler=function WCU_pasteHandler(aEvent){if(WebConsoleUtils.usageCount>=CONSOLE_ENTRY_THRESHOLD){inputField.removeEventListener("paste",handler);inputField.removeEventListener("drop",handler);return true;}
if(notificationBox.getNotificationWithValue("selfxss-notification")){aEvent.preventDefault();aEvent.stopPropagation();return false;}
let l10n=new WebConsoleUtils.l10n("chrome://browser/locale/devtools/webconsole.properties");let okstring=l10n.getStr("selfxss.okstring");let msg=l10n.getFormatStr("selfxss.msg",[okstring]);let notification=notificationBox.appendNotification(msg,"selfxss-notification",null,notificationBox.PRIORITY_WARNING_HIGH,null,function(eventType){ if(eventType=="removed"){inputField.removeEventListener("keyup",pasteKeyUpHandler);}});function pasteKeyUpHandler(aEvent2){let value=inputField.value||inputField.textContent;if(value.contains(okstring)){notificationBox.removeNotification(notification);inputField.removeEventListener("keyup",pasteKeyUpHandler);WebConsoleUtils.usageCount=CONSOLE_ENTRY_THRESHOLD;}}
inputField.addEventListener("keyup",pasteKeyUpHandler);aEvent.preventDefault();aEvent.stopPropagation();return false;};return handler;},};exports.Utils=WebConsoleUtils;
WebConsoleUtils.l10n=function WCU_l10n(aBundleURI)
{this._bundleUri=aBundleURI;};WebConsoleUtils.l10n.prototype={_stringBundle:null,get stringBundle()
{if(!this._stringBundle){this._stringBundle=Services.strings.createBundle(this._bundleUri);}
return this._stringBundle;},timestampString:function WCU_l10n_timestampString(aMilliseconds)
{let d=new Date(aMilliseconds?aMilliseconds:null);let hours=d.getHours(),minutes=d.getMinutes();let seconds=d.getSeconds(),milliseconds=d.getMilliseconds();let parameters=[hours,minutes,seconds,milliseconds];return this.getFormatStr("timestampFormat",parameters);},getStr:function WCU_l10n_getStr(aName)
{let result;try{result=this.stringBundle.GetStringFromName(aName);}
catch(ex){Cu.reportError("Failed to get string: "+aName);throw ex;}
return result;},getFormatStr:function WCU_l10n_getFormatStr(aName,aArray)
{let result;try{result=this.stringBundle.formatStringFromName(aName,aArray,aArray.length);}
catch(ex){Cu.reportError("Failed to format string: "+aName);throw ex;}
return result;},};
(function _JSPP(WCU){const STATE_NORMAL=0;const STATE_QUOTE=2;const STATE_DQUOTE=3;const OPEN_BODY="{[(".split("");const CLOSE_BODY="}])".split("");const OPEN_CLOSE_BODY={"{":"}","[":"]","(":")",};function findCompletionBeginning(aStr)
{let bodyStack=[];let state=STATE_NORMAL;let start=0;let c;for(let i=0;i<aStr.length;i++){c=aStr[i];switch(state){case STATE_NORMAL:if(c=='"'){state=STATE_DQUOTE;}
else if(c=="'"){state=STATE_QUOTE;}
else if(c==";"){start=i+1;}
else if(c==" "){start=i+1;}
else if(OPEN_BODY.indexOf(c)!=-1){bodyStack.push({token:c,start:start});start=i+1;}
else if(CLOSE_BODY.indexOf(c)!=-1){var last=bodyStack.pop();if(!last||OPEN_CLOSE_BODY[last.token]!=c){return{err:"syntax error"};}
if(c=="}"){start=i+1;}
else{start=last.start;}}
break;case STATE_DQUOTE:if(c=="\\"){i++;}
else if(c=="\n"){return{err:"unterminated string literal"};}
else if(c=='"'){state=STATE_NORMAL;}
break;case STATE_QUOTE:if(c=="\\"){i++;}
else if(c=="\n"){return{err:"unterminated string literal"};}
else if(c=="'"){state=STATE_NORMAL;}
break;}}
return{state:state,startPos:start};}
function JSPropertyProvider(aDbgObject,anEnvironment,aInputValue,aCursor)
{if(aCursor===undefined){aCursor=aInputValue.length;}
let inputValue=aInputValue.substring(0,aCursor);
let beginning=findCompletionBeginning(inputValue);if(beginning.err){return null;}

if(beginning.state!=STATE_NORMAL){return null;}
let completionPart=inputValue.substring(beginning.startPos);if(completionPart.trim()==""){return null;}
let lastDot=completionPart.lastIndexOf(".");if(lastDot>0&&(completionPart[0]=="'"||completionPart[0]=='"')&&completionPart[lastDot-1]==completionPart[0]){let matchProp=completionPart.slice(lastDot+1);return getMatchedProps(String.prototype,matchProp);}
let properties=completionPart.split(".");let matchProp=properties.pop().trimLeft();let obj=aDbgObject;
if(anEnvironment){if(properties.length==0){return getMatchedPropsInEnvironment(anEnvironment,matchProp);}
obj=getVariableInEnvironment(anEnvironment,properties.shift());}
if(!isObjectUsable(obj)){return null;}
 
for(let prop of properties){prop=prop.trim();if(!prop){return null;}
if(/\[\d+\]$/.test(prop)) {
obj=getArrayMemberProperty(obj,prop);}
else{obj=DevToolsUtils.getProperty(obj,prop);}
if(!isObjectUsable(obj)){return null;}} 
if(typeof obj!="object"){return getMatchedProps(obj,matchProp);}
return getMatchedPropsInDbgObject(obj,matchProp);}
function getArrayMemberProperty(aObj,aProp)
{let obj=aObj;let propWithoutIndices=aProp.substr(0,aProp.indexOf("["));obj=DevToolsUtils.getProperty(obj,propWithoutIndices);if(!isObjectUsable(obj)){return null;}
let result;let arrayIndicesRegex=/\[[^\]]*\]/g;while((result=arrayIndicesRegex.exec(aProp))!==null){let indexWithBrackets=result[0];let indexAsText=indexWithBrackets.substr(1,indexWithBrackets.length-2);let index=parseInt(indexAsText);if(isNaN(index)){return null;}
obj=DevToolsUtils.getProperty(obj,index);if(!isObjectUsable(obj)){return null;}}
return obj;}
function isObjectUsable(aObject)
{if(aObject==null){return false;}
if(typeof aObject=="object"&&aObject.class=="DeadObject"){return false;}
return true;}
function getVariableInEnvironment(anEnvironment,aName)
{return getExactMatch_impl(anEnvironment,aName,DebuggerEnvironmentSupport);}
function getMatchedPropsInEnvironment(anEnvironment,aMatch)
{return getMatchedProps_impl(anEnvironment,aMatch,DebuggerEnvironmentSupport);}
function getMatchedPropsInDbgObject(aDbgObject,aMatch)
{return getMatchedProps_impl(aDbgObject,aMatch,DebuggerObjectSupport);}
function getMatchedProps(aObj,aMatch)
{if(typeof aObj!="object"){aObj=aObj.constructor.prototype;}
return getMatchedProps_impl(aObj,aMatch,JSObjectSupport);}
function getMatchedProps_impl(aObj,aMatch,{chainIterator,getProperties})
{let matches=new Set();let numProps=0;let iter=chainIterator(aObj);for(let obj of iter){let props=getProperties(obj);numProps+=props.length;
if(numProps>=MAX_AUTOCOMPLETE_ATTEMPTS||matches.size>=MAX_AUTOCOMPLETIONS){break;}
for(let i=0;i<props.length;i++){let prop=props[i];if(prop.indexOf(aMatch)!=0){continue;}

if(+prop!=+prop){matches.add(prop);}
if(matches.size>=MAX_AUTOCOMPLETIONS){break;}}}
return{matchProp:aMatch,matches:[...matches],};}
function getExactMatch_impl(aObj,aName,{chainIterator,getProperty})
{let iter=chainIterator(aObj);for(let obj of iter){let prop=getProperty(obj,aName,aObj);if(prop){return prop.value;}}
return undefined;}
let JSObjectSupport={chainIterator:function(aObj)
{while(aObj){yield aObj;aObj=Object.getPrototypeOf(aObj);}},getProperties:function(aObj)
{return Object.getOwnPropertyNames(aObj);},getProperty:function()
{throw"Unimplemented!";},};let DebuggerObjectSupport={chainIterator:function(aObj)
{while(aObj){yield aObj;aObj=aObj.proto;}},getProperties:function(aObj)
{return aObj.getOwnPropertyNames();},getProperty:function(aObj,aName,aRootObj)
{throw"Unimplemented!";},};let DebuggerEnvironmentSupport={chainIterator:function(aObj)
{while(aObj){yield aObj;aObj=aObj.parent;}},getProperties:function(aObj)
{return aObj.names();},getProperty:function(aObj,aName)
{let result=aObj.getVariable(aName);if(result.optimizedOut||result.missingArguments){return null;}
return result===undefined?null:{value:result};},};exports.JSPropertyProvider=DevToolsUtils.makeInfallible(JSPropertyProvider);})(WebConsoleUtils);
function ConsoleServiceListener(aWindow,aListener)
{this.window=aWindow;this.listener=aListener;if(this.window){this.layoutHelpers=new LayoutHelpers(this.window);}}
exports.ConsoleServiceListener=ConsoleServiceListener;ConsoleServiceListener.prototype={QueryInterface:XPCOMUtils.generateQI([Ci.nsIConsoleListener]),window:null,listener:null,init:function CSL_init()
{Services.console.registerListener(this);},observe:function CSL_observe(aMessage)
{if(!this.listener){return;}
if(this.window){if(!(aMessage instanceof Ci.nsIScriptError)||!aMessage.outerWindowID||!this.isCategoryAllowed(aMessage.category)){return;}
let errorWindow=Services.wm.getOuterWindowWithId(aMessage.outerWindowID);if(!errorWindow||!this.layoutHelpers.isIncludedInTopLevelWindow(errorWindow)){return;}}
this.listener.onConsoleServiceMessage(aMessage);},isCategoryAllowed:function CSL_isCategoryAllowed(aCategory)
{if(!aCategory){return false;}
switch(aCategory){case"XPConnect JavaScript":case"component javascript":case"chrome javascript":case"chrome registration":case"XBL":case"XBL Prototype Handler":case"XBL Content Sink":case"xbl javascript":return false;}
return true;},getCachedMessages:function CSL_getCachedMessages(aIncludePrivate=false)
{let errors=Services.console.getMessageArray()||[];
if(!this.window){return errors.filter((aError)=>{if(aError instanceof Ci.nsIScriptError){if(!aIncludePrivate&&aError.isFromPrivateWindow){return false;}}
return true;});}
let ids=WebConsoleUtils.getInnerWindowIDsForFrames(this.window);return errors.filter((aError)=>{if(aError instanceof Ci.nsIScriptError){if(!aIncludePrivate&&aError.isFromPrivateWindow){return false;}
if(ids&&(ids.indexOf(aError.innerWindowID)==-1||!this.isCategoryAllowed(aError.category))){return false;}}
else if(ids&&ids[0]){
return false;}
return true;});},destroy:function CSL_destroy()
{Services.console.unregisterListener(this);this.listener=this.window=null;},};
function ConsoleAPIListener(aWindow,aOwner,aConsoleID)
{this.window=aWindow;this.owner=aOwner;this.consoleID=aConsoleID;if(this.window){this.layoutHelpers=new LayoutHelpers(this.window);}}
exports.ConsoleAPIListener=ConsoleAPIListener;ConsoleAPIListener.prototype={QueryInterface:XPCOMUtils.generateQI([Ci.nsIObserver]),window:null,owner:null,consoleID:null,init:function CAL_init()
{
Services.obs.addObserver(this,"console-api-log-event",false);},observe:function CAL_observe(aMessage,aTopic)
{if(!this.owner){return;}
let apiMessage=aMessage.wrappedJSObject;if(this.window){let msgWindow=Services.wm.getCurrentInnerWindowWithId(apiMessage.innerID);if(!msgWindow||!this.layoutHelpers.isIncludedInTopLevelWindow(msgWindow)){return;}}
if(this.consoleID&&apiMessage.consoleID!=this.consoleID){return;}
this.owner.onConsoleAPICall(apiMessage);},getCachedMessages:function CAL_getCachedMessages(aIncludePrivate=false)
{let messages=[];let ConsoleAPIStorage=Cc["@mozilla.org/consoleAPI-storage;1"].getService(Ci.nsIConsoleAPIStorage);
if(!this.window){messages=ConsoleAPIStorage.getEvents();}else{let ids=WebConsoleUtils.getInnerWindowIDsForFrames(this.window);ids.forEach((id)=>{messages=messages.concat(ConsoleAPIStorage.getEvents(id));});}
if(this.consoleID){messages=messages.filter((m)=>m.consoleID==this.consoleID);}
if(aIncludePrivate){return messages;}
return messages.filter((m)=>!m.private);},destroy:function CAL_destroy()
{Services.obs.removeObserver(this,"console-api-log-event");this.window=this.owner=null;},};function JSTermHelpers(aOwner)
{aOwner.sandbox.$=function JSTH_$(aSelector)
{return aOwner.window.document.querySelector(aSelector);};aOwner.sandbox.$$=function JSTH_$$(aSelector)
{return aOwner.window.document.querySelectorAll(aSelector);};aOwner.sandbox.$x=function JSTH_$x(aXPath,aContext)
{let nodes=new aOwner.window.wrappedJSObject.Array();let doc=aOwner.window.document;aContext=aContext||doc;let results=doc.evaluate(aXPath,aContext,null,Ci.nsIDOMXPathResult.ANY_TYPE,null);let node;while((node=results.iterateNext())){nodes.push(node);}
return nodes;};Object.defineProperty(aOwner.sandbox,"$0",{get:function(){return aOwner.makeDebuggeeValue(aOwner.selectedNode)},enumerable:true,configurable:false});aOwner.sandbox.clear=function JSTH_clear()
{aOwner.helperResult={type:"clearOutput",};};aOwner.sandbox.keys=function JSTH_keys(aObject)
{return aOwner.window.wrappedJSObject.Object.keys(WebConsoleUtils.unwrap(aObject));};aOwner.sandbox.values=function JSTH_values(aObject)
{let arrValues=new aOwner.window.wrappedJSObject.Array();let obj=WebConsoleUtils.unwrap(aObject);for(let prop in obj){arrValues.push(obj[prop]);}
return arrValues;};aOwner.sandbox.help=function JSTH_help()
{aOwner.helperResult={type:"help"};};aOwner.sandbox.cd=function JSTH_cd(aWindow)
{if(!aWindow){aOwner.consoleActor.evalWindow=null;aOwner.helperResult={type:"cd"};return;}
if(typeof aWindow=="string"){aWindow=aOwner.window.document.querySelector(aWindow);}
if(aWindow instanceof Ci.nsIDOMElement&&aWindow.contentWindow){aWindow=aWindow.contentWindow;}
if(!(aWindow instanceof Ci.nsIDOMWindow)){aOwner.helperResult={type:"error",message:"cdFunctionInvalidArgument"};return;}
aOwner.consoleActor.evalWindow=aWindow;aOwner.helperResult={type:"cd"};};aOwner.sandbox.inspect=function JSTH_inspect(aObject)
{let dbgObj=aOwner.makeDebuggeeValue(aObject);let grip=aOwner.createValueGrip(dbgObj);aOwner.helperResult={type:"inspectObject",input:aOwner.evalInput,object:grip,};};aOwner.sandbox.pprint=function JSTH_pprint(aObject)
{if(aObject===null||aObject===undefined||aObject===true||aObject===false){aOwner.helperResult={type:"error",message:"helperFuncUnsupportedTypeError",};return null;}
aOwner.helperResult={rawOutput:true};if(typeof aObject=="function"){return aObject+"\n";}
let output=[];let obj=WebConsoleUtils.unwrap(aObject);for(let name in obj){let desc=WebConsoleUtils.getPropertyDescriptor(obj,name)||{};if(desc.get||desc.set){let getGrip=VariablesView.getGrip(desc.get);let setGrip=VariablesView.getGrip(desc.set);let getString=VariablesView.getString(getGrip);let setString=VariablesView.getString(setGrip);output.push(name+":","  get: "+getString,"  set: "+setString);}
else{let valueGrip=VariablesView.getGrip(obj[name]);let valueString=VariablesView.getString(valueGrip);output.push(name+": "+valueString);}}
return"  "+output.join("\n  ");};aOwner.sandbox.print=function JSTH_print(aValue)
{aOwner.helperResult={rawOutput:true};


return String(Cu.waiveXrays(aValue));};}
exports.JSTermHelpers=JSTermHelpers;function ConsoleReflowListener(aWindow,aListener)
{this.docshell=aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation).QueryInterface(Ci.nsIDocShell);this.listener=aListener;this.docshell.addWeakReflowObserver(this);}
exports.ConsoleReflowListener=ConsoleReflowListener;ConsoleReflowListener.prototype={QueryInterface:XPCOMUtils.generateQI([Ci.nsIReflowObserver,Ci.nsISupportsWeakReference]),docshell:null,listener:null,sendReflow:function CRL_sendReflow(aStart,aEnd,aInterruptible)
{let frame=components.stack.caller.caller;let filename=frame.filename;if(filename){filename=filename.split(" ").pop();}
this.listener.onReflowActivity({interruptible:aInterruptible,start:aStart,end:aEnd,sourceURL:filename,sourceLine:frame.lineNumber,functionName:frame.name});},reflow:function CRL_reflow(aStart,aEnd)
{this.sendReflow(aStart,aEnd,false);},reflowInterruptible:function CRL_reflowInterruptible(aStart,aEnd)
{this.sendReflow(aStart,aEnd,true);},destroy:function CRL_destroy()
{this.docshell.removeWeakReflowObserver(this);this.listener=this.docshell=null;},};function gSequenceId()
{return gSequenceId.n++;}
gSequenceId.n=0;