"use strict";let{components,Cc,Ci,Cu}=require("chrome");let Services=require("Services");Cu.import("resource://gre/modules/XPCOMUtils.jsm");Cu.import("resource://gre/modules/NetUtil.jsm");Cu.import("resource://gre/modules/FileUtils.jsm");Cu.import("resource://gre/modules/devtools/SourceMap.jsm");const{Promise:promise}=Cu.import("resource://gre/modules/Promise.jsm",{});const events=require("sdk/event/core");const protocol=require("devtools/server/protocol");const{Arg,Option,method,RetVal,types}=protocol;const{LongStringActor,ShortLongString}=require("devtools/server/actors/string");loader.lazyGetter(this,"CssLogic",()=>require("devtools/styleinspector/css-logic").CssLogic);let TRANSITION_CLASS="moz-styleeditor-transitioning";let TRANSITION_DURATION_MS=500;let TRANSITION_RULE="\
:root.moz-styleeditor-transitioning, :root.moz-styleeditor-transitioning * {\
transition-duration: "+TRANSITION_DURATION_MS+"ms !important; \
transition-delay: 0ms !important;\
transition-timing-function: ease-out !important;\
transition-property: all !important;\
}";let LOAD_ERROR="error-load";exports.register=function(handle){handle.addTabActor(StyleEditorActor,"styleEditorActor");handle.addGlobalActor(StyleEditorActor,"styleEditorActor");};exports.unregister=function(handle){handle.removeTabActor(StyleEditorActor);handle.removeGlobalActor(StyleEditorActor);};types.addActorType("old-stylesheet");let StyleEditorActor=protocol.ActorClass({typeName:"styleeditor",get window()this.parentActor.window,get document()this.window.document,events:{"document-load":{type:"documentLoad",styleSheets:Arg(0,"array:old-stylesheet")}},form:function()
{return{actor:this.actorID};},initialize:function(conn,tabActor){protocol.Actor.prototype.initialize.call(this,null);this.parentActor=tabActor; this._sheets=new Map();},destroy:function()
{this._sheets.clear();},newDocument:method(function(){ this._clearStyleSheetActors();
 if(this.document.readyState=="complete"){this._onDocumentLoaded();}
else{this.window.addEventListener("load",this._onDocumentLoaded,false);}
return{};}),_onDocumentLoaded:function(event){if(event){this.window.removeEventListener("load",this._onDocumentLoaded,false);}
let documents=[this.document];var forms=[];for(let doc of documents){let sheetForms=this._addStyleSheets(doc.styleSheets);forms=forms.concat(sheetForms);for(let iframe of doc.getElementsByTagName("iframe")){documents.push(iframe.contentDocument);}}
events.emit(this,"document-load",forms);},_addStyleSheets:function(styleSheets)
{let sheets=[];for(let i=0;i<styleSheets.length;i++){let styleSheet=styleSheets[i];sheets.push(styleSheet); let imports=this._getImported(styleSheet);sheets=sheets.concat(imports);}
let actors=sheets.map(this._createStyleSheetActor.bind(this));return actors;},_createStyleSheetActor:function(styleSheet)
{if(this._sheets.has(styleSheet)){return this._sheets.get(styleSheet);}
let actor=new OldStyleSheetActor(styleSheet,this);this.manage(actor);this._sheets.set(styleSheet,actor);return actor;},_getImported:function(styleSheet){let imported=[];for(let i=0;i<styleSheet.cssRules.length;i++){let rule=styleSheet.cssRules[i];if(rule.type==Ci.nsIDOMCSSRule.IMPORT_RULE){
if(!rule.styleSheet){continue;}
imported.push(rule.styleSheet); imported=imported.concat(this._getImported(rule.styleSheet));}
else if(rule.type!=Ci.nsIDOMCSSRule.CHARSET_RULE){ break;}}
return imported;},_clearStyleSheetActors:function(){for(let actor in this._sheets){this.unmanage(this._sheets[actor]);}
this._sheets.clear();},newStyleSheet:method(function(text){let parent=this.document.documentElement;let style=this.document.createElementNS("http://www.w3.org/1999/xhtml","style");style.setAttribute("type","text/css");if(text){style.appendChild(this.document.createTextNode(text));}
parent.appendChild(style);let actor=this._createStyleSheetActor(style.sheet);return actor;},{request:{text:Arg(0,"string")},response:{styleSheet:RetVal("old-stylesheet")}})});let StyleEditorFront=protocol.FrontClass(StyleEditorActor,{initialize:function(client,tabForm){protocol.Front.prototype.initialize.call(this,client);this.actorID=tabForm.styleEditorActor;this.manage(this);},getStyleSheets:function(){let deferred=promise.defer();events.once(this,"document-load",(styleSheets)=>{deferred.resolve(styleSheets);});this.newDocument();return deferred.promise;},addStyleSheet:function(text){return this.newStyleSheet(text);}});let OldStyleSheetActor=protocol.ActorClass({typeName:"old-stylesheet",events:{"property-change":{type:"propertyChange",property:Arg(0,"string"),value:Arg(1,"json")},"source-load":{type:"sourceLoad",source:Arg(0,"string")},"style-applied":{type:"styleApplied"}},toString:function(){return"[OldStyleSheetActor "+this.actorID+"]";},get window()this._window||this.parentActor.window,get document()this.window.document,get href()this.rawSheet.href,get styleSheetIndex()
{if(this._styleSheetIndex==-1){for(let i=0;i<this.document.styleSheets.length;i++){if(this.document.styleSheets[i]==this.rawSheet){this._styleSheetIndex=i;break;}}}
return this._styleSheetIndex;},initialize:function(aStyleSheet,aParentActor,aWindow){protocol.Actor.prototype.initialize.call(this,null);this.rawSheet=aStyleSheet;this.parentActor=aParentActor;this.conn=this.parentActor.conn;this._window=aWindow; this.text=null;this._styleSheetIndex=-1;this._transitionRefCount=0; let ownerNode=this.rawSheet.ownerNode;if(ownerNode){let onSheetLoaded=(event)=>{ownerNode.removeEventListener("load",onSheetLoaded,false);this._notifyPropertyChanged("ruleCount");};ownerNode.addEventListener("load",onSheetLoaded,false);}},form:function(detail){if(detail==="actorid"){return this.actorID;}
let docHref;if(this.rawSheet.ownerNode){if(this.rawSheet.ownerNode instanceof Ci.nsIDOMHTMLDocument){docHref=this.rawSheet.ownerNode.location.href;}
if(this.rawSheet.ownerNode.ownerDocument){docHref=this.rawSheet.ownerNode.ownerDocument.location.href;}}
let form={actor:this.actorID, href:this.href,nodeHref:docHref,disabled:this.rawSheet.disabled,title:this.rawSheet.title,system:!CssLogic.isContentStylesheet(this.rawSheet),styleSheetIndex:this.styleSheetIndex}
try{form.ruleCount=this.rawSheet.cssRules.length;}
catch(e){}
return form;},toggleDisabled:method(function(){this.rawSheet.disabled=!this.rawSheet.disabled;this._notifyPropertyChanged("disabled");return this.rawSheet.disabled;},{response:{disabled:RetVal("boolean")}}),_notifyPropertyChanged:function(property){events.emit(this,"property-change",property,this.form()[property]);},fetchSource:method(function(){this._getText().then((content)=>{events.emit(this,"source-load",this.text);});}),_getText:function(){if(this.text){return promise.resolve(this.text);}
if(!this.href){ let content=this.rawSheet.ownerNode.textContent;this.text=content;return promise.resolve(content);}
let options={window:this.window,charset:this._getCSSCharset()};return fetch(this.href,options).then(({content})=>{this.text=content;return content;});},_getCSSCharset:function(channelCharset)
{ if(channelCharset&&channelCharset.length>0){return channelCharset;}
let sheet=this.rawSheet;if(sheet){if(sheet.cssRules){let rules=sheet.cssRules;if(rules.length&&rules.item(0).type==Ci.nsIDOMCSSRule.CHARSET_RULE){return rules.item(0).encoding;}} 
if(sheet.ownerNode&&sheet.ownerNode.getAttribute){let linkCharset=sheet.ownerNode.getAttribute("charset");if(linkCharset!=null){return linkCharset;}}
let parentSheet=sheet.parentStyleSheet;if(parentSheet&&parentSheet.cssRules&&parentSheet.cssRules[0].type==Ci.nsIDOMCSSRule.CHARSET_RULE){return parentSheet.cssRules[0].encoding;}
if(sheet.ownerNode&&sheet.ownerNode.ownerDocument.characterSet){return sheet.ownerNode.ownerDocument.characterSet;}}
return"UTF-8";},update:method(function(text,transition){DOMUtils.parseStyleSheet(this.rawSheet,text);this.text=text;this._notifyPropertyChanged("ruleCount");if(transition){this._insertTransistionRule();}
else{this._notifyStyleApplied();}},{request:{text:Arg(0,"string"),transition:Arg(1,"boolean")}}),_insertTransistionRule:function(){

if(this._transitionRefCount==0){this.rawSheet.insertRule(TRANSITION_RULE,this.rawSheet.cssRules.length);this.document.documentElement.classList.add(TRANSITION_CLASS);}
this._transitionRefCount++; 
this.window.setTimeout(this._onTransitionEnd.bind(this),Math.floor(TRANSITION_DURATION_MS*1.1));},_onTransitionEnd:function()
{if(--this._transitionRefCount==0){this.document.documentElement.classList.remove(TRANSITION_CLASS);this.rawSheet.deleteRule(this.rawSheet.cssRules.length-1);}
events.emit(this,"style-applied");}})
var OldStyleSheetFront=protocol.FrontClass(OldStyleSheetActor,{initialize:function(conn,form,ctx,detail){protocol.Front.prototype.initialize.call(this,conn,form,ctx,detail);this._onPropertyChange=this._onPropertyChange.bind(this);events.on(this,"property-change",this._onPropertyChange);},destroy:function(){events.off(this,"property-change",this._onPropertyChange);protocol.Front.prototype.destroy.call(this);},_onPropertyChange:function(property,value){this._form[property]=value;},form:function(form,detail){if(detail==="actorid"){this.actorID=form;return;}
this.actorID=form.actor;this._form=form;},getText:function(){let deferred=promise.defer();events.once(this,"source-load",(source)=>{let longStr=new ShortLongString(source);deferred.resolve(longStr);});this.fetchSource();return deferred.promise;},getOriginalSources:function(){return promise.resolve([]);},get href()this._form.href,get nodeHref()this._form.nodeHref,get disabled()!!this._form.disabled,get title()this._form.title,get isSystem()this._form.system,get styleSheetIndex()this._form.styleSheetIndex,get ruleCount()this._form.ruleCount});XPCOMUtils.defineLazyGetter(this,"DOMUtils",function(){return Cc["@mozilla.org/inspector/dom-utils;1"].getService(Ci.inIDOMUtils);});exports.StyleEditorActor=StyleEditorActor;exports.StyleEditorFront=StyleEditorFront;exports.OldStyleSheetActor=OldStyleSheetActor;exports.OldStyleSheetFront=OldStyleSheetFront;function fetch(aURL,aOptions={loadFromCache:true,window:null,charset:null}){let deferred=promise.defer();let scheme;let url=aURL.split(" -> ").pop();let charset;let contentType;try{scheme=Services.io.extractScheme(url);}catch(e){

url="file://"+url;scheme=Services.io.extractScheme(url);}
switch(scheme){case"file":case"chrome":case"resource":try{NetUtil.asyncFetch(url,function onFetch(aStream,aStatus,aRequest){if(!components.isSuccessCode(aStatus)){deferred.reject(new Error("Request failed with status code = "
+aStatus
+" after NetUtil.asyncFetch for url = "
+url));return;}
let source=NetUtil.readInputStreamToString(aStream,aStream.available());contentType=aRequest.contentType;deferred.resolve(source);aStream.close();});}catch(ex){deferred.reject(ex);}
break;default:let channel;try{channel=Services.io.newChannel(url,null,null);}catch(e if e.name=="NS_ERROR_UNKNOWN_PROTOCOL"){
url="file:///"+url;channel=Services.io.newChannel(url,null,null);}
let chunks=[];let streamListener={onStartRequest:function(aRequest,aContext,aStatusCode){if(!components.isSuccessCode(aStatusCode)){deferred.reject(new Error("Request failed with status code = "
+aStatusCode
+" in onStartRequest handler for url = "
+url));}},onDataAvailable:function(aRequest,aContext,aStream,aOffset,aCount){chunks.push(NetUtil.readInputStreamToString(aStream,aCount));},onStopRequest:function(aRequest,aContext,aStatusCode){if(!components.isSuccessCode(aStatusCode)){deferred.reject(new Error("Request failed with status code = "
+aStatusCode
+" in onStopRequest handler for url = "
+url));return;}
charset=channel.contentCharset||charset;contentType=channel.contentType;deferred.resolve(chunks.join(""));}};if(aOptions.window){ channel.loadGroup=aOptions.window.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation).QueryInterface(Ci.nsIDocumentLoader).loadGroup;}
channel.loadFlags=aOptions.loadFromCache?channel.LOAD_FROM_CACHE:channel.LOAD_BYPASS_CACHE;channel.asyncOpen(streamListener,null);break;}
return deferred.promise.then(source=>{return{content:convertToUnicode(source,charset),contentType:contentType};});}
function convertToUnicode(aString,aCharset=null){let converter=Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);try{converter.charset=aCharset||"UTF-8";return converter.ConvertToUnicode(aString);}catch(e){return aString;}}
function normalize(...aURLs){let base=Services.io.newURI(aURLs.pop(),null,null);let url;while((url=aURLs.pop())){base=Services.io.newURI(url,null,base);}
return base.spec;}
function dirname(aPath){return Services.io.newURI(".",null,Services.io.newURI(aPath,null,null)).spec;}