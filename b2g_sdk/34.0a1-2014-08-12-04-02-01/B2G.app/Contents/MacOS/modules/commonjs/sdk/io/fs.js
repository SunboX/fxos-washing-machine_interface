"use strict";module.metadata={"stability":"experimental"};const{Cc,Ci,CC}=require("chrome");const{setTimeout}=require("../timers");const{Stream,InputStream,OutputStream}=require("./stream");const{emit,on}=require("../event/core");const{Buffer}=require("./buffer");const{ns}=require("../core/namespace");const{Class}=require("../core/heritage");const nsILocalFile=CC("@mozilla.org/file/local;1","nsILocalFile","initWithPath");const FileOutputStream=CC("@mozilla.org/network/file-output-stream;1","nsIFileOutputStream","init");const FileInputStream=CC("@mozilla.org/network/file-input-stream;1","nsIFileInputStream","init");const BinaryInputStream=CC("@mozilla.org/binaryinputstream;1","nsIBinaryInputStream","setInputStream");const BinaryOutputStream=CC("@mozilla.org/binaryoutputstream;1","nsIBinaryOutputStream","setOutputStream");const StreamPump=CC("@mozilla.org/network/input-stream-pump;1","nsIInputStreamPump","init");const{createOutputTransport,createInputTransport}=Cc["@mozilla.org/network/stream-transport-service;1"].getService(Ci.nsIStreamTransportService);const{OPEN_UNBUFFERED}=Ci.nsITransport;const{REOPEN_ON_REWIND,DEFER_OPEN}=Ci.nsIFileInputStream;const{DIRECTORY_TYPE,NORMAL_FILE_TYPE}=Ci.nsIFile;const{NS_SEEK_SET,NS_SEEK_CUR,NS_SEEK_END}=Ci.nsISeekableStream;const FILE_PERMISSION=parseInt("0666",8);const PR_UINT32_MAX=0xfffffff;const PR_RDONLY=0x01;const PR_WRONLY=0x02;const PR_RDWR=0x04;const PR_CREATE_FILE=0x08;const PR_APPEND=0x10;const PR_TRUNCATE=0x20;const PR_SYNC=0x40;const PR_EXCL=0x80;const FLAGS={"r":PR_RDONLY,"r+":PR_RDWR,"w":PR_CREATE_FILE|PR_TRUNCATE|PR_WRONLY,"w+":PR_CREATE_FILE|PR_TRUNCATE|PR_RDWR,"a":PR_APPEND|PR_CREATE_FILE|PR_WRONLY,"a+":PR_APPEND|PR_CREATE_FILE|PR_RDWR};function accessor(){let map=new WeakMap();return function(fd,value){if(value===null)map.delete(fd);if(value!==undefined)map.set(fd,value);return map.get(fd);}}
let nsIFile=accessor();let nsIFileInputStream=accessor();let nsIFileOutputStream=accessor();let nsIBinaryInputStream=accessor();let nsIBinaryOutputStream=accessor();
const ALL=new String("Read all of the file");function isWritable(mode)!!(mode&PR_WRONLY||mode&PR_RDWR)
function isReadable(mode)!!(mode&PR_RDONLY||mode&PR_RDWR)
function isString(value)typeof(value)==="string"
function isFunction(value)typeof(value)==="function"
function toArray(enumerator){let value=[];while(enumerator.hasMoreElements())
value.push(enumerator.getNext())
return value}
function getFileName(file)file.QueryInterface(Ci.nsIFile).leafName
function remove(path,recursive){let fd=new nsILocalFile(path)
if(fd.exists()){fd.remove(recursive||false);}
else{throw FSError("remove","ENOENT",34,path);}}
function Mode(mode,fallback){return isString(mode)?parseInt(mode,8):mode||fallback;}
function Flags(flag){return!isString(flag)?flag:FLAGS[flag]||Error("Unknown file open flag: "+flag);}
function FSError(op,code,errno,path,file,line){let error=Error(code+", "+op+" "+path,file,line);error.code=code;error.path=path;error.errno=errno;return error;}
const ReadStream=Class({extends:InputStream,initialize:function initialize(path,options){this.position=-1;this.length=-1;this.flags="r";this.mode=FILE_PERMISSION;this.bufferSize=64*1024;options=options||{};if("flags"in options&&options.flags)
this.flags=options.flags;if("bufferSize"in options&&options.bufferSize)
this.bufferSize=options.bufferSize;if("length"in options&&options.length)
this.length=options.length;if("position"in options&&options.position!==undefined)
this.position=options.position;let{flags,mode,position,length}=this;let fd=isString(path)?openSync(path,flags,mode):path;this.fd=fd;let input=nsIFileInputStream(fd);if(position>=0)
input.QueryInterface(Ci.nsISeekableStream).seek(NS_SEEK_SET,position);

let transport=createInputTransport(input,position,length,false);
InputStream.prototype.initialize.call(this,{asyncInputStream:transport.openInputStream(null,0,0)});on(this,"end",_=>{this.destroy();emit(this,"close");});this.read();},destroy:function(){closeSync(this.fd);InputStream.prototype.destroy.call(this);}});exports.ReadStream=ReadStream;exports.createReadStream=function createReadStream(path,options){return new ReadStream(path,options);};const WriteStream=Class({extends:OutputStream,initialize:function initialize(path,options){this.drainable=true;this.flags="w";this.position=-1;this.mode=FILE_PERMISSION;options=options||{};if("flags"in options&&options.flags)
this.flags=options.flags;if("mode"in options&&options.mode)
this.mode=options.mode;if("position"in options&&options.position!==undefined)
this.position=options.position;let{position,flags,mode}=this;
let fd=isString(path)?openSync(path,flags,mode):path;this.fd=fd;let output=nsIFileOutputStream(fd);if(position>=0)
output.QueryInterface(Ci.nsISeekableStream).seek(NS_SEEK_SET,position);

let transport=createOutputTransport(output,position,-1,false);
OutputStream.prototype.initialize.call(this,{asyncOutputStream:transport.openOutputStream(OPEN_UNBUFFERED,0,0),output:output});on(this,"finish",_=>{this.destroy();emit(this,"close");});},destroy:function(){OutputStream.prototype.destroy.call(this);closeSync(this.fd);}});exports.WriteStream=WriteStream;exports.createWriteStream=function createWriteStream(path,options){return new WriteStream(path,options);};const Stats=Class({initialize:function initialize(path){let file=new nsILocalFile(path);if(!file.exists())throw FSError("stat","ENOENT",34,path);nsIFile(this,file);},isDirectory:function()nsIFile(this).isDirectory(),isFile:function()nsIFile(this).isFile(),isSymbolicLink:function()nsIFile(this).isSymlink(),get mode()nsIFile(this).permissions,get size()nsIFile(this).fileSize,get mtime()nsIFile(this).lastModifiedTime,isBlockDevice:function()nsIFile(this).isSpecial(),isCharacterDevice:function()nsIFile(this).isSpecial(),isFIFO:function()nsIFile(this).isSpecial(),isSocket:function()nsIFile(this).isSpecial(), get exists()nsIFile(this).exists(),get hidden()nsIFile(this).isHidden(),get writable()nsIFile(this).isWritable(),get readable()nsIFile(this).isReadable()});exports.Stats=Stats;const LStats=Class({extends:Stats,get size()this.isSymbolicLink()?nsIFile(this).fileSizeOfLink:nsIFile(this).fileSize,get mtime()this.isSymbolicLink()?nsIFile(this).lastModifiedTimeOfLink:nsIFile(this).lastModifiedTime, get permissions()this.isSymbolicLink()?nsIFile(this).permissionsOfLink:nsIFile(this).permissions});const FStat=Class({extends:Stats,initialize:function initialize(fd){nsIFile(this,nsIFile(fd));}});function noop(){}
function Async(wrapped){return function(path,callback){let args=Array.slice(arguments);callback=args.pop();
if(typeof(callback)!=="function"){args.push(callback);callback=noop;}
setTimeout(function(){try{var result=wrapped.apply(this,args);if(result===undefined)callback(null);else callback(null,result);}catch(error){callback(error);}},0);}}
function renameSync(oldPath,newPath){let source=new nsILocalFile(oldPath);let target=new nsILocalFile(newPath);if(!source.exists())throw FSError("rename","ENOENT",34,oldPath);return source.moveTo(target.parent,target.leafName);};exports.renameSync=renameSync;let rename=Async(renameSync);exports.rename=rename;function existsSync(path){return new nsILocalFile(path).exists();}
exports.existsSync=existsSync;let exists=Async(existsSync);exports.exists=exists;function truncateSync(path,length){let fd=openSync(path,"w");ftruncateSync(fd,length);closeSync(fd);}
exports.truncateSync=truncateSync;function truncate(path,length,callback){open(path,"w",function(error,fd){if(error)return callback(error);ftruncate(fd,length,function(error){if(error){closeSync(fd);callback(error);}
else{close(fd,callback);}});});}
exports.truncate=truncate;function ftruncate(fd,length,callback){write(fd,new Buffer(length),0,length,0,function(error){callback(error);});}
exports.ftruncate=ftruncate;function ftruncateSync(fd,length=0){writeSync(fd,new Buffer(length),0,length,0);}
exports.ftruncateSync=ftruncateSync;function chownSync(path,uid,gid){throw Error("Not implemented yet!!");}
exports.chownSync=chownSync;let chown=Async(chownSync);exports.chown=chown;function lchownSync(path,uid,gid){throw Error("Not implemented yet!!");}
exports.lchownSync=chownSync;let lchown=Async(lchown);exports.lchown=lchown;function chmodSync(path,mode){let file;try{file=new nsILocalFile(path);}catch(e){throw FSError("chmod","ENOENT",34,path);}
file.permissions=Mode(mode);}
exports.chmodSync=chmodSync;let chmod=Async(chmodSync);exports.chmod=chmod;function fchmodSync(fd,mode){throw Error("Not implemented yet!!");};exports.fchmodSync=fchmodSync;let fchmod=Async(fchmodSync);exports.fchmod=fchmod;function statSync(path){return new Stats(path);};exports.statSync=statSync;let stat=Async(statSync);exports.stat=stat;function lstatSync(path){return new LStats(path);};exports.lstatSync=lstatSync;let lstat=Async(lstatSync);exports.lstat=lstat;function fstatSync(fd){return new FStat(fd);};exports.fstatSync=fstatSync;let fstat=Async(fstatSync);exports.fstat=fstat;function linkSync(source,target){throw Error("Not implemented yet!!");};exports.linkSync=linkSync;let link=Async(linkSync);exports.link=link;function symlinkSync(source,target){throw Error("Not implemented yet!!");};exports.symlinkSync=symlinkSync;let symlink=Async(symlinkSync);exports.symlink=symlink;function readlinkSync(path){return new nsILocalFile(path).target;};exports.readlinkSync=readlinkSync;let readlink=Async(readlinkSync);exports.readlink=readlink;function realpathSync(path){return new nsILocalFile(path).path;};exports.realpathSync=realpathSync;let realpath=Async(realpathSync);exports.realpath=realpath;let unlinkSync=remove;exports.unlinkSync=unlinkSync;let unlink=Async(remove);exports.unlink=unlink;let rmdirSync=remove;exports.rmdirSync=rmdirSync;let rmdir=Async(rmdirSync);exports.rmdir=rmdir;function mkdirSync(path,mode){try{return nsILocalFile(path).create(DIRECTORY_TYPE,Mode(mode));}catch(error){if(error.name==="NS_ERROR_FILE_ALREADY_EXISTS"){let{fileName,lineNumber}=error;error=FSError("mkdir","EEXIST",47,path,fileName,lineNumber);}
throw error;}};exports.mkdirSync=mkdirSync;let mkdir=Async(mkdirSync);exports.mkdir=mkdir;function readdirSync(path){try{return toArray(new nsILocalFile(path).directoryEntries).map(getFileName);}
catch(error){if(error.name==="NS_ERROR_FILE_TARGET_DOES_NOT_EXIST"||error.name==="NS_ERROR_FILE_NOT_FOUND")
{let{fileName,lineNumber}=error;error=FSError("readdir","ENOENT",34,path,fileName,lineNumber);}
throw error;}};exports.readdirSync=readdirSync;let readdir=Async(readdirSync);exports.readdir=readdir;function closeSync(fd){let input=nsIFileInputStream(fd);let output=nsIFileOutputStream(fd);if(input)input.close();if(output)output.close();nsIFile(fd,null);nsIFileInputStream(fd,null);nsIFileOutputStream(fd,null);nsIBinaryInputStream(fd,null);nsIBinaryOutputStream(fd,null);};exports.closeSync=closeSync;let close=Async(closeSync);exports.close=close;function openSync(path,flags,mode){let[fd,flags,mode,file]=[{path:path},Flags(flags),Mode(mode),nsILocalFile(path)];nsIFile(fd,file);
if(!file.exists()&&!isWritable(flags))
throw FSError("open","ENOENT",34,path);if(isReadable(flags)){let input=FileInputStream(file,flags,mode,DEFER_OPEN);nsIFileInputStream(fd,input);}
if(isWritable(flags)){let output=FileOutputStream(file,flags,mode,DEFER_OPEN);nsIFileOutputStream(fd,output);}
return fd;}
exports.openSync=openSync;let open=Async(openSync);exports.open=open;function writeSync(fd,buffer,offset,length,position){if(length+offset>buffer.length){throw Error("Length is extends beyond buffer");}
else if(length+offset!==buffer.length){buffer=buffer.slice(offset,offset+length);}
let writeStream=new WriteStream(fd,{position:position,length:length});let output=BinaryOutputStream(nsIFileOutputStream(fd));nsIBinaryOutputStream(fd,output);
output.writeByteArray(buffer.valueOf(),buffer.length);output.flush();};exports.writeSync=writeSync;function write(fd,buffer,offset,length,position,callback){if(!Buffer.isBuffer(buffer)){let encoding=null;[position,encoding,callback]=Array.slice(arguments,1);buffer=new Buffer(String(buffer),encoding);offset=0;}else if(length+offset>buffer.length){throw Error("Length is extends beyond buffer");}else if(length+offset!==buffer.length){buffer=buffer.slice(offset,offset+length);}
let writeStream=new WriteStream(fd,{position:position,length:length});writeStream.on("error",callback);writeStream.write(buffer,function onEnd(){writeStream.destroy();if(callback)
callback(null,buffer.length,buffer);});};exports.write=write;function readSync(fd,buffer,offset,length,position){let input=nsIFileInputStream(fd);if(position>=0)
input.QueryInterface(Ci.nsISeekableStream).seek(NS_SEEK_SET,position);

let binaryInputStream=BinaryInputStream(input);let count=length===ALL?binaryInputStream.available():length;if(offset===0)binaryInputStream.readArrayBuffer(count,buffer.buffer);else{let chunk=new Buffer(count);binaryInputStream.readArrayBuffer(count,chunk.buffer);chunk.copy(buffer,offset);}
return buffer.slice(offset,offset+count);};exports.readSync=readSync;function read(fd,buffer,offset,length,position,callback){let bytesRead=0;let readStream=new ReadStream(fd,{position:position,length:length});readStream.on("data",function onData(data){data.copy(buffer,offset+bytesRead);bytesRead+=data.length;});readStream.on("end",function onEnd(){callback(null,bytesRead,buffer);readStream.destroy();});};exports.read=read;function readFile(path,encoding,callback){if(isFunction(encoding)){callback=encoding
encoding=null}
let buffer=null;try{let readStream=new ReadStream(path);readStream.on("data",function(data){if(!buffer)buffer=data;else buffer=Buffer.concat([buffer,data],2);});readStream.on("error",function onError(error){callback(error);});readStream.on("end",function onEnd(){
readStream.destroy();callback(null,buffer);});}catch(error){setTimeout(callback,0,error);}};exports.readFile=readFile;function readFileSync(path,encoding){let fd=openSync(path,"r");let size=fstatSync(fd).size;let buffer=new Buffer(size);try{readSync(fd,buffer,0,ALL,0);}
finally{closeSync(fd);}
return buffer;};exports.readFileSync=readFileSync;function writeFile(path,content,encoding,callback){if(!isString(path))
throw new TypeError('path must be a string');try{if(isFunction(encoding)){callback=encoding
encoding=null}
if(isString(content))
content=new Buffer(content,encoding);let writeStream=new WriteStream(path);let error=null;writeStream.end(content,function(){writeStream.destroy();callback(error);});writeStream.on("error",function onError(reason){error=reason;writeStream.destroy();});}catch(error){callback(error);}};exports.writeFile=writeFile;function writeFileSync(filename,data,encoding){throw Error("Not implemented");};exports.writeFileSync=writeFileSync;function utimesSync(path,atime,mtime){throw Error("Not implemented");}
exports.utimesSync=utimesSync;let utimes=Async(utimesSync);exports.utimes=utimes;function futimesSync(fd,atime,mtime,callback){throw Error("Not implemented");}
exports.futimesSync=futimesSync;let futimes=Async(futimesSync);exports.futimes=futimes;function fsyncSync(fd,atime,mtime,callback){throw Error("Not implemented");}
exports.fsyncSync=fsyncSync;let fsync=Async(fsyncSync);exports.fsync=fsync;function watchFile(path,options,listener){throw Error("Not implemented");};exports.watchFile=watchFile;function unwatchFile(path,listener){throw Error("Not implemented");}
exports.unwatchFile=unwatchFile;function watch(path,options,listener){throw Error("Not implemented");}
exports.watch=watch;