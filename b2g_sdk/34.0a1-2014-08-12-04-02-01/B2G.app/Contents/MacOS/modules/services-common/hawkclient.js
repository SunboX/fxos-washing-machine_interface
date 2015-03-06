"use strict";this.EXPORTED_SYMBOLS=["HawkClient"];const{interfaces:Ci,utils:Cu}=Components;Cu.import("resource://services-common/utils.js");Cu.import("resource://services-crypto/utils.js");Cu.import("resource://services-common/hawkrequest.js");Cu.import("resource://services-common/observers.js");Cu.import("resource://gre/modules/Promise.jsm");Cu.import("resource://gre/modules/Log.jsm");Cu.import("resource://gre/modules/XPCOMUtils.jsm");Cu.import("resource://gre/modules/Services.jsm");
const PREF_LOG_LEVEL="services.hawk.loglevel";
const PREF_LOG_SENSITIVE_DETAILS="services.hawk.log.sensitive";XPCOMUtils.defineLazyGetter(this,"log",function(){let log=Log.repository.getLogger("Hawk");log.addAppender(new Log.DumpAppender());log.level=Log.Level.Error;try{let level=Services.prefs.getPrefType(PREF_LOG_LEVEL)==Ci.nsIPrefBranch.PREF_STRING&&Services.prefs.getCharPref(PREF_LOG_LEVEL);log.level=Log.Level[level]||Log.Level.Error;}catch(e){log.error(e);}
return log;});
XPCOMUtils.defineLazyGetter(this,'logPII',function(){try{return Services.prefs.getBoolPref(PREF_LOG_SENSITIVE_DETAILS);}catch(_){return false;}});this.HawkClient=function(host){this.host=host;
this._localtimeOffsetMsec=0;}
this.HawkClient.prototype={_constructError:function(restResponse,errorString){let errorObj={error:errorString,message:restResponse.statusText,code:restResponse.status,errno:restResponse.status};let retryAfter=restResponse.headers&&restResponse.headers["retry-after"];retryAfter=retryAfter?parseInt(retryAfter):retryAfter;if(retryAfter){errorObj.retryAfter=retryAfter; if(this.observerPrefix){Observers.notify(this.observerPrefix+":backoff:interval",retryAfter);}}
return errorObj;},_updateClockOffset:function(dateString){try{let serverDateMsec=Date.parse(dateString);this._localtimeOffsetMsec=serverDateMsec-this.now();log.debug("Clock offset vs "+this.host+": "+this._localtimeOffsetMsec);}catch(err){log.warn("Bad date header in server response: "+dateString);}},get localtimeOffsetMsec(){return this._localtimeOffsetMsec;},now:function(){return Date.now();},request:function(path,method,credentials=null,payloadObj={},retryOK=true){method=method.toLowerCase();let deferred=Promise.defer();let uri=this.host+path;let self=this;function _onComplete(error){let restResponse=this.response;let status=restResponse.status;log.debug("(Response) "+path+": code: "+status+" - Status text: "+restResponse.statusText);if(logPII){log.debug("Response text: "+restResponse.body);}

self._maybeNotifyBackoff(restResponse,"x-weave-backoff");self._maybeNotifyBackoff(restResponse,"x-backoff");if(error){
return deferred.reject(self._constructError(restResponse,error));}
self._updateClockOffset(restResponse.headers["date"]);if(status===401&&retryOK&&!("retry-after"in restResponse.headers)){log.debug("Received 401 for "+path+": retrying");return deferred.resolve(self.request(path,method,credentials,payloadObj,false));}



let jsonResponse={};try{jsonResponse=JSON.parse(restResponse.body);}catch(notJSON){}
let okResponse=(200<=status&&status<300);if(!okResponse||jsonResponse.error){if(jsonResponse.error){return deferred.reject(jsonResponse);}
return deferred.reject(self._constructError(restResponse,"Request failed"));}
deferred.resolve(this.response);};function onComplete(error){try{
_onComplete.call(this,error);}catch(ex){log.error("Unhandled exception processing response:"+
CommonUtils.exceptionStr(ex));deferred.reject(ex);}}
let extra={now:this.now(),localtimeOffsetMsec:this.localtimeOffsetMsec,};let request=this.newHAWKAuthenticatedRESTRequest(uri,credentials,extra);if(method=="post"||method=="put"){request[method](payloadObj,onComplete);}else{request[method](onComplete);}
return deferred.promise;},observerPrefix:null,_maybeNotifyBackoff:function(response,headerName){if(!this.observerPrefix||!response.headers){return;}
let headerVal=response.headers[headerName];if(!headerVal){return;}
let backoffInterval;try{backoffInterval=parseInt(headerVal,10);}catch(ex){log.error("hawkclient response had invalid backoff value in '"+
headerName+"' header: "+headerVal);return;}
Observers.notify(this.observerPrefix+":backoff:interval",backoffInterval);},newHAWKAuthenticatedRESTRequest:function(uri,credentials,extra){return new HAWKAuthenticatedRESTRequest(uri,credentials,extra);},}