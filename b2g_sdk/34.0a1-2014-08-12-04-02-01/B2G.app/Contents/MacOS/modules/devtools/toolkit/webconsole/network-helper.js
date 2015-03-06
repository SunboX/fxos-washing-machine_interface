"use strict";const{components,Cc,Ci,Cu}=require("chrome");loader.lazyImporter(this,"NetUtil","resource://gre/modules/NetUtil.jsm");let NetworkHelper={convertToUnicode:function NH_convertToUnicode(aText,aCharset)
{let conv=Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);try{conv.charset=aCharset||"UTF-8";return conv.ConvertToUnicode(aText);}
catch(ex){return aText;}},readAndConvertFromStream:function NH_readAndConvertFromStream(aStream,aCharset)
{let text=null;try{text=NetUtil.readInputStreamToString(aStream,aStream.available())
return this.convertToUnicode(text,aCharset);}
catch(err){return text;}},readPostTextFromRequest:function NH_readPostTextFromRequest(aRequest,aCharset)
{if(aRequest instanceof Ci.nsIUploadChannel){let iStream=aRequest.uploadStream;let isSeekableStream=false;if(iStream instanceof Ci.nsISeekableStream){isSeekableStream=true;}
let prevOffset;if(isSeekableStream){prevOffset=iStream.tell();iStream.seek(Ci.nsISeekableStream.NS_SEEK_SET,0);}
let text=this.readAndConvertFromStream(iStream,aCharset);

if(isSeekableStream&&prevOffset==0){iStream.seek(Ci.nsISeekableStream.NS_SEEK_SET,0);}
return text;}
return null;},readPostTextFromPage:function NH_readPostTextFromPage(aDocShell,aCharset)
{let webNav=aDocShell.QueryInterface(Ci.nsIWebNavigation);return this.readPostTextFromPageViaWebNav(webNav,aCharset);},readPostTextFromPageViaWebNav:function NH_readPostTextFromPageViaWebNav(aWebNav,aCharset)
{if(aWebNav instanceof Ci.nsIWebPageDescriptor){let descriptor=aWebNav.currentDescriptor;if(descriptor instanceof Ci.nsISHEntry&&descriptor.postData&&descriptor instanceof Ci.nsISeekableStream){descriptor.seek(NS_SEEK_SET,0);return this.readAndConvertFromStream(descriptor,aCharset);}}
return null;},getAppIdForRequest:function NH_getAppIdForRequest(aRequest)
{try{return this.getRequestLoadContext(aRequest).appId;}catch(ex){}
return null;},getTopFrameForRequest:function NH_getTopFrameForRequest(aRequest)
{try{return this.getRequestLoadContext(aRequest).topFrameElement;}catch(ex){}
return null;},getWindowForRequest:function NH_getWindowForRequest(aRequest)
{try{return this.getRequestLoadContext(aRequest).associatedWindow;}catch(ex){
}
return null;},getRequestLoadContext:function NH_getRequestLoadContext(aRequest)
{try{return aRequest.notificationCallbacks.getInterface(Ci.nsILoadContext);}catch(ex){}
try{return aRequest.loadGroup.notificationCallbacks.getInterface(Ci.nsILoadContext);}catch(ex){}
return null;},loadFromCache:function NH_loadFromCache(aUrl,aCharset,aCallback)
{let channel=NetUtil.newChannel(aUrl);channel.loadFlags=Ci.nsIRequest.LOAD_FROM_CACHE|Ci.nsICachingChannel.LOAD_ONLY_FROM_CACHE|Ci.nsICachingChannel.LOAD_BYPASS_LOCAL_CACHE_IF_BUSY;NetUtil.asyncFetch(channel,(aInputStream,aStatusCode,aRequest)=>{if(!components.isSuccessCode(aStatusCode)){aCallback(null);return;}

let aChannel=aRequest.QueryInterface(Ci.nsIChannel);let contentCharset=aChannel.contentCharset||aCharset;aCallback(this.readAndConvertFromStream(aInputStream,contentCharset));});},parseCookieHeader:function NH_parseCookieHeader(aHeader)
{let cookies=aHeader.split(";");let result=[];cookies.forEach(function(aCookie){let equal=aCookie.indexOf("=");let name=aCookie.substr(0,equal);let value=aCookie.substr(equal+1);result.push({name:unescape(name.trim()),value:unescape(value.trim())});});return result;},parseSetCookieHeader:function NH_parseSetCookieHeader(aHeader)
{let rawCookies=aHeader.split(/\r\n|\n|\r/);let cookies=[];rawCookies.forEach(function(aCookie){let equal=aCookie.indexOf("=");let name=unescape(aCookie.substr(0,equal).trim());let parts=aCookie.substr(equal+1).split(";");let value=unescape(parts.shift().trim());let cookie={name:name,value:value};parts.forEach(function(aPart){let part=aPart.trim();if(part.toLowerCase()=="secure"){cookie.secure=true;}
else if(part.toLowerCase()=="httponly"){cookie.httpOnly=true;}
else if(part.indexOf("=")>-1){let pair=part.split("=");pair[0]=pair[0].toLowerCase();if(pair[0]=="path"||pair[0]=="domain"){cookie[pair[0]]=pair[1];}
else if(pair[0]=="expires"){try{pair[1]=pair[1].replace(/-/g,' ');cookie.expires=new Date(pair[1]).toISOString();}
catch(ex){}}}});cookies.push(cookie);});return cookies;},
mimeCategoryMap:{"text/plain":"txt","text/html":"html","text/xml":"xml","text/xsl":"txt","text/xul":"txt","text/css":"css","text/sgml":"txt","text/rtf":"txt","text/x-setext":"txt","text/richtext":"txt","text/javascript":"js","text/jscript":"txt","text/tab-separated-values":"txt","text/rdf":"txt","text/xif":"txt","text/ecmascript":"js","text/vnd.curl":"txt","text/x-json":"json","text/x-js":"txt","text/js":"txt","text/vbscript":"txt","view-source":"txt","view-fragment":"txt","application/xml":"xml","application/xhtml+xml":"xml","application/atom+xml":"xml","application/rss+xml":"xml","application/vnd.mozilla.maybe.feed":"xml","application/vnd.mozilla.xul+xml":"xml","application/javascript":"js","application/x-javascript":"js","application/x-httpd-php":"txt","application/rdf+xml":"xml","application/ecmascript":"js","application/http-index-format":"txt","application/json":"json","application/x-js":"txt","multipart/mixed":"txt","multipart/x-mixed-replace":"txt","image/svg+xml":"svg","application/octet-stream":"bin","image/jpeg":"image","image/jpg":"image","image/gif":"image","image/png":"image","image/bmp":"image","application/x-shockwave-flash":"flash","video/x-flv":"flash","audio/mpeg3":"media","audio/x-mpeg-3":"media","video/mpeg":"media","video/x-mpeg":"media","audio/ogg":"media","application/ogg":"media","application/x-ogg":"media","application/x-midi":"media","audio/midi":"media","audio/x-mid":"media","audio/x-midi":"media","music/crescendo":"media","audio/wav":"media","audio/x-wav":"media","text/json":"json","application/x-json":"json","application/json-rpc":"json","application/x-web-app-manifest+json":"json",},isTextMimeType:function NH_isTextMimeType(aMimeType)
{if(aMimeType.indexOf("text/")==0){return true;}



if(/^application\/\w+(?:[\.-]\w+)*(?:\+xml|[-+]json)$/.test(aMimeType)){return true;}
let category=this.mimeCategoryMap[aMimeType]||null;switch(category){case"txt":case"js":case"json":case"css":case"html":case"svg":case"xml":return true;default:return false;}},};for(let prop of Object.getOwnPropertyNames(NetworkHelper)){exports[prop]=NetworkHelper[prop];}