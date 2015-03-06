'use strict';var Inputter=require('./inputter').Inputter;var Completer=require('./completer').Completer;var Tooltip=require('./tooltip').Tooltip;var FocusManager=require('../ui/focus').FocusManager;var Requisition=require('../cli').Requisition;var cli=require('../cli');var jstype=require('../types/javascript');var nodetype=require('../types/node');var resource=require('../types/resource');var intro=require('../ui/intro');var CommandOutputManager=require('../commands/commands').CommandOutputManager;function setContentDocument(document){if(document){nodetype.setDocument(document);resource.setDocument(document);}
else{resource.unsetDocument();nodetype.unsetDocument();jstype.unsetGlobalObject();}}
function FFDisplay(system,options){if(options.eval){cli.setEvalFunction(options.eval);}
setContentDocument(options.contentDocument);this.requisition=new Requisition(system,{environment:options.environment,document:options.outputDocument});this.onOutput=this.requisition.commandOutputManager.onOutput;this.focusManager=new FocusManager(options.chromeDocument,system.settings);this.onVisibilityChange=this.focusManager.onVisibilityChange;this.inputter=new Inputter(options,{requisition:this.requisition,focusManager:this.focusManager,element:options.inputElement});this.completer=new Completer({requisition:this.requisition,inputter:this.inputter,backgroundElement:options.backgroundElement,element:options.completeElement});this.tooltip=new Tooltip(options,{requisition:this.requisition,focusManager:this.focusManager,inputter:this.inputter,element:options.hintElement});this.inputter.tooltip=this.tooltip;if(options.consoleWrap){this.resizer=this.resizer.bind(this);this.consoleWrap=options.consoleWrap;var win=options.consoleWrap.ownerDocument.defaultView;win.addEventListener('resize',this.resizer,false);}
this.options=options;}
FFDisplay.prototype.maybeShowIntro=function(){intro.maybeShowIntro(this.requisition.commandOutputManager,this.requisition.conversionContext);};FFDisplay.prototype.reattach=function(options){setContentDocument(options.contentDocument);};FFDisplay.prototype.destroy=function(){if(this.consoleWrap){var win=this.options.consoleWrap.ownerDocument.defaultView;win.removeEventListener('resize',this.resizer,false);}
this.tooltip.destroy();this.completer.destroy();this.inputter.destroy();this.focusManager.destroy();this.requisition.destroy();setContentDocument(null);cli.unsetEvalFunction();delete this.options;


};FFDisplay.prototype.resizer=function(){var parentRect=this.options.consoleWrap.getBoundingClientRect(); var parentHeight=parentRect.bottom-parentRect.top-64;
 if(parentHeight<100){this.options.hintElement.classList.add('gcliterm-hint-nospace');}
else{this.options.hintElement.classList.remove('gcliterm-hint-nospace');this.options.hintElement.style.overflowY=null;this.options.hintElement.style.borderBottomColor='white';}

var doc=this.options.hintElement.ownerDocument;var outputNode=this.options.hintElement.parentNode.parentNode.children[1];var listItems=outputNode.getElementsByClassName('hud-msg-node');



 var scrollbarWidth=20;if(listItems.length>0){var parentWidth=outputNode.getBoundingClientRect().width-scrollbarWidth;var otherWidth;var body;for(var i=0;i<listItems.length;++i){var listItem=listItems[i];otherWidth=0;body=null;for(var j=0;j<listItem.children.length;j++){var child=listItem.children[j];if(child.classList.contains('gcliterm-msg-body')){body=child.children[0];}
else{otherWidth+=child.getBoundingClientRect().width;}
var styles=doc.defaultView.getComputedStyle(child,null);otherWidth+=parseInt(styles.borderLeftWidth,10)+
parseInt(styles.borderRightWidth,10)+
parseInt(styles.paddingLeft,10)+
parseInt(styles.paddingRight,10)+
parseInt(styles.marginLeft,10)+
parseInt(styles.marginRight,10);}
if(body){body.style.width=(parentWidth-otherWidth)+'px';}}}};exports.FFDisplay=FFDisplay;