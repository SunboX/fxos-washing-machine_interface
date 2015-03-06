this.EXPORTED_SYMBOLS=["template"];Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");XPCOMUtils.defineLazyModuleGetter(this,"console","resource://gre/modules/devtools/Console.jsm");'do not use strict';
var template=function(node,data,options){var state={options:options||{},
 nodes:[]};state.stack=state.options.stack;if(!Array.isArray(state.stack)){if(typeof state.stack==='string'){state.stack=[options.stack];}
else{state.stack=[];}}
processNode(state,node,data);};function cloneState(state){return{options:state.options,stack:state.stack.slice(),nodes:state.nodes.slice()};}
var TEMPLATE_REGION=/\$\{([^}]*)\}/g;function processNode(state,node,data){if(typeof node==='string'){node=document.getElementById(node);}
if(data==null){data={};}
state.stack.push(node.nodeName+(node.id?'#'+node.id:''));var pushedNode=false;try{ if(node.attributes&&node.attributes.length){

if(node.hasAttribute('foreach')){processForEach(state,node,data);return;}
if(node.hasAttribute('if')){if(!processIf(state,node,data)){return;}} 
state.nodes.push(data.__element);data.__element=node;pushedNode=true; var attrs=Array.prototype.slice.call(node.attributes);for(var i=0;i<attrs.length;i++){var value=attrs[i].value;var name=attrs[i].name;state.stack.push(name);try{if(name==='save'){ value=stripBraces(state,value);property(state,value,data,node);node.removeAttribute('save');}
else if(name.substring(0,2)==='on'){ if(value.substring(0,2)==='${'&&value.slice(-1)==='}'&&value.indexOf('${',2)===-1){value=stripBraces(state,value);var func=property(state,value,data);if(typeof func==='function'){node.removeAttribute(name);var capture=node.hasAttribute('capture'+name.substring(2));node.addEventListener(name.substring(2),func,capture);if(capture){node.removeAttribute('capture'+name.substring(2));}}
else{ node.setAttribute(name,func);}}
else{ node.setAttribute(name,processString(state,value,data));}}
else{node.removeAttribute(name);
 if(name.charAt(0)==='_'){name=name.substring(1);} 
var replacement;if(value.indexOf('${')===0&&value.charAt(value.length-1)==='}'){replacement=envEval(state,value.slice(2,-1),data,value);if(replacement&&typeof replacement.then==='function'){node.setAttribute(name,'');replacement.then(function(newValue){node.setAttribute(name,newValue);}).then(null,console.error);}
else{if(state.options.blankNullUndefined&&replacement==null){replacement='';}
node.setAttribute(name,replacement);}}
else{node.setAttribute(name,processString(state,value,data));}}}
finally{state.stack.pop();}}}

var childNodes=Array.prototype.slice.call(node.childNodes);for(var j=0;j<childNodes.length;j++){processNode(state,childNodes[j],data);}
if(node.nodeType===3){processTextNode(state,node,data);}}
finally{if(pushedNode){data.__element=state.nodes.pop();}
state.stack.pop();}}
function processString(state,value,data){return value.replace(TEMPLATE_REGION,function(path){var insert=envEval(state,path.slice(2,-1),data,value);return state.options.blankNullUndefined&&insert==null?'':insert;});}
function processIf(state,node,data){state.stack.push('if');try{var originalValue=node.getAttribute('if');var value=stripBraces(state,originalValue);var recurse=true;try{var reply=envEval(state,value,data,originalValue);recurse=!!reply;}
catch(ex){handleError(state,'Error with \''+value+'\'',ex);recurse=false;}
if(!recurse){node.parentNode.removeChild(node);}
node.removeAttribute('if');return recurse;}
finally{state.stack.pop();}}
function processForEach(state,node,data){state.stack.push('foreach');try{var originalValue=node.getAttribute('foreach');var value=originalValue;var paramName='param';if(value.charAt(0)==='$'){value=stripBraces(state,value);}
else{var nameArr=value.split(' in ');paramName=nameArr[0].trim();value=stripBraces(state,nameArr[1].trim());}
node.removeAttribute('foreach');try{var evaled=envEval(state,value,data,originalValue);var cState=cloneState(state);handleAsync(evaled,node,function(reply,siblingNode){processForEachLoop(cState,reply,node,siblingNode,data,paramName);});node.parentNode.removeChild(node);}
catch(ex){handleError(state,'Error with \''+value+'\'',ex);}}
finally{state.stack.pop();}}
function processForEachLoop(state,set,templNode,sibling,data,paramName){if(Array.isArray(set)){set.forEach(function(member,i){processForEachMember(state,member,templNode,sibling,data,paramName,''+i);});}
else{for(var member in set){if(set.hasOwnProperty(member)){processForEachMember(state,member,templNode,sibling,data,paramName,member);}}}}
function processForEachMember(state,member,templNode,siblingNode,data,paramName,frame){state.stack.push(frame);try{var cState=cloneState(state);handleAsync(member,siblingNode,function(reply,node){ var newData=Object.create(null);Object.keys(data).forEach(function(key){newData[key]=data[key];});newData[paramName]=reply;if(node.parentNode!=null){if(templNode.nodeName.toLowerCase()==='loop'){for(var i=0;i<templNode.childNodes.length;i++){var clone=templNode.childNodes[i].cloneNode(true);node.parentNode.insertBefore(clone,node);processNode(cState,clone,newData);}}
else{var clone=templNode.cloneNode(true);clone.removeAttribute('foreach');node.parentNode.insertBefore(clone,node);processNode(cState,clone,newData);}}});}
finally{state.stack.pop();}}
function processTextNode(state,node,data){ var value=node.data;




value=value.replace(TEMPLATE_REGION,'\uF001$$$1\uF002');var parts=value.split(/\uF001|\uF002/);if(parts.length>1){parts.forEach(function(part){if(part===null||part===undefined||part===''){return;}
if(part.charAt(0)==='$'){part=envEval(state,part.slice(1),data,node.data);}
var cState=cloneState(state);handleAsync(part,node,function(reply,siblingNode){var doc=siblingNode.ownerDocument;if(reply==null){reply=cState.options.blankNullUndefined?'':''+reply;}
if(typeof reply.cloneNode==='function'){reply=maybeImportNode(cState,reply,doc);siblingNode.parentNode.insertBefore(reply,siblingNode);}
else if(typeof reply.item==='function'&&reply.length){

 var list=Array.prototype.slice.call(reply,0);list.forEach(function(child){var imported=maybeImportNode(cState,child,doc);siblingNode.parentNode.insertBefore(imported,siblingNode);});}
else{ reply=doc.createTextNode(reply.toString());siblingNode.parentNode.insertBefore(reply,siblingNode);}});});node.parentNode.removeChild(node);}}
function maybeImportNode(state,node,doc){return node.ownerDocument===doc?node:doc.importNode(node,true);}
function handleAsync(thing,siblingNode,inserter){if(thing!=null&&typeof thing.then==='function'){ var tempNode=siblingNode.ownerDocument.createElement('span');siblingNode.parentNode.insertBefore(tempNode,siblingNode);thing.then(function(delayed){inserter(delayed,tempNode);if(tempNode.parentNode!=null){tempNode.parentNode.removeChild(tempNode);}}).then(null,function(error){console.error(error.stack);});}
else{inserter(thing,siblingNode);}}
function stripBraces(state,str){if(!str.match(TEMPLATE_REGION)){handleError(state,'Expected '+str+' to match ${...}');return str;}
return str.slice(2,-1);}
function property(state,path,data,newValue){try{if(typeof path==='string'){path=path.split('.');}
var value=data[path[0]];if(path.length===1){if(newValue!==undefined){data[path[0]]=newValue;}
if(typeof value==='function'){return value.bind(data);}
return value;}
if(!value){handleError(state,'"'+path[0]+'" is undefined');return null;}
return property(state,path.slice(1),value,newValue);}
catch(ex){handleError(state,'Path error with \''+path+'\'',ex);return'${'+path+'}';}}
function envEval(state,script,data,frame){try{state.stack.push(frame.replace(/\s+/g,' '));if(/^[_a-zA-Z0-9.]*$/.test(script)){return property(state,script,data);}
else{if(!state.options.allowEval){handleError(state,'allowEval is not set, however \''+script+'\''+' can not be resolved using a simple property path.');return'${'+script+'}';}
with(data){return eval(script);}}}
catch(ex){handleError(state,'Template error evaluating \''+script+'\'',ex);return'${'+script+'}';}
finally{state.stack.pop();}}
function handleError(state,message,ex){logError(message+' (In: '+state.stack.join(' > ')+')');if(ex){logError(ex);}}
function logError(message){console.log(message);}