'use strict';var eventDebug=false;if(eventDebug){if(console.group==null){console.group=function(){console.log(arguments);};}
if(console.groupEnd==null){console.groupEnd=function(){console.log(arguments);};}}
function nameFunction(handler){var scope=handler.scope?handler.scope.constructor.name+'.':'';var name=handler.func.name;if(name){return scope+name;}
for(var prop in handler.scope){if(handler.scope[prop]===handler.func){return scope+prop;}}
return scope+handler.func;}
exports.createEvent=function(name){var handlers=[];var fireHoldCount=0;var heldEvents=[];var eventCombiner;var event=function(ev){if(fireHoldCount>0){heldEvents.push(ev);if(eventDebug){console.log('Held fire: '+name,ev);}
return;}
if(eventDebug){console.group('Fire: '+name+' to '+handlers.length+' listeners',ev);}
 
for(var i=0;i<handlers.length;i++){var handler=handlers[i];if(eventDebug){console.log(nameFunction(handler));}
handler.func.call(handler.scope,ev);}
if(eventDebug){console.groupEnd();}};event.add=function(func,scope){if(typeof func!=='function'){throw new Error(name+' add(func,...), 1st param is '+typeof func);}
if(eventDebug){console.log('Adding listener to '+name);}
handlers.push({func:func,scope:scope});};event.remove=function(func,scope){if(eventDebug){console.log('Removing listener from '+name);}
var found=false;handlers=handlers.filter(function(test){var match=(test.func===func&&test.scope===scope);if(match){found=true;}
return!match;});if(!found){console.warn('Handler not found. Attached to '+name);}};event.removeAll=function(){handlers=[];};event.holdFire=function(){if(eventDebug){console.group('Holding fire: '+name);}
fireHoldCount++;};event.resumeFire=function(){if(eventDebug){console.groupEnd('Resume fire: '+name);}
if(fireHoldCount===0){throw new Error('fireHoldCount === 0 during resumeFire on '+name);}
fireHoldCount--;if(heldEvents.length===0){return;}
if(heldEvents.length===1){event(heldEvents[0]);}
else{var first=heldEvents[0];var last=heldEvents[heldEvents.length-1];if(eventCombiner){event(eventCombiner(first,last,heldEvents));}
else{event(last);}}
heldEvents=[];};Object.defineProperty(event,'eventCombiner',{set:function(newEventCombiner){if(typeof newEventCombiner!=='function'){throw new Error('eventCombiner is not a function');}
eventCombiner=newEventCombiner;},enumerable:true});return event;};var Promise=require('../util/promise').Promise;exports.promiseEach=function(array,action,scope){if(array.length===0){return Promise.resolve([]);}
return new Promise(function(resolve,reject){var replies=[];var callNext=function(index){var onSuccess=function(reply){replies[index]=reply;if(index+1>=array.length){resolve(replies);}
else{callNext(index+1);}};var onFailure=function(ex){reject(ex);};var reply=action.call(scope,array[index],index,array);Promise.resolve(reply).then(onSuccess).then(null,onFailure);};callNext(0);});};exports.errorHandler=function(ex){if(ex instanceof Error){ if(ex.stack.indexOf(ex.message)!==-1){console.error(ex.stack);}
else{console.error(''+ex);console.error(ex.stack);}}
else{console.error(ex);}};exports.copyProperties=function(src,dest){for(var key in src){var descriptor;var obj=src;while(true){descriptor=Object.getOwnPropertyDescriptor(obj,key);if(descriptor!=null){break;}
obj=Object.getPrototypeOf(obj);if(obj==null){throw new Error('Can\'t find descriptor of '+key);}}
if('value'in descriptor){dest[key]=src[key];}
else if('get'in descriptor){Object.defineProperty(dest,key,{get:descriptor.get,set:descriptor.set,enumerable:descriptor.enumerable});}
else{throw new Error('Don\'t know how to copy '+key+' property.');}}};exports.NS_XHTML='http://www.w3.org/1999/xhtml';exports.NS_XUL='http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul';exports.createElement=function(doc,tag){if(exports.isXmlDocument(doc)){return doc.createElementNS(exports.NS_XHTML,tag);}
else{return doc.createElement(tag);}};exports.clearElement=function(elem){while(elem.hasChildNodes()){elem.removeChild(elem.firstChild);}};var isAllWhitespace=/^\s*$/;exports.removeWhitespace=function(elem,deep){var i=0;while(i<elem.childNodes.length){var child=elem.childNodes.item(i);if(child.nodeType===3&&isAllWhitespace.test(child.textContent)){elem.removeChild(child);}
else{if(deep&&child.nodeType===1){exports.removeWhitespace(child,deep);}
i++;}}};exports.importCss=function(cssText,doc,id){if(!cssText){return undefined;}
doc=doc||document;if(!id){id='hash-'+hash(cssText);}
var found=doc.getElementById(id);if(found){if(found.tagName.toLowerCase()!=='style'){console.error('Warning: importCss passed id='+id+', but that pre-exists (and isn\'t a style tag)');}
return found;}
var style=exports.createElement(doc,'style');style.id=id;style.appendChild(doc.createTextNode(cssText));var head=doc.getElementsByTagName('head')[0]||doc.documentElement;head.appendChild(style);return style;};function hash(str){var h=0;if(str.length===0){return h;}
for(var i=0;i<str.length;i++){var character=str.charCodeAt(i);h=((h<<5)-h)+character;h=h&h;}
return h;}
exports.setTextContent=function(elem,text){exports.clearElement(elem);var child=elem.ownerDocument.createTextNode(text);elem.appendChild(child);};exports.setContents=function(elem,contents){if(typeof HTMLElement!=='undefined'&&contents instanceof HTMLElement){exports.clearElement(elem);elem.appendChild(contents);return;}
if('innerHTML'in elem){elem.innerHTML=contents;}
else{try{var ns=elem.ownerDocument.documentElement.namespaceURI;if(!ns){ns=exports.NS_XHTML;}
exports.clearElement(elem);contents='<div xmlns="'+ns+'">'+contents+'</div>';var range=elem.ownerDocument.createRange();var child=range.createContextualFragment(contents).firstChild;while(child.hasChildNodes()){elem.appendChild(child.firstChild);}}
catch(ex){console.error('Bad XHTML',ex);console.trace();throw ex;}}};exports.isXmlDocument=function(doc){doc=doc||document; if(doc.contentType&&doc.contentType!='text/html'){return true;} 
if(doc.xmlVersion!=null){return true;}
return false;};exports.createEmptyNodeList=function(doc){if(doc.createDocumentFragment){return doc.createDocumentFragment().childNodes;}
return doc.querySelectorAll('x>:root');};if(typeof'KeyEvent'==='undefined'){exports.KeyEvent=this.KeyEvent;}
else{exports.KeyEvent={DOM_VK_CANCEL:3,DOM_VK_HELP:6,DOM_VK_BACK_SPACE:8,DOM_VK_TAB:9,DOM_VK_CLEAR:12,DOM_VK_RETURN:13,DOM_VK_SHIFT:16,DOM_VK_CONTROL:17,DOM_VK_ALT:18,DOM_VK_PAUSE:19,DOM_VK_CAPS_LOCK:20,DOM_VK_ESCAPE:27,DOM_VK_SPACE:32,DOM_VK_PAGE_UP:33,DOM_VK_PAGE_DOWN:34,DOM_VK_END:35,DOM_VK_HOME:36,DOM_VK_LEFT:37,DOM_VK_UP:38,DOM_VK_RIGHT:39,DOM_VK_DOWN:40,DOM_VK_PRINTSCREEN:44,DOM_VK_INSERT:45,DOM_VK_DELETE:46,DOM_VK_0:48,DOM_VK_1:49,DOM_VK_2:50,DOM_VK_3:51,DOM_VK_4:52,DOM_VK_5:53,DOM_VK_6:54,DOM_VK_7:55,DOM_VK_8:56,DOM_VK_9:57,DOM_VK_SEMICOLON:59,DOM_VK_EQUALS:61,DOM_VK_A:65,DOM_VK_B:66,DOM_VK_C:67,DOM_VK_D:68,DOM_VK_E:69,DOM_VK_F:70,DOM_VK_G:71,DOM_VK_H:72,DOM_VK_I:73,DOM_VK_J:74,DOM_VK_K:75,DOM_VK_L:76,DOM_VK_M:77,DOM_VK_N:78,DOM_VK_O:79,DOM_VK_P:80,DOM_VK_Q:81,DOM_VK_R:82,DOM_VK_S:83,DOM_VK_T:84,DOM_VK_U:85,DOM_VK_V:86,DOM_VK_W:87,DOM_VK_X:88,DOM_VK_Y:89,DOM_VK_Z:90,DOM_VK_CONTEXT_MENU:93,DOM_VK_NUMPAD0:96,DOM_VK_NUMPAD1:97,DOM_VK_NUMPAD2:98,DOM_VK_NUMPAD3:99,DOM_VK_NUMPAD4:100,DOM_VK_NUMPAD5:101,DOM_VK_NUMPAD6:102,DOM_VK_NUMPAD7:103,DOM_VK_NUMPAD8:104,DOM_VK_NUMPAD9:105,DOM_VK_MULTIPLY:106,DOM_VK_ADD:107,DOM_VK_SEPARATOR:108,DOM_VK_SUBTRACT:109,DOM_VK_DECIMAL:110,DOM_VK_DIVIDE:111,DOM_VK_F1:112,DOM_VK_F2:113,DOM_VK_F3:114,DOM_VK_F4:115,DOM_VK_F5:116,DOM_VK_F6:117,DOM_VK_F7:118,DOM_VK_F8:119,DOM_VK_F9:120,DOM_VK_F10:121,DOM_VK_F11:122,DOM_VK_F12:123,DOM_VK_F13:124,DOM_VK_F14:125,DOM_VK_F15:126,DOM_VK_F16:127,DOM_VK_F17:128,DOM_VK_F18:129,DOM_VK_F19:130,DOM_VK_F20:131,DOM_VK_F21:132,DOM_VK_F22:133,DOM_VK_F23:134,DOM_VK_F24:135,DOM_VK_NUM_LOCK:144,DOM_VK_SCROLL_LOCK:145,DOM_VK_COMMA:188,DOM_VK_PERIOD:190,DOM_VK_SLASH:191,DOM_VK_BACK_QUOTE:192,DOM_VK_OPEN_BRACKET:219,DOM_VK_BACK_SLASH:220,DOM_VK_CLOSE_BRACKET:221,DOM_VK_QUOTE:222,DOM_VK_META:224};}