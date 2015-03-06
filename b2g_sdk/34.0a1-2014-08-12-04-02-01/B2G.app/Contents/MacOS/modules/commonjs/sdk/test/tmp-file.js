"use strict";const{Cc,Ci}=require("chrome");const system=require("sdk/system");const file=require("sdk/io/file");const unload=require("sdk/system/unload");const tmpDir=require("sdk/system").pathFor("TmpD");let files=[];unload.when(function(){files.forEach(function(path){ try{if(file.exists(path))
file.remove(path);}
catch(e){console.exception(e);}});});
function readBinaryURI(uri){let ioservice=Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);let channel=ioservice.newChannel(uri,"UTF-8",null);let stream=Cc["@mozilla.org/binaryinputstream;1"].createInstance(Ci.nsIBinaryInputStream);stream.setInputStream(channel.open());let data="";while(true){let available=stream.available();if(available<=0)
break;data+=stream.readBytes(available);}
stream.close();return data;}
exports.createFromString=function createFromString(data,tmpName){let filename=(tmpName?tmpName:"tmp-file")+"-"+(new Date().getTime());let path=file.join(tmpDir,filename);let tmpFile=file.open(path,"wb");tmpFile.write(data);tmpFile.close(); files.push(path);return path;}
exports.createFromURL=function createFromURL(url,tmpName){let data=readBinaryURI(url);return exports.createFromString(data,tmpName);}