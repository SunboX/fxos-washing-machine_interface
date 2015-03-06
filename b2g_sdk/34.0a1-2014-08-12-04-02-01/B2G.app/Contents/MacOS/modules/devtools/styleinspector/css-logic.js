const{Cc,Ci,Cu}=require("chrome");const Services=require("Services");const DevToolsUtils=require("devtools/toolkit/DevToolsUtils");const RX_UNIVERSAL_SELECTOR=/\s*\*\s*/g;const RX_NOT=/:not\((.*?)\)/g;const RX_PSEUDO_CLASS_OR_ELT=/(:[\w-]+\().*?\)/g;const RX_CONNECTORS=/\s*[\s>+~]\s*/g;const RX_ID=/\s*#\w+\s*/g;const RX_CLASS_OR_ATTRIBUTE=/\s*(?:\.\w+|\[.+?\])\s*/g;const RX_PSEUDO=/\s*:?:([\w-]+)(\(?\)?)\s*/g;
if(Cu){Cu.importGlobalProperties(['CSS']);}
function CssLogic()
{_propertyInfos:{};}
exports.CssLogic=CssLogic;CssLogic.FILTER={USER:"user",UA:"ua",};CssLogic.MEDIA={ALL:"all",SCREEN:"screen",};CssLogic.STATUS={BEST:3,MATCHED:2,PARENT_MATCH:1,UNMATCHED:0,UNKNOWN:-1,};CssLogic.prototype={viewedElement:null,viewedDocument:null,_sheets:null,_sheetsCached:false,_ruleCount:0,_computedStyle:null, _sourceFilter:CssLogic.FILTER.USER,
_passId:0,_matchId:0,_matchedRules:null,_matchedSelectors:null, _keyframesRules:null,reset:function CssLogic_reset()
{this._propertyInfos={};this._ruleCount=0;this._sheetIndex=0;this._sheets={};this._sheetsCached=false;this._matchedRules=null;this._matchedSelectors=null;this._keyframesRules=[];},highlight:function CssLogic_highlight(aViewedElement)
{if(!aViewedElement){this.viewedElement=null;this.viewedDocument=null;this._computedStyle=null;this.reset();return;}
this.viewedElement=aViewedElement;let doc=this.viewedElement.ownerDocument;if(doc!=this.viewedDocument){this.viewedDocument=doc;this._cacheSheets();}else{this._propertyInfos={};}
this._matchedRules=null;this._matchedSelectors=null;let win=this.viewedDocument.defaultView;this._computedStyle=win.getComputedStyle(this.viewedElement,"");},get computedStyle(){return this._computedStyle;},get sourceFilter(){return this._sourceFilter;},set sourceFilter(aValue){let oldValue=this._sourceFilter;this._sourceFilter=aValue;let ruleCount=0;this.forEachSheet(function(aSheet){aSheet._sheetAllowed=-1;if(aSheet.contentSheet&&aSheet.sheetAllowed){ruleCount+=aSheet.ruleCount;}},this);this._ruleCount=ruleCount;
let needFullUpdate=(oldValue==CssLogic.FILTER.UA||aValue==CssLogic.FILTER.UA);if(needFullUpdate){this._matchedRules=null;this._matchedSelectors=null;this._propertyInfos={};}else{for each(let propertyInfo in this._propertyInfos){propertyInfo.needRefilter=true;}}},getPropertyInfo:function CssLogic_getPropertyInfo(aProperty)
{if(!this.viewedElement){return{};}
let info=this._propertyInfos[aProperty];if(!info){info=new CssPropertyInfo(this,aProperty);this._propertyInfos[aProperty]=info;}
return info;},_cacheSheets:function CssLogic_cacheSheets()
{this._passId++;this.reset(); Array.prototype.forEach.call(this.viewedDocument.styleSheets,this._cacheSheet,this);this._sheetsCached=true;},_cacheSheet:function CssLogic_cacheSheet(aDomSheet)
{if(aDomSheet.disabled){return;}
if(!this.mediaMatches(aDomSheet)){return;}
let cssSheet=this.getSheet(aDomSheet,this._sheetIndex++);if(cssSheet._passId!=this._passId){cssSheet._passId=this._passId;for(let aDomRule of aDomSheet.cssRules){if(aDomRule.type==Ci.nsIDOMCSSRule.IMPORT_RULE&&aDomRule.styleSheet&&this.mediaMatches(aDomRule)){this._cacheSheet(aDomRule.styleSheet);}else if(aDomRule.type==Ci.nsIDOMCSSRule.KEYFRAMES_RULE){this._keyframesRules.push(aDomRule);}}}},get sheets()
{if(!this._sheetsCached){this._cacheSheets();}
let sheets=[];this.forEachSheet(function(aSheet){if(aSheet.contentSheet){sheets.push(aSheet);}},this);return sheets;},get keyframesRules()
{if(!this._sheetsCached){this._cacheSheets();}
return this._keyframesRules;},getSheet:function CL_getSheet(aDomSheet,aIndex)
{let cacheId="";if(aDomSheet.href){cacheId=aDomSheet.href;}else if(aDomSheet.ownerNode&&aDomSheet.ownerNode.ownerDocument){cacheId=aDomSheet.ownerNode.ownerDocument.location;}
let sheet=null;let sheetFound=false;if(cacheId in this._sheets){for(let i=0,numSheets=this._sheets[cacheId].length;i<numSheets;i++){sheet=this._sheets[cacheId][i];if(sheet.domSheet===aDomSheet){if(aIndex!=-1){sheet.index=aIndex;}
sheetFound=true;break;}}}
if(!sheetFound){if(!(cacheId in this._sheets)){this._sheets[cacheId]=[];}
sheet=new CssSheet(this,aDomSheet,aIndex);if(sheet.sheetAllowed&&sheet.contentSheet){this._ruleCount+=sheet.ruleCount;}
this._sheets[cacheId].push(sheet);}
return sheet;},forEachSheet:function CssLogic_forEachSheet(aCallback,aScope)
{for each(let sheets in this._sheets){for(let i=0;i<sheets.length;i++){ try{let sheet=sheets[i];sheet.domSheet;
 aCallback.call(aScope,sheet,i,sheets);}catch(e){sheets.splice(i,1);i--;}}}},forSomeSheets:function CssLogic_forSomeSheets(aCallback,aScope)
{for each(let sheets in this._sheets){if(sheets.some(aCallback,aScope)){return true;}}
return false;},get ruleCount()
{if(!this._sheetsCached){this._cacheSheets();}
return this._ruleCount;},processMatchedSelectors:function CL_processMatchedSelectors(aCallback,aScope)
{if(this._matchedSelectors){if(aCallback){this._passId++;this._matchedSelectors.forEach(function(aValue){aCallback.call(aScope,aValue[0],aValue[1]);aValue[0].cssRule._passId=this._passId;},this);}
return;}
if(!this._matchedRules){this._buildMatchedRules();}
this._matchedSelectors=[];this._passId++;for(let i=0;i<this._matchedRules.length;i++){let rule=this._matchedRules[i][0];let status=this._matchedRules[i][1];rule.selectors.forEach(function(aSelector){if(aSelector._matchId!==this._matchId&&(aSelector.elementStyle||this.selectorMatchesElement(rule.domRule,aSelector.selectorIndex))){aSelector._matchId=this._matchId;this._matchedSelectors.push([aSelector,status]);if(aCallback){aCallback.call(aScope,aSelector,status);}}},this);rule._passId=this._passId;}},selectorMatchesElement:function CL_selectorMatchesElement2(domRule,idx)
{let element=this.viewedElement;do{if(domUtils.selectorMatchesElement(element,domRule,idx)){return true;}}while((element=element.parentNode)&&element.nodeType===Ci.nsIDOMNode.ELEMENT_NODE);return false;},hasMatchedSelectors:function CL_hasMatchedSelectors(aProperties)
{if(!this._matchedRules){this._buildMatchedRules();}
let result={};this._matchedRules.some(function(aValue){let rule=aValue[0];let status=aValue[1];aProperties=aProperties.filter((aProperty)=>{
if(rule.getPropertyValue(aProperty)&&(status==CssLogic.STATUS.MATCHED||(status==CssLogic.STATUS.PARENT_MATCH&&domUtils.isInheritedProperty(aProperty)))){result[aProperty]=true;return false;}
return true;});return aProperties.length==0;},this);return result;},_buildMatchedRules:function CL__buildMatchedRules()
{let domRules;let element=this.viewedElement;let filter=this.sourceFilter;let sheetIndex=0;this._matchId++;this._passId++;this._matchedRules=[];if(!element){return;}
do{let status=this.viewedElement===element?CssLogic.STATUS.MATCHED:CssLogic.STATUS.PARENT_MATCH;try{domRules=domUtils.getCSSStyleRules(element);}catch(ex){Services.console.logStringMessage("CL__buildMatchedRules error: "+ex);continue;}
for(let i=0,n=domRules.Count();i<n;i++){let domRule=domRules.GetElementAt(i);if(domRule.type!==Ci.nsIDOMCSSRule.STYLE_RULE){continue;}
let sheet=this.getSheet(domRule.parentStyleSheet,-1);if(sheet._passId!==this._passId){sheet.index=sheetIndex++;sheet._passId=this._passId;}
if(filter===CssLogic.FILTER.USER&&!sheet.contentSheet){continue;}
let rule=sheet.getRule(domRule);if(rule._passId===this._passId){continue;}
rule._matchId=this._matchId;rule._passId=this._passId;this._matchedRules.push([rule,status]);}
if(element.style&&element.style.length>0){let rule=new CssRule(null,{style:element.style},element);rule._matchId=this._matchId;rule._passId=this._passId;this._matchedRules.push([rule,status]);}}while((element=element.parentNode)&&element.nodeType===Ci.nsIDOMNode.ELEMENT_NODE);},mediaMatches:function CL_mediaMatches(aDomObject)
{let mediaText=aDomObject.media.mediaText;return!mediaText||this.viewedDocument.defaultView.matchMedia(mediaText).matches;},};CssLogic.getShortName=function CssLogic_getShortName(aElement)
{if(!aElement){return"null";}
if(aElement.id){return"#"+aElement.id;}
let priorSiblings=0;let temp=aElement;while((temp=temp.previousElementSibling)){priorSiblings++;}
return aElement.tagName+"["+priorSiblings+"]";};CssLogic.getShortNamePath=function CssLogic_getShortNamePath(aElement)
{let doc=aElement.ownerDocument;let reply=[];if(!aElement){return reply;}

do{reply.unshift({display:CssLogic.getShortName(aElement),element:aElement});aElement=aElement.parentNode;}while(aElement&&aElement!=doc.body&&aElement!=doc.head&&aElement!=doc);return reply;};CssLogic.getSelectors=function CssLogic_getSelectors(aDOMRule)
{let selectors=[];let len=domUtils.getSelectorCount(aDOMRule);for(let i=0;i<len;i++){let text=domUtils.getSelectorText(aDOMRule,i);selectors.push(text);}
return selectors;}
CssLogic.l10n=function(aName)CssLogic._strings.GetStringFromName(aName);DevToolsUtils.defineLazyGetter(CssLogic,"_strings",function()Services.strings.createBundle("chrome://global/locale/devtools/styleinspector.properties"));CssLogic.isContentStylesheet=function CssLogic_isContentStylesheet(aSheet)
{if(aSheet.ownerNode){return true;}
if(aSheet.ownerRule instanceof Ci.nsIDOMCSSImportRule){return CssLogic.isContentStylesheet(aSheet.parentStyleSheet);}
return false;};CssLogic.href=function CssLogic_href(aSheet)
{let href=aSheet.href;if(!href){href=aSheet.ownerNode.ownerDocument.location;}
return href;};CssLogic.shortSource=function CssLogic_shortSource(aSheet)
{ if(!aSheet||!aSheet.href){return CssLogic.l10n("rule.sourceInline");} 
let url={};try{url=Services.io.newURI(aSheet.href,null,null);url=url.QueryInterface(Ci.nsIURL);}catch(ex){}
if(url.fileName){return url.fileName;}
if(url.filePath){return url.filePath;}
if(url.query){return url.query;}
let dataUrl=aSheet.href.match(/^(data:[^,]*),/);return dataUrl?dataUrl[1]:aSheet.href;}
function positionInNodeList(element,nodeList){for(var i=0;i<nodeList.length;i++){if(element===nodeList[i]){return i;}}
return-1;}
CssLogic.findCssSelector=function CssLogic_findCssSelector(ele){var document=ele.ownerDocument;if(!document.contains(ele)){throw new Error('findCssSelector received element not inside document');} 
if(ele.id&&document.querySelectorAll('#'+CSS.escape(ele.id)).length===1){return'#'+CSS.escape(ele.id);} 
var tagName=ele.localName;if(tagName==='html'){return'html';}
if(tagName==='head'){return'head';}
if(tagName==='body'){return'body';} 
var selector,index,matches;if(ele.classList.length>0){for(var i=0;i<ele.classList.length;i++){selector='.'+CSS.escape(ele.classList.item(i));matches=document.querySelectorAll(selector);if(matches.length===1){return selector;}
selector=tagName+selector;matches=document.querySelectorAll(selector);if(matches.length===1){return selector;} 
index=positionInNodeList(ele,ele.parentNode.children)+1;selector=selector+':nth-child('+index+')';matches=document.querySelectorAll(selector);if(matches.length===1){return selector;}}}
if(ele.parentNode!==document){index=positionInNodeList(ele,ele.parentNode.children)+1;selector=CssLogic_findCssSelector(ele.parentNode)+' > '+
tagName+':nth-child('+index+')';}
return selector;};const TAB_CHARS="\t";CssLogic.prettifyCSS=function(text,ruleCount){if(CssLogic.LINE_SEPARATOR==null){let os=Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULRuntime).OS;CssLogic.LINE_SEPARATOR=(os==="WINNT"?"\r\n":"\n");} 
text=text.replace(/(?:^\s*<!--[\r\n]*)|(?:\s*-->\s*$)/g,"");let lineCount=text.split("\n").length-1;if(ruleCount!==null&&lineCount>=ruleCount){return text;}
let parts=[]; let partStart=0; let indent="";let indentLevel=0;for(let i=0;i<text.length;i++){let c=text[i];let shouldIndent=false;switch(c){case"}":if(i-partStart>1){ parts.push(indent+text.substring(partStart,i));partStart=i;}
indent=TAB_CHARS.repeat(--indentLevel);case";":case"{":shouldIndent=true;break;}
if(shouldIndent){let la=text[i+1]; if(!/\n/.test(la)||/^\s+$/.test(text.substring(i+1,text.length))){ parts.push(indent+text.substring(partStart,i+1));if(c=="}"){parts.push("");}
partStart=i+1;}else{return text;}}
if(c=="{"){indent=TAB_CHARS.repeat(++indentLevel);}}
return parts.join(CssLogic.LINE_SEPARATOR);};function CssSheet(aCssLogic,aDomSheet,aIndex)
{this._cssLogic=aCssLogic;this.domSheet=aDomSheet;this.index=this.contentSheet?aIndex:-100*aIndex;this._href=null;this._shortSource=null;this._sheetAllowed=null;this._rules={};this._ruleCount=-1;}
CssSheet.prototype={_passId:null,_contentSheet:null,_mediaMatches:null,get contentSheet()
{if(this._contentSheet===null){this._contentSheet=CssLogic.isContentStylesheet(this.domSheet);}
return this._contentSheet;},get disabled()
{return this.domSheet.disabled;},get mediaMatches()
{if(this._mediaMatches===null){this._mediaMatches=this._cssLogic.mediaMatches(this.domSheet);}
return this._mediaMatches;},get href()
{if(this._href){return this._href;}
this._href=CssLogic.href(this.domSheet);return this._href;},get shortSource()
{if(this._shortSource){return this._shortSource;}
this._shortSource=CssLogic.shortSource(this.domSheet);return this._shortSource;},get sheetAllowed()
{if(this._sheetAllowed!==null){return this._sheetAllowed;}
this._sheetAllowed=true;let filter=this._cssLogic.sourceFilter;if(filter===CssLogic.FILTER.USER&&!this.contentSheet){this._sheetAllowed=false;}
if(filter!==CssLogic.FILTER.USER&&filter!==CssLogic.FILTER.UA){this._sheetAllowed=(filter===this.href);}
return this._sheetAllowed;},get ruleCount()
{return this._ruleCount>-1?this._ruleCount:this.domSheet.cssRules.length;},getRule:function CssSheet_getRule(aDomRule)
{let cacheId=aDomRule.type+aDomRule.selectorText;let rule=null;let ruleFound=false;if(cacheId in this._rules){for(let i=0,rulesLen=this._rules[cacheId].length;i<rulesLen;i++){rule=this._rules[cacheId][i];if(rule.domRule===aDomRule){ruleFound=true;break;}}}
if(!ruleFound){if(!(cacheId in this._rules)){this._rules[cacheId]=[];}
rule=new CssRule(this,aDomRule);this._rules[cacheId].push(rule);}
return rule;},forEachRule:function CssSheet_forEachRule(aCallback,aScope)
{let ruleCount=0;let domRules=this.domSheet.cssRules;function _iterator(aDomRule){if(aDomRule.type==Ci.nsIDOMCSSRule.STYLE_RULE){aCallback.call(aScope,this.getRule(aDomRule));ruleCount++;}else if(aDomRule.type==Ci.nsIDOMCSSRule.MEDIA_RULE&&aDomRule.cssRules&&this._cssLogic.mediaMatches(aDomRule)){Array.prototype.forEach.call(aDomRule.cssRules,_iterator,this);}}
Array.prototype.forEach.call(domRules,_iterator,this);this._ruleCount=ruleCount;},forSomeRules:function CssSheet_forSomeRules(aCallback,aScope)
{let domRules=this.domSheet.cssRules;function _iterator(aDomRule){if(aDomRule.type==Ci.nsIDOMCSSRule.STYLE_RULE){return aCallback.call(aScope,this.getRule(aDomRule));}else if(aDomRule.type==Ci.nsIDOMCSSRule.MEDIA_RULE&&aDomRule.cssRules&&this._cssLogic.mediaMatches(aDomRule)){return Array.prototype.some.call(aDomRule.cssRules,_iterator,this);}
return false;}
return Array.prototype.some.call(domRules,_iterator,this);},toString:function CssSheet_toString()
{return"CssSheet["+this.shortSource+"]";}};function CssRule(aCssSheet,aDomRule,aElement)
{this._cssSheet=aCssSheet;this.domRule=aDomRule;let parentRule=aDomRule.parentRule;if(parentRule&&parentRule.type==Ci.nsIDOMCSSRule.MEDIA_RULE){this.mediaText=parentRule.media.mediaText;}
if(this._cssSheet){ this._selectors=null;this.line=domUtils.getRuleLine(this.domRule);this.source=this._cssSheet.shortSource+":"+this.line;if(this.mediaText){this.source+=" @media "+this.mediaText;}
this.href=this._cssSheet.href;this.contentRule=this._cssSheet.contentSheet;}else if(aElement){this._selectors=[new CssSelector(this,"@element.style",0)];this.line=-1;this.source=CssLogic.l10n("rule.sourceElement");this.href="#";this.contentRule=true;this.sourceElement=aElement;}}
CssRule.prototype={_passId:null,mediaText:"",get isMediaRule()
{return!!this.mediaText;},get sheetAllowed()
{return this._cssSheet?this._cssSheet.sheetAllowed:true;},get sheetIndex()
{return this._cssSheet?this._cssSheet.index:0;},getPropertyValue:function(aProperty)
{return this.domRule.style.getPropertyValue(aProperty);},getPropertyPriority:function(aProperty)
{return this.domRule.style.getPropertyPriority(aProperty);},get selectors()
{if(this._selectors){return this._selectors;}
this._selectors=[];if(!this.domRule.selectorText){return this._selectors;}
let selectors=CssLogic.getSelectors(this.domRule);for(let i=0,len=selectors.length;i<len;i++){this._selectors.push(new CssSelector(this,selectors[i],i));}
return this._selectors;},toString:function CssRule_toString()
{return"[CssRule "+this.domRule.selectorText+"]";},};function CssSelector(aCssRule,aSelector,aIndex)
{this.cssRule=aCssRule;this.text=aSelector;this.elementStyle=this.text=="@element.style";this._specificity=null;this.selectorIndex=aIndex;}
exports.CssSelector=CssSelector;CssSelector.prototype={_matchId:null,get source()
{return this.cssRule.source;},get sourceElement()
{return this.cssRule.sourceElement;},get href()
{return this.cssRule.href;},get contentRule()
{return this.cssRule.contentRule;},get sheetAllowed()
{return this.cssRule.sheetAllowed;},get sheetIndex()
{return this.cssRule.sheetIndex;},get ruleLine()
{return this.cssRule.line;},get pseudoElements()
{if(!CssSelector._pseudoElements){let pseudos=CssSelector._pseudoElements=new Set();pseudos.add("after");pseudos.add("before");pseudos.add("first-letter");pseudos.add("first-line");pseudos.add("selection");pseudos.add("-moz-color-swatch");pseudos.add("-moz-focus-inner");pseudos.add("-moz-focus-outer");pseudos.add("-moz-list-bullet");pseudos.add("-moz-list-number");pseudos.add("-moz-math-anonymous");pseudos.add("-moz-math-stretchy");pseudos.add("-moz-progress-bar");pseudos.add("-moz-selection");}
return CssSelector._pseudoElements;},get specificity()
{if(this.elementStyle){


 return 0x01000000;}
if(this._specificity){return this._specificity;}
this._specificity=domUtils.getSpecificity(this.cssRule.domRule,this.selectorIndex);return this._specificity;},toString:function CssSelector_toString()
{return this.text;},};function CssPropertyInfo(aCssLogic,aProperty)
{this._cssLogic=aCssLogic;this.property=aProperty;this._value="";this._matchedRuleCount=0;


this._matchedSelectors=null;}
CssPropertyInfo.prototype={get value()
{if(!this._value&&this._cssLogic.computedStyle){try{this._value=this._cssLogic.computedStyle.getPropertyValue(this.property);}catch(ex){Services.console.logStringMessage('Error reading computed style for '+
this.property);Services.console.logStringMessage(ex);}}
return this._value;},get matchedRuleCount()
{if(!this._matchedSelectors){this._findMatchedSelectors();}else if(this.needRefilter){this._refilterSelectors();}
return this._matchedRuleCount;},get matchedSelectors()
{if(!this._matchedSelectors){this._findMatchedSelectors();}else if(this.needRefilter){this._refilterSelectors();}
return this._matchedSelectors;},_findMatchedSelectors:function CssPropertyInfo_findMatchedSelectors()
{this._matchedSelectors=[];this._matchedRuleCount=0;this.needRefilter=false;this._cssLogic.processMatchedSelectors(this._processMatchedSelector,this);this._matchedSelectors.sort(function(aSelectorInfo1,aSelectorInfo2){if(aSelectorInfo1.status>aSelectorInfo2.status){return-1;}else if(aSelectorInfo2.status>aSelectorInfo1.status){return 1;}else{return aSelectorInfo1.compareTo(aSelectorInfo2);}});if(this._matchedSelectors.length>0&&this._matchedSelectors[0].status>CssLogic.STATUS.UNMATCHED){this._matchedSelectors[0].status=CssLogic.STATUS.BEST;}},_processMatchedSelector:function CssPropertyInfo_processMatchedSelector(aSelector,aStatus)
{let cssRule=aSelector.cssRule;let value=cssRule.getPropertyValue(this.property);if(value&&(aStatus==CssLogic.STATUS.MATCHED||(aStatus==CssLogic.STATUS.PARENT_MATCH&&domUtils.isInheritedProperty(this.property)))){let selectorInfo=new CssSelectorInfo(aSelector,this.property,value,aStatus);this._matchedSelectors.push(selectorInfo);if(this._cssLogic._passId!==cssRule._passId&&cssRule.sheetAllowed){this._matchedRuleCount++;}}},_refilterSelectors:function CssPropertyInfo_refilterSelectors()
{let passId=++this._cssLogic._passId;let ruleCount=0;let iterator=function(aSelectorInfo){let cssRule=aSelectorInfo.selector.cssRule;if(cssRule._passId!=passId){if(cssRule.sheetAllowed){ruleCount++;}
cssRule._passId=passId;}};if(this._matchedSelectors){this._matchedSelectors.forEach(iterator);this._matchedRuleCount=ruleCount;}
this.needRefilter=false;},toString:function CssPropertyInfo_toString()
{return"CssPropertyInfo["+this.property+"]";},};function CssSelectorInfo(aSelector,aProperty,aValue,aStatus)
{this.selector=aSelector;this.property=aProperty;this.status=aStatus;this.value=aValue;let priority=this.selector.cssRule.getPropertyPriority(this.property);this.important=(priority==="important");}
CssSelectorInfo.prototype={get source()
{return this.selector.source;},get sourceElement()
{return this.selector.sourceElement;},get href()
{return this.selector.href;},get elementStyle()
{return this.selector.elementStyle;},get specificity()
{return this.selector.specificity;},get sheetIndex()
{return this.selector.sheetIndex;},get sheetAllowed()
{return this.selector.sheetAllowed;},get ruleLine()
{return this.selector.ruleLine;},get contentRule()
{return this.selector.contentRule;},compareTo:function CssSelectorInfo_compareTo(aThat)
{if(!this.contentRule&&aThat.contentRule)return 1;if(this.contentRule&&!aThat.contentRule)return-1;if(this.elementStyle&&!aThat.elementStyle){if(!this.important&&aThat.important)return 1;else return-1;}
if(!this.elementStyle&&aThat.elementStyle){if(this.important&&!aThat.important)return-1;else return 1;}
if(this.important&&!aThat.important)return-1;if(aThat.important&&!this.important)return 1;if(this.specificity>aThat.specificity)return-1;if(aThat.specificity>this.specificity)return 1;if(this.sheetIndex>aThat.sheetIndex)return-1;if(aThat.sheetIndex>this.sheetIndex)return 1;if(this.ruleLine>aThat.ruleLine)return-1;if(aThat.ruleLine>this.ruleLine)return 1;return 0;},toString:function CssSelectorInfo_toString()
{return this.selector+" -> "+this.value;},};DevToolsUtils.defineLazyGetter(this,"domUtils",function(){return Cc["@mozilla.org/inspector/dom-utils;1"].getService(Ci.inIDOMUtils);});