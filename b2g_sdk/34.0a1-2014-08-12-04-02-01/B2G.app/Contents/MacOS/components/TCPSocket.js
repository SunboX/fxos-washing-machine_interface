"use strict";const Cc=Components.classes;const Ci=Components.interfaces;const Cu=Components.utils;const Cr=Components.results;const CC=Components.Constructor;Cu.import("resource://gre/modules/XPCOMUtils.jsm");Cu.import("resource://gre/modules/Services.jsm");const InputStreamPump=CC("@mozilla.org/network/input-stream-pump;1","nsIInputStreamPump","init"),AsyncStreamCopier=CC("@mozilla.org/network/async-stream-copier;1","nsIAsyncStreamCopier","init"),ScriptableInputStream=CC("@mozilla.org/scriptableinputstream;1","nsIScriptableInputStream","init"),BinaryInputStream=CC("@mozilla.org/binaryinputstream;1","nsIBinaryInputStream","setInputStream"),StringInputStream=CC('@mozilla.org/io/string-input-stream;1','nsIStringInputStream'),ArrayBufferInputStream=CC('@mozilla.org/io/arraybuffer-input-stream;1','nsIArrayBufferInputStream'),MultiplexInputStream=CC('@mozilla.org/io/multiplex-input-stream;1','nsIMultiplexInputStream');const TCPServerSocket=CC("@mozilla.org/tcp-server-socket;1","nsITCPServerSocketInternal","init");const kCONNECTING='connecting';const kOPEN='open';const kCLOSING='closing';const kCLOSED='closed';const kRESUME_ERROR='Calling resume() on a connection that was not suspended.';const BUFFER_SIZE=65536;const NETWORK_STATS_THRESHOLD=65536;



function createTCPError(aWindow,aErrorName,aErrorType){return new(aWindow?aWindow.DOMError:DOMError)(aErrorName);}
let debug=false;function LOG(msg){if(debug)
dump("TCPSocket: "+msg+"\n");}
function TCPSocketEvent(type,sock,data){this._type=type;this._target=sock;this._data=data;}
TCPSocketEvent.prototype={__exposedProps__:{type:'r',target:'r',data:'r'},get type(){return this._type;},get target(){return this._target;},get data(){return this._data;}}
function TCPSocket(){this._readyState=kCLOSED;this._onopen=null;this._ondrain=null;this._ondata=null;this._onerror=null;this._onclose=null;this._binaryType="string";this._host="";this._port=0;this._ssl=false;this.useWin=null;}
TCPSocket.prototype={__exposedProps__:{open:'r',host:'r',port:'r',ssl:'r',bufferedAmount:'r',suspend:'r',resume:'r',close:'r',send:'r',readyState:'r',binaryType:'r',listen:'r',onopen:'rw',ondrain:'rw',ondata:'rw',onerror:'rw',onclose:'rw'},_binaryType:null, _hasPrivileges:null, _transport:null,_socketInputStream:null,_socketOutputStream:null, _inputStreamPump:null,_inputStreamScriptable:null,_inputStreamBinary:null, _multiplexStream:null,_multiplexStreamCopier:null,_asyncCopierActive:false,_waitingForDrain:false,_suspendCount:0, _bufferedAmount:0, _socketBridge:null, _waitingForStartTLS:false,_pendingDataAfterStartTLS:[],_onUpdateBufferedAmount:null,_trackingNumber:0,get readyState(){return this._readyState;},get binaryType(){return this._binaryType;},get host(){return this._host;},get port(){return this._port;},get ssl(){return this._ssl;},get bufferedAmount(){if(this._inChild){return this._bufferedAmount;}
return this._multiplexStream.available();},get onopen(){return this._onopen;},set onopen(f){this._onopen=f;},get ondrain(){return this._ondrain;},set ondrain(f){this._ondrain=f;},get ondata(){return this._ondata;},set ondata(f){this._ondata=f;},get onerror(){return this._onerror;},set onerror(f){this._onerror=f;},get onclose(){return this._onclose;},set onclose(f){this._onclose=f;},_activateTLS:function(){let securityInfo=this._transport.securityInfo.QueryInterface(Ci.nsISSLSocketControl);securityInfo.StartTLS();},_createTransport:function ts_createTransport(host,port,sslMode){let options;if(sslMode==='ssl'){options=['ssl'];}else{options=['starttls'];}
return Cc["@mozilla.org/network/socket-transport-service;1"].getService(Ci.nsISocketTransportService).createTransport(options,1,host,port,null);},_sendBufferedAmount:function ts_sendBufferedAmount(){if(this._onUpdateBufferedAmount){this._onUpdateBufferedAmount(this.bufferedAmount,this._trackingNumber);}},_ensureCopying:function ts_ensureCopying(){let self=this;if(this._asyncCopierActive){return;}
this._asyncCopierActive=true;this._multiplexStreamCopier.asyncCopy({onStartRequest:function ts_output_onStartRequest(){},onStopRequest:function ts_output_onStopRequest(request,context,status){self._asyncCopierActive=false;self._multiplexStream.removeStream(0);self._sendBufferedAmount();if(!Components.isSuccessCode(status)){
self._maybeReportErrorAndCloseIfOpen(status);return;}
if(self._multiplexStream.count){self._ensureCopying();}else{
if(self._waitingForStartTLS&&self._readyState==kOPEN){self._activateTLS();self._waitingForStartTLS=false;
if(self._pendingDataAfterStartTLS.length>0){while(self._pendingDataAfterStartTLS.length)
self._multiplexStream.appendStream(self._pendingDataAfterStartTLS.shift());self._ensureCopying();return;}}

if(self._waitingForDrain&&!self._onUpdateBufferedAmount){self._waitingForDrain=false;self.callListener("drain");}
if(self._readyState===kCLOSING){self._socketOutputStream.close();self._readyState=kCLOSED;self.callListener("close");}}}},null);},_initStream:function ts_initStream(binaryType){this._binaryType=binaryType;this._socketInputStream=this._transport.openInputStream(0,0,0);this._socketOutputStream=this._transport.openOutputStream(Ci.nsITransport.OPEN_UNBUFFERED,0,0);

this._socketInputStream.asyncWait(this,this._socketInputStream.WAIT_CLOSURE_ONLY,0,Services.tm.currentThread);if(this._binaryType==="arraybuffer"){this._inputStreamBinary=new BinaryInputStream(this._socketInputStream);}else{this._inputStreamScriptable=new ScriptableInputStream(this._socketInputStream);}
this._multiplexStream=new MultiplexInputStream();this._multiplexStreamCopier=new AsyncStreamCopier(this._multiplexStream,this._socketOutputStream,Cc["@mozilla.org/network/socket-transport-service;1"].getService(Ci.nsIEventTarget),true,false,BUFFER_SIZE,false,false);},callListener:function ts_callListener(type,data){if(!this["on"+type])
return;this["on"+type].call(null,new TCPSocketEvent(type,this,data||""));},callListenerError:function ts_callListenerError(type,name){
this.callListener(type,createTCPError(this.useWin,name));},callListenerData:function ts_callListenerString(type,data){this.callListener(type,data);},callListenerArrayBuffer:function ts_callListenerArrayBuffer(type,data){this.callListener(type,data);},callListenerVoid:function ts_callListenerVoid(type){this.callListener(type);},updateReadyState:function ts_updateReadyState(readyState){if(!this._inChild){LOG("Calling updateReadyState in parent, which should only be called "+"in child");return;}
this._readyState=readyState;},updateBufferedAmount:function ts_updateBufferedAmount(bufferedAmount,trackingNumber){if(trackingNumber!=this._trackingNumber){LOG("updateBufferedAmount is called but trackingNumber is not matched "+"parent's trackingNumber: "+trackingNumber+", child's trackingNumber: "+
this._trackingNumber);return;}
this._bufferedAmount=bufferedAmount;if(bufferedAmount==0){if(this._waitingForDrain){this._waitingForDrain=false;this.callListener("drain");}}else{LOG("bufferedAmount is updated but haven't reaches zero. bufferedAmount: "+
bufferedAmount);}},createAcceptedParent:function ts_createAcceptedParent(transport,binaryType){let that=new TCPSocket();that._transport=transport;that._initStream(binaryType); that._readyState=kOPEN;that._inputStreamPump=new InputStreamPump(that._socketInputStream,-1,-1,0,0,false);that._inputStreamPump.asyncRead(that,null);that._host=transport.host;that._port=transport.port;return that;},createAcceptedChild:function ts_createAcceptedChild(socketChild,binaryType,windowObject){let that=new TCPSocket();that._binaryType=binaryType;that._inChild=true;that._readyState=kOPEN;socketChild.setSocketAndWindow(that,windowObject);that._socketBridge=socketChild;that._host=socketChild.host;that._port=socketChild.port;return that;},setAppId:function ts_setAppId(appId){},setOnUpdateBufferedAmountHandler:function(aFunction){if(typeof(aFunction)=='function'){this._onUpdateBufferedAmount=aFunction;}else{throw new Error("only function can be passed to "+"setOnUpdateBufferedAmountHandler");}},onRecvSendFromChild:function(data,byteOffset,byteLength,trackingNumber){this._trackingNumber=trackingNumber;this.send(data,byteOffset,byteLength);},initWindowless:function ts_initWindowless(){try{return Services.prefs.getBoolPref("dom.mozTCPSocket.enabled");}catch(e){ return false;}},init:function ts_init(aWindow){if(!this.initWindowless())
return null;let principal=aWindow.document.nodePrincipal;let secMan=Cc["@mozilla.org/scriptsecuritymanager;1"].getService(Ci.nsIScriptSecurityManager);let perm=principal==secMan.getSystemPrincipal()?Ci.nsIPermissionManager.ALLOW_ACTION:Services.perms.testExactPermissionFromPrincipal(principal,"tcp-socket");this._hasPrivileges=perm==Ci.nsIPermissionManager.ALLOW_ACTION;let util=aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);this.useWin=XPCNativeWrapper.unwrap(aWindow);this.innerWindowID=util.currentInnerWindowID;LOG("window init: "+this.innerWindowID);},observe:function(aSubject,aTopic,aData){if(aTopic=="inner-window-destroyed"){let wId=aSubject.QueryInterface(Ci.nsISupportsPRUint64).data;if(wId==this.innerWindowID){LOG("inner-window-destroyed: "+this.innerWindowID);

 this.onopen=null;this.ondrain=null;this.ondata=null;this.onerror=null;this.onclose=null;this.useWin=null; this.close();}}}, open:function ts_open(host,port,options){this._inChild=Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULRuntime).processType!=Ci.nsIXULRuntime.PROCESS_TYPE_DEFAULT;LOG("content process: "+(this._inChild?"true":"false"));
if(this._hasPrivileges!==true&&this._hasPrivileges!==null){throw new Error("TCPSocket does not have permission in this context.\n");}
let that=new TCPSocket();that.useWin=this.useWin;that.innerWindowID=this.innerWindowID;that._inChild=this._inChild;LOG("window init: "+that.innerWindowID);Services.obs.addObserver(that,"inner-window-destroyed",true);LOG("startup called");LOG("Host info: "+host+":"+port);that._readyState=kCONNECTING;that._host=host;that._port=port;if(options!==undefined){if(options.useSecureTransport){that._ssl='ssl';}else{that._ssl=false;}
that._binaryType=options.binaryType||that._binaryType;}
LOG("SSL: "+that.ssl);if(this._inChild){that._socketBridge=Cc["@mozilla.org/tcp-socket-child;1"].createInstance(Ci.nsITCPSocketChild);that._socketBridge.sendOpen(that,host,port,!!that._ssl,that._binaryType,this.useWin,this.useWin||this);return that;}
let transport=that._transport=this._createTransport(host,port,that._ssl);transport.setEventSink(that,Services.tm.currentThread);that._initStream(that._binaryType);return that;},upgradeToSecure:function ts_upgradeToSecure(){if(this._readyState!==kOPEN){throw new Error("Socket not open.");}
if(this._ssl=='ssl'){ return;}
this._ssl='ssl';if(this._inChild){this._socketBridge.sendStartTLS();return;}
if(this._multiplexStream.count==0){this._activateTLS();}else{this._waitingForStartTLS=true;}},listen:function ts_listen(localPort,options,backlog){
if(this._hasPrivileges!==true&&this._hasPrivileges!==null){throw new Error("TCPSocket does not have permission in this context.\n");}
let that=new TCPServerSocket(this.useWin||this);options=options||{binaryType:this.binaryType};backlog=backlog||-1;that.listen(localPort,options,backlog);return that;},close:function ts_close(){if(this._readyState===kCLOSED||this._readyState===kCLOSING)
return;LOG("close called");this._readyState=kCLOSING;if(this._inChild){this._socketBridge.sendClose();return;}
if(!this._multiplexStream.count){this._socketOutputStream.close();}
this._socketInputStream.close();},send:function ts_send(data,byteOffset,byteLength){if(this._readyState!==kOPEN){throw new Error("Socket not open.");}
if(this._binaryType==="arraybuffer"){byteLength=byteLength||data.byteLength;}
if(this._inChild){this._socketBridge.sendSend(data,byteOffset,byteLength,++this._trackingNumber);}
let length=this._binaryType==="arraybuffer"?byteLength:data.length;let newBufferedAmount=this.bufferedAmount+length;let bufferFull=newBufferedAmount>=BUFFER_SIZE;if(bufferFull){


this._waitingForDrain=true;}
if(this._inChild){
this._bufferedAmount=newBufferedAmount;return!bufferFull;}
let new_stream;if(this._binaryType==="arraybuffer"){new_stream=new ArrayBufferInputStream();new_stream.setData(data,byteOffset,byteLength);}else{new_stream=new StringInputStream();new_stream.setData(data,length);}
if(this._waitingForStartTLS){
this._pendingDataAfterStartTLS.push(new_stream);}else{this._multiplexStream.appendStream(new_stream);}
this._ensureCopying();return!bufferFull;},suspend:function ts_suspend(){if(this._inChild){this._socketBridge.sendSuspend();return;}
if(this._inputStreamPump){this._inputStreamPump.suspend();}else{++this._suspendCount;}},resume:function ts_resume(){if(this._inChild){this._socketBridge.sendResume();return;}
if(this._inputStreamPump){this._inputStreamPump.resume();}else if(this._suspendCount<1){throw new Error(kRESUME_ERROR);}else{--this._suspendCount;}},_maybeReportErrorAndCloseIfOpen:function(status){
if(this._readyState===kCLOSED)
return;this._readyState=kCLOSED;if(!Components.isSuccessCode(status)){




let errName,errType;if((status&0xff0000)===0x5a0000){const nsINSSErrorsService=Ci.nsINSSErrorsService;let nssErrorsService=Cc['@mozilla.org/nss_errors_service;1'].getService(nsINSSErrorsService);let errorClass;
try{errorClass=nssErrorsService.getErrorClass(status);}
catch(ex){errorClass='SecurityProtocol';}
switch(errorClass){case nsINSSErrorsService.ERROR_CLASS_SSL_PROTOCOL:errType='SecurityProtocol';break;case nsINSSErrorsService.ERROR_CLASS_BAD_CERT:errType='SecurityCertificate';break;
}
if((status&0xffff)<Math.abs(nsINSSErrorsService.NSS_SEC_ERROR_BASE)){
let nssErr=Math.abs(nsINSSErrorsService.NSS_SEC_ERROR_BASE)-
(status&0xffff);switch(nssErr){case 11:errName='SecurityExpiredCertificateError';break;case 12:errName='SecurityRevokedCertificateError';break;case 13:case 20:case 21:case 36:errName='SecurityUntrustedCertificateIssuerError';break;case 90:errName='SecurityInadequateKeyUsageError';break;case 176:errName='SecurityCertificateSignatureAlgorithmDisabledError';break;default:errName='SecurityError';break;}} 
else{let sslErr=Math.abs(nsINSSErrorsService.NSS_SSL_ERROR_BASE)-
(status&0xffff);switch(sslErr){case 3:errName='SecurityNoCertificateError';break;case 4:errName='SecurityBadCertificateError';break;case 8:errName='SecurityUnsupportedCertificateTypeError';break;case 9:errName='SecurityUnsupportedTLSVersionError';break;case 12:errName='SecurityCertificateDomainMismatchError';break;default:errName='SecurityError';break;}}} 
else{errType='Network';switch(status){ case 0x804B000C:errName='ConnectionRefusedError';break; case 0x804B000E:errName='NetworkTimeoutError';break; case 0x804B001E:errName='DomainNotFoundError';break;case 0x804B0047:errName='NetworkInterruptError';break;default:errName='NetworkError';break;}}
let err=createTCPError(this.useWin,errName,errType);this.callListener("error",err);}
this.callListener("close");},onTransportStatus:function ts_onTransportStatus(transport,status,progress,max){if(status===Ci.nsISocketTransport.STATUS_CONNECTED_TO){this._readyState=kOPEN;this.callListener("open");this._inputStreamPump=new InputStreamPump(this._socketInputStream,-1,-1,0,0,false);while(this._suspendCount--){this._inputStreamPump.suspend();}
this._inputStreamPump.asyncRead(this,null);}}, 
onInputStreamReady:function ts_onInputStreamReady(input){try{input.available();}catch(e){ this._maybeReportErrorAndCloseIfOpen(0x804B000C);}},onStartRequest:function ts_onStartRequest(request,context){},onStopRequest:function ts_onStopRequest(request,context,status){let buffered_output=this._multiplexStream.count!==0;this._inputStreamPump=null;let statusIsError=!Components.isSuccessCode(status);if(buffered_output&&!statusIsError){



return;}
this._maybeReportErrorAndCloseIfOpen(status);},onDataAvailable:function ts_onDataAvailable(request,context,inputStream,offset,count){if(this._binaryType==="arraybuffer"){let buffer=new(this.useWin?this.useWin.ArrayBuffer:ArrayBuffer)(count);this._inputStreamBinary.readArrayBuffer(count,buffer);this.callListener("data",buffer);}else{this.callListener("data",this._inputStreamScriptable.read(count));}
},classID:Components.ID("{cda91b22-6472-11e1-aa11-834fec09cd0a}"),classInfo:XPCOMUtils.generateCI({classID:Components.ID("{cda91b22-6472-11e1-aa11-834fec09cd0a}"),contractID:"@mozilla.org/tcp-socket;1",classDescription:"Client TCP Socket",interfaces:[Ci.nsIDOMTCPSocket,],flags:Ci.nsIClassInfo.DOM_OBJECT,}),QueryInterface:XPCOMUtils.generateQI([Ci.nsIDOMTCPSocket,Ci.nsITCPSocketInternal,Ci.nsIDOMGlobalPropertyInitializer,Ci.nsIObserver,Ci.nsISupportsWeakReference])}
this.NSGetFactory=XPCOMUtils.generateNSGetFactory([TCPSocket]);