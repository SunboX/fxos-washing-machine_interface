"use strict";this.EXPORTED_SYMBOLS=["FormData"];const Cu=Components.utils;const Ci=Components.interfaces;Cu.import("resource://gre/modules/Timer.jsm");Cu.import("resource://gre/modules/XPathGenerator.jsm");function isRestorationPage(url){return url=="about:sessionrestore"||url=="about:welcomeback";}
function hasRestorationData(data){if(isRestorationPage(data.url)&&data.id){return typeof(data.id.sessionData)=="object";}
return false;}
function getDocumentURI(doc){return doc.documentURI.replace(/#.*$/,"");}
function isValidCCNumber(value){let ccNumber=value.replace(/[-\s]+/g,"");if(/[^0-9]/.test(ccNumber)){return false;}
let length=ccNumber.length;if(length!=9&&length!=15&&length!=16){return false;}
let total=0;for(let i=0;i<length;i++){let currentChar=ccNumber.charAt(length-i-1);let currentDigit=parseInt(currentChar,10);if(i%2){total+=currentDigit*2;if(currentDigit>4){total-=9;}}else{total+=currentDigit;}}
return total%10==0;}
this.FormData=Object.freeze({collect:function(frame){return FormDataInternal.collect(frame);},restore:function(frame,data){FormDataInternal.restore(frame,data);},restoreTree:function(root,data){FormDataInternal.restoreTree(root,data);}});let FormDataInternal={collect:function({document:doc}){let formNodes=doc.evaluate(XPathGenerator.restorableFormNodes,doc,XPathGenerator.resolveNS,Ci.nsIDOMXPathResult.UNORDERED_NODE_ITERATOR_TYPE,null);let node;let ret={};
const MAX_TRAVERSED_XPATHS=100;let generatedCount=0;while(node=formNodes.iterateNext()){let hasDefaultValue=true;let value;
if(!node.id&&generatedCount>MAX_TRAVERSED_XPATHS){continue;}
if(node instanceof Ci.nsIDOMHTMLInputElement&&isValidCCNumber(node.value)){continue;}
if(node instanceof Ci.nsIDOMHTMLInputElement||node instanceof Ci.nsIDOMHTMLTextAreaElement||node instanceof Ci.nsIDOMXULTextBoxElement){switch(node.type){case"checkbox":case"radio":value=node.checked;hasDefaultValue=value==node.defaultChecked;break;case"file":value={type:"file",fileList:node.mozGetFileNameArray()};hasDefaultValue=!value.fileList.length;break;default: value=node.value;hasDefaultValue=value==node.defaultValue;break;}}else if(!node.multiple){
hasDefaultValue=false;value={selectedIndex:node.selectedIndex,value:node.value};}else{
 let options=Array.map(node.options,opt=>{hasDefaultValue=hasDefaultValue&&(opt.selected==opt.defaultSelected);return opt.selected?opt.value:-1;});value=options.filter(ix=>ix>-1);}

if(hasDefaultValue){continue;}
if(node.id){ret.id=ret.id||{};ret.id[node.id]=value;}else{generatedCount++;ret.xpath=ret.xpath||{};ret.xpath[XPathGenerator.generate(node)]=value;}}
if((doc.designMode||"")=="on"&&doc.body){ret.innerHTML=doc.body.innerHTML;}
if(Object.keys(ret).length===0){return null;}

ret.url=getDocumentURI(doc);
 if(isRestorationPage(ret.url)){ret.id.sessionData=JSON.parse(ret.id.sessionData);}
return ret;},restore:function({document:doc},data){
if(!data.url||data.url!=getDocumentURI(doc)){return;}
 
if(hasRestorationData(data)){data.id.sessionData=JSON.stringify(data.id.sessionData);}
if("id"in data){let retrieveNode=id=>doc.getElementById(id);this.restoreManyInputValues(data.id,retrieveNode);}
if("xpath"in data){let retrieveNode=xpath=>XPathGenerator.resolve(doc,xpath);this.restoreManyInputValues(data.xpath,retrieveNode);}
if("innerHTML"in data){

let savedURL=doc.documentURI;setTimeout(()=>{if(doc.body&&doc.designMode=="on"&&doc.documentURI==savedURL){doc.body.innerHTML=data.innerHTML;this.fireEvent(doc.body,"input");}});}},restoreManyInputValues:function(data,retrieve){for(let key of Object.keys(data)){let input=retrieve(key);if(input){this.restoreSingleInputValue(input,data[key]);}}},restoreSingleInputValue:function(aNode,aValue){let eventType;if(typeof aValue=="string"&&aNode.type!="file"){if(aNode.value==aValue){return;}
aNode.value=aValue;eventType="input";}else if(typeof aValue=="boolean"){if(aNode.checked==aValue){return;}
aNode.checked=aValue;eventType="change";}else if(aValue&&aValue.selectedIndex>=0&&aValue.value){ if(aNode.options[aNode.selectedIndex].value==aValue.value){return;} 
for(let i=0;i<aNode.options.length;i++){if(aNode.options[i].value==aValue.value){aNode.selectedIndex=i;eventType="change";break;}}}else if(aValue&&aValue.fileList&&aValue.type=="file"&&aNode.type=="file"){aNode.mozSetFileNameArray(aValue.fileList,aValue.fileList.length);eventType="input";}else if(Array.isArray(aValue)&&aNode.options){Array.forEach(aNode.options,function(opt,index){ opt.selected=aValue.indexOf(opt.value)>-1; if(!opt.defaultSelected){eventType="change";}});} 
if(eventType){this.fireEvent(aNode,eventType);}},fireEvent:function(node,type){let doc=node.ownerDocument;let event=doc.createEvent("UIEvents");event.initUIEvent(type,true,true,doc.defaultView,0);node.dispatchEvent(event);},restoreTree:function(root,data){
if(data.url&&data.url!=getDocumentURI(root.document)){return;}
if(data.url){this.restore(root,data);}
if(!data.hasOwnProperty("children")){return;}
let frames=root.frames;for(let index of Object.keys(data.children)){if(index<frames.length){this.restoreTree(frames[index],data.children[index]);}}}};