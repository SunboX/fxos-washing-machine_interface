this.EXPORTED_SYMBOLS=["NetUtil",];const Ci=Components.interfaces;const Cc=Components.classes;const Cr=Components.results;const Cu=Components.utils;const PR_UINT32_MAX=0xffffffff;this.NetUtil={asyncCopy:function NetUtil_asyncCopy(aSource,aSink,aCallback=null)
{if(!aSource||!aSink){let exception=new Components.Exception("Must have a source and a sink",Cr.NS_ERROR_INVALID_ARG,Components.stack.caller);throw exception;} 
var copier=Cc["@mozilla.org/network/async-stream-copier;1"].createInstance(Ci.nsIAsyncStreamCopier2);copier.init(aSource,aSink,null,0,true,true);var observer;if(aCallback){observer={onStartRequest:function(aRequest,aContext){},onStopRequest:function(aRequest,aContext,aStatusCode){aCallback(aStatusCode);}}}else{observer=null;} 
copier.QueryInterface(Ci.nsIAsyncStreamCopier).asyncCopy(observer,null);return copier;},asyncFetch:function NetUtil_asyncOpen(aSource,aCallback)
{if(!aSource||!aCallback){let exception=new Components.Exception("Must have a source and a callback",Cr.NS_ERROR_INVALID_ARG,Components.stack.caller);throw exception;}

let pipe=Cc["@mozilla.org/pipe;1"].createInstance(Ci.nsIPipe);pipe.init(true,true,0,PR_UINT32_MAX,null);let listener=Cc["@mozilla.org/network/simple-stream-listener;1"].createInstance(Ci.nsISimpleStreamListener);listener.init(pipe.outputStream,{onStartRequest:function(aRequest,aContext){},onStopRequest:function(aRequest,aContext,aStatusCode){pipe.outputStream.close();aCallback(pipe.inputStream,aStatusCode,aRequest);}});if(aSource instanceof Ci.nsIInputStream){let pump=Cc["@mozilla.org/network/input-stream-pump;1"].createInstance(Ci.nsIInputStreamPump);pump.init(aSource,-1,-1,0,0,true);pump.asyncRead(listener,null);return;}
let channel=aSource;if(!(channel instanceof Ci.nsIChannel)){channel=this.newChannel(aSource);}
try{channel.asyncOpen(listener,null);}
catch(e){let exception=new Components.Exception("Failed to open input source '"+channel.originalURI.spec+"'",e.result,Components.stack.caller,aSource,e);throw exception;}},newURI:function NetUtil_newURI(aTarget,aOriginCharset,aBaseURI)
{if(!aTarget){let exception=new Components.Exception("Must have a non-null string spec or nsIFile object",Cr.NS_ERROR_INVALID_ARG,Components.stack.caller);throw exception;}
if(aTarget instanceof Ci.nsIFile){return this.ioService.newFileURI(aTarget);}
return this.ioService.newURI(aTarget,aOriginCharset,aBaseURI);},newChannel:function NetUtil_newChannel(aWhatToLoad,aOriginCharset,aBaseURI)
{if(!aWhatToLoad){let exception=new Components.Exception("Must have a non-null string spec, nsIURI, or nsIFile object",Cr.NS_ERROR_INVALID_ARG,Components.stack.caller);throw exception;}
let uri=aWhatToLoad;if(!(aWhatToLoad instanceof Ci.nsIURI)){uri=this.newURI(aWhatToLoad,aOriginCharset,aBaseURI);}
return this.ioService.newChannelFromURI(uri);},readInputStreamToString:function NetUtil_readInputStreamToString(aInputStream,aCount,aOptions)
{if(!(aInputStream instanceof Ci.nsIInputStream)){let exception=new Components.Exception("First argument should be an nsIInputStream",Cr.NS_ERROR_INVALID_ARG,Components.stack.caller);throw exception;}
if(!aCount){let exception=new Components.Exception("Non-zero amount of bytes must be specified",Cr.NS_ERROR_INVALID_ARG,Components.stack.caller);throw exception;}
if(aOptions&&"charset"in aOptions){let cis=Cc["@mozilla.org/intl/converter-input-stream;1"].createInstance(Ci.nsIConverterInputStream);try{
if(!("replacement"in aOptions)){aOptions.replacement=0;}
cis.init(aInputStream,aOptions.charset,aCount,aOptions.replacement);let str={};cis.readString(-1,str);cis.close();return str.value;}
catch(e){throw new Components.Exception(e.message,e.result,Components.stack.caller,e.data);}}
let sis=Cc["@mozilla.org/scriptableinputstream;1"].createInstance(Ci.nsIScriptableInputStream);sis.init(aInputStream);try{return sis.readBytes(aCount);}
catch(e){throw new Components.Exception(e.message,e.result,Components.stack.caller,e.data);}},get ioService()
{delete this.ioService;return this.ioService=Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);},};Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");XPCOMUtils.defineLazyServiceGetter(this,"ioUtil","@mozilla.org/io-util;1","nsIIOUtil");