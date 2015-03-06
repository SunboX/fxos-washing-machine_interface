"use strict";this.EXPORTED_SYMBOLS=["TokenServerClient","TokenServerClientError","TokenServerClientNetworkError","TokenServerClientServerError",];const{classes:Cc,interfaces:Ci,utils:Cu,results:Cr}=Components;Cu.import("resource://gre/modules/Preferences.jsm");Cu.import("resource://gre/modules/Log.jsm");Cu.import("resource://services-common/rest.js");Cu.import("resource://services-common/utils.js");Cu.import("resource://services-common/observers.js");const Prefs=new Preferences("services.common.tokenserverclient.");this.TokenServerClientError=function TokenServerClientError(message){this.name="TokenServerClientError";this.message=message||"Client error.";}
TokenServerClientError.prototype=new Error();TokenServerClientError.prototype.constructor=TokenServerClientError;TokenServerClientError.prototype._toStringFields=function(){return{message:this.message};}
TokenServerClientError.prototype.toString=function(){return this.name+"("+JSON.stringify(this._toStringFields())+")";}
this.TokenServerClientNetworkError=function TokenServerClientNetworkError(error){this.name="TokenServerClientNetworkError";this.error=error;}
TokenServerClientNetworkError.prototype=new TokenServerClientError();TokenServerClientNetworkError.prototype.constructor=TokenServerClientNetworkError;TokenServerClientNetworkError.prototype._toStringFields=function(){return{error:this.error};}
this.TokenServerClientServerError=function TokenServerClientServerError(message,cause="general"){this.now=new Date().toISOString();this.name="TokenServerClientServerError";this.message=message||"Server error.";this.cause=cause;}
TokenServerClientServerError.prototype=new TokenServerClientError();TokenServerClientServerError.prototype.constructor=TokenServerClientServerError;TokenServerClientServerError.prototype._toStringFields=function(){let fields={now:this.now,message:this.message,cause:this.cause,};if(this.response){fields.response_body=this.response.body;fields.response_headers=this.response.headers;fields.response_status=this.response.status;}
return fields;};this.TokenServerClient=function TokenServerClient(){this._log=Log.repository.getLogger("Common.TokenServerClient");this._log.level=Log.Level[Prefs.get("logger.level")];}
TokenServerClient.prototype={_log:null,getTokenFromBrowserIDAssertion:function getTokenFromBrowserIDAssertion(url,assertion,cb,addHeaders={}){if(!url){throw new TokenServerClientError("url argument is not valid.");}
if(!assertion){throw new TokenServerClientError("assertion argument is not valid.");}
if(!cb){throw new TokenServerClientError("cb argument is not valid.");}
this._log.debug("Beginning BID assertion exchange: "+url);let req=this.newRESTRequest(url);req.setHeader("Accept","application/json");req.setHeader("Authorization","BrowserID "+assertion);for(let header in addHeaders){req.setHeader(header,addHeaders[header]);}
let client=this;req.get(function onResponse(error){if(error){cb(new TokenServerClientNetworkError(error),null);return;}
let self=this;function callCallback(error,result){if(!cb){self._log.warn("Callback already called! Did it throw?");return;}
try{cb(error,result);}catch(ex){self._log.warn("Exception when calling user-supplied callback: "+
CommonUtils.exceptionStr(ex));}
cb=null;}
try{client._processTokenResponse(this.response,callCallback);}catch(ex){this._log.warn("Error processing token server response: "+
CommonUtils.exceptionStr(ex));let error=new TokenServerClientError(ex);error.response=this.response;callCallback(error,null);}});},_processTokenResponse:function processTokenResponse(response,cb){this._log.debug("Got token response: "+response.status);
let ct=response.headers["content-type"]||"";if(ct!="application/json"&&!ct.startsWith("application/json;")){this._log.warn("Did not receive JSON response. Misconfigured server?");this._log.debug("Content-Type: "+ct);this._log.debug("Body: "+response.body);let error=new TokenServerClientServerError("Non-JSON response.","malformed-response");error.response=response;cb(error,null);return;}
let result;try{result=JSON.parse(response.body);}catch(ex){this._log.warn("Invalid JSON returned by server: "+response.body);let error=new TokenServerClientServerError("Malformed JSON.","malformed-response");error.response=response;cb(error,null);return;}
this._maybeNotifyBackoff(response,"x-weave-backoff");this._maybeNotifyBackoff(response,"x-backoff");if(response.status!=200){
if("errors"in result){

for(let error of result.errors){this._log.info("Server-reported error: "+JSON.stringify(error));}}
let error=new TokenServerClientServerError();error.response=response;if(response.status==400){error.message="Malformed request.";error.cause="malformed-request";}else if(response.status==401){
error.message="Authentication failed.";error.cause=result.status;}


else if(response.status==403){if(!("urls"in result)){this._log.warn("403 response without proper fields!");this._log.warn("Response body: "+response.body);error.message="Missing JSON fields.";error.cause="malformed-response";}else if(typeof(result.urls)!="object"){error.message="urls field is not a map.";error.cause="malformed-response";}else{error.message="Conditions must be accepted.";error.cause="conditions-required";error.urls=result.urls;}}else if(response.status==404){error.message="Unknown service.";error.cause="unknown-service";}

this._maybeNotifyBackoff(response,"retry-after");cb(error,null);return;}
for(let k of["id","key","api_endpoint","uid","duration"]){if(!(k in result)){let error=new TokenServerClientServerError("Expected key not "+" present in result: "+
k);error.cause="malformed-response";error.response=response;cb(error,null);return;}}
this._log.debug("Successful token response: "+result.id);cb(null,{id:result.id,key:result.key,endpoint:result.api_endpoint,uid:result.uid,duration:result.duration,});},observerPrefix:null,_maybeNotifyBackoff:function(response,headerName){if(!this.observerPrefix){return;}
let headerVal=response.headers[headerName];if(!headerVal){return;}
let backoffInterval;try{backoffInterval=parseInt(headerVal,10);}catch(ex){this._log.error("TokenServer response had invalid backoff value in '"+
headerName+"' header: "+headerVal);return;}
Observers.notify(this.observerPrefix+":backoff:interval",backoffInterval);},newRESTRequest:function(url){return new RESTRequest(url);}};