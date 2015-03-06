


this.EXPORTED_SYMBOLS=["Finder"];const Ci=Components.interfaces;const Cc=Components.classes;const Cu=Components.utils;Cu.import("resource://gre/modules/XPCOMUtils.jsm");Cu.import("resource://gre/modules/Geometry.jsm");Cu.import("resource://gre/modules/Services.jsm");XPCOMUtils.defineLazyServiceGetter(this,"TextToSubURIService","@mozilla.org/intl/texttosuburi;1","nsITextToSubURI");XPCOMUtils.defineLazyServiceGetter(this,"Clipboard","@mozilla.org/widget/clipboard;1","nsIClipboard");XPCOMUtils.defineLazyServiceGetter(this,"ClipboardHelper","@mozilla.org/widget/clipboardhelper;1","nsIClipboardHelper");function Finder(docShell){this._fastFind=Cc["@mozilla.org/typeaheadfind;1"].createInstance(Ci.nsITypeAheadFind);this._fastFind.init(docShell);this._docShell=docShell;this._listeners=[];this._previousLink=null;this._searchString=null;docShell.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebProgress).addProgressListener(this,Ci.nsIWebProgress.NOTIFY_LOCATION);}
Finder.prototype={addResultListener:function(aListener){if(this._listeners.indexOf(aListener)===-1)
this._listeners.push(aListener);},removeResultListener:function(aListener){this._listeners=this._listeners.filter(l=>l!=aListener);},_notify:function(aSearchString,aResult,aFindBackwards,aDrawOutline,aStoreResult=true){if(aStoreResult){this._searchString=aSearchString;this.clipboardSearchString=aSearchString}
this._outlineLink(aDrawOutline);let foundLink=this._fastFind.foundLink;let linkURL=null;if(foundLink){let docCharset=null;let ownerDoc=foundLink.ownerDocument;if(ownerDoc)
docCharset=ownerDoc.characterSet;linkURL=TextToSubURIService.unEscapeURIForUI(docCharset,foundLink.href);}
let data={result:aResult,findBackwards:aFindBackwards,linkURL:linkURL,rect:this._getResultRect(),searchString:this._searchString,storeResult:aStoreResult};for(let l of this._listeners){try{l.onFindResult(data);}catch(ex){}}},get searchString(){if(!this._searchString&&this._fastFind.searchString)
this._searchString=this._fastFind.searchString;return this._searchString;},get clipboardSearchString(){let searchString="";if(!Clipboard.supportsFindClipboard())
return searchString;try{let trans=Cc["@mozilla.org/widget/transferable;1"].createInstance(Ci.nsITransferable);trans.init(this._getWindow().QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation).QueryInterface(Ci.nsILoadContext));trans.addDataFlavor("text/unicode");Clipboard.getData(trans,Ci.nsIClipboard.kFindClipboard);let data={};let dataLen={};trans.getTransferData("text/unicode",data,dataLen);if(data.value){data=data.value.QueryInterface(Ci.nsISupportsString);searchString=data.toString();}}catch(ex){}
return searchString;},set clipboardSearchString(aSearchString){if(!aSearchString||!Clipboard.supportsFindClipboard())
return;ClipboardHelper.copyStringToClipboard(aSearchString,Ci.nsIClipboard.kFindClipboard,this._getWindow().document);},set caseSensitive(aSensitive){this._fastFind.caseSensitive=aSensitive;},fastFind:function(aSearchString,aLinksOnly,aDrawOutline){let result=this._fastFind.find(aSearchString,aLinksOnly);let searchString=this._fastFind.searchString;this._notify(searchString,result,false,aDrawOutline);},findAgain:function(aFindBackwards,aLinksOnly,aDrawOutline){let result=this._fastFind.findAgain(aFindBackwards,aLinksOnly);let searchString=this._fastFind.searchString;this._notify(searchString,result,aFindBackwards,aDrawOutline);},setSearchStringToSelection:function(){let selection=this._getWindow().getSelection();if(!selection.rangeCount)
return null;let searchString=(selection.toString()||"").trim();if(!searchString.length)
return null;this.clipboardSearchString=searchString;return searchString;},highlight:function(aHighlight,aWord){let found=this._highlight(aHighlight,aWord,null);if(aHighlight){let result=found?Ci.nsITypeAheadFind.FIND_FOUND:Ci.nsITypeAheadFind.FIND_NOTFOUND;this._notify(aWord,result,false,false,false);}},enableSelection:function(){this._fastFind.setSelectionModeAndRepaint(Ci.nsISelectionController.SELECTION_ON);this._restoreOriginalOutline();},removeSelection:function(){this._fastFind.collapseSelection();this.enableSelection();},focusContent:function(){for(let l of this._listeners){try{if(!l.shouldFocusContent())
return;}catch(ex){}}
let fastFind=this._fastFind;const fm=Cc["@mozilla.org/focus-manager;1"].getService(Ci.nsIFocusManager);try{

if(fastFind.foundLink){fm.setFocus(fastFind.foundLink,fm.FLAG_NOSCROLL);}else if(fastFind.foundEditable){fm.setFocus(fastFind.foundEditable,fm.FLAG_NOSCROLL);fastFind.collapseSelection();}else{this._getWindow().focus()}}catch(e){}},keyPress:function(aEvent){let controller=this._getSelectionController(this._getWindow());switch(aEvent.keyCode){case Ci.nsIDOMKeyEvent.DOM_VK_RETURN:if(this._fastFind.foundLink){let view=this._fastFind.foundLink.ownerDocument.defaultView;this._fastFind.foundLink.dispatchEvent(new view.MouseEvent("click",{view:view,cancelable:true,bubbles:true,ctrlKey:aEvent.ctrlKey,altKey:aEvent.altKey,shiftKey:aEvent.shiftKey,metaKey:aEvent.metaKey}));}
break;case Ci.nsIDOMKeyEvent.DOM_VK_TAB:let direction=Services.focus.MOVEFOCUS_FORWARD;if(aEvent.shiftKey){direction=Services.focus.MOVEFOCUS_BACKWARD;}
Services.focus.moveFocus(this._getWindow(),null,direction,0);break;case Ci.nsIDOMKeyEvent.DOM_VK_PAGE_UP:controller.scrollPage(false);break;case Ci.nsIDOMKeyEvent.DOM_VK_PAGE_DOWN:controller.scrollPage(true);break;case Ci.nsIDOMKeyEvent.DOM_VK_UP:controller.scrollLine(false);break;case Ci.nsIDOMKeyEvent.DOM_VK_DOWN:controller.scrollLine(true);break;}},requestMatchesCount:function(aWord,aMatchLimit,aLinksOnly){let window=this._getWindow();let result=this._countMatchesInWindow(aWord,aMatchLimit,aLinksOnly,window);for(let frame of result._framesToCount){if(result.total==-1||result.total==aMatchLimit)
break;this._countMatchesInWindow(aWord,aMatchLimit,aLinksOnly,frame,result);}

delete result._currentFound;delete result._framesToCount;for(let l of this._listeners){try{l.onMatchesCountResult(result);}catch(ex){}}},_countMatchesInWindow:function(aWord,aMatchLimit,aLinksOnly,aWindow=null,aStats=null){aWindow=aWindow||this._getWindow();aStats=aStats||{total:0,current:0,_framesToCount:new Set(),_currentFound:false};if(aStats.total==-1||aStats.total==aMatchLimit){aStats.total=-1;return aStats;}
this._collectFrames(aWindow,aStats);let foundRange=this._fastFind.getFoundRange();this._findIterator(aWord,aWindow,aRange=>{if(!aLinksOnly||this._rangeStartsInLink(aRange)){++aStats.total;if(!aStats._currentFound){++aStats.current;aStats._currentFound=(foundRange&&aRange.startContainer==foundRange.startContainer&&aRange.startOffset==foundRange.startOffset&&aRange.endContainer==foundRange.endContainer&&aRange.endOffset==foundRange.endOffset);}}
if(aStats.total==aMatchLimit){aStats.total=-1;return false;}});return aStats;},_findIterator:function(aWord,aWindow,aOnFind){let doc=aWindow.document;let body=(doc instanceof Ci.nsIDOMHTMLDocument&&doc.body)?doc.body:doc.documentElement;if(!body)
return;let searchRange=doc.createRange();searchRange.selectNodeContents(body);let startPt=searchRange.cloneRange();startPt.collapse(true);let endPt=searchRange.cloneRange();endPt.collapse(false);let retRange=null;let finder=Cc["@mozilla.org/embedcomp/rangefind;1"].createInstance().QueryInterface(Ci.nsIFind);finder.caseSensitive=this._fastFind.caseSensitive;while((retRange=finder.Find(aWord,searchRange,startPt,endPt))){if(aOnFind(retRange)===false)
break;startPt=retRange.cloneRange();startPt.collapse(false);}},_collectFrames:function(aWindow,aStats){if(!aWindow.frames||!aWindow.frames.length)
return;
for(let i=0,l=aWindow.frames.length;i<l;++i){let frame=aWindow.frames[i];let frameEl=frame&&frame.frameElement;if(!frameEl)
continue;let range=aWindow.document.createRange();range.setStart(frameEl,0);range.setEnd(frameEl,0);if(!this._fastFind.isRangeVisible(range,this._getDocShell(range),true))
continue;if(!aStats._framesToCount.has(frame))
aStats._framesToCount.add(frame);this._collectFrames(frame,aStats);}},_getDocShell:function(aWindowOrRange){let window=aWindowOrRange;if(aWindowOrRange instanceof Ci.nsIDOMRange)
window=aWindowOrRange.startContainer.ownerDocument.defaultView;return window.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation).QueryInterface(Ci.nsIDocShell);},_getWindow:function(){return this._docShell.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindow);},_getResultRect:function(){let topWin=this._getWindow();let win=this._fastFind.currentWindow;if(!win)
return null;let selection=win.getSelection();if(!selection.rangeCount||selection.isCollapsed){let nodes=win.document.querySelectorAll("input, textarea");for(let node of nodes){if(node instanceof Ci.nsIDOMNSEditableElement&&node.editor){let sc=node.editor.selectionController;selection=sc.getSelection(Ci.nsISelectionController.SELECTION_NORMAL);if(selection.rangeCount&&!selection.isCollapsed){break;}}}}
let utils=topWin.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);let scrollX={},scrollY={};utils.getScrollXY(false,scrollX,scrollY);for(let frame=win;frame!=topWin;frame=frame.parent){let rect=frame.frameElement.getBoundingClientRect();let left=frame.getComputedStyle(frame.frameElement,"").borderLeftWidth;let top=frame.getComputedStyle(frame.frameElement,"").borderTopWidth;scrollX.value+=rect.left+parseInt(left,10);scrollY.value+=rect.top+parseInt(top,10);}
let rect=Rect.fromRect(selection.getRangeAt(0).getBoundingClientRect());return rect.translate(scrollX.value,scrollY.value);},_outlineLink:function(aDrawOutline){let foundLink=this._fastFind.foundLink;
if(foundLink==this._previousLink&&aDrawOutline)
return;this._restoreOriginalOutline();if(foundLink&&aDrawOutline){ this._tmpOutline=foundLink.style.outline;this._tmpOutlineOffset=foundLink.style.outlineOffset;

foundLink.style.outline="1px dotted";foundLink.style.outlineOffset="0";this._previousLink=foundLink;}},_restoreOriginalOutline:function(){if(this._previousLink){this._previousLink.style.outline=this._tmpOutline;this._previousLink.style.outlineOffset=this._tmpOutlineOffset;this._previousLink=null;}},_highlight:function(aHighlight,aWord,aWindow){let win=aWindow||this._getWindow();let found=false;for(let i=0;win.frames&&i<win.frames.length;i++){if(this._highlight(aHighlight,aWord,win.frames[i]))
found=true;}
let controller=this._getSelectionController(win);let doc=win.document;if(!controller||!doc||!doc.documentElement){ return found;}
if(aHighlight){this._findIterator(aWord,win,aRange=>{this._highlightRange(aRange,controller);found=true;});}else{ let sel=controller.getSelection(Ci.nsISelectionController.SELECTION_FIND);sel.removeAllRanges();
 if(this._editors){for(let x=this._editors.length-1;x>=0;--x){if(this._editors[x].document==doc){sel=this._editors[x].selectionController.getSelection(Ci.nsISelectionController.SELECTION_FIND);sel.removeAllRanges(); this._unhookListenersAtIndex(x);}}}
found=true;}
return found;},_highlightRange:function(aRange,aController){let node=aRange.startContainer;let controller=aController;let editableNode=this._getEditableNode(node);if(editableNode)
controller=editableNode.editor.selectionController;let findSelection=controller.getSelection(Ci.nsISelectionController.SELECTION_FIND);findSelection.addRange(aRange);if(editableNode){
 if(!this._editors){this._editors=[];this._stateListeners=[];}
let existingIndex=this._editors.indexOf(editableNode.editor);if(existingIndex==-1){let x=this._editors.length;this._editors[x]=editableNode.editor;this._stateListeners[x]=this._createStateListener();this._editors[x].addEditActionListener(this);this._editors[x].addDocumentStateListener(this._stateListeners[x]);}}},_getSelectionController:function(aWindow){ if(!aWindow.innerWidth||!aWindow.innerHeight)
return null;let docShell=aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation).QueryInterface(Ci.nsIDocShell);let controller=docShell.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsISelectionDisplay).QueryInterface(Ci.nsISelectionController);return controller;},_getEditableNode:function(aNode){while(aNode){if(aNode instanceof Ci.nsIDOMNSEditableElement)
return aNode.editor?aNode:null;aNode=aNode.parentNode;}
return null;},_unhookListenersAtIndex:function(aIndex){this._editors[aIndex].removeEditActionListener(this);this._editors[aIndex].removeDocumentStateListener(this._stateListeners[aIndex]);this._editors.splice(aIndex,1);this._stateListeners.splice(aIndex,1);if(!this._editors.length){delete this._editors;delete this._stateListeners;}},_removeEditorListeners:function(aEditor){
 let idx=this._editors.indexOf(aEditor);if(idx==-1)
return; this._unhookListenersAtIndex(idx);},_checkOverlap:function(aSelectionRange,aFindRange){


 if(aFindRange.isPointInRange(aSelectionRange.startContainer,aSelectionRange.startOffset))
return true;if(aFindRange.isPointInRange(aSelectionRange.endContainer,aSelectionRange.endOffset))
return true;if(aSelectionRange.isPointInRange(aFindRange.startContainer,aFindRange.startOffset))
return true;if(aSelectionRange.isPointInRange(aFindRange.endContainer,aFindRange.endOffset))
return true;return false;},_findRange:function(aSelection,aNode,aOffset){let rangeCount=aSelection.rangeCount;let rangeidx=0;let foundContainingRange=false;let range=null; while(!foundContainingRange&&rangeidx<rangeCount){range=aSelection.getRangeAt(rangeidx);if(range.isPointInRange(aNode,aOffset)){foundContainingRange=true;break;}
rangeidx++;}
if(foundContainingRange)
return range;return null;},_rangeStartsInLink:function(aRange){let isInsideLink=false;let node=aRange.startContainer;if(node.nodeType==node.ELEMENT_NODE){if(node.hasChildNodes){let childNode=node.item(aRange.startOffset);if(childNode)
node=childNode;}}
const XLink_NS="http://www.w3.org/1999/xlink";do{if(node instanceof HTMLAnchorElement){isInsideLink=node.hasAttribute("href");break;}else if(typeof node.hasAttributeNS=="function"&&node.hasAttributeNS(XLink_NS,"href")){isInsideLink=(node.getAttributeNS(XLink_NS,"type")=="simple");break;}
node=node.parentNode;}while(node);return isInsideLink;},onLocationChange:function(aWebProgress,aRequest,aLocation,aFlags){if(!aWebProgress.isTopLevel)
return;this._previousLink=null;}, WillDeleteText:function(aTextNode,aOffset,aLength){let editor=this._getEditableNode(aTextNode).editor;let controller=editor.selectionController;let fSelection=controller.getSelection(Ci.nsISelectionController.SELECTION_FIND);let range=this._findRange(fSelection,aTextNode,aOffset);if(range){
 if(aTextNode!=range.endContainer||aOffset!=range.endOffset){
 fSelection.removeRange(range);if(fSelection.rangeCount==0)
this._removeEditorListeners(editor);}}},DidInsertText:function(aTextNode,aOffset,aString){let editor=this._getEditableNode(aTextNode).editor;let controller=editor.selectionController;let fSelection=controller.getSelection(Ci.nsISelectionController.SELECTION_FIND);let range=this._findRange(fSelection,aTextNode,aOffset);if(range){
 if(aTextNode==range.startContainer&&aOffset==range.startOffset){range.setStart(range.startContainer,range.startOffset+aString.length);}else if(aTextNode!=range.endContainer||aOffset!=range.endOffset){
 fSelection.removeRange(range);if(fSelection.rangeCount==0)
this._removeEditorListeners(editor);}}},WillDeleteSelection:function(aSelection){let editor=this._getEditableNode(aSelection.getRangeAt(0).startContainer).editor;let controller=editor.selectionController;let fSelection=controller.getSelection(Ci.nsISelectionController.SELECTION_FIND);let selectionIndex=0;let findSelectionIndex=0;let shouldDelete={};let numberOfDeletedSelections=0;let numberOfMatches=fSelection.rangeCount;


for(let fIndex=0;fIndex<numberOfMatches;fIndex++){shouldDelete[fIndex]=false;let fRange=fSelection.getRangeAt(fIndex);for(let index=0;index<aSelection.rangeCount;index++){if(shouldDelete[fIndex])
continue;let selRange=aSelection.getRangeAt(index);let doesOverlap=this._checkOverlap(selRange,fRange);if(doesOverlap){shouldDelete[fIndex]=true;numberOfDeletedSelections++;}}}

if(numberOfDeletedSelections==0)
return;for(let i=numberOfMatches-1;i>=0;i--){if(shouldDelete[i])
fSelection.removeRange(fSelection.getRangeAt(i));} 
if(fSelection.rangeCount==0)
this._removeEditorListeners(editor);},_onEditorDestruction:function(aListener){
let idx=0;while(this._stateListeners[idx]!=aListener)
idx++; this._unhookListenersAtIndex(idx);},_createStateListener:function(){return{findbar:this,QueryInterface:function(aIID){if(aIID.equals(Ci.nsIDocumentStateListener)||aIID.equals(Ci.nsISupports))
return this;throw Components.results.NS_ERROR_NO_INTERFACE;},NotifyDocumentWillBeDestroyed:function(){this.findbar._onEditorDestruction(this);}, notifyDocumentCreated:function(){},notifyDocumentStateChanged:function(aDirty){}};},QueryInterface:XPCOMUtils.generateQI([Ci.nsIWebProgressListener,Ci.nsISupportsWeakReference])};