const EXPORTED_SYMBOLS=["httpRequest","percentEncode"];const{classes:Cc,interfaces:Ci,utils:Cu}=Components;
function percentEncode(aString)
encodeURIComponent(aString).replace(/[!'()]/g,escape).replace(/\*/g,"%2A");function httpRequest(aUrl,aOptions){let xhr=Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Ci.nsIXMLHttpRequest);xhr.mozBackgroundRequest=true; xhr.open(aOptions.method||(aOptions.postData?"POST":"GET"),aUrl);xhr.channel.loadFlags=Ci.nsIChannel.LOAD_ANONYMOUS| Ci.nsIChannel.LOAD_BYPASS_CACHE|Ci.nsIChannel.INHIBIT_CACHING;xhr.onerror=function(aProgressEvent){if(aOptions.onError){ let request=aProgressEvent.target;let status;try{status=request.status;}
catch(e){request=request.channel.QueryInterface(Ci.nsIRequest);status=request.status;}
let statusText=status?request.statusText:"offline";aOptions.onError(statusText,null,this);}};xhr.onload=function(aRequest){try{let target=aRequest.target;if(aOptions.logger)
aOptions.logger.debug("Received response: "+target.responseText);if(target.status<200||target.status>=300){let errorText=target.responseText;if(!errorText||/<(ht|\?x)ml\b/i.test(errorText))
errorText=target.statusText;throw target.status+" - "+errorText;}
if(aOptions.onLoad)
aOptions.onLoad(target.responseText,this);}catch(e){Cu.reportError(e);if(aOptions.onError)
aOptions.onError(e,aRequest.target.responseText,this);}};if(aOptions.headers){aOptions.headers.forEach(function(header){xhr.setRequestHeader(header[0],header[1]);});}
let POSTData=aOptions.postData||"";if(Array.isArray(POSTData)){xhr.setRequestHeader("Content-Type","application/x-www-form-urlencoded; charset=utf-8");POSTData=POSTData.map(function(p)p[0]+"="+percentEncode(p[1])).join("&");}
if(aOptions.logger){aOptions.logger.log("sending request to "+aUrl+" (POSTData = "+
POSTData+")");}
xhr.send(POSTData);return xhr;}