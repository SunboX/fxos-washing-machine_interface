"use strict";module.metadata={"stability":"experimental"};const{Cc,Ci,Cu,components}=require("chrome");var NetUtil={};Cu.import("resource://gre/modules/NetUtil.jsm",NetUtil);NetUtil=NetUtil.NetUtil;
const BUFFER_BYTE_LEN=0x8000;const PR_UINT32_MAX=0xffffffff;const DEFAULT_CHARSET="UTF-8";exports.TextReader=TextReader;exports.TextWriter=TextWriter;function TextReader(inputStream,charset){const self=this;charset=checkCharset(charset);let stream=Cc["@mozilla.org/intl/converter-input-stream;1"].createInstance(Ci.nsIConverterInputStream);stream.init(inputStream,charset,BUFFER_BYTE_LEN,Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);let manager=new StreamManager(this,stream);this.read=function TextReader_read(numChars){manager.ensureOpened();let readAll=false;if(typeof(numChars)==="number")
numChars=Math.max(numChars,0);else
readAll=true;let str="";let totalRead=0;let chunkRead=1;
while(true){let chunk={};let toRead=readAll?PR_UINT32_MAX:Math.min(numChars-totalRead,PR_UINT32_MAX);if(toRead<=0||chunkRead<=0)
break;

chunkRead=stream.readString(toRead,chunk);str+=chunk.value;totalRead+=chunkRead;}
return str;};}
function TextWriter(outputStream,charset){const self=this;charset=checkCharset(charset);let stream=outputStream;let ioUtils=Cc["@mozilla.org/io-util;1"].getService(Ci.nsIIOUtil);if(!ioUtils.outputStreamIsBuffered(outputStream)){stream=Cc["@mozilla.org/network/buffered-output-stream;1"].createInstance(Ci.nsIBufferedOutputStream);stream.init(outputStream,BUFFER_BYTE_LEN);}




let uconv=Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);uconv.charset=charset;let manager=new StreamManager(this,stream);this.flush=function TextWriter_flush(){manager.ensureOpened();stream.flush();};this.write=function TextWriter_write(str){manager.ensureOpened();let istream=uconv.convertToInputStream(str);let len=istream.available();while(len>0){stream.writeFrom(istream,len);len=istream.available();}
istream.close();};this.writeAsync=function TextWriter_writeAsync(str,callback){manager.ensureOpened();let istream=uconv.convertToInputStream(str);NetUtil.asyncCopy(istream,stream,function(result){let err=components.isSuccessCode(result)?undefined:new Error("An error occured while writing to the stream: "+result);if(err)
console.error(err);manager.opened=false;if(typeof(callback)==="function"){try{callback.call(self,err);}
catch(exc){console.exception(exc);}}});};}



function StreamManager(stream,rawStream){const self=this;this.rawStream=rawStream;this.opened=true;stream.__defineGetter__("closed",function stream_closed(){return!self.opened;});stream.close=function stream_close(){self.ensureOpened();self.unload();};require("../system/unload").ensure(this);}
StreamManager.prototype={ensureOpened:function StreamManager_ensureOpened(){if(!this.opened)
throw new Error("The stream is closed and cannot be used.");},unload:function StreamManager_unload(){
if(this.opened){

this.rawStream.close();this.opened=false;}}};function checkCharset(charset){return typeof(charset)==="string"?charset:DEFAULT_CHARSET;}