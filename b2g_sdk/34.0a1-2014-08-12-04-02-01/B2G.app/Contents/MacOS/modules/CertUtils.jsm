
this.EXPORTED_SYMBOLS=["BadCertHandler","checkCert","readCertPrefs","validateCert"];const Ce=Components.Exception;const Ci=Components.interfaces;const Cr=Components.results;const Cu=Components.utils;Components.utils.import("resource://gre/modules/Services.jsm");this.readCertPrefs=function readCertPrefs(aPrefBranch){if(Services.prefs.getBranch(aPrefBranch).getChildList("").length==0)
return null;let certs=[];let counter=1;while(true){let prefBranchCert=Services.prefs.getBranch(aPrefBranch+counter+".");let prefCertAttrs=prefBranchCert.getChildList("");if(prefCertAttrs.length==0)
break;let certAttrs={};for each(let prefCertAttr in prefCertAttrs)
certAttrs[prefCertAttr]=prefBranchCert.getCharPref(prefCertAttr);certs.push(certAttrs);counter++;}
return certs;}
this.validateCert=function validateCert(aCertificate,aCerts){ if(!aCerts||aCerts.length==0)
return;if(!aCertificate){const missingCertErr="A required certificate was not present.";Cu.reportError(missingCertErr);throw new Ce(missingCertErr,Cr.NS_ERROR_ILLEGAL_VALUE);}
var errors=[];for(var i=0;i<aCerts.length;++i){var error=false;var certAttrs=aCerts[i];for(var name in certAttrs){if(!(name in aCertificate)){error=true;errors.push("Expected attribute '"+name+"' not present in "+"certificate.");break;}
if(aCertificate[name]!=certAttrs[name]){error=true;errors.push("Expected certificate attribute '"+name+"' "+"value incorrect, expected: '"+certAttrs[name]+"', got: '"+aCertificate[name]+"'.");break;}}
if(!error)
break;}
if(error){errors.forEach(Cu.reportError.bind(Cu));const certCheckErr="Certificate checks failed. See previous errors "+"for details.";Cu.reportError(certCheckErr);throw new Ce(certCheckErr,Cr.NS_ERROR_ILLEGAL_VALUE);}}
this.checkCert=function checkCert(aChannel,aAllowNonBuiltInCerts,aCerts){if(!aChannel.originalURI.schemeIs("https")){ if(aCerts){throw new Ce("SSL is required and URI scheme is not https.",Cr.NS_ERROR_UNEXPECTED);}
return;}
var cert=aChannel.securityInfo.QueryInterface(Ci.nsISSLStatusProvider).SSLStatus.QueryInterface(Ci.nsISSLStatus).serverCert;validateCert(cert,aCerts);if(aAllowNonBuiltInCerts===true)
return;var issuerCert=cert;while(issuerCert.issuer&&!issuerCert.issuer.equals(issuerCert))
issuerCert=issuerCert.issuer;const certNotBuiltInErr="Certificate issuer is not built-in.";if(!issuerCert)
throw new Ce(certNotBuiltInErr,Cr.NS_ERROR_ABORT);var tokenNames=issuerCert.getAllTokenNames({});if(!tokenNames||!tokenNames.some(isBuiltinToken))
throw new Ce(certNotBuiltInErr,Cr.NS_ERROR_ABORT);}
function isBuiltinToken(tokenName){return tokenName=="Builtin Object Token";}
this.BadCertHandler=function BadCertHandler(aAllowNonBuiltInCerts){this.allowNonBuiltInCerts=aAllowNonBuiltInCerts;}
BadCertHandler.prototype={ asyncOnChannelRedirect:function(oldChannel,newChannel,flags,callback){if(this.allowNonBuiltInCerts){callback.onRedirectVerifyCallback(Components.results.NS_OK);return;}

if(!(flags&Ci.nsIChannelEventSink.REDIRECT_INTERNAL))
checkCert(oldChannel);callback.onRedirectVerifyCallback(Components.results.NS_OK);}, getInterface:function(iid){return this.QueryInterface(iid);}, QueryInterface:function(iid){if(!iid.equals(Ci.nsIChannelEventSink)&&!iid.equals(Ci.nsIInterfaceRequestor)&&!iid.equals(Ci.nsISupports))
throw Cr.NS_ERROR_NO_INTERFACE;return this;}};