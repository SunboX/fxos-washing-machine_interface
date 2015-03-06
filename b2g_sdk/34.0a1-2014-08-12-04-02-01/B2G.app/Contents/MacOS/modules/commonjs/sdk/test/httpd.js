module.metadata={"stability":"experimental"};const{components,CC,Cc,Ci,Cr,Cu}=require("chrome");Cu.import("resource://gre/modules/XPCOMUtils.jsm");const PR_UINT32_MAX=Math.pow(2,32)-1;var DEBUG=false;var DEBUG_TIMESTAMP=false;var gGlobalObject=Cc["@mozilla.org/systemprincipal;1"].createInstance();function NS_ASSERT(cond,msg)
{if(DEBUG&&!cond)
{dumpn("###!!!");dumpn("###!!! ASSERTION"+(msg?": "+msg:"!"));dumpn("###!!! Stack follows:");var stack=new Error().stack.split(/\n/);dumpn(stack.map(function(val){return"###!!! "+val;}).join("\n"));throw Cr.NS_ERROR_ABORT;}}
function HttpError(code,description)
{this.code=code;this.description=description;}
HttpError.prototype={toString:function()
{return this.code+" "+this.description;}};const HTTP_400=new HttpError(400,"Bad Request");const HTTP_401=new HttpError(401,"Unauthorized");const HTTP_402=new HttpError(402,"Payment Required");const HTTP_403=new HttpError(403,"Forbidden");const HTTP_404=new HttpError(404,"Not Found");const HTTP_405=new HttpError(405,"Method Not Allowed");const HTTP_406=new HttpError(406,"Not Acceptable");const HTTP_407=new HttpError(407,"Proxy Authentication Required");const HTTP_408=new HttpError(408,"Request Timeout");const HTTP_409=new HttpError(409,"Conflict");const HTTP_410=new HttpError(410,"Gone");const HTTP_411=new HttpError(411,"Length Required");const HTTP_412=new HttpError(412,"Precondition Failed");const HTTP_413=new HttpError(413,"Request Entity Too Large");const HTTP_414=new HttpError(414,"Request-URI Too Long");const HTTP_415=new HttpError(415,"Unsupported Media Type");const HTTP_417=new HttpError(417,"Expectation Failed");const HTTP_500=new HttpError(500,"Internal Server Error");const HTTP_501=new HttpError(501,"Not Implemented");const HTTP_502=new HttpError(502,"Bad Gateway");const HTTP_503=new HttpError(503,"Service Unavailable");const HTTP_504=new HttpError(504,"Gateway Timeout");const HTTP_505=new HttpError(505,"HTTP Version Not Supported");function array2obj(arr)
{var obj={};for(var i=0;i<arr.length;i++)
obj[arr[i]]=arr[i];return obj;}
function range(x,y)
{var arr=[];for(var i=x;i<=y;i++)
arr.push(i);return arr;}
const HTTP_ERROR_CODES=array2obj(range(400,417).concat(range(500,505)));const HIDDEN_CHAR="^";const HEADERS_SUFFIX=HIDDEN_CHAR+"headers"+HIDDEN_CHAR;const SJS_TYPE="sjs";var firstStamp=0;function dumpn(str)
{if(DEBUG)
{var prefix="HTTPD-INFO | ";if(DEBUG_TIMESTAMP)
{if(firstStamp===0)
firstStamp=Date.now();var elapsed=Date.now()-firstStamp; var min=Math.floor(elapsed/60000);var sec=(elapsed%60000)/1000;if(sec<10)
prefix+=min+":0"+sec.toFixed(3)+" | ";else
prefix+=min+":"+sec.toFixed(3)+" | ";}
dump(prefix+str+"\n");}}
function dumpStack()
{var stack=new Error().stack.split(/\n/).slice(2);stack.forEach(dumpn);}
var gThreadManager=null;var gRootPrefBranch=null;function getRootPrefBranch()
{if(!gRootPrefBranch)
{gRootPrefBranch=Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);}
return gRootPrefBranch;}
const ServerSocket=CC("@mozilla.org/network/server-socket;1","nsIServerSocket","init");const ScriptableInputStream=CC("@mozilla.org/scriptableinputstream;1","nsIScriptableInputStream","init");const Pipe=CC("@mozilla.org/pipe;1","nsIPipe","init");const FileInputStream=CC("@mozilla.org/network/file-input-stream;1","nsIFileInputStream","init");const ConverterInputStream=CC("@mozilla.org/intl/converter-input-stream;1","nsIConverterInputStream","init");const WritablePropertyBag=CC("@mozilla.org/hash-property-bag;1","nsIWritablePropertyBag2");const SupportsString=CC("@mozilla.org/supports-string;1","nsISupportsString");var BinaryInputStream=CC("@mozilla.org/binaryinputstream;1","nsIBinaryInputStream","setInputStream");var BinaryOutputStream=CC("@mozilla.org/binaryoutputstream;1","nsIBinaryOutputStream","setOutputStream");function toDateString(date)
{



const wkdayStrings=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];const monthStrings=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];function toTime(date)
{var hrs=date.getUTCHours();var rv=(hrs<10)?"0"+hrs:hrs;var mins=date.getUTCMinutes();rv+=":";rv+=(mins<10)?"0"+mins:mins;var secs=date.getUTCSeconds();rv+=":";rv+=(secs<10)?"0"+secs:secs;return rv;}
function toDate1(date)
{var day=date.getUTCDate();var month=date.getUTCMonth();var year=date.getUTCFullYear();var rv=(day<10)?"0"+day:day;rv+=" "+monthStrings[month];rv+=" "+year;return rv;}
date=new Date(date);const fmtString="%wkday%, %date1% %time% GMT";var rv=fmtString.replace("%wkday%",wkdayStrings[date.getUTCDay()]);rv=rv.replace("%time%",toTime(date));return rv.replace("%date1%",toDate1(date));}
function printObj(o,showMembers)
{var s="******************************\n";s+="o = {\n";for(var i in o)
{if(typeof(i)!="string"||(showMembers||(i.length>0&&i[0]!="_")))
s+=" "+i+": "+o[i]+",\n";}
s+=" };\n";s+="******************************";dumpn(s);}
function nsHttpServer()
{if(!gThreadManager)
gThreadManager=Cc["@mozilla.org/thread-manager;1"].getService();this._port=undefined;this._socket=null;this._handler=new ServerHandler(this);this._identity=new ServerIdentity();this._doQuit=false;this._socketClosed=true;this._connectionGen=0;this._connections={};}
nsHttpServer.prototype={classID:components.ID("{54ef6f81-30af-4b1d-ac55-8ba811293e41}"),onSocketAccepted:function(socket,trans)
{dumpn("*** onSocketAccepted(socket="+socket+", trans="+trans+")");dumpn(">>> new connection on "+trans.host+":"+trans.port);const SEGMENT_SIZE=8192;const SEGMENT_COUNT=1024;try
{var input=trans.openInputStream(0,SEGMENT_SIZE,SEGMENT_COUNT).QueryInterface(Ci.nsIAsyncInputStream);var output=trans.openOutputStream(0,0,0);}
catch(e)
{dumpn("*** error opening transport streams: "+e);trans.close(Cr.NS_BINDING_ABORTED);return;}
var connectionNumber=++this._connectionGen;try
{var conn=new Connection(input,output,this,socket.port,trans.port,connectionNumber);var reader=new RequestReader(conn);

input.asyncWait(reader,0,0,gThreadManager.mainThread);}
catch(e)
{
dumpn("*** error in initial request-processing stages: "+e);trans.close(Cr.NS_BINDING_ABORTED);return;}
this._connections[connectionNumber]=conn;dumpn("*** starting connection "+connectionNumber);},onStopListening:function(socket,status)
{dumpn(">>> shutting down server on port "+socket.port);this._socketClosed=true;if(!this._hasOpenConnections())
{dumpn("*** no open connections, notifying async from onStopListening");
var self=this;var stopEvent={run:function()
{dumpn("*** _notifyStopped async callback");self._notifyStopped();}};gThreadManager.currentThread.dispatch(stopEvent,Ci.nsIThread.DISPATCH_NORMAL);}},

start:function(port)
{this._start(port,"localhost")},_start:function(port,host)
{if(this._socket)
throw Cr.NS_ERROR_ALREADY_INITIALIZED;this._port=port;this._doQuit=this._socketClosed=false;this._host=host;

var prefs=getRootPrefBranch();var maxConnections;try{maxConnections=prefs.getIntPref("network.http.max-persistent-connections-per-server")+5;}
catch(e){maxConnections=prefs.getIntPref("network.http.max-connections-per-server")+5;}
try
{var loopback=true;if(this._host!="127.0.0.1"&&this._host!="localhost"){var loopback=false;}
var socket=new ServerSocket(this._port,loopback, maxConnections);dumpn(">>> listening on port "+socket.port+", "+maxConnections+" pending connections");socket.asyncListen(this);this._identity._initialize(socket.port,host,true);this._socket=socket;}
catch(e)
{dumpn("!!! could not start server on port "+port+": "+e);throw Cr.NS_ERROR_NOT_AVAILABLE;}},
stop:function(callback)
{if(!callback)
throw Cr.NS_ERROR_NULL_POINTER;if(!this._socket)
throw Cr.NS_ERROR_UNEXPECTED;this._stopCallback=typeof callback==="function"?callback:function(){callback.onStopped();};dumpn(">>> stopping listening on port "+this._socket.port);this._socket.close();this._socket=null;
this._identity._teardown();this._doQuit=false;},
registerFile:function(path,file)
{if(file&&(!file.exists()||file.isDirectory()))
throw Cr.NS_ERROR_INVALID_ARG;this._handler.registerFile(path,file);},
registerDirectory:function(path,directory)
{if(path.charAt(0)!="/"||path.charAt(path.length-1)!="/"||(directory&&(!directory.exists()||!directory.isDirectory())))
throw Cr.NS_ERROR_INVALID_ARG;
this._handler.registerDirectory(path,directory);},
registerPathHandler:function(path,handler)
{this._handler.registerPathHandler(path,handler);},
registerPrefixHandler:function(prefix,handler)
{this._handler.registerPrefixHandler(prefix,handler);},
registerErrorHandler:function(code,handler)
{this._handler.registerErrorHandler(code,handler);},
setIndexHandler:function(handler)
{this._handler.setIndexHandler(handler);},
registerContentType:function(ext,type)
{this._handler.registerContentType(ext,type);},
get identity()
{return this._identity;},
getState:function(path,k)
{return this._handler._getState(path,k);},
setState:function(path,k,v)
{return this._handler._setState(path,k,v);},
getSharedState:function(k)
{return this._handler._getSharedState(k);},
setSharedState:function(k,v)
{return this._handler._setSharedState(k,v);},
getObjectState:function(k)
{return this._handler._getObjectState(k);},
setObjectState:function(k,v)
{return this._handler._setObjectState(k,v);},

QueryInterface:function(iid)
{if(iid.equals(Ci.nsIServerSocketListener)||iid.equals(Ci.nsISupports))
return this;throw Cr.NS_ERROR_NO_INTERFACE;},isStopped:function()
{return this._socketClosed&&!this._hasOpenConnections();},_hasOpenConnections:function()
{



for(var n in this._connections)
return true;return false;},_notifyStopped:function()
{NS_ASSERT(this._stopCallback!==null,"double-notifying?");NS_ASSERT(!this._hasOpenConnections(),"should be done serving by now");



var callback=this._stopCallback;this._stopCallback=null;try
{callback();}
catch(e)
{
 dump("!!! error running onStopped callback: "+e+"\n");}},_connectionClosed:function(connection)
{NS_ASSERT(connection.number in this._connections,"closing a connection "+this+" that we never added to the "+"set of open connections?");NS_ASSERT(this._connections[connection.number]===connection,"connection number mismatch? "+
this._connections[connection.number]);delete this._connections[connection.number];if(!this._hasOpenConnections()&&this._socketClosed)
this._notifyStopped();},_requestQuit:function()
{dumpn(">>> requesting a quit");dumpStack();this._doQuit=true;}};




const HOST_REGEX=new RegExp("^(?:"+
"(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)*"+
"[a-z](?:[a-z0-9-]*[a-z0-9])?"+"|"+
"\\d+\\.\\d+\\.\\d+\\.\\d+"+")$","i");function ServerIdentity()
{this._primaryScheme="http";this._primaryHost="127.0.0.1"
this._primaryPort=-1;this._defaultPort=-1;this._locations={"xlocalhost":{}};}
ServerIdentity.prototype={

get primaryScheme()
{if(this._primaryPort===-1)
throw Cr.NS_ERROR_NOT_INITIALIZED;return this._primaryScheme;},
get primaryHost()
{if(this._primaryPort===-1)
throw Cr.NS_ERROR_NOT_INITIALIZED;return this._primaryHost;},
get primaryPort()
{if(this._primaryPort===-1)
throw Cr.NS_ERROR_NOT_INITIALIZED;return this._primaryPort;},
add:function(scheme,host,port)
{this._validate(scheme,host,port);var entry=this._locations["x"+host];if(!entry)
this._locations["x"+host]=entry={};entry[port]=scheme;},
remove:function(scheme,host,port)
{this._validate(scheme,host,port);var entry=this._locations["x"+host];if(!entry)
return false;var present=port in entry;delete entry[port];if(this._primaryScheme==scheme&&this._primaryHost==host&&this._primaryPort==port&&this._defaultPort!==-1)
{
this._primaryPort=-1;this._initialize(this._defaultPort,host,false);}
return present;},
has:function(scheme,host,port)
{this._validate(scheme,host,port);return"x"+host in this._locations&&scheme===this._locations["x"+host][port];},
getScheme:function(host,port)
{this._validate("http",host,port);var entry=this._locations["x"+host];if(!entry)
return"";return entry[port]||"";},
setPrimary:function(scheme,host,port)
{this._validate(scheme,host,port);this.add(scheme,host,port);this._primaryScheme=scheme;this._primaryHost=host;this._primaryPort=port;},

QueryInterface:function(iid)
{if(iid.equals(Ci.nsIHttpServerIdentity)||iid.equals(Ci.nsISupports))
return this;throw Cr.NS_ERROR_NO_INTERFACE;},_initialize:function(port,host,addSecondaryDefault)
{this._host=host;if(this._primaryPort!==-1)
this.add("http",host,port);else
this.setPrimary("http","localhost",port);this._defaultPort=port; if(addSecondaryDefault&&host!="127.0.0.1")
this.add("http","127.0.0.1",port);},_teardown:function()
{if(this._host!="127.0.0.1"){ this.remove("http","127.0.0.1",this._defaultPort);}

if(this._primaryScheme=="http"&&this._primaryHost==this._host&&this._primaryPort==this._defaultPort)
{
var port=this._defaultPort;this._defaultPort=-1;this.remove("http",this._host,port);this._primaryPort=-1;}
else
{ this.remove("http",this._host,this._defaultPort);}},_validate:function(scheme,host,port)
{if(scheme!=="http"&&scheme!=="https")
{dumpn("*** server only supports http/https schemes: '"+scheme+"'");dumpStack();throw Cr.NS_ERROR_ILLEGAL_VALUE;}
if(!HOST_REGEX.test(host))
{dumpn("*** unexpected host: '"+host+"'");throw Cr.NS_ERROR_ILLEGAL_VALUE;}
if(port<0||port>65535)
{dumpn("*** unexpected port: '"+port+"'");throw Cr.NS_ERROR_ILLEGAL_VALUE;}}};function Connection(input,output,server,port,outgoingPort,number)
{dumpn("*** opening new connection "+number+" on port "+outgoingPort);this.input=input;this.output=output;this.server=server;this.port=port;this._outgoingPort=outgoingPort;this.number=number;this.request=null;this._closed=this._processed=false;}
Connection.prototype={close:function()
{dumpn("*** closing connection "+this.number+" on port "+this._outgoingPort);this.input.close();this.output.close();this._closed=true;var server=this.server;server._connectionClosed(this); if(server._doQuit)
server.stop(function(){});},process:function(request)
{NS_ASSERT(!this._closed&&!this._processed);this._processed=true;this.request=request;this.server._handler.handleResponse(this);},processError:function(code,request)
{NS_ASSERT(!this._closed&&!this._processed);this._processed=true;this.request=request;this.server._handler.handleError(code,this);},toString:function()
{return"<Connection("+this.number+
(this.request?", "+this.request.path:"")+"): "+
(this._closed?"closed":"open")+">";}};function readBytes(inputStream,count)
{return new BinaryInputStream(inputStream).readByteArray(count);}
const READER_IN_REQUEST_LINE=0;const READER_IN_HEADERS=1;const READER_IN_BODY=2;const READER_FINISHED=3;function RequestReader(connection)
{this._connection=connection;this._data=new LineData();this._contentLength=0;this._state=READER_IN_REQUEST_LINE;this._metadata=new Request(connection.port);this._lastHeaderName=this._lastHeaderValue=undefined;}
RequestReader.prototype={onInputStreamReady:function(input)
{dumpn("*** onInputStreamReady(input="+input+") on thread "+
gThreadManager.currentThread+" (main is "+
gThreadManager.mainThread+")");dumpn("*** this._state == "+this._state);
var data=this._data;if(!data)
return;try
{data.appendBytes(readBytes(input,input.available()));}
catch(e)
{if(streamClosed(e))
{dumpn("*** WARNING: unexpected error when reading from socket; will "+"be treated as if the input stream had been closed");dumpn("*** WARNING: actual error was: "+e);}


dumpn("*** onInputStreamReady called on a closed input, destroying "+"connection");this._connection.close();return;}
switch(this._state)
{default:NS_ASSERT(false,"invalid state: "+this._state);break;case READER_IN_REQUEST_LINE:if(!this._processRequestLine())
break;case READER_IN_HEADERS:if(!this._processHeaders())
break;case READER_IN_BODY:this._processBody();}
if(this._state!=READER_FINISHED)
input.asyncWait(this,0,0,gThreadManager.currentThread);},
QueryInterface:function(aIID)
{if(aIID.equals(Ci.nsIInputStreamCallback)||aIID.equals(Ci.nsISupports))
return this;throw Cr.NS_ERROR_NO_INTERFACE;},_processRequestLine:function()
{NS_ASSERT(this._state==READER_IN_REQUEST_LINE);
var data=this._data;var line={};var readSuccess;while((readSuccess=data.readLine(line))&&line.value=="")
dumpn("*** ignoring beginning blank line..."); if(!readSuccess)
return false; try
{this._parseRequestLine(line.value);this._state=READER_IN_HEADERS;return true;}
catch(e)
{this._handleError(e);return false;}},_processHeaders:function()
{NS_ASSERT(this._state==READER_IN_HEADERS); try
{var done=this._parseHeaders();if(done)
{var request=this._metadata;

this._contentLength=request.hasHeader("Content-Length")?parseInt(request.getHeader("Content-Length"),10):0;dumpn("_processHeaders, Content-length="+this._contentLength);this._state=READER_IN_BODY;}
return done;}
catch(e)
{this._handleError(e);return false;}},_processBody:function()
{NS_ASSERT(this._state==READER_IN_BODY);try
{if(this._contentLength>0)
{var data=this._data.purge();var count=Math.min(data.length,this._contentLength);dumpn("*** loading data="+data+" len="+data.length+" excess="+(data.length-count));var bos=new BinaryOutputStream(this._metadata._bodyOutputStream);bos.writeByteArray(data,count);this._contentLength-=count;}
dumpn("*** remaining body data len="+this._contentLength);if(this._contentLength==0)
{this._validateRequest();this._state=READER_FINISHED;this._handleResponse();return true;}
return false;}
catch(e)
{this._handleError(e);return false;}},_validateRequest:function()
{NS_ASSERT(this._state==READER_IN_BODY);dumpn("*** _validateRequest");var metadata=this._metadata;var headers=metadata._headers; var identity=this._connection.server.identity;if(metadata._httpVersion.atLeast(nsHttpVersion.HTTP_1_1))
{if(!headers.hasHeader("Host"))
{dumpn("*** malformed HTTP/1.1 or greater request with no Host header!");throw HTTP_400;}


if(!metadata._host)
{var host,port;var hostPort=headers.getHeader("Host");var colon=hostPort.indexOf(":");if(colon<0)
{host=hostPort;port="";}
else
{host=hostPort.substring(0,colon);port=hostPort.substring(colon+1);}


if(!HOST_REGEX.test(host)||!/^\d*$/.test(port))
{dumpn("*** malformed hostname ("+hostPort+") in Host "+"header, 400 time");throw HTTP_400;}




port=+port||80;var scheme=identity.getScheme(host,port);if(!scheme)
{dumpn("*** unrecognized hostname ("+hostPort+") in Host "+"header, 400 time");throw HTTP_400;}
metadata._scheme=scheme;metadata._host=host;metadata._port=port;}}
else
{NS_ASSERT(metadata._host===undefined,"HTTP/1.0 doesn't allow absolute paths in the request line!");metadata._scheme=identity.primaryScheme;metadata._host=identity.primaryHost;metadata._port=identity.primaryPort;}
NS_ASSERT(identity.has(metadata._scheme,metadata._host,metadata._port),"must have a location we recognize by now!");},_handleError:function(e)
{this._state=READER_FINISHED;var server=this._connection.server;if(e instanceof HttpError)
{var code=e.code;}
else
{dumpn("!!! UNEXPECTED ERROR: "+e+
(e.lineNumber?", line "+e.lineNumber:"")); code=500;server._requestQuit();} 
this._data=null;this._connection.processError(code,this._metadata);},_handleResponse:function()
{NS_ASSERT(this._state==READER_FINISHED);
this._data=null;this._connection.process(this._metadata);},_parseRequestLine:function(line)
{NS_ASSERT(this._state==READER_IN_REQUEST_LINE);dumpn("*** _parseRequestLine('"+line+"')");var metadata=this._metadata;
var request=line.split(/[ \t]+/);if(!request||request.length!=3)
throw HTTP_400;metadata._method=request[0]; var ver=request[2];var match=ver.match(/^HTTP\/(\d+\.\d+)$/);if(!match)
throw HTTP_400; try
{metadata._httpVersion=new nsHttpVersion(match[1]);if(!metadata._httpVersion.atLeast(nsHttpVersion.HTTP_1_0))
throw"unsupported HTTP version";}
catch(e)
{ throw HTTP_501;}
var fullPath=request[1];var serverIdentity=this._connection.server.identity;var scheme,host,port;if(fullPath.charAt(0)!="/")
{ if(!metadata._httpVersion.atLeast(nsHttpVersion.HTTP_1_1))
throw HTTP_400;try
{var uri=Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService).newURI(fullPath,null,null);fullPath=uri.path;scheme=uri.scheme;host=metadata._host=uri.asciiHost;port=uri.port;if(port===-1)
{if(scheme==="http")
port=80;else if(scheme==="https")
port=443;else
throw HTTP_400;}}
catch(e)
{

throw HTTP_400;}
if(!serverIdentity.has(scheme,host,port)||fullPath.charAt(0)!="/")
throw HTTP_400;}
var splitter=fullPath.indexOf("?");if(splitter<0)
{ metadata._path=fullPath;}
else
{metadata._path=fullPath.substring(0,splitter);metadata._queryString=fullPath.substring(splitter+1);}
metadata._scheme=scheme;metadata._host=host;metadata._port=port;},_parseHeaders:function()
{NS_ASSERT(this._state==READER_IN_HEADERS);dumpn("*** _parseHeaders");var data=this._data;var headers=this._metadata._headers;var lastName=this._lastHeaderName;var lastVal=this._lastHeaderValue;var line={};while(true)
{NS_ASSERT(!((lastVal===undefined)^(lastName===undefined)),lastName===undefined?"lastVal without lastName? lastVal: '"+lastVal+"'":"lastName without lastVal? lastName: '"+lastName+"'");if(!data.readLine(line))
{ this._lastHeaderName=lastName;this._lastHeaderValue=lastVal;return false;}
var lineText=line.value;var firstChar=lineText.charAt(0); if(lineText=="")
{ if(lastName)
{try
{headers.setHeader(lastName,lastVal,true);}
catch(e)
{dumpn("*** e == "+e);throw HTTP_400;}}
else
{} 
this._state=READER_IN_BODY;return true;}
else if(firstChar==" "||firstChar=="\t")
{ if(!lastName)
{throw HTTP_400;}
 
lastVal+=lineText;}
else
{if(lastName)
{try
{headers.setHeader(lastName,lastVal,true);}
catch(e)
{dumpn("*** e == "+e);throw HTTP_400;}}
var colon=lineText.indexOf(":"); if(colon<1)
{ throw HTTP_400;}
lastName=lineText.substring(0,colon);lastVal=lineText.substring(colon+1);}
}
}};const CR=0x0D,LF=0x0A;function findCRLF(array)
{for(var i=array.indexOf(CR);i>=0;i=array.indexOf(CR,i+1))
{if(array[i+1]==LF)
return i;}
return-1;}
function LineData()
{this._data=[];}
LineData.prototype={appendBytes:function(bytes)
{Array.prototype.push.apply(this._data,bytes);},readLine:function(out)
{var data=this._data;var length=findCRLF(data);if(length<0)
return false;




var line=String.fromCharCode.apply(null,data.splice(0,length+2));out.value=line.substring(0,length);return true;},purge:function()
{var data=this._data;this._data=[];return data;}};function createHandlerFunc(handler)
{return function(metadata,response){handler.handle(metadata,response);};}
function defaultIndexHandler(metadata,response)
{response.setHeader("Content-Type","text/html",false);var path=htmlEscape(decodeURI(metadata.path));

var body='<html>\
<head>\
<title>'+path+'</title>\
</head>\
<body>\
<h1>'+path+'</h1>\
<ol style="list-style-type: none">';var directory=metadata.getProperty("directory").QueryInterface(Ci.nsILocalFile);NS_ASSERT(directory&&directory.isDirectory());var fileList=[];var files=directory.directoryEntries;while(files.hasMoreElements())
{var f=files.getNext().QueryInterface(Ci.nsIFile);var name=f.leafName;if(!f.isHidden()&&(name.charAt(name.length-1)!=HIDDEN_CHAR||name.charAt(name.length-2)==HIDDEN_CHAR))
fileList.push(f);}
fileList.sort(fileSort);for(var i=0;i<fileList.length;i++)
{var file=fileList[i];try
{var name=file.leafName;if(name.charAt(name.length-1)==HIDDEN_CHAR)
name=name.substring(0,name.length-1);var sep=file.isDirectory()?"/":"";
var item='<li><a href="'+encodeURIComponent(name)+sep+'">'+
htmlEscape(name)+sep+'</a></li>';body+=item;}
catch(e){}}
body+=' </ol>\
</body>\
</html>';response.bodyOutputStream.write(body,body.length);}
function fileSort(a,b)
{var dira=a.isDirectory(),dirb=b.isDirectory();if(dira&&!dirb)
return-1;if(dirb&&!dira)
return 1;var namea=a.leafName.toLowerCase(),nameb=b.leafName.toLowerCase();return nameb>namea?-1:1;}
function toInternalPath(path,encoded)
{if(encoded)
path=decodeURI(path);var comps=path.split("/");for(var i=0,sz=comps.length;i<sz;i++)
{var comp=comps[i];if(comp.charAt(comp.length-1)==HIDDEN_CHAR)
comps[i]=comp+HIDDEN_CHAR;}
return comps.join("/");}
function maybeAddHeaders(file,metadata,response)
{var name=file.leafName;if(name.charAt(name.length-1)==HIDDEN_CHAR)
name=name.substring(0,name.length-1);var headerFile=file.parent;headerFile.append(name+HEADERS_SUFFIX);if(!headerFile.exists())
return;const PR_RDONLY=0x01;var fis=new FileInputStream(headerFile,PR_RDONLY,parseInt("444",8),Ci.nsIFileInputStream.CLOSE_ON_EOF);try
{var lis=new ConverterInputStream(fis,"UTF-8",1024,0x0);lis.QueryInterface(Ci.nsIUnicharLineInputStream);var line={value:""};var more=lis.readLine(line);if(!more&&line.value=="")
return; var status=line.value;if(status.indexOf("HTTP ")==0)
{status=status.substring(5);var space=status.indexOf(" ");var code,description;if(space<0)
{code=status;description="";}
else
{code=status.substring(0,space);description=status.substring(space+1,status.length);}
response.setStatusLine(metadata.httpVersion,parseInt(code,10),description);line.value="";more=lis.readLine(line);} 
while(more||line.value!="")
{var header=line.value;var colon=header.indexOf(":");response.setHeader(header.substring(0,colon),header.substring(colon+1,header.length),false); line.value="";more=lis.readLine(line);}}
catch(e)
{dumpn("WARNING: error in headers for "+metadata.path+": "+e);throw HTTP_500;}
finally
{fis.close();}}
function ServerHandler(server)
{this._server=server;this._pathDirectoryMap=new FileMap();this._overridePaths={};this._overridePrefixes={};this._overrideErrors={};this._mimeMappings={};this._indexHandler=defaultIndexHandler;this._state={};this._sharedState={};this._objectState={};}
ServerHandler.prototype={handleResponse:function(connection)
{var request=connection.request;var response=new Response(connection);var path=request.path;dumpn("*** path == "+path);try
{try
{if(path in this._overridePaths)
{ dumpn("calling override for "+path);this._overridePaths[path](request,response);}
else
{let longestPrefix="";for(let prefix in this._overridePrefixes)
{if(prefix.length>longestPrefix.length&&path.startsWith(prefix))
{longestPrefix=prefix;}}
if(longestPrefix.length>0)
{dumpn("calling prefix override for "+longestPrefix);this._overridePrefixes[longestPrefix](request,response);}
else
{this._handleDefault(request,response);}}}
catch(e)
{if(response.partiallySent())
{response.abort(e);return;}
if(!(e instanceof HttpError))
{dumpn("*** unexpected error: e == "+e);throw HTTP_500;}
if(e.code!==404)
throw e;dumpn("*** default: "+(path in this._defaultPaths));response=new Response(connection);if(path in this._defaultPaths)
this._defaultPaths[path](request,response);else
throw HTTP_404;}}
catch(e)
{if(response.partiallySent())
{response.abort(e);return;}
var errorCode="internal";try
{if(!(e instanceof HttpError))
throw e;errorCode=e.code;dumpn("*** errorCode == "+errorCode);response=new Response(connection);if(e.customErrorHandling)
e.customErrorHandling(response);this._handleError(errorCode,request,response);return;}
catch(e2)
{dumpn("*** error handling "+errorCode+" error: "+"e2 == "+e2+", shutting down server");connection.server._requestQuit();response.abort(e2);return;}}
response.complete();},
registerFile:function(path,file)
{if(!file)
{dumpn("*** unregistering '"+path+"' mapping");delete this._overridePaths[path];return;}
dumpn("*** registering '"+path+"' as mapping to "+file.path);file=file.clone();var self=this;this._overridePaths[path]=function(request,response)
{if(!file.exists())
throw HTTP_404;response.setStatusLine(request.httpVersion,200,"OK");self._writeFileResponse(request,file,response,0,file.fileSize);};},
registerPathHandler:function(path,handler)
{if(path.charAt(0)!="/")
throw Cr.NS_ERROR_INVALID_ARG;this._handlerToField(handler,this._overridePaths,path);},
registerPrefixHandler:function(prefix,handler)
{if(!(prefix.startsWith("/")&&prefix.endsWith("/")))
throw Cr.NS_ERROR_INVALID_ARG;this._handlerToField(handler,this._overridePrefixes,prefix);},
registerDirectory:function(path,directory)
{

 var key=path.length==1?"":path.substring(1,path.length-1);
 if(key.charAt(0)=="/")
throw Cr.NS_ERROR_INVALID_ARG;key=toInternalPath(key,false);if(directory)
{dumpn("*** mapping '"+path+"' to the location "+directory.path);this._pathDirectoryMap.put(key,directory);}
else
{dumpn("*** removing mapping for '"+path+"'");this._pathDirectoryMap.put(key,null);}},
registerErrorHandler:function(err,handler)
{if(!(err in HTTP_ERROR_CODES))
dumpn("*** WARNING: registering non-HTTP/1.1 error code "+"("+err+") handler -- was this intentional?");this._handlerToField(handler,this._overrideErrors,err);},
setIndexHandler:function(handler)
{if(!handler)
handler=defaultIndexHandler;else if(typeof(handler)!="function")
handler=createHandlerFunc(handler);this._indexHandler=handler;},
registerContentType:function(ext,type)
{if(!type)
delete this._mimeMappings[ext];else
this._mimeMappings[ext]=headerUtils.normalizeFieldValue(type);},_handlerToField:function(handler,dict,key)
{ if(typeof(handler)=="function")
dict[key]=handler;else if(handler)
dict[key]=createHandlerFunc(handler);else
delete dict[key];},_handleDefault:function(metadata,response)
{dumpn("*** _handleDefault()");response.setStatusLine(metadata.httpVersion,200,"OK");var path=metadata.path;NS_ASSERT(path.charAt(0)=="/","invalid path: <"+path+">");
 var file=this._getFileForPath(path);
 if(file.exists()&&file.isDirectory())
{file.append("index.html");if(!file.exists()||file.isDirectory())
{metadata._ensurePropertyBag();metadata._bag.setPropertyAsInterface("directory",file.parent);this._indexHandler(metadata,response);return;}} 
if(!file.exists())
throw HTTP_404;var start,end;if(metadata._httpVersion.atLeast(nsHttpVersion.HTTP_1_1)&&metadata.hasHeader("Range")&&this._getTypeFromFile(file)!==SJS_TYPE)
{var rangeMatch=metadata.getHeader("Range").match(/^bytes=(\d+)?-(\d+)?$/);if(!rangeMatch)
throw HTTP_400;if(rangeMatch[1]!==undefined)
start=parseInt(rangeMatch[1],10);if(rangeMatch[2]!==undefined)
end=parseInt(rangeMatch[2],10);if(start===undefined&&end===undefined)
throw HTTP_400;
if(start===undefined)
{start=Math.max(0,file.fileSize-end);end=file.fileSize-1;} 
if(end===undefined||end>=file.fileSize)
end=file.fileSize-1;if(start!==undefined&&start>=file.fileSize){var HTTP_416=new HttpError(416,"Requested Range Not Satisfiable");HTTP_416.customErrorHandling=function(errorResponse)
{maybeAddHeaders(file,metadata,errorResponse);};throw HTTP_416;}
if(end<start)
{response.setStatusLine(metadata.httpVersion,200,"OK");start=0;end=file.fileSize-1;}
else
{response.setStatusLine(metadata.httpVersion,206,"Partial Content");var contentRange="bytes "+start+"-"+end+"/"+file.fileSize;response.setHeader("Content-Range",contentRange);}}
else
{start=0;end=file.fileSize-1;}
dumpn("*** handling '"+path+"' as mapping to "+file.path+" from "+
start+" to "+end+" inclusive");this._writeFileResponse(metadata,file,response,start,end-start+1);},_writeFileResponse:function(metadata,file,response,offset,count)
{const PR_RDONLY=0x01;var type=this._getTypeFromFile(file);if(type===SJS_TYPE)
{var fis=new FileInputStream(file,PR_RDONLY,parseInt("444",8),Ci.nsIFileInputStream.CLOSE_ON_EOF);try
{var sis=new ScriptableInputStream(fis);var s=Cu.Sandbox(gGlobalObject);s.importFunction(dump,"dump");
var self=this;var path=metadata.path;s.importFunction(function getState(k)
{return self._getState(path,k);});s.importFunction(function setState(k,v)
{self._setState(path,k,v);});s.importFunction(function getSharedState(k)
{return self._getSharedState(k);});s.importFunction(function setSharedState(k,v)
{self._setSharedState(k,v);});s.importFunction(function getObjectState(k,callback)
{callback(self._getObjectState(k));});s.importFunction(function setObjectState(k,v)
{self._setObjectState(k,v);});s.importFunction(function registerPathHandler(p,h)
{self.registerPathHandler(p,h);}); this._setState(path,"__LOCATION__",file.path);try
{


var line=new Error().lineNumber;Cu.evalInSandbox(sis.read(file.fileSize),s);}
catch(e)
{dumpn("*** syntax error in SJS at "+file.path+": "+e);throw HTTP_500;}
try
{s.handleRequest(metadata,response);}
catch(e)
{dump("*** error running SJS at "+file.path+": "+
e+" on line "+
(e instanceof Error?e.lineNumber+" in httpd.js":(e.lineNumber-line))+"\n");throw HTTP_500;}}
finally
{fis.close();}}
else
{try
{response.setHeader("Last-Modified",toDateString(file.lastModifiedTime),false);}
catch(e){}
response.setHeader("Content-Type",type,false);maybeAddHeaders(file,metadata,response);response.setHeader("Content-Length",""+count,false);var fis=new FileInputStream(file,PR_RDONLY,parseInt("444",8),Ci.nsIFileInputStream.CLOSE_ON_EOF);offset=offset||0;count=count||file.fileSize;NS_ASSERT(offset===0||offset<file.fileSize,"bad offset");NS_ASSERT(count>=0,"bad count");NS_ASSERT(offset+count<=file.fileSize,"bad total data size");try
{if(offset!==0)
{
if(fis instanceof Ci.nsISeekableStream)
fis.seek(Ci.nsISeekableStream.NS_SEEK_SET,offset);else
new ScriptableInputStream(fis).read(offset);}}
catch(e)
{fis.close();throw e;}
let writeMore=function writeMore()
{gThreadManager.currentThread.dispatch(writeData,Ci.nsIThread.DISPATCH_NORMAL);}
var input=new BinaryInputStream(fis);var output=new BinaryOutputStream(response.bodyOutputStream);var writeData={run:function()
{var chunkSize=Math.min(65536,count);count-=chunkSize;NS_ASSERT(count>=0,"underflow");try
{var data=input.readByteArray(chunkSize);NS_ASSERT(data.length===chunkSize,"incorrect data returned? got "+data.length+", expected "+chunkSize);output.writeByteArray(data,data.length);if(count===0)
{fis.close();response.finish();}
else
{writeMore();}}
catch(e)
{try
{fis.close();}
finally
{response.finish();}
throw e;}}};writeMore();response.processAsync();}},_getState:function(path,k)
{var state=this._state;if(path in state&&k in state[path])
return state[path][k];return"";},_setState:function(path,k,v)
{if(typeof v!=="string")
throw new Error("non-string value passed");var state=this._state;if(!(path in state))
state[path]={};state[path][k]=v;},_getSharedState:function(k)
{var state=this._sharedState;if(k in state)
return state[k];return"";},_setSharedState:function(k,v)
{if(typeof v!=="string")
throw new Error("non-string value passed");this._sharedState[k]=v;},_getObjectState:function(k)
{if(typeof k!=="string")
throw new Error("non-string key passed");return this._objectState[k]||null;},_setObjectState:function(k,v)
{if(typeof k!=="string")
throw new Error("non-string key passed");if(typeof v!=="object")
throw new Error("non-object value passed");if(v&&!("QueryInterface"in v))
{throw new Error("must pass an nsISupports; use wrappedJSObject to ease "+"pain when using the server from JS");}
this._objectState[k]=v;},_getTypeFromFile:function(file)
{try
{var name=file.leafName;var dot=name.lastIndexOf(".");if(dot>0)
{var ext=name.slice(dot+1);if(ext in this._mimeMappings)
return this._mimeMappings[ext];}
return Cc["@mozilla.org/uriloader/external-helper-app-service;1"].getService(Ci.nsIMIMEService).getTypeFromFile(file);}
catch(e)
{return"application/octet-stream";}},_getFileForPath:function(path)
{ try
{path=toInternalPath(path,true);}
catch(e)
{throw HTTP_400;} 
var pathMap=this._pathDirectoryMap;var tmp=path.substring(1);while(true)
{var file=pathMap.get(tmp);if(file)
{


 if(tmp==path.substring(1)&&tmp.length!=0&&tmp.charAt(tmp.length-1)!="/")
file=null;else
break;} 
if(tmp=="")
break;tmp=tmp.substring(0,tmp.lastIndexOf("/"));} 
if(!file)
throw HTTP_404; var parentFolder=file.parent;var dirIsRoot=(parentFolder==null);


 var leafPath=path.substring(tmp.length+1);var comps=leafPath.split("/");for(var i=0,sz=comps.length;i<sz;i++)
{var comp=comps[i];if(comp=="..")
file=file.parent;else if(comp=="."||comp=="")
continue;else
file.append(comp);if(!dirIsRoot&&file.equals(parentFolder))
throw HTTP_403;}
return file;},handleError:function(errorCode,connection)
{var response=new Response(connection);dumpn("*** error in request: "+errorCode);this._handleError(errorCode,new Request(connection.port),response);},_handleError:function(errorCode,metadata,response)
{if(!metadata)
throw Cr.NS_ERROR_NULL_POINTER;var errorX00=errorCode-(errorCode%100);try
{if(!(errorCode in HTTP_ERROR_CODES))
dumpn("*** WARNING: requested invalid error: "+errorCode);



 try
{if(errorCode in this._overrideErrors)
this._overrideErrors[errorCode](metadata,response);else
this._defaultErrors[errorCode](metadata,response);}
catch(e)
{if(response.partiallySent())
{response.abort(e);return;} 
if(errorX00==errorCode)
throw HTTP_500;dumpn("*** error in handling for error code "+errorCode+", "+"falling back to "+errorX00+"...");response=new Response(response._connection);if(errorX00 in this._overrideErrors)
this._overrideErrors[errorX00](metadata,response);else if(errorX00 in this._defaultErrors)
this._defaultErrors[errorX00](metadata,response);else
throw HTTP_500;}}
catch(e)
{if(response.partiallySent())
{response.abort();return;} 
dumpn("*** error in handling for error code "+errorX00+", falling "+"back to 500...");try
{response=new Response(response._connection);if(500 in this._overrideErrors)
this._overrideErrors[500](metadata,response);else
this._defaultErrors[500](metadata,response);}
catch(e2)
{dumpn("*** multiple errors in default error handlers!");dumpn("*** e == "+e+", e2 == "+e2);response.abort(e2);return;}}
response.complete();},_defaultErrors:{400:function(metadata,response)
{ response.setStatusLine("1.1",400,"Bad Request");response.setHeader("Content-Type","text/plain",false);var body="Bad request\n";response.bodyOutputStream.write(body,body.length);},403:function(metadata,response)
{response.setStatusLine(metadata.httpVersion,403,"Forbidden");response.setHeader("Content-Type","text/html",false);var body="<html>\
<head><title>403 Forbidden</title></head>\
<body>\
<h1>403 Forbidden</h1>\
</body>\
</html>";response.bodyOutputStream.write(body,body.length);},404:function(metadata,response)
{response.setStatusLine(metadata.httpVersion,404,"Not Found");response.setHeader("Content-Type","text/html",false);var body="<html>\
<head><title>404 Not Found</title></head>\
<body>\
<h1>404 Not Found</h1>\
<p>\
<span style='font-family: monospace;'>"+
htmlEscape(metadata.path)+"</span> was not found.\
</p>\
</body>\
</html>";response.bodyOutputStream.write(body,body.length);},416:function(metadata,response)
{response.setStatusLine(metadata.httpVersion,416,"Requested Range Not Satisfiable");response.setHeader("Content-Type","text/html",false);var body="<html>\
<head>\
<title>416 Requested Range Not Satisfiable</title></head>\
<body>\
<h1>416 Requested Range Not Satisfiable</h1>\
<p>The byte range was not valid for the\
requested resource.\
</p>\
</body>\
</html>";response.bodyOutputStream.write(body,body.length);},500:function(metadata,response)
{response.setStatusLine(metadata.httpVersion,500,"Internal Server Error");response.setHeader("Content-Type","text/html",false);var body="<html>\
<head><title>500 Internal Server Error</title></head>\
<body>\
<h1>500 Internal Server Error</h1>\
<p>Something's broken in this server and\
needs to be fixed.</p>\
</body>\
</html>";response.bodyOutputStream.write(body,body.length);},501:function(metadata,response)
{response.setStatusLine(metadata.httpVersion,501,"Not Implemented");response.setHeader("Content-Type","text/html",false);var body="<html>\
<head><title>501 Not Implemented</title></head>\
<body>\
<h1>501 Not Implemented</h1>\
<p>This server is not (yet) Apache.</p>\
</body>\
</html>";response.bodyOutputStream.write(body,body.length);},505:function(metadata,response)
{response.setStatusLine("1.1",505,"HTTP Version Not Supported");response.setHeader("Content-Type","text/html",false);var body="<html>\
<head><title>505 HTTP Version Not Supported</title></head>\
<body>\
<h1>505 HTTP Version Not Supported</h1>\
<p>This server only supports HTTP/1.0 and HTTP/1.1\
connections.</p>\
</body>\
</html>";response.bodyOutputStream.write(body,body.length);}},_defaultPaths:{"/":function(metadata,response)
{response.setStatusLine(metadata.httpVersion,200,"OK");response.setHeader("Content-Type","text/html",false);var body="<html>\
<head><title>httpd.js</title></head>\
<body>\
<h1>httpd.js</h1>\
<p>If you're seeing this page, httpd.js is up and\
serving requests! Now set a base path and serve some\
files!</p>\
</body>\
</html>";response.bodyOutputStream.write(body,body.length);},"/trace":function(metadata,response)
{response.setStatusLine(metadata.httpVersion,200,"OK");response.setHeader("Content-Type","text/plain",false);var body="Request-URI: "+
metadata.scheme+"://"+metadata.host+":"+metadata.port+
metadata.path+"\n\n";body+="Request (semantically equivalent, slightly reformatted):\n\n";body+=metadata.method+" "+metadata.path;if(metadata.queryString)
body+="?"+metadata.queryString;body+=" HTTP/"+metadata.httpVersion+"\r\n";var headEnum=metadata.headers;while(headEnum.hasMoreElements())
{var fieldName=headEnum.getNext().QueryInterface(Ci.nsISupportsString).data;body+=fieldName+": "+metadata.getHeader(fieldName)+"\r\n";}
response.bodyOutputStream.write(body,body.length);}}};function FileMap()
{this._map={};}
FileMap.prototype={put:function(key,value)
{if(value)
this._map[key]=value.clone();else
delete this._map[key];},get:function(key)
{var val=this._map[key];return val?val.clone():null;}};
const IS_TOKEN_ARRAY=[0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0, 0,1,0,1,1,1,1,1, 0,0,1,1,0,1,1,0, 1,1,1,1,1,1,1,1, 1,1,0,0,0,0,0,0, 0,1,1,1,1,1,1,1, 1,1,1,1,1,1,1,1, 1,1,1,1,1,1,1,1, 1,1,1,0,0,0,1,1, 1,1,1,1,1,1,1,1, 1,1,1,1,1,1,1,1, 1,1,1,1,1,1,1,1, 1,1,1,0,1,0,1];function isCTL(code)
{return(code>=0&&code<=31)||(code==127);}
function Response(connection)
{this._connection=connection;this._httpVersion=nsHttpVersion.HTTP_1_1;this._httpCode=200;this._httpDescription="OK";this._headers=new nsHttpHeaders();this._ended=false;this._bodyOutputStream=null;this._bodyInputStream=null;this._asyncCopier=null;this._processAsync=false;this._finished=false;this._powerSeized=false;}
Response.prototype={

get bodyOutputStream()
{if(this._finished)
throw Cr.NS_ERROR_NOT_AVAILABLE;if(!this._bodyOutputStream)
{var pipe=new Pipe(true,false,Response.SEGMENT_SIZE,PR_UINT32_MAX,null);this._bodyOutputStream=pipe.outputStream;this._bodyInputStream=pipe.inputStream;if(this._processAsync||this._powerSeized)
this._startAsyncProcessor();}
return this._bodyOutputStream;},
write:function(data)
{if(this._finished)
throw Cr.NS_ERROR_NOT_AVAILABLE;var dataAsString=String(data);this.bodyOutputStream.write(dataAsString,dataAsString.length);},
setStatusLine:function(httpVersion,code,description)
{if(!this._headers||this._finished||this._powerSeized)
throw Cr.NS_ERROR_NOT_AVAILABLE;this._ensureAlive();if(!(code>=0&&code<1000))
throw Cr.NS_ERROR_INVALID_ARG;try
{var httpVer; if(!httpVersion||httpVersion=="1.1")
httpVer=nsHttpVersion.HTTP_1_1;else if(httpVersion=="1.0")
httpVer=nsHttpVersion.HTTP_1_0;else
httpVer=new nsHttpVersion(httpVersion);}
catch(e)
{throw Cr.NS_ERROR_INVALID_ARG;}
 
if(!description)
description="";for(var i=0;i<description.length;i++)
if(isCTL(description.charCodeAt(i))&&description.charAt(i)!="\t")
throw Cr.NS_ERROR_INVALID_ARG; this._httpDescription=description;this._httpCode=code;this._httpVersion=httpVer;},
setHeader:function(name,value,merge)
{if(!this._headers||this._finished||this._powerSeized)
throw Cr.NS_ERROR_NOT_AVAILABLE;this._ensureAlive();this._headers.setHeader(name,value,merge);},
processAsync:function()
{if(this._finished)
throw Cr.NS_ERROR_UNEXPECTED;if(this._powerSeized)
throw Cr.NS_ERROR_NOT_AVAILABLE;if(this._processAsync)
return;this._ensureAlive();dumpn("*** processing connection "+this._connection.number+" async");this._processAsync=true;if(this._bodyOutputStream&&!this._asyncCopier)
this._startAsyncProcessor();},
seizePower:function()
{if(this._processAsync)
throw Cr.NS_ERROR_NOT_AVAILABLE;if(this._finished)
throw Cr.NS_ERROR_UNEXPECTED;if(this._powerSeized)
return;this._ensureAlive();dumpn("*** forcefully seizing power over connection "+
this._connection.number+"...");


if(this._asyncCopier)
this._asyncCopier.cancel(Cr.NS_BINDING_ABORTED);this._asyncCopier=null;if(this._bodyOutputStream)
{var input=new BinaryInputStream(this._bodyInputStream);var avail;while((avail=input.available())>0)
input.readByteArray(avail);}
this._powerSeized=true;if(this._bodyOutputStream)
this._startAsyncProcessor();},
finish:function()
{if(!this._processAsync&&!this._powerSeized)
throw Cr.NS_ERROR_UNEXPECTED;if(this._finished)
return;dumpn("*** finishing connection "+this._connection.number);this._startAsyncProcessor(); if(this._bodyOutputStream)
this._bodyOutputStream.close();this._finished=true;},

QueryInterface:function(iid)
{if(iid.equals(Ci.nsIHttpResponse)||iid.equals(Ci.nsISupports))
return this;throw Cr.NS_ERROR_NO_INTERFACE;},get httpVersion()
{this._ensureAlive();return this._httpVersion.toString();},get httpCode()
{this._ensureAlive();var codeString=(this._httpCode<10?"0":"")+
(this._httpCode<100?"0":"")+
this._httpCode;return codeString;},get httpDescription()
{this._ensureAlive();return this._httpDescription;},get headers()
{this._ensureAlive();return this._headers;},
getHeader:function(name)
{this._ensureAlive();return this._headers.getHeader(name);},partiallySent:function()
{dumpn("*** partiallySent()");return this._processAsync||this._powerSeized;},complete:function()
{dumpn("*** complete()");if(this._processAsync||this._powerSeized)
{NS_ASSERT(this._processAsync^this._powerSeized,"can't both send async and relinquish power");return;}
NS_ASSERT(!this.partiallySent(),"completing a partially-sent response?");this._startAsyncProcessor();if(this._bodyOutputStream)
this._bodyOutputStream.close();},abort:function(e)
{dumpn("*** abort(<"+e+">)");var copier=this._asyncCopier;if(copier)
{










gThreadManager.currentThread.dispatch({run:function()
{dumpn("*** canceling copy asynchronously...");copier.cancel(Cr.NS_ERROR_UNEXPECTED);}},Ci.nsIThread.DISPATCH_NORMAL);}
else
{this.end();}},end:function()
{NS_ASSERT(!this._ended,"ending this response twice?!?!");this._connection.close();if(this._bodyOutputStream)
this._bodyOutputStream.close();this._finished=true;this._ended=true;},_startAsyncProcessor:function()
{dumpn("*** _startAsyncProcessor()");

if(this._asyncCopier||this._ended)
{dumpn("*** ignoring second call to _startAsyncProcessor");return;}

if(this._headers&&!this._powerSeized)
{this._sendHeaders();return;}
this._headers=null;this._sendBody();},_sendHeaders:function()
{dumpn("*** _sendHeaders()");NS_ASSERT(this._headers);NS_ASSERT(!this._powerSeized); var statusLine="HTTP/"+this.httpVersion+" "+
this.httpCode+" "+
this.httpDescription+"\r\n"; var headers=this._headers;headers.setHeader("Connection","close",false);headers.setHeader("Server","httpd.js",false);if(!headers.hasHeader("Date"))
headers.setHeader("Date",toDateString(Date.now()),false);



if(!this._processAsync)
{dumpn("*** non-async response, set Content-Length");var bodyStream=this._bodyInputStream;var avail=bodyStream?bodyStream.available():0; headers.setHeader("Content-Length",""+avail,false);} 
dumpn("*** header post-processing completed, sending response head..."); var preambleData=[statusLine]; var headEnum=headers.enumerator;while(headEnum.hasMoreElements())
{var fieldName=headEnum.getNext().QueryInterface(Ci.nsISupportsString).data;var values=headers.getHeaderValues(fieldName);for(var i=0,sz=values.length;i<sz;i++)
preambleData.push(fieldName+": "+values[i]+"\r\n");} 
preambleData.push("\r\n");var preamble=preambleData.join("");var responseHeadPipe=new Pipe(true,false,0,PR_UINT32_MAX,null);responseHeadPipe.outputStream.write(preamble,preamble.length);var response=this;var copyObserver={onStartRequest:function(request,cx)
{dumpn("*** preamble copying started");},onStopRequest:function(request,cx,statusCode)
{dumpn("*** preamble copying complete "+"[status=0x"+statusCode.toString(16)+"]");if(!components.isSuccessCode(statusCode))
{dumpn("!!! header copying problems: non-success statusCode, "+"ending response");response.end();}
else
{response._sendBody();}},QueryInterface:function(aIID)
{if(aIID.equals(Ci.nsIRequestObserver)||aIID.equals(Ci.nsISupports))
return this;throw Cr.NS_ERROR_NO_INTERFACE;}};var headerCopier=this._asyncCopier=new WriteThroughCopier(responseHeadPipe.inputStream,this._connection.output,copyObserver,null);responseHeadPipe.outputStream.close();this._headers=null;},_sendBody:function()
{dumpn("*** _sendBody");NS_ASSERT(!this._headers,"still have headers around but sending body?"); if(!this._bodyInputStream)
{dumpn("*** empty body, response finished");this.end();return;}
var response=this;var copyObserver={onStartRequest:function(request,context)
{dumpn("*** onStartRequest");},onStopRequest:function(request,cx,statusCode)
{dumpn("*** onStopRequest [status=0x"+statusCode.toString(16)+"]");if(statusCode===Cr.NS_BINDING_ABORTED)
{dumpn("*** terminating copy observer without ending the response");}
else
{if(!components.isSuccessCode(statusCode))
dumpn("*** WARNING: non-success statusCode in onStopRequest");response.end();}},QueryInterface:function(aIID)
{if(aIID.equals(Ci.nsIRequestObserver)||aIID.equals(Ci.nsISupports))
return this;throw Cr.NS_ERROR_NO_INTERFACE;}};dumpn("*** starting async copier of body data...");this._asyncCopier=new WriteThroughCopier(this._bodyInputStream,this._connection.output,copyObserver,null);},_ensureAlive:function()
{NS_ASSERT(!this._ended,"not handling response lifetime correctly");}};Response.SEGMENT_SIZE=8192;function notImplemented()
{throw Cr.NS_ERROR_NOT_IMPLEMENTED;}
function streamClosed(e)
{return e===Cr.NS_BASE_STREAM_CLOSED||(typeof e==="object"&&e.result===Cr.NS_BASE_STREAM_CLOSED);}
function wouldBlock(e)
{return e===Cr.NS_BASE_STREAM_WOULD_BLOCK||(typeof e==="object"&&e.result===Cr.NS_BASE_STREAM_WOULD_BLOCK);}
function WriteThroughCopier(source,sink,observer,context)
{if(!source||!sink||!observer)
throw Cr.NS_ERROR_NULL_POINTER;this._source=source;this._sink=sink;this._observer=observer;this._context=context;this._canceled=false;this._completed=false;this.loadFlags=0;this.loadGroup=null;this.name="response-body-copy";this.status=Cr.NS_OK;this._pendingData=[]; try
{observer.onStartRequest(this,context);this._waitToReadData();this._waitForSinkClosure();}
catch(e)
{dumpn("!!! error starting copy: "+e+
("lineNumber"in e?", line "+e.lineNumber:""));dumpn(e.stack);this.cancel(Cr.NS_ERROR_UNEXPECTED);}}
WriteThroughCopier.prototype={QueryInterface:function(iid)
{if(iid.equals(Ci.nsIInputStreamCallback)||iid.equals(Ci.nsIOutputStreamCallback)||iid.equals(Ci.nsIRequest)||iid.equals(Ci.nsISupports))
{return this;}
throw Cr.NS_ERROR_NO_INTERFACE;},onInputStreamReady:function(input)
{if(this._source===null)
return;dumpn("*** onInputStreamReady");











var bytesWanted=0,bytesConsumed=-1;try
{input=new BinaryInputStream(input);bytesWanted=Math.min(input.available(),Response.SEGMENT_SIZE);dumpn("*** input wanted: "+bytesWanted);if(bytesWanted>0)
{var data=input.readByteArray(bytesWanted);bytesConsumed=data.length;this._pendingData.push(String.fromCharCode.apply(String,data));}
dumpn("*** "+bytesConsumed+" bytes read");
if(bytesWanted===0)
throw Cr.NS_BASE_STREAM_CLOSED;}
catch(e)
{if(streamClosed(e))
{dumpn("*** input stream closed");e=bytesWanted===0?Cr.NS_OK:Cr.NS_ERROR_UNEXPECTED;}
else
{dumpn("!!! unexpected error reading from input, canceling: "+e);e=Cr.NS_ERROR_UNEXPECTED;}
this._doneReadingSource(e);return;}
var pendingData=this._pendingData;NS_ASSERT(bytesConsumed>0);NS_ASSERT(pendingData.length>0,"no pending data somehow?");NS_ASSERT(pendingData[pendingData.length-1].length>0,"buffered zero bytes of data?");NS_ASSERT(this._source!==null);


if(this._sink===null)
{pendingData.length=0;this._doneReadingSource(Cr.NS_ERROR_UNEXPECTED);return;}



try
{if(pendingData.length===1)
this._waitToWriteData();}
catch(e)
{dumpn("!!! error waiting to write data just read, swallowing and "+"writing only what we already have: "+e);this._doneWritingToSink(Cr.NS_ERROR_UNEXPECTED);return;}

try
{this._waitToReadData();}
catch(e)
{dumpn("!!! error waiting to read more data: "+e);this._doneReadingSource(Cr.NS_ERROR_UNEXPECTED);}},onOutputStreamReady:function(output)
{if(this._sink===null)
return;dumpn("*** onOutputStreamReady");var pendingData=this._pendingData;if(pendingData.length===0)
{




dumpn("!!! output stream closed prematurely, ending copy");this._doneWritingToSink(Cr.NS_ERROR_UNEXPECTED);return;}
NS_ASSERT(pendingData[0].length>0,"queued up an empty quantum?");





try
{var quantum=pendingData[0];


var bytesWritten=output.write(quantum,quantum.length);if(bytesWritten===quantum.length)
pendingData.shift();else
pendingData[0]=quantum.substring(bytesWritten);dumpn("*** wrote "+bytesWritten+" bytes of data");}
catch(e)
{if(wouldBlock(e))
{NS_ASSERT(pendingData.length>0,"stream-blocking exception with no data to write?");NS_ASSERT(pendingData[0].length>0,"stream-blocking exception with empty quantum?");this._waitToWriteData();return;}
if(streamClosed(e))
dumpn("!!! output stream prematurely closed, signaling error...");else
dumpn("!!! unknown error: "+e+", quantum="+quantum);this._doneWritingToSink(Cr.NS_ERROR_UNEXPECTED);return;}

try
{if(pendingData.length>0)
{this._waitToWriteData();return;}}
catch(e)
{dumpn("!!! unexpected error waiting to write pending data: "+e);this._doneWritingToSink(Cr.NS_ERROR_UNEXPECTED);return;}

if(this._source!==null)
{this._waitForSinkClosure();}
else
{this._sink=null;this._cancelOrDispatchCancelCallback(Cr.NS_OK);}},isPending:function()
{return!this._completed;},suspend:notImplemented,resume:notImplemented,cancel:function(status)
{dumpn("*** cancel("+status.toString(16)+")");if(this._canceled)
{dumpn("*** suppressing a late cancel");return;}
this._canceled=true;this.status=status;




this._doneReadingSource(status);},_doneReadingSource:function(e)
{dumpn("*** _doneReadingSource(0x"+e.toString(16)+")");this._finishSource(e);if(this._pendingData.length===0)
this._sink=null;else
NS_ASSERT(this._sink!==null,"null output?");
if(this._sink===null)
{NS_ASSERT(this._pendingData.length===0,"pending data still?");this._cancelOrDispatchCancelCallback(e);}},_doneWritingToSink:function(e)
{dumpn("*** _doneWritingToSink(0x"+e.toString(16)+")");this._pendingData.length=0;this._sink=null;this._doneReadingSource(e);},_cancelOrDispatchCancelCallback:function(status)
{dumpn("*** _cancelOrDispatchCancelCallback("+status+")");NS_ASSERT(this._source===null,"should have finished input");NS_ASSERT(this._sink===null,"should have finished output");NS_ASSERT(this._pendingData.length===0,"should have no pending data");if(!this._canceled)
{this.cancel(status);return;}
var self=this;var event={run:function()
{dumpn("*** onStopRequest async callback");self._completed=true;try
{self._observer.onStopRequest(self,self._context,self.status);}
catch(e)
{NS_ASSERT(false,"how are we throwing an exception here? we control "+"all the callers! "+e);}}};gThreadManager.currentThread.dispatch(event,Ci.nsIThread.DISPATCH_NORMAL);},_waitToReadData:function()
{dumpn("*** _waitToReadData");this._source.asyncWait(this,0,Response.SEGMENT_SIZE,gThreadManager.mainThread);},_waitToWriteData:function()
{dumpn("*** _waitToWriteData");var pendingData=this._pendingData;NS_ASSERT(pendingData.length>0,"no pending data to write?");NS_ASSERT(pendingData[0].length>0,"buffered an empty write?");this._sink.asyncWait(this,0,pendingData[0].length,gThreadManager.mainThread);},_waitForSinkClosure:function()
{dumpn("*** _waitForSinkClosure");this._sink.asyncWait(this,Ci.nsIAsyncOutputStream.WAIT_CLOSURE_ONLY,0,gThreadManager.mainThread);},_finishSource:function(status)
{dumpn("*** _finishSource("+status.toString(16)+")");if(this._source!==null)
{this._source.closeWithStatus(status);this._source=null;}}};const headerUtils={normalizeFieldName:function(fieldName)
{if(fieldName=="")
throw Cr.NS_ERROR_INVALID_ARG;for(var i=0,sz=fieldName.length;i<sz;i++)
{if(!IS_TOKEN_ARRAY[fieldName.charCodeAt(i)])
{dumpn(fieldName+" is not a valid header field name!");throw Cr.NS_ERROR_INVALID_ARG;}}
return fieldName.toLowerCase();},normalizeFieldValue:function(fieldValue)
{




 
var val=fieldValue.replace(/(?:(?:\r\n)?[ \t]+)+/g," ");val=val.replace(/^ +/,"").replace(/ +$/,""); for(var i=0,len=val.length;i<len;i++)
if(isCTL(val.charCodeAt(i)))
throw Cr.NS_ERROR_INVALID_ARG;

 return val;}};function htmlEscape(str)
{ var s="";for(var i=0;i<str.length;i++)
s+="&#"+str.charCodeAt(i)+";";return s;}
function nsHttpVersion(versionString)
{var matches=/^(\d+)\.(\d+)$/.exec(versionString);if(!matches)
throw"Not a valid HTTP version!";this.major=parseInt(matches[1],10);this.minor=parseInt(matches[2],10);if(isNaN(this.major)||isNaN(this.minor)||this.major<0||this.minor<0)
throw"Not a valid HTTP version!";}
nsHttpVersion.prototype={toString:function()
{return this.major+"."+this.minor;},equals:function(otherVersion)
{return this.major==otherVersion.major&&this.minor==otherVersion.minor;},atLeast:function(otherVersion)
{return this.major>otherVersion.major||(this.major==otherVersion.major&&this.minor>=otherVersion.minor);}};nsHttpVersion.HTTP_1_0=new nsHttpVersion("1.0");nsHttpVersion.HTTP_1_1=new nsHttpVersion("1.1");function nsHttpHeaders()
{this._headers={};}
nsHttpHeaders.prototype={setHeader:function(fieldName,fieldValue,merge)
{var name=headerUtils.normalizeFieldName(fieldName);var value=headerUtils.normalizeFieldValue(fieldValue);

if(merge&&name in this._headers)
{if(name==="www-authenticate"||name==="proxy-authenticate"||name==="set-cookie")
{this._headers[name].push(value);}
else
{this._headers[name][0]+=","+value;NS_ASSERT(this._headers[name].length===1,"how'd a non-special header have multiple values?")}}
else
{this._headers[name]=[value];}},getHeader:function(fieldName)
{return this.getHeaderValues(fieldName).join("\n");},getHeaderValues:function(fieldName)
{var name=headerUtils.normalizeFieldName(fieldName);if(name in this._headers)
return this._headers[name];else
throw Cr.NS_ERROR_NOT_AVAILABLE;},hasHeader:function(fieldName)
{var name=headerUtils.normalizeFieldName(fieldName);return(name in this._headers);},get enumerator()
{var headers=[];for(var i in this._headers)
{var supports=new SupportsString();supports.data=i;headers.push(supports);}
return new nsSimpleEnumerator(headers);}};function nsSimpleEnumerator(items)
{this._items=items;this._nextIndex=0;}
nsSimpleEnumerator.prototype={hasMoreElements:function()
{return this._nextIndex<this._items.length;},getNext:function()
{if(!this.hasMoreElements())
throw Cr.NS_ERROR_NOT_AVAILABLE;return this._items[this._nextIndex++];},QueryInterface:function(aIID)
{if(Ci.nsISimpleEnumerator.equals(aIID)||Ci.nsISupports.equals(aIID))
return this;throw Cr.NS_ERROR_NO_INTERFACE;}};function Request(port)
{this._method="";this._path="";this._queryString="";this._scheme="http";this._host=undefined;this._port=port;var bodyPipe=new Pipe(false,false,0,PR_UINT32_MAX,null);this._bodyInputStream=bodyPipe.inputStream;this._bodyOutputStream=bodyPipe.outputStream;this._headers=new nsHttpHeaders();this._bag=null;}
Request.prototype={

get scheme()
{return this._scheme;},
get host()
{return this._host;},
get port()
{return this._port;},

get method()
{return this._method;},
get httpVersion()
{return this._httpVersion.toString();},
get path()
{return this._path;},
get queryString()
{return this._queryString;},

getHeader:function(name)
{return this._headers.getHeader(name);},
hasHeader:function(name)
{return this._headers.hasHeader(name);},
get headers()
{return this._headers.enumerator;},
get enumerator()
{this._ensurePropertyBag();return this._bag.enumerator;},
get bodyInputStream()
{return this._bodyInputStream;},
getProperty:function(name)
{this._ensurePropertyBag();return this._bag.getProperty(name);},

QueryInterface:function(iid)
{if(iid.equals(Ci.nsIHttpRequest)||iid.equals(Ci.nsISupports))
return this;throw Cr.NS_ERROR_NO_INTERFACE;},
_ensurePropertyBag:function()
{if(!this._bag)
this._bag=new WritablePropertyBag();}};if("XPCOMUtils"in this&&"generateNSGetFactory"in XPCOMUtils){var NSGetFactory=XPCOMUtils.generateNSGetFactory([nsHttpServer]);}
function server(port,basePath)
{if(basePath)
{var lp=Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);lp.initWithPath(basePath);} 
DEBUG=true;var srv=new nsHttpServer();if(lp)
srv.registerDirectory("/",lp);srv.registerContentType("sjs",SJS_TYPE);srv.start(port);var thread=gThreadManager.currentThread;while(!srv.isStopped())
thread.processNextEvent(true); while(thread.hasPendingEvents())
thread.processNextEvent(true);DEBUG=false;}
function startServerAsync(port,basePath)
{if(basePath)
{var lp=Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);lp.initWithPath(basePath);}
var srv=new nsHttpServer();if(lp)
srv.registerDirectory("/",lp);srv.registerContentType("sjs","sjs");srv.start(port);return srv;}
exports.nsHttpServer=nsHttpServer;exports.ScriptableInputStream=ScriptableInputStream;exports.server=server;exports.startServerAsync=startServerAsync;