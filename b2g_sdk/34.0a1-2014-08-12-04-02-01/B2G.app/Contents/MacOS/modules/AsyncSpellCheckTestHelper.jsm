this.EXPORTED_SYMBOLS=["onSpellCheck",];const SPELL_CHECK_ENDED_TOPIC="inlineSpellChecker-spellCheck-ended";const SPELL_CHECK_STARTED_TOPIC="inlineSpellChecker-spellCheck-started";const{classes:Cc,interfaces:Ci,utils:Cu}=Components;function onSpellCheck(editableElement,callback){let editor=editableElement.editor;if(!editor){let win=editableElement.ownerDocument.defaultView;editor=win.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation).QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIEditingSession).getEditorForWindow(win);}
if(!editor)
throw new Error("Unable to find editor for element "+editableElement);try{
var isc=editor.getInlineSpellChecker(false);}
catch(err){



}
let waitingForEnded=isc&&isc.spellCheckPending;let count=0;function observe(subj,topic,data){if(subj!=editor)
return;count=0;let expectedTopic=waitingForEnded?SPELL_CHECK_ENDED_TOPIC:SPELL_CHECK_STARTED_TOPIC;if(topic!=expectedTopic)
Cu.reportError("Expected "+expectedTopic+" but got "+topic+"!");waitingForEnded=!waitingForEnded;}
let os=Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);os.addObserver(observe,SPELL_CHECK_STARTED_TOPIC,false);os.addObserver(observe,SPELL_CHECK_ENDED_TOPIC,false);let timer=Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);timer.init(function tick(){
if(waitingForEnded||++count<50)
return;timer.cancel();os.removeObserver(observe,SPELL_CHECK_STARTED_TOPIC);os.removeObserver(observe,SPELL_CHECK_ENDED_TOPIC);callback();},0,Ci.nsITimer.TYPE_REPEATING_SLACK);};