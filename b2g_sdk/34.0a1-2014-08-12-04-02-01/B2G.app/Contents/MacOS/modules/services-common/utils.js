const{classes:Cc,interfaces:Ci,utils:Cu,results:Cr}=Components;this.EXPORTED_SYMBOLS=["CommonUtils"];Cu.import("resource://gre/modules/Promise.jsm");Cu.import("resource://gre/modules/Services.jsm");Cu.import("resource://gre/modules/XPCOMUtils.jsm");Cu.import("resource://gre/modules/osfile.jsm")
Cu.import("resource://gre/modules/Log.jsm");this.CommonUtils={union:function(a,b){let out=new Set(a);for(let x of b){out.add(x);}
return out;},difference:function(a,b){let out=new Set(a);for(let x of b){out.delete(x);}
return out;},intersection:function(a,b){let out=new Set();for(let x of a){if(b.has(x)){out.add(x);}}
return out;},setEqual:function(a,b){if(a.size!=b.size){return false;}
for(let x of a){if(!b.has(x)){return false;}}
return true;}, exceptionStr:Log.exceptionStr,stackTrace:Log.stackTrace,encodeBase64URL:function encodeBase64URL(bytes,pad=true){let s=btoa(bytes).replace("+","-","g").replace("/","_","g");if(!pad){s=s.replace("=","","g");}
return s;},makeURI:function makeURI(URIString){if(!URIString)
return null;try{return Services.io.newURI(URIString,null,null);}catch(e){let log=Log.repository.getLogger("Common.Utils");log.debug("Could not create URI: "+CommonUtils.exceptionStr(e));return null;}},nextTick:function nextTick(callback,thisObj){if(thisObj){callback=callback.bind(thisObj);}
Services.tm.currentThread.dispatch(callback,Ci.nsIThread.DISPATCH_NORMAL);},laterTickResolvingPromise:function(value,prototype){let deferred=Promise.defer(prototype);this.nextTick(deferred.resolve.bind(deferred,value));return deferred.promise;},waitForNextTick:function waitForNextTick(){let cb=Async.makeSyncCallback();this.nextTick(cb);Async.waitForSyncCallback(cb);return;},namedTimer:function namedTimer(callback,wait,thisObj,name){if(!thisObj||!name){throw"You must provide both an object and a property name for the timer!";} 
if(name in thisObj&&thisObj[name]instanceof Ci.nsITimer){thisObj[name].delay=wait;return;} 
let timer=Object.create(Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer)); timer.clear=function(){thisObj[name]=null;timer.cancel();}; timer.initWithCallback({notify:function notify(){ timer.clear();callback.call(thisObj,timer);}},wait,timer.TYPE_ONE_SHOT);return thisObj[name]=timer;},encodeUTF8:function encodeUTF8(str){try{str=this._utf8Converter.ConvertFromUnicode(str);return str+this._utf8Converter.Finish();}catch(ex){return null;}},decodeUTF8:function decodeUTF8(str){try{str=this._utf8Converter.ConvertToUnicode(str);return str+this._utf8Converter.Finish();}catch(ex){return null;}},byteArrayToString:function byteArrayToString(bytes){return[String.fromCharCode(byte)for each(byte in bytes)].join("");},stringToByteArray:function stringToByteArray(bytesString){return[String.charCodeAt(byte)for each(byte in bytesString)];},bytesAsHex:function bytesAsHex(bytes){return[("0"+bytes.charCodeAt(byte).toString(16)).slice(-2)
for(byte in bytes)].join("");},stringAsHex:function stringAsHex(str){return CommonUtils.bytesAsHex(CommonUtils.encodeUTF8(str));},stringToBytes:function stringToBytes(str){return CommonUtils.hexToBytes(CommonUtils.stringAsHex(str));},hexToBytes:function hexToBytes(str){let bytes=[];for(let i=0;i<str.length-1;i+=2){bytes.push(parseInt(str.substr(i,2),16));}
return String.fromCharCode.apply(String,bytes);},hexAsString:function hexAsString(hex){return CommonUtils.decodeUTF8(CommonUtils.hexToBytes(hex));},encodeBase32:function encodeBase32(bytes){const key="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";let quanta=Math.floor(bytes.length/5);let leftover=bytes.length%5;if(leftover){quanta+=1;for(let i=leftover;i<5;i++)
bytes+="\0";}

let ret="";for(let i=0;i<bytes.length;i+=5){let c=[byte.charCodeAt()for each(byte in bytes.slice(i,i+5))];ret+=key[c[0]>>3]
+key[((c[0]<<2)&0x1f)|(c[1]>>6)]
+key[(c[1]>>1)&0x1f]
+key[((c[1]<<4)&0x1f)|(c[2]>>4)]
+key[((c[2]<<1)&0x1f)|(c[3]>>7)]
+key[(c[3]>>2)&0x1f]
+key[((c[3]<<3)&0x1f)|(c[4]>>5)]
+key[c[4]&0x1f];}
switch(leftover){case 1:return ret.slice(0,-6)+"======";case 2:return ret.slice(0,-4)+"====";case 3:return ret.slice(0,-3)+"===";case 4:return ret.slice(0,-1)+"=";default:return ret;}},decodeBase32:function decodeBase32(str){const key="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";let padChar=str.indexOf("=");let chars=(padChar==-1)?str.length:padChar;let bytes=Math.floor(chars*5/8);let blocks=Math.ceil(chars/8);function processBlock(ret,cOffset,rOffset){let c,val;
function accumulate(val){ret[rOffset]|=val;}
function advance(){c=str[cOffset++];if(!c||c==""||c=="=")
throw"Done";val=key.indexOf(c);if(val==-1)
throw"Unknown character in base32: "+c;}
function left(octet,shift)
(octet<<shift)&0xff;advance();accumulate(left(val,3));advance();accumulate(val>>2);++rOffset;accumulate(left(val,6));advance();accumulate(left(val,1));advance();accumulate(val>>4);++rOffset;accumulate(left(val,4));advance();accumulate(val>>1);++rOffset;accumulate(left(val,7));advance();accumulate(left(val,2));advance();accumulate(val>>3);++rOffset;accumulate(left(val,5));advance();accumulate(val);++rOffset;}
let ret=new Array(bytes);let i=0;let cOff=0;let rOff=0;for(;i<blocks;++i){try{processBlock(ret,cOff,rOff);}catch(ex){if(ex=="Done")
break;throw ex;}
cOff+=8;rOff+=5;}
return CommonUtils.byteArrayToString(ret.slice(0,bytes));},safeAtoB:function safeAtoB(b64){let len=b64.length;let over=len%4;return over?atob(b64.substr(0,len-over)):atob(b64);},readJSON:function(path){return OS.File.read(path,{encoding:"utf-8"}).then((data)=>{return JSON.parse(data);});},writeJSON:function(contents,path){let encoder=new TextEncoder();let array=encoder.encode(JSON.stringify(contents));return OS.File.writeAtomic(path,array,{tmpPath:path+".tmp"});},ensureMillisecondsTimestamp:function ensureMillisecondsTimestamp(value){if(!value){return;}
if(!/^[0-9]+$/.test(value)){throw new Error("Timestamp value is not a positive integer: "+value);}
let intValue=parseInt(value,10);if(!intValue){return;}
if(intValue<10000000000){throw new Error("Timestamp appears to be in seconds: "+intValue);}},readBytesFromInputStream:function readBytesFromInputStream(stream,count){let BinaryInputStream=Components.Constructor("@mozilla.org/binaryinputstream;1","nsIBinaryInputStream","setInputStream");if(!count){count=stream.available();}
return new BinaryInputStream(stream).readBytes(count);},generateUUID:function generateUUID(){let uuid=Cc["@mozilla.org/uuid-generator;1"].getService(Ci.nsIUUIDGenerator).generateUUID().toString();return uuid.substring(1,uuid.length-1);},getEpochPref:function getEpochPref(branch,pref,def=0,log=null){if(!Number.isInteger(def)){throw new Error("Default value is not a number: "+def);}
let valueStr=branch.get(pref,null);if(valueStr!==null){let valueInt=parseInt(valueStr,10);if(Number.isNaN(valueInt)){if(log){log.warn("Preference value is not an integer. Using default. "+
pref+"="+valueStr+" -> "+def);}
return def;}
return valueInt;}
return def;},getDatePref:function getDatePref(branch,pref,def=0,log=null,oldestYear=2010){let valueInt=this.getEpochPref(branch,pref,def,log);let date=new Date(valueInt);if(valueInt==def||date.getFullYear()>=oldestYear){return date;}
if(log){log.warn("Unexpected old date seen in pref. Returning default: "+
pref+"="+date+" -> "+def);}
return new Date(def);},setDatePref:function setDatePref(branch,pref,date,oldestYear=2010){if(date.getFullYear()<oldestYear){throw new Error("Trying to set "+pref+" to a very old time: "+
date+". The current time is "+new Date()+". Is the system clock wrong?");}
branch.set(pref,""+date.getTime());},convertString:function convertString(s,source,dest){if(!s){throw new Error("Input string must be defined.");}
let is=Cc["@mozilla.org/io/string-input-stream;1"].createInstance(Ci.nsIStringInputStream);is.setData(s,s.length);let listener=Cc["@mozilla.org/network/stream-loader;1"].createInstance(Ci.nsIStreamLoader);let result;listener.init({onStreamComplete:function onStreamComplete(loader,context,status,length,data){result=String.fromCharCode.apply(this,data);},});let converter=this._converterService.asyncConvertData(source,dest,listener,null);converter.onStartRequest(null,null);converter.onDataAvailable(null,null,is,0,s.length);converter.onStopRequest(null,null,null);return result;},};XPCOMUtils.defineLazyGetter(CommonUtils,"_utf8Converter",function(){let converter=Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);converter.charset="UTF-8";return converter;});XPCOMUtils.defineLazyGetter(CommonUtils,"_converterService",function(){return Cc["@mozilla.org/streamConverters;1"].getService(Ci.nsIStreamConverterService);});