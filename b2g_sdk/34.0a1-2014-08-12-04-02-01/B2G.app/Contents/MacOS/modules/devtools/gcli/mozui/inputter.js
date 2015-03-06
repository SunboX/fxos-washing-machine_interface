'use strict';var Promise=require('../util/promise').Promise;var util=require('../util/util');var KeyEvent=require('../util/util').KeyEvent;var Status=require('../types/types').Status;var History=require('../ui/history').History;var RESOLVED=Promise.resolve(true);function Inputter(options,components){this.requisition=components.requisition;this.focusManager=components.focusManager;this.element=components.element;this.element.classList.add('gcli-in-input');this.element.spellcheck=false;this.document=this.element.ownerDocument;this.lastTabDownAt=0;this._caretChange=null; this.onKeyDown=this.onKeyDown.bind(this);this.onKeyUp=this.onKeyUp.bind(this);this.element.addEventListener('keydown',this.onKeyDown,false);this.element.addEventListener('keyup',this.onKeyUp,false); this.history=new History();this._scrollingThroughHistory=false; this._choice=null;this.onChoiceChange=util.createEvent('Inputter.onChoiceChange'); this.onMouseUp=this.onMouseUp.bind(this);this.element.addEventListener('mouseup',this.onMouseUp,false);if(this.focusManager){this.focusManager.addMonitoredElement(this.element,'input');} 
this._completed=RESOLVED;this.textChanged=this.textChanged.bind(this);this.outputted=this.outputted.bind(this);this.requisition.commandOutputManager.onOutput.add(this.outputted,this);this.assignment=this.requisition.getAssignmentAt(0);this.onAssignmentChange=util.createEvent('Inputter.onAssignmentChange');this.onInputChange=util.createEvent('Inputter.onInputChange');this.onResize=util.createEvent('Inputter.onResize');this.onWindowResize=this.onWindowResize.bind(this);this.document.defaultView.addEventListener('resize',this.onWindowResize,false);this.requisition.onExternalUpdate.add(this.textChanged,this);this._previousValue=undefined;this.requisition.update(this.element.value||'');}
Inputter.prototype.destroy=function(){this.document.defaultView.removeEventListener('resize',this.onWindowResize,false);this.requisition.commandOutputManager.onOutput.remove(this.outputted,this);this.requisition.onExternalUpdate.remove(this.textChanged,this);if(this.focusManager){this.focusManager.removeMonitoredElement(this.element,'input');}
this.element.removeEventListener('mouseup',this.onMouseUp,false);this.element.removeEventListener('keydown',this.onKeyDown,false);this.element.removeEventListener('keyup',this.onKeyUp,false);this.history.destroy();if(this.style){this.style.parentNode.removeChild(this.style);this.style=undefined;}
this.textChanged=undefined;this.outputted=undefined;this.onMouseUp=undefined;this.onKeyDown=undefined;this.onKeyUp=undefined;this.onWindowResize=undefined;this.tooltip=undefined;this.document=undefined;this.element=undefined;};Inputter.prototype.onWindowResize=function(){ if(!this.element){return;}
this.onResize(this.getDimensions());};Inputter.prototype.getDimensions=function(){var fixedLoc={};var currentElement=this.element.parentNode;while(currentElement&&currentElement.nodeName!=='#document'){var style=this.document.defaultView.getComputedStyle(currentElement,'');if(style){var position=style.getPropertyValue('position');if(position==='absolute'||position==='fixed'){var bounds=currentElement.getBoundingClientRect();fixedLoc.top=bounds.top;fixedLoc.left=bounds.left;break;}}
currentElement=currentElement.parentNode;}
var rect=this.element.getBoundingClientRect();return{top:rect.top-(fixedLoc.top||0)+1,height:rect.bottom-rect.top-1,left:rect.left-(fixedLoc.left||0)+2,width:rect.right-rect.left};};Inputter.prototype.outputted=function(){if(this.focusManager){this.focusManager.outputted();}};Inputter.prototype.onMouseUp=function(ev){this._checkAssignment();};Inputter.prototype.textChanged=function(){if(!this.document){return;}
if(this._caretChange==null){

this._caretChange=Caret.TO_ARG_END;}
var newStr=this.requisition.toString();var input=this.getInputState();input.typed=newStr;this._processCaretChange(input);if(this.element.value!==newStr){this.element.value=newStr;}
this.onInputChange({inputState:input});this.tooltip.textChanged();};var Caret={NO_CHANGE:0,SELECT_ALL:1,TO_END:2,TO_ARG_END:3};Inputter.prototype._processCaretChange=function(input){var start,end;switch(this._caretChange){case Caret.SELECT_ALL:start=0;end=input.typed.length;break;case Caret.TO_END:start=input.typed.length;end=input.typed.length;break;case Caret.TO_ARG_END:

 start=input.cursor.start;do{start++;}
while(start<input.typed.length&&input.typed[start-1]!==' ');end=start;break;default:start=input.cursor.start;end=input.cursor.end;break;}
start=(start>input.typed.length)?input.typed.length:start;end=(end>input.typed.length)?input.typed.length:end;var newInput={typed:input.typed,cursor:{start:start,end:end}};if(this.element.selectionStart!==start){this.element.selectionStart=start;}
if(this.element.selectionEnd!==end){this.element.selectionEnd=end;}
this._checkAssignment(start);this._caretChange=null;return newInput;};Inputter.prototype._checkAssignment=function(start){if(start==null){start=this.element.selectionStart;}
if(!this.requisition.isUpToDate()){return;}
var newAssignment=this.requisition.getAssignmentAt(start);if(newAssignment==null){return;}
if(this.assignment!==newAssignment){if(this.assignment.param.type.onLeave){this.assignment.param.type.onLeave(this.assignment);}
this.assignment=newAssignment;this.onAssignmentChange({assignment:this.assignment});if(this.assignment.param.type.onEnter){this.assignment.param.type.onEnter(this.assignment);}}
else{if(this.assignment&&this.assignment.param.type.onChange){this.assignment.param.type.onChange(this.assignment);}}




 
if(this.focusManager){var error=(this.assignment.status===Status.ERROR);this.focusManager.setError(error);}};Inputter.prototype.setInput=function(str){this._caretChange=Caret.TO_END;return this.requisition.update(str).then(function(updated){this.textChanged();return updated;}.bind(this));};Inputter.prototype.setCursor=function(cursor){this._caretChange=Caret.NO_CHANGE;this._processCaretChange({typed:this.element.value,cursor:cursor});return RESOLVED;};Inputter.prototype.focus=function(){this.element.focus();this._checkAssignment();};Inputter.prototype.onKeyDown=function(ev){if(ev.keyCode===KeyEvent.DOM_VK_UP||ev.keyCode===KeyEvent.DOM_VK_DOWN){ev.preventDefault();return;}
 
if(ev.keyCode===KeyEvent.DOM_VK_F1||ev.keyCode===KeyEvent.DOM_VK_ESCAPE||ev.keyCode===KeyEvent.DOM_VK_UP||ev.keyCode===KeyEvent.DOM_VK_DOWN){return;}
if(this.focusManager){this.focusManager.onInputChange();}
if(ev.keyCode===KeyEvent.DOM_VK_TAB){this.lastTabDownAt=0;if(!ev.shiftKey){ev.preventDefault();
this.lastTabDownAt=ev.timeStamp;}
if(ev.metaKey||ev.altKey||ev.crtlKey){if(this.document.commandDispatcher){this.document.commandDispatcher.advanceFocus();}
else{this.element.blur();}}}};Inputter.prototype.onKeyUp=function(ev){this.handleKeyUp(ev).then(null,util.errorHandler);};Inputter.prototype.handleKeyUp=function(ev){if(this.focusManager&&ev.keyCode===KeyEvent.DOM_VK_F1){this.focusManager.helpRequest();return RESOLVED;}
if(this.focusManager&&ev.keyCode===KeyEvent.DOM_VK_ESCAPE){this.focusManager.removeHelp();return RESOLVED;}
if(ev.keyCode===KeyEvent.DOM_VK_UP){return this._handleUpArrow();}
if(ev.keyCode===KeyEvent.DOM_VK_DOWN){return this._handleDownArrow();}
if(ev.keyCode===KeyEvent.DOM_VK_RETURN){return this._handleReturn();}
if(ev.keyCode===KeyEvent.DOM_VK_TAB&&!ev.shiftKey){return this._handleTab(ev);}
if(this._previousValue===this.element.value){return RESOLVED;}
this._scrollingThroughHistory=false;this._caretChange=Caret.NO_CHANGE;this._completed=this.requisition.update(this.element.value);this._previousValue=this.element.value;return this._completed.then(function(updated){ if(updated){this._choice=null;this.textChanged();this.onChoiceChange({choice:this._choice});}}.bind(this));};Inputter.prototype._handleUpArrow=function(){if(this.tooltip&&this.tooltip.isMenuShowing){this.changeChoice(-1);return RESOLVED;}
if(this.element.value===''||this._scrollingThroughHistory){this._scrollingThroughHistory=true;return this.requisition.update(this.history.backward()).then(function(updated){this.textChanged();return updated;}.bind(this));}
 
if(this.assignment.getStatus()===Status.VALID){return this.requisition.increment(this.assignment).then(function(){ this.textChanged();if(this.focusManager){this.focusManager.onInputChange();}}.bind(this));}
this.changeChoice(-1);return RESOLVED;};Inputter.prototype._handleDownArrow=function(){if(this.tooltip&&this.tooltip.isMenuShowing){this.changeChoice(+1);return RESOLVED;}
if(this.element.value===''||this._scrollingThroughHistory){this._scrollingThroughHistory=true;return this.requisition.update(this.history.forward()).then(function(updated){this.textChanged();return updated;}.bind(this));} 
if(this.assignment.getStatus()===Status.VALID){return this.requisition.decrement(this.assignment).then(function(){ this.textChanged();if(this.focusManager){this.focusManager.onInputChange();}}.bind(this));}
this.changeChoice(+1);return RESOLVED;};Inputter.prototype._handleReturn=function(){ if(this.requisition.status===Status.VALID){this._scrollingThroughHistory=false;this.history.add(this.element.value);return this.requisition.exec().then(function(){this.textChanged();}.bind(this));}

if(!this.tooltip.selectChoice()){this.focusManager.setError(true);}
this._choice=null;return RESOLVED;};Inputter.prototype._handleTab=function(ev){
var hasContents=(this.element.value.length>0);


if(hasContents&&this.lastTabDownAt+1000>ev.timeStamp){

 this._caretChange=Caret.TO_ARG_END;var inputState=this.getInputState();this._processCaretChange(inputState);if(this._choice==null){this._choice=0;}

 
this._completed=this.requisition.complete(inputState.cursor,this._choice);this._previousValue=this.element.value;}
this.lastTabDownAt=0;this._scrollingThroughHistory=false;return this._completed.then(function(updated){ if(updated){this.textChanged();this._choice=null;this.onChoiceChange({choice:this._choice});}}.bind(this));};Inputter.prototype.changeChoice=function(amount){if(this._choice==null){this._choice=0;}

 
this._choice+=amount;this.onChoiceChange({choice:this._choice});};Inputter.prototype.getInputState=function(){var input={typed:this.element.value,cursor:{start:this.element.selectionStart,end:this.element.selectionEnd}};
 if(input.typed==null){input={typed:'',cursor:{start:0,end:0}};}
return input;};exports.Inputter=Inputter;