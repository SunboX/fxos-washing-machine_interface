this.EXPORTED_SYMBOLS=["InlineSpellChecker"];var gLanguageBundle;var gRegionBundle;const MAX_UNDO_STACK_DEPTH=1;this.InlineSpellChecker=function InlineSpellChecker(aEditor){this.init(aEditor);this.mAddedWordStack=[];}
InlineSpellChecker.prototype={ init:function(aEditor)
{this.uninit();this.mEditor=aEditor;try{this.mInlineSpellChecker=this.mEditor.getInlineSpellChecker(true);}catch(e){this.mInlineSpellChecker=null;}}, uninit:function()
{this.mEditor=null;this.mInlineSpellChecker=null;this.mOverMisspelling=false;this.mMisspelling="";this.mMenu=null;this.mSpellSuggestions=[];this.mSuggestionItems=[];this.mDictionaryMenu=null;this.mDictionaryNames=[];this.mDictionaryItems=[];this.mWordNode=null;},
 initFromEvent:function(rangeParent,rangeOffset)
{this.mOverMisspelling=false;if(!rangeParent||!this.mInlineSpellChecker)
return;var selcon=this.mEditor.selectionController;var spellsel=selcon.getSelection(selcon.SELECTION_SPELLCHECK);if(spellsel.rangeCount==0)
return; var range=this.mInlineSpellChecker.getMisspelledWord(rangeParent,rangeOffset);if(!range)
return; this.mMisspelling=range.toString();this.mOverMisspelling=true;this.mWordNode=rangeParent;this.mWordOffset=rangeOffset;},
get canSpellCheck()
{
 return(this.mInlineSpellChecker!=null);},get initialSpellCheckPending(){return!!(this.mInlineSpellChecker&&!this.mInlineSpellChecker.spellChecker&&this.mInlineSpellChecker.spellCheckPending);}, get enabled()
{return(this.mInlineSpellChecker&&this.mInlineSpellChecker.enableRealTimeSpell);},set enabled(isEnabled)
{if(this.mInlineSpellChecker)
this.mEditor.setSpellcheckUserOverride(isEnabled);}, get overMisspelling()
{return this.mOverMisspelling;},
addSuggestionsToMenu:function(menu,insertBefore,maxNumber)
{if(!this.mInlineSpellChecker||!this.mOverMisspelling)
return 0; var spellchecker=this.mInlineSpellChecker.spellChecker;try{if(!spellchecker.CheckCurrentWord(this.mMisspelling))
return 0;}catch(e){return 0;}
this.mMenu=menu;this.mSpellSuggestions=[];this.mSuggestionItems=[];for(var i=0;i<maxNumber;i++){var suggestion=spellchecker.GetSuggestedWord();if(!suggestion.length)
break;this.mSpellSuggestions.push(suggestion);var item=menu.ownerDocument.createElement("menuitem");this.mSuggestionItems.push(item);item.setAttribute("label",suggestion);item.setAttribute("value",suggestion);
var callback=function(me,val){return function(evt){me.replaceMisspelling(val);}};item.addEventListener("command",callback(this,i),true);item.setAttribute("class","spell-suggestion");menu.insertBefore(item,insertBefore);}
return this.mSpellSuggestions.length;},
clearSuggestionsFromMenu:function()
{for(var i=0;i<this.mSuggestionItems.length;i++){this.mMenu.removeChild(this.mSuggestionItems[i]);}
this.mSuggestionItems=[];},
 addDictionaryListToMenu:function(menu,insertBefore)
{this.mDictionaryMenu=menu;this.mDictionaryNames=[];this.mDictionaryItems=[];if(!this.mInlineSpellChecker||!this.enabled)
return 0;var spellchecker=this.mInlineSpellChecker.spellChecker;var o1={},o2={};spellchecker.GetDictionaryList(o1,o2);var list=o1.value;var listcount=o2.value;var curlang="";try{curlang=spellchecker.GetCurrentDictionary();}catch(e){}
var sortedList=[];for(var i=0;i<list.length;i++){sortedList.push({"id":list[i],"label":this.getDictionaryDisplayName(list[i])});}
sortedList.sort(function(a,b){if(a.label<b.label)
return-1;if(a.label>b.label)
return 1;return 0;});for(var i=0;i<sortedList.length;i++){this.mDictionaryNames.push(sortedList[i].id);var item=menu.ownerDocument.createElement("menuitem");item.setAttribute("id","spell-check-dictionary-"+sortedList[i].id);item.setAttribute("label",sortedList[i].label);item.setAttribute("type","radio");this.mDictionaryItems.push(item);if(curlang==sortedList[i].id){item.setAttribute("checked","true");}else{var callback=function(me,val){return function(evt){me.selectDictionary(val,menu.ownerDocument.defaultView);}};item.addEventListener("command",callback(this,i),true);}
if(insertBefore)
menu.insertBefore(item,insertBefore);else
menu.appendChild(item);}
return list.length;},getDictionaryDisplayName:function(dictionaryName){try{let languageTagMatch=/^([a-z]{2,3}|[a-z]{4}|[a-z]{5,8})(?:[-_]([a-z]{4}))?(?:[-_]([A-Z]{2}|[0-9]{3}))?((?:[-_](?:[a-z0-9]{5,8}|[0-9][a-z0-9]{3}))*)(?:[-_][a-wy-z0-9](?:[-_][a-z0-9]{2,8})+)*(?:[-_]x(?:[-_][a-z0-9]{1,8})+)?$/i;var[languageTag,languageSubtag,scriptSubtag,regionSubtag,variantSubtags]=dictionaryName.match(languageTagMatch);}catch(e){return dictionaryName;}
if(!gLanguageBundle){var bundleService=Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);gLanguageBundle=bundleService.createBundle("chrome://global/locale/languageNames.properties");gRegionBundle=bundleService.createBundle("chrome://global/locale/regionNames.properties");}
var displayName="";try{displayName+=gLanguageBundle.GetStringFromName(languageSubtag.toLowerCase());}catch(e){displayName+=languageSubtag.toLowerCase();}
if(regionSubtag){displayName+=" (";try{displayName+=gRegionBundle.GetStringFromName(regionSubtag.toLowerCase());}catch(e){displayName+=regionSubtag.toUpperCase();}
displayName+=")";}
if(scriptSubtag){displayName+=" / ";displayName+=scriptSubtag;}
if(variantSubtags)
displayName+=" ("+variantSubtags.substr(1).split(/[-_]/).join(" / ")+")";return displayName;},
clearDictionaryListFromMenu:function()
{for(var i=0;i<this.mDictionaryItems.length;i++){this.mDictionaryMenu.removeChild(this.mDictionaryItems[i]);}
this.mDictionaryItems=[];}, selectDictionary:function(index,aWindow)
{
 const Ci=Components.interfaces;let chromeFlags=aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation).QueryInterface(Ci.nsIDocShellTreeItem).treeOwner.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIXULWindow).chromeFlags;let chromeRemoteWindow=Ci.nsIWebBrowserChrome.CHROME_REMOTE_WINDOW;if(chromeFlags&chromeRemoteWindow){return;}
if(!this.mInlineSpellChecker||index<0||index>=this.mDictionaryNames.length)
return;var spellchecker=this.mInlineSpellChecker.spellChecker;spellchecker.SetCurrentDictionary(this.mDictionaryNames[index]);this.mInlineSpellChecker.spellCheckRange(null);}, replaceMisspelling:function(index)
{if(!this.mInlineSpellChecker||!this.mOverMisspelling)
return;if(index<0||index>=this.mSpellSuggestions.length)
return;this.mInlineSpellChecker.replaceWord(this.mWordNode,this.mWordOffset,this.mSpellSuggestions[index]);}, toggleEnabled:function(aWindow)
{
 const Ci=Components.interfaces;let chromeFlags=aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation).QueryInterface(Ci.nsIDocShellTreeItem).treeOwner.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIXULWindow).chromeFlags;let chromeRemoteWindow=Ci.nsIWebBrowserChrome.CHROME_REMOTE_WINDOW;if(chromeFlags&chromeRemoteWindow){return;}
this.mEditor.setSpellcheckUserOverride(!this.mInlineSpellChecker.enableRealTimeSpell);}, addToDictionary:function()
{ if(this.mAddedWordStack.length==MAX_UNDO_STACK_DEPTH)
this.mAddedWordStack.shift();this.mAddedWordStack.push(this.mMisspelling);this.mInlineSpellChecker.addWordToDictionary(this.mMisspelling);}, undoAddToDictionary:function()
{if(this.mAddedWordStack.length>0)
{var word=this.mAddedWordStack.pop();this.mInlineSpellChecker.removeWordFromDictionary(word);}},canUndo:function()
{ return(this.mAddedWordStack.length>0);},ignoreWord:function()
{this.mInlineSpellChecker.ignoreWord(this.mMisspelling);}};