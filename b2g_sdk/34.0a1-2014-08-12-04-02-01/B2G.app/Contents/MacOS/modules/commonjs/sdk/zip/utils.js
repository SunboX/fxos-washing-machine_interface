'use strict';const{Cc,Ci,Cu}=require("chrome");const{defer}=require("../core/promise");const getZipReader=function getZipReader(aFile){let{promise,resolve,reject}=defer();let zipReader=Cc["@mozilla.org/libjar/zip-reader;1"].createInstance(Ci.nsIZipReader);try{zipReader.open(aFile);}
catch(e){reject(e);}
resolve(zipReader);return promise;};exports.getZipReader=getZipReader;