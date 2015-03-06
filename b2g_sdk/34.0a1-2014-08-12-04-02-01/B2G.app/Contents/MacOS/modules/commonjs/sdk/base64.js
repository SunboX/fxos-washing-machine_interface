"use strict";module.metadata={"stability":"unstable"};const{Cu}=require("chrome");

var{atob,btoa}=Cu.import("resource://gre/modules/Services.jsm",{});function isUTF8(charset){let type=typeof charset;if(type==="undefined")
return false;if(type==="string"&&charset.toLowerCase()==="utf-8")
return true;throw new Error("The charset argument can be only 'utf-8'");}
exports.decode=function(data,charset){if(isUTF8(charset))
return decodeURIComponent(escape(atob(data)))
return atob(data);}
exports.encode=function(data,charset){if(isUTF8(charset))
return btoa(unescape(encodeURIComponent(data)))
return btoa(data);}