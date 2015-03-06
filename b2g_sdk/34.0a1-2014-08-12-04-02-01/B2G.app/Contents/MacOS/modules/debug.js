
this.EXPORTED_SYMBOLS=["NS_ASSERT"];var gTraceOnAssert=true;this.NS_ASSERT=function NS_ASSERT(condition,message){if(condition)
return;var releaseBuild=true;var defB=Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getDefaultBranch(null);try{switch(defB.getCharPref("app.update.channel")){case"nightly":case"aurora":case"beta":case"default":releaseBuild=false;}}catch(ex){}
var caller=arguments.callee.caller;var assertionText="ASSERT: "+message+"\n"; Components.utils.reportError(assertionText);if(releaseBuild){return;} 
var stackText="";if(gTraceOnAssert){stackText="Stack Trace: \n";var count=0;while(caller){stackText+=count+++":"+caller.name+"(";for(var i=0;i<caller.arguments.length;++i){var arg=caller.arguments[i];stackText+=arg;if(i<caller.arguments.length-1)
stackText+=",";}
stackText+=")\n";caller=caller.arguments.callee.caller;}}
dump(assertionText+stackText);}