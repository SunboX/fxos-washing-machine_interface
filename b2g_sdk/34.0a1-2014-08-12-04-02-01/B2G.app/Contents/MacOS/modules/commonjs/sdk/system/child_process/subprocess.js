
'use strict';const{Cc,Ci,Cu,ChromeWorker}=require("chrome");Cu.import("resource://gre/modules/ctypes.jsm");const NS_LOCAL_FILE="@mozilla.org/file/local;1";const Runtime=require("sdk/system/runtime");const Environment=require("sdk/system/environment").env;const DEFAULT_ENVIRONMENT=[];if(Runtime.OS=="Linux"&&"DISPLAY"in Environment){DEFAULT_ENVIRONMENT.push("DISPLAY="+Environment.DISPLAY);}
const URL_PREFIX=module.uri.replace(/subprocess\.js/,"");const WORKER_URL_WIN=URL_PREFIX+"subprocess_worker_win.js";const WORKER_URL_UNIX=URL_PREFIX+"subprocess_worker_unix.js";if(ctypes.size_t.size==8){var WinABI=ctypes.default_abi;}else{var WinABI=ctypes.winapi_abi;}
const WORD=ctypes.uint16_t;const DWORD=ctypes.uint32_t;const LPDWORD=DWORD.ptr;const UINT=ctypes.unsigned_int;const BOOL=ctypes.bool;const HANDLE=ctypes.size_t;const HWND=HANDLE;const HMODULE=HANDLE;const WPARAM=ctypes.size_t;const LPARAM=ctypes.size_t;const LRESULT=ctypes.size_t;const ULONG_PTR=ctypes.uintptr_t;const PVOID=ctypes.voidptr_t;const LPVOID=PVOID;const LPCTSTR=ctypes.jschar.ptr;const LPCWSTR=ctypes.jschar.ptr;const LPTSTR=ctypes.jschar.ptr;const LPSTR=ctypes.char.ptr;const LPCSTR=ctypes.char.ptr;const LPBYTE=ctypes.char.ptr;const CREATE_NEW_CONSOLE=0x00000010;const CREATE_NO_WINDOW=0x08000000;const CREATE_UNICODE_ENVIRONMENT=0x00000400;const STARTF_USESHOWWINDOW=0x00000001;const STARTF_USESTDHANDLES=0x00000100;const SW_HIDE=0;const DUPLICATE_SAME_ACCESS=0x00000002;const STILL_ACTIVE=259;const INFINITE=DWORD(0xFFFFFFFF);const WAIT_TIMEOUT=0x00000102;const SECURITY_ATTRIBUTES=new ctypes.StructType("SECURITY_ATTRIBUTES",[{"nLength":DWORD},{"lpSecurityDescriptor":LPVOID},{"bInheritHandle":BOOL},]);const STARTUPINFO=new ctypes.StructType("STARTUPINFO",[{"cb":DWORD},{"lpReserved":LPTSTR},{"lpDesktop":LPTSTR},{"lpTitle":LPTSTR},{"dwX":DWORD},{"dwY":DWORD},{"dwXSize":DWORD},{"dwYSize":DWORD},{"dwXCountChars":DWORD},{"dwYCountChars":DWORD},{"dwFillAttribute":DWORD},{"dwFlags":DWORD},{"wShowWindow":WORD},{"cbReserved2":WORD},{"lpReserved2":LPBYTE},{"hStdInput":HANDLE},{"hStdOutput":HANDLE},{"hStdError":HANDLE},]);const PROCESS_INFORMATION=new ctypes.StructType("PROCESS_INFORMATION",[{"hProcess":HANDLE},{"hThread":HANDLE},{"dwProcessId":DWORD},{"dwThreadId":DWORD},]);const OVERLAPPED=new ctypes.StructType("OVERLAPPED");const pid_t=ctypes.int32_t;const WNOHANG=1;const F_GETFD=1;const F_SETFL=4;const LIBNAME=0;const O_NONBLOCK=1;const RLIM_T=2;const RLIMIT_NOFILE=3;function getPlatformValue(valueType){if(!gXulRuntime)
gXulRuntime=Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULRuntime);const platformDefaults={'winnt':['kernel32.dll'],'darwin':['libc.dylib',0x04,ctypes.uint64_t,8],'linux':['libc.so.6',2024,ctypes.unsigned_long,7],'freebsd':['libc.so.7',0x04,ctypes.int64_t,8],'openbsd':['libc.so.61.0',0x04,ctypes.int64_t,8],'sunos':['libc.so',0x80,ctypes.unsigned_long,5]}
return platformDefaults[gXulRuntime.OS.toLowerCase()][valueType];}
var gDebugFunc=null,gLogFunc=null,gXulRuntime=null;function LogError(s){if(gLogFunc)
gLogFunc(s);else
dump(s);}
function debugLog(s){if(gDebugFunc)
gDebugFunc(s);}
function setTimeout(callback,timeout){var timer=Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);timer.initWithCallback(callback,timeout,Ci.nsITimer.TYPE_ONE_SHOT);};function getBytes(data){var string='';data.forEach(function(x){string+=String.fromCharCode(x<0?x+256:x)});return string;}
function readString(data,length,charset){var string='',bytes=[];for(var i=0;i<length;i++){if(data[i]==0&&charset!==null) 
break
bytes.push(data[i]);}
if(!bytes||bytes.length==0)
return string;if(charset===null){return bytes;}
return convertBytes(bytes,charset);}
function convertBytes(bytes,charset){var string='';charset=charset||'UTF-8';var unicodeConv=Cc["@mozilla.org/intl/scriptableunicodeconverter"].getService(Ci.nsIScriptableUnicodeConverter);try{unicodeConv.charset=charset;string=unicodeConv.convertFromByteArray(bytes,bytes.length);}catch(ex){LogError("String conversion failed: "+ex.toString()+"\n")
string='';}
string+=unicodeConv.Finish();return string;}
function getLocalFileApi(){if("nsILocalFile"in Ci){return Ci.nsILocalFile;}
else
return Ci.nsIFile;}
function getCommandStr(command){let commandStr=null;if(typeof(command)=="string"){let file=Cc[NS_LOCAL_FILE].createInstance(getLocalFileApi());file.initWithPath(command);if(!(file.isExecutable()&&file.isFile()))
throw("File '"+command+"' is not an executable file");commandStr=command;}
else{if(!(command.isExecutable()&&command.isFile()))
throw("File '"+command.path+"' is not an executable file");commandStr=command.path;}
return commandStr;}
function getWorkDir(workdir){let workdirStr=null;if(typeof(workdir)=="string"){let file=Cc[NS_LOCAL_FILE].createInstance(getLocalFileApi());file.initWithPath(workdir);if(!(file.isDirectory()))
throw("Directory '"+workdir+"' does not exist");workdirStr=workdir;}
else if(workdir){if(!workdir.isDirectory())
throw("Directory '"+workdir.path+"' does not exist");workdirStr=workdir.path;}
return workdirStr;}
var subprocess={call:function(options){options.mergeStderr=options.mergeStderr||false;options.workdir=options.workdir||null;options.environment=options.environment||DEFAULT_ENVIRONMENT;if(options.arguments){var args=options.arguments;options.arguments=[];args.forEach(function(argument){options.arguments.push(argument);});}else{options.arguments=[];}
options.libc=getPlatformValue(LIBNAME);if(gXulRuntime.OS.substring(0,3)=="WIN"){return subprocess_win32(options);}else{return subprocess_unix(options);}},registerDebugHandler:function(func){gDebugFunc=func;},registerLogHandler:function(func){gLogFunc=func;}};function subprocess_win32(options){var kernel32dll=ctypes.open(options.libc),hChildProcess,active=true,done=false,exitCode=-1,child={},stdinWorker=null,stdoutWorker=null,stderrWorker=null,pendingWriteCount=0,readers=options.mergeStderr?1:2,stdinOpenState=2,error='',output=''; const OPEN=2;const CLOSEABLE=1;const CLOSED=0;var CloseHandle=kernel32dll.declare("CloseHandle",WinABI,BOOL,HANDLE);var CreateProcessW=kernel32dll.declare("CreateProcessW",WinABI,BOOL,LPCTSTR,LPTSTR,SECURITY_ATTRIBUTES.ptr,SECURITY_ATTRIBUTES.ptr,BOOL,DWORD,LPVOID,LPCTSTR,STARTUPINFO.ptr,PROCESS_INFORMATION.ptr);





var CreatePipe=kernel32dll.declare("CreatePipe",WinABI,BOOL,HANDLE.ptr,HANDLE.ptr,SECURITY_ATTRIBUTES.ptr,DWORD);var GetCurrentProcess=kernel32dll.declare("GetCurrentProcess",WinABI,HANDLE);var GetLastError=kernel32dll.declare("GetLastError",WinABI,DWORD);var DuplicateHandle=kernel32dll.declare("DuplicateHandle",WinABI,BOOL,HANDLE,HANDLE,HANDLE,HANDLE.ptr,DWORD,BOOL,DWORD);var GetExitCodeProcess=kernel32dll.declare("GetExitCodeProcess",WinABI,BOOL,HANDLE,LPDWORD);var WaitForSingleObject=kernel32dll.declare("WaitForSingleObject",WinABI,DWORD,HANDLE,DWORD);var TerminateProcess=kernel32dll.declare("TerminateProcess",WinABI,BOOL,HANDLE,UINT); function popen(command,workdir,args,environment,child){ args.unshift(command);for(var i=0;i<args.length;i++){if(typeof args[i]!="string"){args[i]=args[i].toString();}
if(args[i].match(/\s/)){args[i]="\""+args[i]+"\"";}
args[i]=args[i].replace(/\\\"/g,"\\\\\"");}
command=args.join(' ');environment=environment||[];if(environment.length){
 environment=ctypes.jschar.array()(environment.join('\0')+'\0');}else{environment=null;}
var hOutputReadTmp=new HANDLE(),hOutputRead=new HANDLE(),hOutputWrite=new HANDLE();var hErrorRead=new HANDLE(),hErrorReadTmp=new HANDLE(),hErrorWrite=new HANDLE();var hInputRead=new HANDLE(),hInputWriteTmp=new HANDLE(),hInputWrite=new HANDLE();var sa=new SECURITY_ATTRIBUTES();sa.nLength=SECURITY_ATTRIBUTES.size;sa.lpSecurityDescriptor=null;sa.bInheritHandle=true;if(!CreatePipe(hOutputReadTmp.address(),hOutputWrite.address(),sa.address(),0))
LogError('CreatePipe hOutputReadTmp failed');if(options.mergeStderr){

if(!DuplicateHandle(GetCurrentProcess(),hOutputWrite,GetCurrentProcess(),hErrorWrite.address(),0,true,DUPLICATE_SAME_ACCESS))
LogError("DuplicateHandle hOutputWrite failed");}else{if(!CreatePipe(hErrorReadTmp.address(),hErrorWrite.address(),sa.address(),0))
LogError('CreatePipe hErrorReadTmp failed');}
if(!CreatePipe(hInputRead.address(),hInputWriteTmp.address(),sa.address(),0))
LogError("CreatePipe hInputRead failed");


if(!DuplicateHandle(GetCurrentProcess(),hOutputReadTmp,GetCurrentProcess(),hOutputRead.address(),0,false,DUPLICATE_SAME_ACCESS))
LogError("DupliateHandle hOutputReadTmp failed");if(!options.mergeStderr){if(!DuplicateHandle(GetCurrentProcess(),hErrorReadTmp,GetCurrentProcess(),hErrorRead.address(),0,false,DUPLICATE_SAME_ACCESS))
LogError("DupliateHandle hErrorReadTmp failed");}
if(!DuplicateHandle(GetCurrentProcess(),hInputWriteTmp,GetCurrentProcess(),hInputWrite.address(),0,false,DUPLICATE_SAME_ACCESS))
LogError("DupliateHandle hInputWriteTmp failed");if(!CloseHandle(hOutputReadTmp))LogError("CloseHandle hOutputReadTmp failed");if(!options.mergeStderr)
if(!CloseHandle(hErrorReadTmp))LogError("CloseHandle hErrorReadTmp failed");if(!CloseHandle(hInputWriteTmp))LogError("CloseHandle failed");var pi=new PROCESS_INFORMATION();var si=new STARTUPINFO();si.cb=STARTUPINFO.size;si.dwFlags=STARTF_USESTDHANDLES;si.hStdInput=hInputRead;si.hStdOutput=hOutputWrite;si.hStdError=hErrorWrite; if(!CreateProcessW(null, command, null, null, true, CREATE_UNICODE_ENVIRONMENT|CREATE_NO_WINDOW, environment, workdir, si.address(), pi.address()
))
throw("Fatal - Could not launch subprocess '"+command+"'");if(!CloseHandle(pi.hThread))
LogError("CloseHandle pi.hThread failed");

if(!CloseHandle(hInputRead))LogError("CloseHandle hInputRead failed");if(!CloseHandle(hOutputWrite))LogError("CloseHandle hOutputWrite failed");if(!CloseHandle(hErrorWrite))LogError("CloseHandle hErrorWrite failed"); child.stdin=hInputWrite;child.stdout=hOutputRead;child.stderr=options.mergeStderr?undefined:hErrorRead;child.process=pi.hProcess;return pi.hProcess;}
function createStdinWriter(){debugLog("Creating new stdin worker\n");stdinWorker=new ChromeWorker(WORKER_URL_WIN);stdinWorker.onmessage=function(event){switch(event.data){case"WriteOK":pendingWriteCount--;debugLog("got OK from stdinWorker - remaining count: "+pendingWriteCount+"\n");break;case"ClosedOK":stdinOpenState=CLOSED;debugLog("Stdin pipe closed\n");break;default:debugLog("got msg from stdinWorker: "+event.data+"\n");}}
stdinWorker.onerror=function(error){pendingWriteCount--;LogError("got error from stdinWorker: "+error.message+"\n");}
stdinWorker.postMessage({msg:"init",libc:options.libc});}
function writeStdin(data){++pendingWriteCount;debugLog("sending "+data.length+" bytes to stdinWorker\n");var pipePtr=parseInt(ctypes.cast(child.stdin.address(),ctypes.uintptr_t).value);stdinWorker.postMessage({msg:'write',pipe:pipePtr,data:data});}
function closeStdinHandle(){debugLog("trying to close stdin\n");if(stdinOpenState!=OPEN)return;stdinOpenState=CLOSEABLE;if(stdinWorker){debugLog("sending close stdin to worker\n");var pipePtr=parseInt(ctypes.cast(child.stdin.address(),ctypes.uintptr_t).value);stdinWorker.postMessage({msg:'close',pipe:pipePtr});}
else{stdinOpenState=CLOSED;debugLog("Closing Stdin\n");CloseHandle(child.stdin)||LogError("CloseHandle hInputWrite failed");}}
function createReader(pipe,name,callbackFunc){var worker=new ChromeWorker(WORKER_URL_WIN);worker.onmessage=function(event){switch(event.data.msg){case"data":debugLog("got "+event.data.count+" bytes from "+name+"\n");var data='';if(options.charset===null){data=getBytes(event.data.data);}
else{try{data=convertBytes(event.data.data,options.charset);}
catch(ex){console.warn("error decoding output: "+ex);data=getBytes(event.data.data);}}
callbackFunc(data);break;case"done":debugLog("Pipe "+name+" closed\n");--readers;if(readers==0)cleanup();break;default:debugLog("Got msg from "+name+": "+event.data.data+"\n");}}
worker.onerror=function(errorMsg){LogError("Got error from "+name+": "+errorMsg.message);}
var pipePtr=parseInt(ctypes.cast(pipe.address(),ctypes.uintptr_t).value);worker.postMessage({msg:'read',pipe:pipePtr,libc:options.libc,charset:options.charset===null?"null":options.charset,name:name});return worker;}
function readPipes(){stdoutWorker=createReader(child.stdout,"stdout",function(data){if(options.stdout){setTimeout(function(){options.stdout(data);},0);}else{output+=data;}});if(!options.mergeStderr)stderrWorker=createReader(child.stderr,"stderr",function(data){if(options.stderr){setTimeout(function(){options.stderr(data);},0);}else{error+=data;}});}
function cleanup(){debugLog("Cleanup called\n");if(active){active=false;closeStdinHandle(); var exit=new DWORD();GetExitCodeProcess(child.process,exit.address());exitCode=exit.value;if(stdinWorker)
stdinWorker.postMessage({msg:'stop'})
setTimeout(function _done(){if(options.done){try{options.done({exitCode:exitCode,stdout:output,stderr:error,});}
catch(ex){ done=true;throw ex;}}
done=true;},0);kernel32dll.close();}}
var cmdStr=getCommandStr(options.command);var workDir=getWorkDir(options.workdir); hChildProcess=popen(cmdStr,workDir,options.arguments,options.environment,child);readPipes();if(options.stdin){createStdinWriter();if(typeof(options.stdin)=='function'){try{options.stdin({write:function(data){writeStdin(data);},close:function(){closeStdinHandle();}});}
catch(ex){ closeStdinHandle();throw ex;}}else{writeStdin(options.stdin);closeStdinHandle();}}
else
closeStdinHandle();return{kill:function(hardKill){ var r=!!TerminateProcess(child.process,255);cleanup(-1);return r;},wait:function(){ var thread=Cc['@mozilla.org/thread-manager;1'].getService(Ci.nsIThreadManager).currentThread;while(!done)thread.processNextEvent(true);return exitCode;}}}
function subprocess_unix(options){ const OPEN=2;const CLOSEABLE=1;const CLOSED=0;var libc=ctypes.open(options.libc),active=true,done=false,exitCode=-1,workerExitCode=0,child={},pid=-1,stdinWorker=null,stdoutWorker=null,stderrWorker=null,pendingWriteCount=0,readers=options.mergeStderr?1:2,stdinOpenState=OPEN,error='',output='';
var fork=libc.declare("fork",ctypes.default_abi,pid_t); var argv=ctypes.char.ptr.array(options.arguments.length+2);var envp=ctypes.char.ptr.array(options.environment.length+1);


var posix_spawn_file_actions_t=ctypes.uint8_t.array(100);var posix_spawn=libc.declare("posix_spawn",ctypes.default_abi,ctypes.int,pid_t.ptr,ctypes.char.ptr,posix_spawn_file_actions_t.ptr,ctypes.voidptr_t,argv,envp);var posix_spawn_file_actions_init=libc.declare("posix_spawn_file_actions_init",ctypes.default_abi,ctypes.int,posix_spawn_file_actions_t.ptr);var posix_spawn_file_actions_destroy=libc.declare("posix_spawn_file_actions_destroy",ctypes.default_abi,ctypes.int,posix_spawn_file_actions_t.ptr);var posix_spawn_file_actions_adddup2=libc.declare("posix_spawn_file_actions_adddup2",ctypes.default_abi,ctypes.int,posix_spawn_file_actions_t.ptr,ctypes.int,ctypes.int);var posix_spawn_file_actions_addclose=libc.declare("posix_spawn_file_actions_addclose",ctypes.default_abi,ctypes.int,posix_spawn_file_actions_t.ptr,ctypes.int);var pipefd=ctypes.int.array(2);var pipe=libc.declare("pipe",ctypes.default_abi,ctypes.int,pipefd);var close=libc.declare("close",ctypes.default_abi,ctypes.int,ctypes.int);var waitpid=libc.declare("waitpid",ctypes.default_abi,pid_t,pid_t,ctypes.int.ptr,ctypes.int);var kill=libc.declare("kill",ctypes.default_abi,ctypes.int,pid_t,ctypes.int);var bufferSize=1024;var buffer=ctypes.char.array(bufferSize);var read=libc.declare("read",ctypes.default_abi,ctypes.int,ctypes.int,buffer,ctypes.int);var write=libc.declare("write",ctypes.default_abi,ctypes.int,ctypes.int,ctypes.char.ptr,ctypes.int);var chdir=libc.declare("chdir",ctypes.default_abi,ctypes.int,ctypes.char.ptr);var fcntl=libc.declare("fcntl",ctypes.default_abi,ctypes.int,ctypes.int,ctypes.int,ctypes.int);function popen(command,workdir,args,environment,child){var _in,_out,_err,pid,rc;_in=new pipefd();_out=new pipefd();if(!options.mergeStderr)
_err=new pipefd();var _args=argv();args.unshift(command);for(var i=0;i<args.length;i++){_args[i]=ctypes.char.array()(args[i]);}
var _envp=envp();for(var i=0;i<environment.length;i++){_envp[i]=ctypes.char.array()(environment[i]);}
rc=pipe(_in);if(rc<0){return-1;}
rc=pipe(_out);fcntl(_out[0],F_SETFL,getPlatformValue(O_NONBLOCK));if(rc<0){close(_in[0]);close(_in[1]);return-1}
if(!options.mergeStderr){rc=pipe(_err);fcntl(_err[0],F_SETFL,getPlatformValue(O_NONBLOCK));if(rc<0){close(_in[0]);close(_in[1]);close(_out[0]);close(_out[1]);return-1}}
let STDIN_FILENO=0;let STDOUT_FILENO=1;let STDERR_FILENO=2;let action=posix_spawn_file_actions_t();posix_spawn_file_actions_init(action.address());posix_spawn_file_actions_adddup2(action.address(),_in[0],STDIN_FILENO);posix_spawn_file_actions_addclose(action.address(),_in[1]);posix_spawn_file_actions_addclose(action.address(),_in[0]);posix_spawn_file_actions_adddup2(action.address(),_out[1],STDOUT_FILENO);posix_spawn_file_actions_addclose(action.address(),_out[1]);posix_spawn_file_actions_addclose(action.address(),_out[0]);if(!options.mergeStderr){posix_spawn_file_actions_adddup2(action.address(),_err[1],STDERR_FILENO);posix_spawn_file_actions_addclose(action.address(),_err[1]);posix_spawn_file_actions_addclose(action.address(),_err[0]);}
if(workdir){if(chdir(workdir)<0){throw new Error("Unable to change workdir before launching child process");}}
closeOtherFds(action,_in[1],_out[0],options.mergeStderr?undefined:_err[0]);let id=pid_t(0);let rv=posix_spawn(id.address(),command,action.address(),null,_args,_envp);posix_spawn_file_actions_destroy(action.address());if(rv!=0){ if(!options.mergeStderr){close(_err[0]);close(_err[1]);}
close(_out[0]);close(_out[1]);close(_in[0]);close(_in[1]);throw new Error("Fatal - failed to create subprocess '"+command+"'");}
pid=id.value;close(_in[0]);close(_out[1]);if(!options.mergeStderr)
close(_err[1]);child.stdin=_in[1];child.stdout=_out[0];child.stderr=options.mergeStderr?undefined:_err[0];child.pid=pid;return pid;} 
function closeOtherFds(action,fdIn,fdOut,fdErr){
if(gXulRuntime.OS=="Darwin")
return;var maxFD=256; var rlim_t=getPlatformValue(RLIM_T);const RLIMITS=new ctypes.StructType("RLIMITS",[{"rlim_cur":rlim_t},{"rlim_max":rlim_t}]);try{var getrlimit=libc.declare("getrlimit",ctypes.default_abi,ctypes.int,ctypes.int,RLIMITS.ptr);var rl=new RLIMITS();if(getrlimit(getPlatformValue(RLIMIT_NOFILE),rl.address())==0){maxFD=rl.rlim_cur;}
debugLog("getlimit: maxFD="+maxFD+"\n");}
catch(ex){debugLog("getrlimit: no such function on this OS\n");debugLog(ex.toString());}
 
for(var i=3;i<maxFD;i++){if(i!=fdIn&&i!=fdOut&&i!=fdErr&&fcntl(i,F_GETFD,-1)>=0){posix_spawn_file_actions_addclose(action.address(),i);}}}
function createStdinWriter(){debugLog("Creating new stdin worker\n");stdinWorker=new ChromeWorker(WORKER_URL_UNIX);stdinWorker.onmessage=function(event){switch(event.data.msg){case"info":switch(event.data.data){case"WriteOK":pendingWriteCount--;debugLog("got OK from stdinWorker - remaining count: "+pendingWriteCount+"\n");break;case"ClosedOK":stdinOpenState=CLOSED;debugLog("Stdin pipe closed\n");break;default:debugLog("got msg from stdinWorker: "+event.data.data+"\n");}
break;case"debug":debugLog("stdinWorker: "+event.data.data+"\n");break;case"error":LogError("got error from stdinWorker: "+event.data.data+"\n");pendingWriteCount=0;stdinOpenState=CLOSED;}}
stdinWorker.onerror=function(error){pendingWriteCount=0;closeStdinHandle();LogError("got error from stdinWorker: "+error.message+"\n");}
stdinWorker.postMessage({msg:"init",libc:options.libc});}
function writeStdin(data){if(stdinOpenState==CLOSED)return;++pendingWriteCount;debugLog("sending "+data.length+" bytes to stdinWorker\n");var pipe=parseInt(child.stdin);stdinWorker.postMessage({msg:'write',pipe:pipe,data:data});}
function closeStdinHandle(){debugLog("trying to close stdin\n");if(stdinOpenState!=OPEN)return;stdinOpenState=CLOSEABLE;if(stdinWorker){debugLog("sending close stdin to worker\n");var pipePtr=parseInt(child.stdin);stdinWorker.postMessage({msg:'close',pipe:pipePtr});}
else{stdinOpenState=CLOSED;debugLog("Closing Stdin\n");close(child.stdin)&&LogError("CloseHandle stdin failed");}}
function createReader(pipe,name,callbackFunc){var worker=new ChromeWorker(WORKER_URL_UNIX);worker.onmessage=function(event){switch(event.data.msg){case"data":debugLog("got "+event.data.count+" bytes from "+name+"\n");var data='';if(options.charset===null){data=getBytes(event.data.data);}
else{try{data=convertBytes(event.data.data,options.charset);}
catch(ex){console.warn("error decoding output: "+ex);data=getBytes(event.data.data);}}
callbackFunc(data);break;case"done":debugLog("Pipe "+name+" closed\n");if(event.data.data>0)workerExitCode=event.data.data;--readers;if(readers==0)cleanup();break;default:debugLog("Got msg from "+name+": "+event.data.data+"\n");}}
worker.onerror=function(error){LogError("Got error from "+name+": "+error.message);}
worker.postMessage({msg:'read',pipe:pipe,pid:pid,libc:options.libc,charset:options.charset===null?"null":options.charset,name:name});return worker;}
function readPipes(){stdoutWorker=createReader(child.stdout,"stdout",function(data){if(options.stdout){setTimeout(function(){options.stdout(data);},0);}else{output+=data;}});if(!options.mergeStderr)stderrWorker=createReader(child.stderr,"stderr",function(data){if(options.stderr){setTimeout(function(){options.stderr(data);},0);}else{error+=data;}});}
function cleanup(){debugLog("Cleanup called\n");if(active){active=false;closeStdinHandle(); var result,status=ctypes.int();result=waitpid(child.pid,status.address(),0);if(result>0)
exitCode=status.value
else
if(workerExitCode>=0)
exitCode=workerExitCode
else
exitCode=status.value;if(stdinWorker)
stdinWorker.postMessage({msg:'stop'})
setTimeout(function _done(){if(options.done){try{options.done({exitCode:exitCode,stdout:output,stderr:error,});}
catch(ex){ done=true;throw ex;}}
done=true;},0);libc.close();}} 
var cmdStr=getCommandStr(options.command);var workDir=getWorkDir(options.workdir);child={};pid=popen(cmdStr,workDir,options.arguments,options.environment,child);debugLog("subprocess started; got PID "+pid+"\n");readPipes();if(options.stdin){createStdinWriter();if(typeof(options.stdin)=='function'){try{options.stdin({write:function(data){writeStdin(data);},close:function(){closeStdinHandle();}});}
catch(ex){ closeStdinHandle();throw ex;}}else{writeStdin(options.stdin);closeStdinHandle();}}
return{wait:function(){ var thread=Cc['@mozilla.org/thread-manager;1'].getService(Ci.nsIThreadManager).currentThread;while(!done)thread.processNextEvent(true)
return exitCode;},kill:function(hardKill){var rv=kill(pid,(hardKill?9:15));cleanup(-1);return rv;},pid:pid}}
module.exports=subprocess;