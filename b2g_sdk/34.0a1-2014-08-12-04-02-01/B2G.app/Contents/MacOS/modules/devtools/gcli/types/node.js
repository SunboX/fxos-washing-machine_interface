'use strict';var Promise=require('../util/promise').Promise;var Highlighter=require('../util/host').Highlighter;var l10n=require('../util/l10n');var util=require('../util/util');var Status=require('./types').Status;var Conversion=require('./types').Conversion;var BlankArgument=require('./types').BlankArgument;var doc;if(typeof document!=='undefined'){doc=document;}
exports.setDocument=function(document){doc=document;};exports.unsetDocument=function(){doc=undefined;};exports.getDocument=function(){return doc;};function onEnter(assignment){assignment.highlighter=new Highlighter(doc);assignment.highlighter.nodelist=assignment.conversion.matches;}
function onLeave(assignment){if(!assignment.highlighter){return;}
assignment.highlighter.destroy();delete assignment.highlighter;}
function onChange(assignment){if(assignment.conversion.matches==null){return;}
if(!assignment.highlighter){return;}
assignment.highlighter.nodelist=assignment.conversion.matches;}
exports.items=[{ item:'type',name:'node',getSpec:function(){return'node';},stringify:function(value,context){if(value==null){return'';}
return value.__gcliQuery||'Error';},parse:function(arg,context){var reply;if(arg.text===''){reply=new Conversion(undefined,arg,Status.INCOMPLETE);reply.matches=util.createEmptyNodeList(doc);}
else{var nodes;try{nodes=doc.querySelectorAll(arg.text);if(nodes.length===0){reply=new Conversion(undefined,arg,Status.INCOMPLETE,l10n.lookup('nodeParseNone'));}
else if(nodes.length===1){var node=nodes.item(0);node.__gcliQuery=arg.text;reply=new Conversion(node,arg,Status.VALID,'');}
else{var msg=l10n.lookupFormat('nodeParseMultiple',[nodes.length]);reply=new Conversion(undefined,arg,Status.ERROR,msg);}
reply.matches=nodes;}
catch(ex){reply=new Conversion(undefined,arg,Status.ERROR,l10n.lookup('nodeParseSyntax'));}}
return Promise.resolve(reply);},onEnter:onEnter,onLeave:onLeave,onChange:onChange},{ item:'type',name:'nodelist',





allowEmpty:false,constructor:function(){if(typeof this.allowEmpty!=='boolean'){throw new Error('Legal values for allowEmpty are [true|false]');}},getSpec:function(){return this.allowEmpty?{name:'nodelist',allowEmpty:true}:'nodelist';},getBlank:function(context){var emptyNodeList=(doc==null?[]:util.createEmptyNodeList(doc));return new Conversion(emptyNodeList,new BlankArgument(),Status.VALID);},stringify:function(value,context){if(value==null){return'';}
return value.__gcliQuery||'Error';},parse:function(arg,context){var reply;try{if(arg.text===''){reply=new Conversion(undefined,arg,Status.INCOMPLETE);reply.matches=util.createEmptyNodeList(doc);}
else{var nodes=doc.querySelectorAll(arg.text);if(nodes.length===0&&!this.allowEmpty){reply=new Conversion(undefined,arg,Status.INCOMPLETE,l10n.lookup('nodeParseNone'));}
else{reply=new Conversion(nodes,arg,Status.VALID,'');}
reply.matches=nodes;}}
catch(ex){reply=new Conversion(undefined,arg,Status.ERROR,l10n.lookup('nodeParseSyntax'));reply.matches=util.createEmptyNodeList(doc);}
return Promise.resolve(reply);},onEnter:onEnter,onLeave:onLeave,onChange:onChange}];