'use strict';var Promise=require('../util/promise').Promise;var l10n=require('../util/l10n');var Conversion=require('./types').Conversion;var Type=require('./types').Type;var Status=require('./types').Status;var globalObject;if(typeof window!=='undefined'){globalObject=window;}
exports.setGlobalObject=function(obj){globalObject=obj;};exports.getGlobalObject=function(){return globalObject;};exports.unsetGlobalObject=function(){globalObject=undefined;};function JavascriptType(typeSpec){}
JavascriptType.prototype=Object.create(Type.prototype);JavascriptType.prototype.getSpec=function(){return'javascript';};JavascriptType.prototype.stringify=function(value,context){if(value==null){return'';}
return value;};JavascriptType.MAX_COMPLETION_MATCHES=10;JavascriptType.prototype.parse=function(arg,context){var typed=arg.text;var scope=globalObject; if(typed===''){return Promise.resolve(new Conversion(undefined,arg,Status.INCOMPLETE));} 
if(!isNaN(parseFloat(typed))&&isFinite(typed)){return Promise.resolve(new Conversion(typed,arg));} 
if(typed.trim().match(/(null|undefined|NaN|Infinity|true|false)/)){return Promise.resolve(new Conversion(typed,arg));}

var beginning=this._findCompletionBeginning(typed);if(beginning.err){return Promise.resolve(new Conversion(typed,arg,Status.ERROR,beginning.err));} 
if(beginning.state===ParseState.COMPLEX){return Promise.resolve(new Conversion(typed,arg));}

if(beginning.state!==ParseState.NORMAL){return Promise.resolve(new Conversion(typed,arg,Status.INCOMPLETE,''));}
var completionPart=typed.substring(beginning.startPos);var properties=completionPart.split('.');var matchProp;var prop;if(properties.length>1){matchProp=properties.pop().trimLeft();for(var i=0;i<properties.length;i++){prop=properties[i].trim(); if(scope==null){return Promise.resolve(new Conversion(typed,arg,Status.ERROR,l10n.lookup('jstypeParseScope')));}
if(prop===''){return Promise.resolve(new Conversion(typed,arg,Status.INCOMPLETE,''));}

if(this._isSafeProperty(scope,prop)){return Promise.resolve(new Conversion(typed,arg));}
try{scope=scope[prop];}
catch(ex){

 return Promise.resolve(new Conversion(typed,arg,Status.VALID,''));}}}
else{matchProp=properties[0].trimLeft();} 
if(prop&&!prop.match(/^[0-9A-Za-z]*$/)){return Promise.resolve(new Conversion(typed,arg));} 
if(scope==null){var msg=l10n.lookupFormat('jstypeParseMissing',[prop]);return Promise.resolve(new Conversion(typed,arg,Status.ERROR,msg));}
 
if(!matchProp.match(/^[0-9A-Za-z]*$/)){return Promise.resolve(new Conversion(typed,arg));}
if(this._isIteratorOrGenerator(scope)){return Promise.resolve(new Conversion(typed,arg));}
var matchLen=matchProp.length;var prefix=matchLen===0?typed:typed.slice(0,-matchLen);var status=Status.INCOMPLETE;var message='';
 var matches={};


 var distUpPrototypeChain=0;var root=scope;try{while(root!=null&&Object.keys(matches).length<JavascriptType.MAX_COMPLETION_MATCHES){Object.keys(root).forEach(function(property){

 if(property.indexOf(matchProp)===0&&!(property in matches)){matches[property]={prop:property,distUpPrototypeChain:distUpPrototypeChain};}});distUpPrototypeChain++;root=Object.getPrototypeOf(root);}}
catch(ex){return Promise.resolve(new Conversion(typed,arg,Status.INCOMPLETE,''));}
 
matches=Object.keys(matches).map(function(property){if(property===matchProp){status=Status.VALID;}
return matches[property];});

 matches.sort(function(m1,m2){if(m1.distUpPrototypeChain!==m2.distUpPrototypeChain){return m1.distUpPrototypeChain-m2.distUpPrototypeChain;} 
return isVendorPrefixed(m1.prop)?(isVendorPrefixed(m2.prop)?m1.prop.localeCompare(m2.prop):1):(isVendorPrefixed(m2.prop)?-1:m1.prop.localeCompare(m2.prop));});


if(matches.length>JavascriptType.MAX_COMPLETION_MATCHES){matches=matches.slice(0,JavascriptType.MAX_COMPLETION_MATCHES-1);}

 
var predictions=matches.map(function(match){var description;var incomplete=true;if(this._isSafeProperty(scope,match.prop)){description='(property getter)';}
else{try{var value=scope[match.prop];if(typeof value==='function'){description='(function)';}
else if(typeof value==='boolean'||typeof value==='number'){description='= '+value;incomplete=false;}
else if(typeof value==='string'){if(value.length>40){value=value.substring(0,37)+'…';}
description='= \''+value+'\'';incomplete=false;}
else{description='('+typeof value+')';}}
catch(ex){description='('+l10n.lookup('jstypeParseError')+')';}}
return{name:prefix+match.prop,value:{name:prefix+match.prop,description:description},description:description,incomplete:incomplete};},this);if(predictions.length===0){status=Status.ERROR;message=l10n.lookupFormat('jstypeParseMissing',[matchProp]);} 
if(predictions.length===1&&status===Status.VALID){predictions=[];}
return Promise.resolve(new Conversion(typed,arg,status,message,Promise.resolve(predictions)));};function isVendorPrefixed(name){return name.indexOf('moz')===0||name.indexOf('webkit')===0||name.indexOf('ms')===0;}
var ParseState={NORMAL:0,COMPLEX:1,QUOTE:2,DQUOTE:3};var OPEN_BODY='{[('.split('');var CLOSE_BODY='}])'.split('');var OPEN_CLOSE_BODY={'{':'}','[':']','(':')'};var simpleChars=/[a-zA-Z0-9.]/;JavascriptType.prototype._findCompletionBeginning=function(text){var bodyStack=[];var state=ParseState.NORMAL;var start=0;var c;var complex=false;for(var i=0;i<text.length;i++){c=text[i];if(!simpleChars.test(c)){complex=true;}
switch(state){case ParseState.NORMAL:if(c==='"'){state=ParseState.DQUOTE;}
else if(c==='\''){state=ParseState.QUOTE;}
else if(c===';'){start=i+1;}
else if(c===' '){start=i+1;}
else if(OPEN_BODY.indexOf(c)!=-1){bodyStack.push({token:c,start:start});start=i+1;}
else if(CLOSE_BODY.indexOf(c)!=-1){var last=bodyStack.pop();if(!last||OPEN_CLOSE_BODY[last.token]!=c){return{err:l10n.lookup('jstypeBeginSyntax')};}
if(c==='}'){start=i+1;}
else{start=last.start;}}
break;case ParseState.DQUOTE:if(c==='\\'){i++;}
else if(c==='\n'){return{err:l10n.lookup('jstypeBeginUnterm')};}
else if(c==='"'){state=ParseState.NORMAL;}
break;case ParseState.QUOTE:if(c==='\\'){i++;}
else if(c==='\n'){return{err:l10n.lookup('jstypeBeginUnterm')};}
else if(c==='\''){state=ParseState.NORMAL;}
break;}}
if(state===ParseState.NORMAL&&complex){state=ParseState.COMPLEX;}
return{state:state,startPos:start};};JavascriptType.prototype._isIteratorOrGenerator=function(obj){if(obj===null){return false;}
if(typeof aObject==='object'){if(typeof obj.__iterator__==='function'||obj.constructor&&obj.constructor.name==='Iterator'){return true;}
try{var str=obj.toString();if(typeof obj.next==='function'&&str.indexOf('[object Generator')===0){return true;}}
catch(ex){return false;}}
return false;};JavascriptType.prototype._isSafeProperty=function(scope,prop){if(typeof scope!=='object'){return false;}

var propDesc;while(scope){try{propDesc=Object.getOwnPropertyDescriptor(scope,prop);if(propDesc){break;}}
catch(ex){if(ex.name==='NS_ERROR_XPC_BAD_CONVERT_JS'||ex.name==='NS_ERROR_XPC_BAD_OP_ON_WN_PROTO'){return false;}
return true;}
scope=Object.getPrototypeOf(scope);}
if(!propDesc){return false;}
if(!propDesc.get){return false;}

return typeof propDesc.get!=='function'||'prototype'in propDesc.get;};JavascriptType.prototype.name='javascript';exports.items=[JavascriptType];