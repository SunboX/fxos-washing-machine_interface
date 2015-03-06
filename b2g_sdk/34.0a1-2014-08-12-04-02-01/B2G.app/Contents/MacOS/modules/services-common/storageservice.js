"use strict";this.EXPORTED_SYMBOLS=["BasicStorageObject","StorageServiceClient","StorageServiceRequestError",];const{classes:Cc,interfaces:Ci,results:Cr,utils:Cu}=Components;Cu.import("resource://gre/modules/Preferences.jsm");Cu.import("resource://services-common/async.js");Cu.import("resource://gre/modules/Log.jsm");Cu.import("resource://services-common/rest.js");Cu.import("resource://services-common/utils.js");const Prefs=new Preferences("services.common.storageservice.");this.BasicStorageObject=function BasicStorageObject(id=null,collection=null){this.data={};this.id=id;this.collection=collection;}
BasicStorageObject.prototype={id:null,collection:null,data:null,

_validKeys:new Set(["id","payload","modified","sortindex","ttl"]),get payload(){return this.data.payload;},set payload(value){this.data.payload=value;},get modified(){return this.data.modified;},set modified(value){this.data.modified=value;},get sortindex(){if(this.data.sortindex){return this.data.sortindex||0;}
return 0;},set sortindex(value){if(!value&&value!==0){delete this.data.sortindex;return;}
this.data.sortindex=value;},get ttl(){return this.data.ttl;},set ttl(value){if(!value&&value!==0){delete this.data.ttl;return;}
this.data.ttl=value;},deserialize:function deserialize(input){let data;if(typeof(input)=="string"){data=JSON.parse(input);if(typeof(data)!="object"){throw new Error("Supplied JSON is valid but is not a JS-Object.");}}
else if(typeof(input)=="object"){data=input;}else{throw new Error("Argument must be a JSON string or object: "+
typeof(input));}
for each(let key in Object.keys(data)){if(key=="id"){this.id=data.id;continue;}
if(!this._validKeys.has(key)){throw new Error("Invalid key in object: "+key);}
this.data[key]=data[key];}},toJSON:function toJSON(){let obj={};for(let[k,v]in Iterator(this.data)){obj[k]=v;}
if(this.id){obj.id=this.id;}
return obj;},toString:function toString(){return"{ "+"id: "+this.id+" "+"modified: "+this.modified+" "+"ttl: "+this.ttl+" "+"index: "+this.sortindex+" "+"payload: "+this.payload+" }";},};this.StorageServiceRequestError=function StorageServiceRequestError(){this.serverModified=false;this.notFound=false;this.conflict=false;this.requestToolarge=false;this.network=null;this.authentication=null;this.client=null;this.server=null;}
function StorageServiceRequest(){this._log=Log.repository.getLogger("Sync.StorageService.Request");this._log.level=Log.Level[Prefs.get("log.level")];this.notModified=false;this._client=null;this._request=null;this._method=null;this._handler={};this._data=null;this._error=null;this._resultObj=null;this._locallyModifiedVersion=null;this._allowIfModified=false;this._allowIfUnmodified=false;}
StorageServiceRequest.prototype={get client(){return this._client;},get request(){return this._request;},get response(){return this._request.response;},get statusCode(){let response=this.response;return response?response.status:null;},get error(){return this._error;},get resultObj(){return this._resultObj;},set locallyModifiedVersion(value){this._locallyModifiedVersion=""+value;},set handler(value){if(typeof(value)!="object"){throw new Error("Invalid handler. Must be an Object.");}
this._handler=value;if(!value.onComplete){this._log.warn("Handler does not contain an onComplete callback!");}},get handler(){return this._handler;},dispatch:function dispatch(onComplete){if(onComplete){this.handler={onComplete:onComplete};}

this._dispatch(function _internalOnComplete(error){this._onComplete(error);this.completed=true;}.bind(this));},dispatchSynchronous:function dispatchSynchronous(onComplete){if(onComplete){this.handler={onComplete:onComplete};}
let cb=Async.makeSyncCallback();this._dispatch(cb);let error=Async.waitForSyncCallback(cb);this._onComplete(error);this.completed=true;},_data:null,_error:null,_completeParser:null,_dispatch:function _dispatch(onComplete){


if(this._allowIfModified&&this._locallyModifiedVersion){this._log.trace("Making request conditional.");this._request.setHeader("X-If-Modified-Since",this._locallyModifiedVersion);}else if(this._allowIfUnmodified&&this._locallyModifiedVersion){this._log.trace("Making request conditional.");this._request.setHeader("X-If-Unmodified-Since",this._locallyModifiedVersion);}
if(this._onDispatch){this._onDispatch();}
if(this._handler.onDispatch){this._handler.onDispatch(this);}
this._client.runListeners("onDispatch",this);this._log.info("Dispatching request: "+this._method+" "+
this._request.uri.asciiSpec);this._request.dispatch(this._method,this._data,onComplete);},_onComplete:function(error){let onCompleteCalled=false;let callOnComplete=function callOnComplete(){onCompleteCalled=true;if(!this._handler.onComplete){this._log.warn("No onComplete installed in handler!");return;}
try{this._handler.onComplete(this._error,this);}catch(ex){this._log.warn("Exception when invoking handler's onComplete: "+
CommonUtils.exceptionStr(ex));throw ex;}}.bind(this);try{if(error){this._error=new StorageServiceRequestError();this._error.network=error;this._log.info("Network error during request: "+error);this._client.runListeners("onNetworkError",this._client,this,error);callOnComplete();return;}
let response=this._request.response;this._log.info(response.status+" "+this._request.uri.asciiSpec);this._processHeaders();if(response.status==200){this._resultObj=this._completeParser(response);callOnComplete();return;}
if(response.status==201){callOnComplete();return;}
if(response.status==204){callOnComplete();return;}
if(response.status==304){this.notModified=true;callOnComplete();return;}
if(response.status==400){this._error=new StorageServiceRequestError();this._error.client=new Error("Client error!");callOnComplete();return;}
if(response.status==401){this._error=new StorageServiceRequestError();this._error.authentication=new Error("401 Received.");this._client.runListeners("onAuthFailure",this._error.authentication,this);callOnComplete();return;}
if(response.status==404){this._error=new StorageServiceRequestError();this._error.notFound=true;callOnComplete();return;}
if(response.status==409){this._error=new StorageServiceRequestError();this._error.conflict=true;callOnComplete();return;}
if(response.status==412){this._error=new StorageServiceRequestError();this._error.serverModified=true;callOnComplete();return;}
if(response.status==413){this._error=new StorageServiceRequestError();this._error.requestTooLarge=true;callOnComplete();return;}

if(response.status==415){this._log.error("415 HTTP response seen from server! This should "+"never happen!");this._error=new StorageServiceRequestError();this._error.client=new Error("415 Unsupported Media Type received!");callOnComplete();return;}
if(response.status>=500&&response.status<=599){this._log.error(response.status+" seen from server!");this._error=new StorageServiceRequestError();this._error.server=new Error(response.status+" status code.");callOnComplete();return;}
callOnComplete();}catch(ex){this._clientError=ex;this._log.info("Exception when processing _onComplete: "+ex);if(!onCompleteCalled){this._log.warn("Exception in internal response handling logic!");try{callOnComplete();}catch(ex){this._log.warn("An additional exception was encountered when "+"calling the handler's onComplete: "+ex);}}}},_processHeaders:function _processHeaders(){let headers=this._request.response.headers;if(headers["x-timestamp"]){this.serverTime=parseFloat(headers["x-timestamp"]);}
if(headers["x-backoff"]){this.backoffInterval=1000*parseInt(headers["x-backoff"],10);}
if(headers["retry-after"]){this.backoffInterval=1000*parseInt(headers["retry-after"],10);}
if(this.backoffInterval){let failure=this._request.response.status==503;this._client.runListeners("onBackoffReceived",this._client,this,this.backoffInterval,!failure);}
if(headers["x-quota-remaining"]){this.quotaRemaining=parseInt(headers["x-quota-remaining"],10);this._client.runListeners("onQuotaRemaining",this._client,this,this.quotaRemaining);}},};function StorageCollectionGetRequest(){StorageServiceRequest.call(this);}
StorageCollectionGetRequest.prototype={__proto__:StorageServiceRequest.prototype,_namedArgs:{},_streaming:true,set streaming(value){this._streaming=!!value;},set ids(value){this._namedArgs.ids=value.join(",");},set older(value){this._namedArgs.older=value;},set newer(value){this._namedArgs.newer=value;},set full(value){if(value){this._namedArgs.full="1";}else{delete this._namedArgs["full"];}},set limit(value){this._namedArgs.limit=value;},set sortOldest(value){this._namedArgs.sort="oldest";},set sortNewest(value){this._namedArgs.sort="newest";},set sortIndex(value){this._namedArgs.sort="index";},_onDispatch:function _onDispatch(){let qs=this._getQueryString();if(!qs.length){return;}
this._request.uri=CommonUtils.makeURI(this._request.uri.asciiSpec+"?"+
qs);},_getQueryString:function _getQueryString(){let args=[];for(let[k,v]in Iterator(this._namedArgs)){args.push(encodeURIComponent(k)+"="+encodeURIComponent(v));}
return args.join("&");},_completeParser:function _completeParser(response){let obj=JSON.parse(response.body);let items=obj.items;if(!Array.isArray(items)){throw new Error("Unexpected JSON response. items is missing or not an "+"array!");}
if(!this.handler.onBSORecord){return;}
for(let bso of items){this.handler.onBSORecord(this,bso);}},};function StorageCollectionSetRequest(){StorageServiceRequest.call(this);this.size=0;this.successfulIDs=[];this.failures={};this._lines=[];}
StorageCollectionSetRequest.prototype={__proto__:StorageServiceRequest.prototype,get count(){return this._lines.length;},addBSO:function addBSO(bso){if(!bso instanceof BasicStorageObject){throw new Error("argument must be a BasicStorageObject instance.");}
if(!bso.id){throw new Error("Passed BSO must have id defined.");}
this.addLine(JSON.stringify(bso));},addLine:function addLine(line){this.size+=line.length+1;this._lines.push(line);},_onDispatch:function _onDispatch(){this._data=this._lines.join("\n");this.size=this._data.length;},_completeParser:function _completeParser(response){let result=JSON.parse(response.body);for(let id of result.success){this.successfulIDs.push(id);}
this.allSucceeded=true;for(let[id,reasons]in Iterator(result.failed)){this.failures[id]=reasons;this.allSucceeded=false;}},};function StorageCollectionBatchedSet(client,collection){this.client=client;this.collection=collection;this._log=client._log;this.locallyModifiedVersion=null;this.serverModifiedVersion=null;this.successfulIDs=[];this.failures={};this._stagingRequest=client.setBSOs(this.collection);this._outgoingRequests=[];this._requestInFlight=false;this._onFinishCallback=null;this._finished=false;this._errorEncountered=false;}
StorageCollectionBatchedSet.prototype={addBSO:function addBSO(bso){if(this._errorEncountered){return;}
let line=JSON.stringify(bso);if(line.length>this.client.REQUEST_SIZE_LIMIT){throw new Error("BSO is larger than allowed limit: "+line.length+" > "+this.client.REQUEST_SIZE_LIMIT);}
if(this._stagingRequest.size+line.length>this.client.REQUEST_SIZE_LIMIT){this._log.debug("Sending request because payload size would be exceeded");this._finishStagedRequest();this._stagingRequest.addLine(line);return;}
this._stagingRequest.addLine(line);if(this._stagingRequest.count>=this.client.REQUEST_BSO_COUNT_LIMIT){this._log.debug("Sending request because BSO count threshold reached.");this._finishStagedRequest();return;}},finish:function finish(cb){if(this._finished){throw new Error("Batch request has already been finished.");}
this.flush();this._onFinishCallback=cb;this._finished=true;this._stagingRequest=null;},flush:function flush(){if(this._finished){throw new Error("Batch request has been finished.");}
if(!this._stagingRequest.count){return;}
this._finishStagedRequest();},_finishStagedRequest:function _finishStagedRequest(){this._outgoingRequests.push(this._stagingRequest);this._sendOutgoingRequest();this._stagingRequest=this.client.setBSOs(this.collection);},_sendOutgoingRequest:function _sendOutgoingRequest(){if(this._requestInFlight||this._errorEncountered){return;}
if(!this._outgoingRequests.length){return;}
let request=this._outgoingRequests.shift();if(this.locallyModifiedVersion){request.locallyModifiedVersion=this.locallyModifiedVersion;}
request.dispatch(this._onBatchComplete.bind(this));this._requestInFlight=true;},_onBatchComplete:function _onBatchComplete(error,request){this._requestInFlight=false;this.serverModifiedVersion=request.serverTime;
if(this.locallyModifiedVersion){this.locallyModifiedVersion=request.serverTime;}
for(let id of request.successfulIDs){this.successfulIDs.push(id);}
for(let[id,reason]in Iterator(request.failures)){this.failures[id]=reason;}
if(request.error){this._errorEncountered=true;}
this._checkFinish();},_checkFinish:function _checkFinish(){if(this._outgoingRequests.length&&!this._errorEncountered){this._sendOutgoingRequest();return;}
if(!this._onFinishCallback){return;}
try{this._onFinishCallback(this);}catch(ex){this._log.warn("Exception when calling finished callback: "+
CommonUtils.exceptionStr(ex));}},};Object.freeze(StorageCollectionBatchedSet.prototype);function StorageCollectionBatchedDelete(client,collection){this.client=client;this.collection=collection;this._log=client._log;this.locallyModifiedVersion=null;this.serverModifiedVersion=null;this.errors=[];this._pendingIDs=[];this._requestInFlight=false;this._finished=false;this._finishedCallback=null;}
StorageCollectionBatchedDelete.prototype={addID:function addID(id){if(this._finished){throw new Error("Cannot add IDs to a finished instance.");}

if(this.errors.length){return;}
this._pendingIDs.push(id);if(this._pendingIDs.length>=this.client.REQUEST_BSO_DELETE_LIMIT){this._sendRequest();}},finish:function finish(cb){if(this._finished){throw new Error("Batch delete instance has already been finished.");}
this._finished=true;this._finishedCallback=cb;if(this._pendingIDs.length){this._sendRequest();}},_sendRequest:function _sendRequest(){
if(this._requestInFlight||this.errors.length){return;}
let ids=this._pendingIDs.splice(0,this.client.REQUEST_BSO_DELETE_LIMIT);let request=this.client.deleteBSOs(this.collection,ids);if(this.locallyModifiedVersion){request.locallyModifiedVersion=this.locallyModifiedVersion;}
request.dispatch(this._onRequestComplete.bind(this));this._requestInFlight=true;},_onRequestComplete:function _onRequestComplete(error,request){this._requestInFlight=false;if(error){
this._log.warn("Error received from server: "+error);this.errors.push(error);}
this.serverModifiedVersion=request.serverTime;
if(this.locallyModifiedVersion){this.locallyModifiedVersion=request.serverTime;}
if(this._pendingIDs.length&&!this.errors.length){this._sendRequest();return;}
if(!this._finishedCallback){return;}
try{this._finishedCallback(this);}catch(ex){this._log.warn("Exception when invoking finished callback: "+
CommonUtils.exceptionStr(ex));}},};Object.freeze(StorageCollectionBatchedDelete.prototype);this.StorageServiceClient=function StorageServiceClient(baseURI){this._log=Log.repository.getLogger("Services.Common.StorageServiceClient");this._log.level=Log.Level[Prefs.get("log.level")];this._baseURI=baseURI;if(this._baseURI[this._baseURI.length-1]!="/"){this._baseURI+="/";}
this._log.info("Creating new StorageServiceClient under "+this._baseURI);this._listeners=[];}
StorageServiceClient.prototype={userAgent:"StorageServiceClient",REQUEST_SIZE_LIMIT:512000,REQUEST_BSO_COUNT_LIMIT:100,REQUEST_BSO_DELETE_LIMIT:100,_baseURI:null,_log:null,_listeners:null,addListener:function addListener(listener){if(!listener){throw new Error("listener argument must be an object.");}
if(this._listeners.indexOf(listener)!=-1){return;}
this._listeners.push(listener);},removeListener:function removeListener(listener){this._listeners=this._listeners.filter(function(a){return a!=listener;});},runListeners:function runListeners(name,...args){for(let listener of this._listeners){try{if(name in listener){listener[name].apply(listener,args);}}catch(ex){this._log.warn("Listener threw an exception during "+name+": "
+ex);}}},getCollectionInfo:function getCollectionInfo(){return this._getJSONGETRequest("info/collections");},getQuota:function getQuota(){return this._getJSONGETRequest("info/quota");},getCollectionUsage:function getCollectionUsage(){return this._getJSONGETRequest("info/collection_usage");},getCollectionCounts:function getCollectionCounts(){return this._getJSONGETRequest("info/collection_counts");},getCollection:function getCollection(collection){if(!collection){throw new Error("collection argument must be defined.");}
let uri=this._baseURI+"storage/"+collection;let request=this._getRequest(uri,"GET",{accept:"application/json",allowIfModified:true,requestType:StorageCollectionGetRequest});return request;},getBSO:function fetchBSO(collection,id,type=BasicStorageObject){if(!collection){throw new Error("collection argument must be defined.");}
if(!id){throw new Error("id argument must be defined.");}
let uri=this._baseURI+"storage/"+collection+"/"+id;return this._getRequest(uri,"GET",{accept:"application/json",allowIfModified:true,completeParser:function completeParser(response){let record=new type(id,collection);record.deserialize(response.body);return record;},});},setBSO:function setBSO(bso){if(!bso){throw new Error("bso argument must be defined.");}
if(!bso.collection){throw new Error("BSO instance does not have collection defined.");}
if(!bso.id){throw new Error("BSO instance does not have ID defined.");}
let uri=this._baseURI+"storage/"+bso.collection+"/"+bso.id;let request=this._getRequest(uri,"PUT",{contentType:"application/json",allowIfUnmodified:true,data:JSON.stringify(bso),});return request;},setBSOs:function setBSOs(collection){if(!collection){throw new Error("collection argument must be defined.");}
let uri=this._baseURI+"storage/"+collection;let request=this._getRequest(uri,"POST",{requestType:StorageCollectionSetRequest,contentType:"application/newlines",accept:"application/json",allowIfUnmodified:true,});return request;},setBSOsBatching:function setBSOsBatching(collection){if(!collection){throw new Error("collection argument must be defined.");}
return new StorageCollectionBatchedSet(this,collection);},deleteBSO:function deleteBSO(collection,id){if(!collection){throw new Error("collection argument must be defined.");}
if(!id){throw new Error("id argument must be defined.");}
let uri=this._baseURI+"storage/"+collection+"/"+id;return this._getRequest(uri,"DELETE",{allowIfUnmodified:true,});},deleteBSOs:function deleteBSOs(collection,ids){

let s=ids.join(",");let uri=this._baseURI+"storage/"+collection+"?ids="+s;return this._getRequest(uri,"DELETE",{allowIfUnmodified:true,});},deleteBSOsBatching:function deleteBSOsBatching(collection){if(!collection){throw new Error("collection argument must be defined.");}
return new StorageCollectionBatchedDelete(this,collection);},deleteCollection:function deleteCollection(collection){let uri=this._baseURI+"storage/"+collection;return this._getRequest(uri,"DELETE",{allowIfUnmodified:true});},deleteCollections:function deleteCollections(){let uri=this._baseURI+"storage";return this._getRequest(uri,"DELETE",{});},_getJSONGETRequest:function _getJSONGETRequest(path){let uri=this._baseURI+path;return this._getRequest(uri,"GET",{accept:"application/json",allowIfModified:true,completeParser:this._jsonResponseParser,});},_getRequest:function _getRequest(uri,method,options){if(!options.requestType){options.requestType=StorageServiceRequest;}
let request=new RESTRequest(uri);if(Prefs.get("sendVersionInfo",true)){let ua=this.userAgent+Prefs.get("client.type","desktop");request.setHeader("user-agent",ua);}
if(options.accept){request.setHeader("accept",options.accept);}
if(options.contentType){request.setHeader("content-type",options.contentType);}
let result=new options.requestType();result._request=request;result._method=method;result._client=this;result._data=options.data;if(options.completeParser){result._completeParser=options.completeParser;}
result._allowIfModified=!!options.allowIfModified;result._allowIfUnmodified=!!options.allowIfUnmodified;return result;},_jsonResponseParser:function _jsonResponseParser(response){let ct=response.headers["content-type"];if(!ct){throw new Error("No Content-Type response header! Misbehaving server!");}
if(ct!="application/json"&&ct.indexOf("application/json;")!=0){throw new Error("Non-JSON media type: "+ct);}
return JSON.parse(response.body);},};