this.EXPORTED_SYMBOLS=["DownloadPaths",];const Cc=Components.classes;const Ci=Components.interfaces;const Cu=Components.utils;const Cr=Components.results;this.DownloadPaths={createNiceUniqueFile:function DP_createNiceUniqueFile(aTemplateFile){var curFile=aTemplateFile.clone().QueryInterface(Ci.nsILocalFile);var[base,ext]=DownloadPaths.splitBaseNameAndExtension(curFile.leafName);for(let i=1;i<10000&&curFile.exists();i++){curFile.leafName=base+"("+i+")"+ext;}





curFile.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE,0644);return curFile;},splitBaseNameAndExtension:function DP_splitBaseNameAndExtension(aLeafName){
var[,base,ext]=/(.*?)(\.[A-Z0-9]{1,3}\.(?:gz|bz2|Z)|\.[^.]*)?$/i.exec(aLeafName);return[base,ext||""];}};