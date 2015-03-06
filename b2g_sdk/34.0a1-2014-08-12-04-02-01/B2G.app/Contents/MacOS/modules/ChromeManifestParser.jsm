"use strict";this.EXPORTED_SYMBOLS=["ChromeManifestParser"];const Cc=Components.classes;const Ci=Components.interfaces;const Cr=Components.results;const Cu=Components.utils;Cu.import("resource://gre/modules/Services.jsm");Cu.import("resource://gre/modules/NetUtil.jsm");const MSG_JAR_FLUSH="AddonJarFlush";function flushJarCache(aJarFile){Services.obs.notifyObservers(aJarFile,"flush-cache-entry",null);Cc["@mozilla.org/globalmessagemanager;1"].getService(Ci.nsIMessageBroadcaster).broadcastAsyncMessage(MSG_JAR_FLUSH,aJarFile.path);}
this.ChromeManifestParser={parseSync:function CMP_parseSync(aURI){function parseLine(aLine){let line=aLine.trim();if(line.length==0||line.charAt(0)=='#')
return;let tokens=line.split(/\s+/);let type=tokens.shift();if(type=="manifest"){let uri=NetUtil.newURI(tokens.shift(),null,aURI);data=data.concat(this.parseSync(uri));}else{data.push({type:type,baseURI:baseURI,args:tokens});}}
let contents="";try{if(aURI.scheme=="jar")
contents=this._readFromJar(aURI);else
contents=this._readFromFile(aURI);}catch(e){}
if(!contents)
return[];let baseURI=NetUtil.newURI(".",null,aURI).spec;let data=[];let lines=contents.split("\n");lines.forEach(parseLine.bind(this));return data;},_readFromJar:function CMP_readFromJar(aURI){let data="";let entries=[];let readers=[];try{let uri=aURI.clone();while(uri instanceof Ci.nsIJARURI){entries.push(uri.JAREntry);uri=uri.JARFile;}
let reader=Cc["@mozilla.org/libjar/zip-reader;1"].createInstance(Ci.nsIZipReader);reader.open(uri.QueryInterface(Ci.nsIFileURL).file);readers.push(reader);for(let i=entries.length-1;i>0;i--){let innerReader=Cc["@mozilla.org/libjar/zip-reader;1"].createInstance(Ci.nsIZipReader);innerReader.openInner(reader,entries[i]);readers.push(innerReader);reader=innerReader;}
let zis=reader.getInputStream(entries[0]);data=NetUtil.readInputStreamToString(zis,zis.available());}
finally{for(let i=readers.length-1;i>=0;i--){readers[i].close();flushJarCache(readers[i].file);}}
return data;},_readFromFile:function CMP_readFromFile(aURI){let file=aURI.QueryInterface(Ci.nsIFileURL).file;if(!file.exists()||!file.isFile())
return"";let data="";let fis=Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);try{fis.init(file,-1,-1,false);data=NetUtil.readInputStreamToString(fis,fis.available());}finally{fis.close();}
return data;},hasType:function CMP_hasType(aManifest,aType){return aManifest.some(function hasType_matchEntryType(aEntry){return aEntry.type==aType;});}};