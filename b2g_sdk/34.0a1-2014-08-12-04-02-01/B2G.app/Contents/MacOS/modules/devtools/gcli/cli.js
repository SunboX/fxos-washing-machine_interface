'use strict';var Promise=require('./util/promise').Promise;var util=require('./util/util');var host=require('./util/host');var l10n=require('./util/l10n');var view=require('./ui/view');var Parameter=require('./commands/commands').Parameter;var CommandOutputManager=require('./commands/commands').CommandOutputManager;var Status=require('./types/types').Status;var Conversion=require('./types/types').Conversion;var commandModule=require('./types/command');var selectionModule=require('./types/selection');var Argument=require('./types/types').Argument;var ArrayArgument=require('./types/types').ArrayArgument;var NamedArgument=require('./types/types').NamedArgument;var TrueNamedArgument=require('./types/types').TrueNamedArgument;var MergedArgument=require('./types/types').MergedArgument;var ScriptArgument=require('./types/types').ScriptArgument;var RESOLVED=Promise.resolve(undefined);var instances=[];function instanceIndex(context){for(var i=0;i<instances.length;i++){var instance=instances[i];if(instance.conversionContext===context||instance.executionContext===context){return i;}}
return-1;}
exports.getMapping=function(context){var index=instanceIndex(context);if(index===-1){console.log('Missing mapping for context: ',context);console.log('Known contexts: ',instances);throw new Error('Missing mapping for context');}
return instances[index].mapping;};var addMapping=function(requisition){if(instanceIndex(requisition.conversionContext)!==-1){throw new Error('Remote existing mapping before adding a new one');}
instances.push({conversionContext:requisition.conversionContext,executionContext:requisition.executionContext,mapping:{requisition:requisition}});};var removeMapping=function(requisition){var index=instanceIndex(requisition.conversionContext);instances.splice(index,1);};function getEvalCommand(commands){if(getEvalCommand._cmd==null){getEvalCommand._cmd=commands.get(evalCmd.name);}
return getEvalCommand._cmd;}
function Assignment(param){ this.param=param;this.conversion=undefined;}
Object.defineProperty(Assignment.prototype,'arg',{get:function(){return this.conversion==null?undefined:this.conversion.arg;},enumerable:true});Object.defineProperty(Assignment.prototype,'value',{get:function(){return this.conversion==null?undefined:this.conversion.value;},enumerable:true});Object.defineProperty(Assignment.prototype,'message',{get:function(){if(this.conversion!=null&&this.conversion.message){return this.conversion.message;}

if(this.getStatus()===Status.INCOMPLETE){return l10n.lookupFormat('cliIncompleteParam',[this.param.name]);}
return'';},enumerable:true});Assignment.prototype.getPredictions=function(context){return this.conversion==null?[]:this.conversion.getPredictions(context);};Assignment.prototype.getPredictionRanked=function(context,rank){if(rank==null){rank=0;}
if(this.isInName()){return Promise.resolve(undefined);}
return this.getPredictions(context).then(function(predictions){if(predictions.length===0){return undefined;}
rank=rank%predictions.length;if(rank<0){rank=predictions.length+rank;}
return predictions[rank];}.bind(this));};Assignment.prototype.isInName=function(){return this.conversion.arg.type==='NamedArgument'&&this.conversion.arg.prefix.slice(-1)!==' ';};Assignment.prototype.getStatus=function(arg){if(this.param.isDataRequired&&!this.conversion.isDataProvided()){return Status.INCOMPLETE;}


if(!this.param.isDataRequired&&this.arg.type==='BlankArgument'){return Status.VALID;}
return this.conversion.getStatus(arg);};Assignment.prototype.toString=function(){return this.conversion.toString();};Object.defineProperty(Assignment.prototype,'_summaryJson',{get:function(){return{param:this.param.name+'/'+this.param.type.name,defaultValue:this.param.defaultValue,arg:this.conversion.arg._summaryJson,value:this.value,message:this.message,status:this.getStatus().toString()};},enumerable:true});exports.Assignment=Assignment;var customEval=eval;exports.setEvalFunction=function(newCustomEval){customEval=newCustomEval;};exports.unsetEvalFunction=function(){customEval=undefined;};var evalCmd={item:'command',name:'{',params:[{name:'javascript',type:'javascript',description:''}],hidden:true,description:{key:'cliEvalJavascript'},exec:function(args,context){var reply=customEval(args.javascript);return context.typedData(typeof reply,reply);},isCommandRegexp:/^\s*{\s*/};exports.items=[evalCmd];function CommandAssignment(requisition){var commandParamMetadata={name:'__command',type:{name:'command',allowNonExec:false}};
var self=this;Object.defineProperty(commandParamMetadata,'description',{get:function(){var value=self.value;return value&&value.description?value.description:'The command to execute';},enumerable:true});this.param=new Parameter(requisition.system.types,commandParamMetadata);}
CommandAssignment.prototype=Object.create(Assignment.prototype);CommandAssignment.prototype.getStatus=function(arg){return Status.combine(Assignment.prototype.getStatus.call(this,arg),this.conversion.value&&this.conversion.value.exec?Status.VALID:Status.INCOMPLETE);};exports.CommandAssignment=CommandAssignment;function UnassignedAssignment(requisition,arg){var isIncompleteName=(arg.text.charAt(0)==='-');this.param=new Parameter(requisition.system.types,{name:'__unassigned',description:l10n.lookup('cliOptions'),type:{name:'param',requisition:requisition,isIncompleteName:isIncompleteName}});

if(isIncompleteName){var lookup=commandModule.getDisplayedParamLookup(requisition);var predictions=selectionModule.findPredictions(arg,lookup);this.conversion=selectionModule.convertPredictions(arg,predictions);}
else{var message=l10n.lookup('cliUnusedArg');this.conversion=new Conversion(undefined,arg,Status.ERROR,message);}
this.conversion.assignment=this;}
UnassignedAssignment.prototype=Object.create(Assignment.prototype);UnassignedAssignment.prototype.getStatus=function(arg){return this.conversion.getStatus();};var logErrors=true;Object.defineProperty(exports,'logErrors',{get:function(){return logErrors;},set:function(val){logErrors=val;},enumerable:true});function Requisition(system,options){options=options||{};this.environment=options.environment||{};this.document=options.document;if(this.document==null){try{this.document=document;}
catch(ex){}}
this.commandOutputManager=options.commandOutputManager||new CommandOutputManager();this.system=system;this.shell={cwd:'/', env:{}
};this.commandAssignment=new CommandAssignment(this);


this._assignments={}; this.assignmentCount=0; this._args=[]; this._unassigned=[];
 this._nextUpdateId=0;
this.prefix='';addMapping(this);this._setBlankAssignment(this.commandAssignment);
 this.onExternalUpdate=util.createEvent('Requisition.onExternalUpdate');}
Requisition.prototype.destroy=function(){this.document=undefined;this.environment=undefined;removeMapping(this);};Requisition.prototype._beginChange=function(){var updateId=this._nextUpdateId;this._nextUpdateId++;return updateId;};Requisition.prototype._isChangeCurrent=function(updateId){return updateId+1===this._nextUpdateId;};Requisition.prototype._endChangeCheckOrder=function(updateId){if(updateId+1!==this._nextUpdateId){
return false;}
return true;};var legacy=false;Object.defineProperty(Requisition.prototype,'executionContext',{get:function(){if(this._executionContext==null){this._executionContext={defer:function(){return Promise.defer();},typedData:function(type,data){return{isTypedData:true,data:data,type:type};},getArgsObject:this.getArgsObject.bind(this)}; var requisition=this;Object.defineProperty(this._executionContext,'prefix',{get:function(){return requisition.prefix;},enumerable:true});Object.defineProperty(this._executionContext,'typed',{get:function(){return requisition.toString();},enumerable:true});Object.defineProperty(this._executionContext,'environment',{get:function(){return requisition.environment;},enumerable:true});Object.defineProperty(this._executionContext,'shell',{get:function(){return requisition.shell;},enumerable:true});Object.defineProperty(this._executionContext,'system',{get:function(){return requisition.system;},enumerable:true});if(legacy){this._executionContext.createView=view.createView;this._executionContext.exec=this.exec.bind(this);this._executionContext.update=this._contextUpdate.bind(this);this._executionContext.updateExec=this._contextUpdateExec.bind(this);Object.defineProperty(this._executionContext,'document',{get:function(){return requisition.document;},enumerable:true});}}
return this._executionContext;},enumerable:true});Object.defineProperty(Requisition.prototype,'conversionContext',{get:function(){if(this._conversionContext==null){this._conversionContext={defer:function(){return Promise.defer();},createView:view.createView,exec:this.exec.bind(this),update:this._contextUpdate.bind(this),updateExec:this._contextUpdateExec.bind(this)}; var requisition=this;Object.defineProperty(this._conversionContext,'document',{get:function(){return requisition.document;},enumerable:true});Object.defineProperty(this._conversionContext,'environment',{get:function(){return requisition.environment;},enumerable:true});Object.defineProperty(this._conversionContext,'system',{get:function(){return requisition.system;},enumerable:true});}
return this._conversionContext;},enumerable:true});Requisition.prototype.getAssignment=function(nameOrNumber){var name=(typeof nameOrNumber==='string')?nameOrNumber:Object.keys(this._assignments)[nameOrNumber];return this._assignments[name]||undefined;};Requisition.prototype.getParameterNames=function(){return Object.keys(this._assignments);};Object.defineProperty(Requisition.prototype,'status',{get:function(){var status=Status.VALID;if(this._unassigned.length!==0){var isAllIncomplete=true;this._unassigned.forEach(function(assignment){if(!assignment.param.type.isIncompleteName){isAllIncomplete=false;}});status=isAllIncomplete?Status.INCOMPLETE:Status.ERROR;}
this.getAssignments(true).forEach(function(assignment){var assignStatus=assignment.getStatus();if(assignStatus>status){status=assignStatus;}},this);if(status===Status.INCOMPLETE){status=Status.ERROR;}
return status;},enumerable:true});Requisition.prototype.getStatusMessage=function(){if(this.commandAssignment.getStatus()!==Status.VALID){return l10n.lookup('cliUnknownCommand');}
var assignments=this.getAssignments();for(var i=0;i<assignments.length;i++){if(assignments[i].getStatus()!==Status.VALID){return assignments[i].message;}}
if(this._unassigned.length!==0){return l10n.lookup('cliUnusedArg');}
return null;};Requisition.prototype.getArgsObject=function(){var args={};this.getAssignments().forEach(function(assignment){args[assignment.param.name]=assignment.conversion.isDataProvided()?assignment.value:assignment.param.defaultValue;},this);return args;};Requisition.prototype.getAssignments=function(includeCommand){var assignments=[];if(includeCommand===true){assignments.push(this.commandAssignment);}
Object.keys(this._assignments).forEach(function(name){assignments.push(this.getAssignment(name));},this);return assignments;};Requisition.prototype._getFirstBlankPositionalAssignment=function(){var reply=null;Object.keys(this._assignments).some(function(name){var assignment=this.getAssignment(name);if(assignment.arg.type==='BlankArgument'&&assignment.param.isPositionalAllowed){reply=assignment;return true;}
return false;},this);return reply;};Requisition.prototype.isUpToDate=function(){if(!this._args){return false;}
for(var i=0;i<this._args.length;i++){if(this._args[i].assignment==null){return false;}}
return true;};Requisition.prototype.getAssignmentAt=function(cursor){
if(cursor===0){return this.commandAssignment;}
var assignForPos=[];var i,j;for(i=0;i<this._args.length;i++){var arg=this._args[i];var assignment=arg.assignment; for(j=0;j<arg.prefix.length;j++){assignForPos.push(assignment);}
for(j=0;j<arg.text.length;j++){assignForPos.push(assignment);} 
if(arg.assignment.arg.type==='NamedArgument'){}
else if(this._args.length>i+1){ assignment=this._args[i+1].assignment;}
else{ var nextAssignment=this._getFirstBlankPositionalAssignment();if(nextAssignment!=null){assignment=nextAssignment;}}
for(j=0;j<arg.suffix.length;j++){assignForPos.push(assignment);}}
 
return assignForPos[cursor-1];};Requisition.prototype.toCanonicalString=function(){var cmd=this.commandAssignment.value?this.commandAssignment.value.name:this.commandAssignment.arg.text; var lineSuffix='';if(cmd==='{'){var scriptSuffix=this.getAssignment(0).arg.suffix;lineSuffix=(scriptSuffix.indexOf('}')===-1)?' }':'';}
var ctx=this.executionContext; var argPromise=util.promiseEach(this.getAssignments(),function(assignment){

if(assignment.value===assignment.param.defaultValue){return'';}
var val=assignment.param.type.stringify(assignment.value,ctx);return Promise.resolve(val).then(function(str){return' '+str;}.bind(this));}.bind(this));return argPromise.then(function(strings){return cmd+strings.join('')+lineSuffix;}.bind(this));};Requisition.prototype.toString=function(){if(!this._args){throw new Error('toString requires a command line. See source.');}
return this._args.map(function(arg){return arg.toString();}).join('');};Object.defineProperty(Requisition.prototype,'_summaryJson',{get:function(){var summary={$args:this._args.map(function(arg){return arg._summaryJson;}),_command:this.commandAssignment._summaryJson,_unassigned:this._unassigned.forEach(function(assignment){return assignment._summaryJson;})};Object.keys(this._assignments).forEach(function(name){summary[name]=this.getAssignment(name)._summaryJson;}.bind(this));return summary;},enumerable:true});Requisition.prototype._setAssignmentInternal=function(assignment,conversion){var oldConversion=assignment.conversion;assignment.conversion=conversion;assignment.conversion.assignment=assignment; if(assignment.conversion.equals(oldConversion)){if(assignment===this.commandAssignment){this._setBlankArguments();}
return;} 
if(assignment===this.commandAssignment){this._assignments={};var command=this.commandAssignment.value;if(command){for(var i=0;i<command.params.length;i++){var param=command.params[i];var newAssignment=new Assignment(param);this._setBlankAssignment(newAssignment);this._assignments[param.name]=newAssignment;}}
this.assignmentCount=Object.keys(this._assignments).length;}};Requisition.prototype.setAssignment=function(assignment,arg,options){options=options||{};if(!options.internal){var originalArgs=assignment.arg.getArgs(); var replacementArgs=arg.getArgs();var maxLen=Math.max(originalArgs.length,replacementArgs.length);for(var i=0;i<maxLen;i++){
 if(i>=originalArgs.length||originalArgs[i].type==='BlankArgument'){this._args.push(replacementArgs[i]);continue;}
var index=this._args.indexOf(originalArgs[i]);if(index===-1){console.error('Couldn\'t find ',originalArgs[i],' in ',this._args);throw new Error('Couldn\'t find '+originalArgs[i]);}
 
if(i>=replacementArgs.length){this._args.splice(index,1);}
else{if(options.matchPadding){if(replacementArgs[i].prefix.length===0&&this._args[index].prefix.length!==0){replacementArgs[i].prefix=this._args[index].prefix;}
if(replacementArgs[i].suffix.length===0&&this._args[index].suffix.length!==0){replacementArgs[i].suffix=this._args[index].suffix;}}
this._args[index]=replacementArgs[i];}}}
var updateId=options.internal?null:this._beginChange();var setAssignmentInternal=function(conversion){if(options.internal||this._isChangeCurrent(updateId)){this._setAssignmentInternal(assignment,conversion);}
if(!options.internal){this._endChangeCheckOrder(updateId);}
return Promise.resolve(undefined);}.bind(this);if(arg==null){var blank=assignment.param.type.getBlank(this.executionContext);return setAssignmentInternal(blank);}
if(typeof arg.getStatus==='function'){ return setAssignmentInternal(arg);}
var parsed=assignment.param.type.parse(arg,this.executionContext);return parsed.then(setAssignmentInternal);};Requisition.prototype._setBlankAssignment=function(assignment){var blank=assignment.param.type.getBlank(this.executionContext);this._setAssignmentInternal(assignment,blank);};Requisition.prototype._setBlankArguments=function(){this.getAssignments().forEach(this._setBlankAssignment.bind(this));};Requisition.prototype.createInputArgTrace=function(){if(!this._args){throw new Error('createInputMap requires a command line. See source.');}
var args=[];var i;this._args.forEach(function(arg){for(i=0;i<arg.prefix.length;i++){args.push({arg:arg,character:arg.prefix[i],part:'prefix'});}
for(i=0;i<arg.text.length;i++){args.push({arg:arg,character:arg.text[i],part:'text'});}
for(i=0;i<arg.suffix.length;i++){args.push({arg:arg,character:arg.suffix[i],part:'suffix'});}});return args;};Requisition.prototype.typedEndsWithSeparator=function(){if(!this._args){throw new Error('typedEndsWithSeparator requires a command line. See source.');}
if(this._args.length===0){return false;} 
var lastArg=this._args.slice(-1)[0];if(lastArg.suffix.slice(-1)===' '){return true;}
return lastArg.text===''&&lastArg.suffix===''&&lastArg.prefix.slice(-1)===' ';};Requisition.prototype.getInputStatusMarkup=function(cursor){var argTraces=this.createInputArgTrace();
cursor=cursor===0?0:cursor-1;var cTrace=argTraces[cursor];var markup=[];for(var i=0;i<argTraces.length;i++){var argTrace=argTraces[i];var arg=argTrace.arg;var status=Status.VALID;if(argTrace.part==='text'){status=arg.assignment.getStatus(arg);if(status===Status.INCOMPLETE){



var isNamed=(cTrace.arg.assignment.arg.type==='NamedArgument');var isInside=cTrace.part==='text'||(isNamed&&cTrace.part==='suffix');if(arg.assignment!==cTrace.arg.assignment||!isInside){ if(!(arg.assignment instanceof CommandAssignment)){status=Status.ERROR;}}}}
markup.push({status:status,string:argTrace.character});} 
i=0;while(i<markup.length-1){if(markup[i].status===markup[i+1].status){markup[i].string+=markup[i+1].string;markup.splice(i+1,1);}
else{i++;}}
return markup;};Requisition.prototype.getStateData=function(start,rank){var typed=this.toString();var current=this.getAssignmentAt(start);var context=this.executionContext;var predictionPromise=(typed.trim().length!==0)?current.getPredictionRanked(context,rank):Promise.resolve(null);return predictionPromise.then(function(prediction){
 var directTabText='';var arrowTabText='';var emptyParameters=[];if(typed.trim().length!==0){var cArg=current.arg;if(prediction){var tabText=prediction.name;var existing=cArg.text;



if(current.isInName()){tabText=' '+tabText;}
if(existing!==tabText){

var inputValue=existing.replace(/^\s*/,'');var isStrictCompletion=tabText.indexOf(inputValue)===0;if(isStrictCompletion&&start===typed.length){ var numLeadingSpaces=existing.match(/^(\s*)/)[0].length;directTabText=tabText.slice(existing.length-numLeadingSpaces);}
else{
 arrowTabText='\u21E5 '+tabText;}}}
else{

 if(cArg.type==='NamedArgument'&&cArg.valueArg==null){emptyParameters.push('<'+current.param.type.name+'>\u00a0');}}} 
if(directTabText!==''){directTabText+='\u00a0';}
else if(!this.typedEndsWithSeparator()){emptyParameters.unshift('\u00a0');}



this.getAssignments().forEach(function(assignment){ if(!assignment.param.isPositionalAllowed){return;} 
if(assignment.arg.toString().trim()!==''){return;} 
if(directTabText!==''&&current===assignment){return;}
var text=(assignment.param.isDataRequired)?'<'+assignment.param.name+'>\u00a0':'['+assignment.param.name+']\u00a0';emptyParameters.push(text);}.bind(this));var command=this.commandAssignment.value;var addOptionsMarker=false;
 if(command&&command.hasNamedParameters){command.params.forEach(function(param){var arg=this.getAssignment(param.name).arg;if(!param.isPositionalAllowed&&!param.hidden&&arg.type==='BlankArgument'){addOptionsMarker=true;}},this);}
if(addOptionsMarker){
 emptyParameters.push('[options]\u00a0');}
var unclosedJs=command&&command.name==='{'&&this.getAssignment(0).arg.suffix.indexOf('}')===-1;return{statusMarkup:this.getInputStatusMarkup(start),unclosedJs:unclosedJs,directTabText:directTabText,arrowTabText:arrowTabText,emptyParameters:emptyParameters};}.bind(this));};Requisition.prototype._addSpace=function(assignment){var arg=assignment.arg.beget({suffixSpace:true});if(arg!==assignment.arg){return this.setAssignment(assignment,arg);}
else{return Promise.resolve(undefined);}};Requisition.prototype.complete=function(cursor,rank){var assignment=this.getAssignmentAt(cursor.start);var context=this.executionContext;var predictionPromise=assignment.getPredictionRanked(context,rank);return predictionPromise.then(function(prediction){var outstanding=[];

if(prediction==null){

if(assignment.arg.suffix.slice(-1)!==' '&&assignment.getStatus()===Status.VALID){outstanding.push(this._addSpace(assignment));}
 
if(assignment.isInName()){var newArg=assignment.arg.beget({prefixPostSpace:true});outstanding.push(this.setAssignment(assignment,newArg));}}
else{ var arg=assignment.arg.beget({text:prediction.name,dontQuote:(assignment===this.commandAssignment)});var assignPromise=this.setAssignment(assignment,arg);if(!prediction.incomplete){assignPromise=assignPromise.then(function(){ return this._addSpace(assignment).then(function(){ if(assignment instanceof UnassignedAssignment){return this.update(this.toString());}}.bind(this));}.bind(this));}
outstanding.push(assignPromise);}
return Promise.all(outstanding).then(function(){return true;}.bind(this));}.bind(this));};Requisition.prototype.decrement=function(assignment){var ctx=this.executionContext;var val=assignment.param.type.decrement(assignment.value,ctx);return Promise.resolve(val).then(function(replacement){if(replacement!=null){var val=assignment.param.type.stringify(replacement,ctx);return Promise.resolve(val).then(function(str){var arg=assignment.arg.beget({text:str});return this.setAssignment(assignment,arg);}.bind(this));}}.bind(this));};Requisition.prototype.increment=function(assignment){var ctx=this.executionContext;var val=assignment.param.type.increment(assignment.value,ctx);return Promise.resolve(val).then(function(replacement){if(replacement!=null){var val=assignment.param.type.stringify(replacement,ctx);return Promise.resolve(val).then(function(str){var arg=assignment.arg.beget({text:str});return this.setAssignment(assignment,arg);}.bind(this));}}.bind(this));};function getDataCommandAttribute(element){var command=element.getAttribute('data-command');if(!command){command=element.querySelector('*[data-command]').getAttribute('data-command');}
return command;}
Requisition.prototype._contextUpdate=function(typed){return this.update(typed).then(function(reply){this.onExternalUpdate({typed:typed});return reply;}.bind(this));};Requisition.prototype.update=function(typed){ if(typeof typed.querySelector==='function'){typed=getDataCommandAttribute(typed);} 
if(typeof typed.currentTarget==='object'){typed=getDataCommandAttribute(typed.currentTarget);}
var updateId=this._beginChange();this._args=exports.tokenize(typed);var args=this._args.slice(0); this._split(args);return this._assign(args).then(function(){return this._endChangeCheckOrder(updateId);}.bind(this));};Requisition.prototype.clear=function(){var arg=new Argument('','','');this._args=[arg];var conversion=commandModule.parse(this.executionContext,arg,false);this.setAssignment(this.commandAssignment,conversion,{internal:true});};var In={WHITESPACE:1,SIMPLE:2,SINGLE_Q:3,DOUBLE_Q:4,SCRIPT:5};exports.tokenize=function(typed){ if(typed==null||typed.length===0){return[new Argument('','','')];}
if(isSimple(typed)){return[new Argument(typed,'','')];}
var mode=In.WHITESPACE;
 typed=typed.replace(/\\\\/g, '\uF000').replace(/\\/g,'\uF001').replace(/\\'/g,'\uF002').replace(/\\"/g,'\uF003').replace(/\\{/g,'\uF004').replace(/\\}/g,'\uF005');function unescape2(escaped){return escaped.replace(/\uF000/g,'\\\\').replace(/\uF001/g,'\\ ').replace(/\uF002/g,'\\\'').replace(/\uF003/g,'\\\"').replace(/\uF004/g,'\\{').replace(/\uF005/g,'\\}');}
var i=0; var start=0;var prefix=''; var args=[]; var blockDepth=0;


while(true){var c=typed[i];var str;switch(mode){case In.WHITESPACE:if(c==='\''){prefix=typed.substring(start,i+1);mode=In.SINGLE_Q;start=i+1;}
else if(c==='"'){prefix=typed.substring(start,i+1);mode=In.DOUBLE_Q;start=i+1;}
else if(c==='{'){prefix=typed.substring(start,i+1);mode=In.SCRIPT;blockDepth++;start=i+1;}
else if(/ /.test(c)){}
else{prefix=typed.substring(start,i);mode=In.SIMPLE;start=i;}
break;case In.SIMPLE:
if(c===' '){str=unescape2(typed.substring(start,i));args.push(new Argument(str,prefix,''));mode=In.WHITESPACE;start=i;prefix='';}
break;case In.SINGLE_Q:if(c==='\''){str=unescape2(typed.substring(start,i));args.push(new Argument(str,prefix,c));mode=In.WHITESPACE;start=i+1;prefix='';}
break;case In.DOUBLE_Q:if(c==='"'){str=unescape2(typed.substring(start,i));args.push(new Argument(str,prefix,c));mode=In.WHITESPACE;start=i+1;prefix='';}
break;case In.SCRIPT:if(c==='{'){blockDepth++;}
else if(c==='}'){blockDepth--;if(blockDepth===0){str=unescape2(typed.substring(start,i));args.push(new ScriptArgument(str,prefix,c));mode=In.WHITESPACE;start=i+1;prefix='';}}
break;}
i++;if(i>=typed.length){ if(mode===In.WHITESPACE){if(i!==start){
var extra=typed.substring(start,i);var lastArg=args[args.length-1];if(!lastArg){args.push(new Argument('',extra,''));}
else{lastArg.suffix+=extra;}}}
else if(mode===In.SCRIPT){str=unescape2(typed.substring(start,i+1));args.push(new ScriptArgument(str,prefix,''));}
else{str=unescape2(typed.substring(start,i+1));args.push(new Argument(str,prefix,''));}
break;}}
return args;};function isSimple(typed){for(var i=0;i<typed.length;i++){var c=typed.charAt(i);if(c===' '||c==='"'||c==='\''||c==='{'||c==='}'||c==='\\'){return false;}}
return true;}
Requisition.prototype._split=function(args){

var conversion;if(args[0].type==='ScriptArgument'){
 conversion=new Conversion(getEvalCommand(this.system.commands),new ScriptArgument());this._setAssignmentInternal(this.commandAssignment,conversion);return;}
var argsUsed=1;while(argsUsed<=args.length){var arg=(argsUsed===1)?args[0]:new MergedArgument(args,0,argsUsed);if(this.prefix!=null&&this.prefix!==''){var prefixArg=new Argument(this.prefix,'',' ');var prefixedArg=new MergedArgument([prefixArg,arg]);conversion=commandModule.parse(this.executionContext,prefixedArg,false);if(conversion.value==null){conversion=commandModule.parse(this.executionContext,arg,false);}}
else{conversion=commandModule.parse(this.executionContext,arg,false);}

if(!conversion.value||conversion.value.exec){break;}

 
argsUsed++;} 
for(var i=0;i<argsUsed;i++){args.shift();}
this._setAssignmentInternal(this.commandAssignment,conversion);};Requisition.prototype._addUnassignedArgs=function(args){args.forEach(function(arg){this._unassigned.push(new UnassignedAssignment(this,arg));}.bind(this));return RESOLVED;};Requisition.prototype._assign=function(args){ var noArgUp={internal:true};this._unassigned=[];if(!this.commandAssignment.value){return this._addUnassignedArgs(args);}
if(args.length===0){this._setBlankArguments();return RESOLVED;}

if(this.assignmentCount===0){return this._addUnassignedArgs(args);}
 
if(this.assignmentCount===1){var assignment=this.getAssignment(0);if(assignment.param.type.name==='string'){var arg=(args.length===1)?args[0]:new MergedArgument(args);return this.setAssignment(assignment,arg,noArgUp);}}
 
var unassignedParams=this.getParameterNames(); var arrayArgs={}; var assignments=this.getAssignments(false);var namedDone=util.promiseEach(assignments,function(assignment){
 var i=0;while(i<args.length){if(!assignment.param.isKnownAs(args[i].text)){ i++;continue;}
var arg=args.splice(i,1)[0];unassignedParams=unassignedParams.filter(function(test){return test!==assignment.param.name;}); if(assignment.param.type.name==='boolean'){arg=new TrueNamedArgument(arg);}
else{var valueArg=null;if(i+1<=args.length){valueArg=args.splice(i,1)[0];}
arg=new NamedArgument(arg,valueArg);}
if(assignment.param.type.name==='array'){var arrayArg=arrayArgs[assignment.param.name];if(!arrayArg){arrayArg=new ArrayArgument();arrayArgs[assignment.param.name]=arrayArg;}
arrayArg.addArgument(arg);return RESOLVED;}
else{if(assignment.arg.type==='BlankArgument'){return this.setAssignment(assignment,arg,noArgUp);}
else{return this._addUnassignedArgs(arg.getArgs());}}}},this); var positionalDone=namedDone.then(function(){return util.promiseEach(unassignedParams,function(name){var assignment=this.getAssignment(name); if(!assignment.param.isPositionalAllowed){this._setBlankAssignment(assignment);return RESOLVED;}

if(assignment.param.type.name==='array'){var arrayArg=arrayArgs[assignment.param.name];if(!arrayArg){arrayArg=new ArrayArgument();arrayArgs[assignment.param.name]=arrayArg;}
arrayArg.addArguments(args);args=[]; return RESOLVED;} 
if(args.length===0){this._setBlankAssignment(assignment);return RESOLVED;}
var arg=args.splice(0,1)[0];
 var isIncompleteName=assignment.param.type.name==='number'?/-[-a-zA-Z_]/.test(arg.text):arg.text.charAt(0)==='-';if(isIncompleteName){this._unassigned.push(new UnassignedAssignment(this,arg));return RESOLVED;}
else{return this.setAssignment(assignment,arg,noArgUp);}},this);}.bind(this));var arrayDone=positionalDone.then(function(){return util.promiseEach(Object.keys(arrayArgs),function(name){var assignment=this.getAssignment(name);return this.setAssignment(assignment,arrayArgs[name],noArgUp);},this);}.bind(this)); return arrayDone.then(function(){return this._addUnassignedArgs(args);}.bind(this));};Requisition.prototype.exec=function(options){var command=null;var args=null;var hidden=false;if(options){if(options.hidden){hidden=true;}
if(options.command!=null){
command=this.system.commands.get(options.command);if(!command){console.error('Command not found: '+options.command);}
args=options.args;}}
if(!command){command=this.commandAssignment.value;args=this.getArgsObject();}
var typed=this.toString();if(evalCmd.isCommandRegexp.test(typed)){typed=typed.replace(evalCmd.isCommandRegexp,'');typed=typed.replace(/\s*}\s*$/,'');}
var output=new Output(this.conversionContext,{command:command,args:args,typed:typed,canonical:this.toCanonicalString(),hidden:hidden});this.commandOutputManager.onOutput({output:output});var onDone=function(data){output.complete(data,false);return output;};var onError=function(data,ex){if(logErrors){if(ex!=null){util.errorHandler(ex);}
else{console.error(data);}}
if(data!=null&&typeof data==='string'){data=data.replace(/^Protocol error: /,'');}
data=(data!=null&&data.isTypedData)?data:{isTypedData:true,data:data,type:'error'};output.complete(data,true);return output;};if(this.status!==Status.VALID){var ex=new Error(this.getStatusMessage());
 return Promise.resolve(onError(ex)).then(function(output){this.clear();return output;}.bind(this));}
else{try{return host.exec(function(){return command.exec(args,this.executionContext);}.bind(this)).then(onDone,onError);}
catch(ex){var data=(typeof ex.message==='string'&&ex.stack!=null)?ex.message:ex;return Promise.resolve(onError(data,ex));}
finally{this.clear();}}};Requisition.prototype._contextUpdateExec=function(typed,options){return this.updateExec(typed,options).then(function(reply){this.onExternalUpdate({typed:typed});return reply;}.bind(this));};Requisition.prototype.updateExec=function(input,options){return this.update(input).then(function(){return this.exec(options);}.bind(this));};exports.Requisition=Requisition;function Output(context,options){options=options||{};this.command=options.command||'';this.args=options.args||{};this.typed=options.typed||'';this.canonical=options.canonical||'';this.hidden=options.hidden===true?true:false;this.converters=context.system.converters;this.type=undefined;this.data=undefined;this.completed=false;this.error=false;this.start=new Date();this.promise=new Promise(function(resolve,reject){this._resolve=resolve;}.bind(this));}
Output.prototype.complete=function(data,error){this.end=new Date();this.completed=true;this.error=error;if(data!=null&&data.isTypedData){this.data=data.data;this.type=data.type;}
else{this.data=data;this.type=this.command.returnType;if(this.type==null){this.type=(this.data==null)?'undefined':typeof this.data;}}
if(this.type==='object'){throw new Error('No type from output of '+this.typed);}
this._resolve();};Output.prototype.convert=function(type,conversionContext){return this.converters.convert(this.data,this.type,type,conversionContext);};Output.prototype.toJson=function(){return{typed:this.typed,type:this.type,data:this.data,error:this.error};};exports.Output=Output;