'use strict';var Promise=require('../util/promise').Promise;var l10n=require('../util/l10n');var spell=require('../util/spell');var SelectionType=require('./selection').SelectionType;var Status=require('./types').Status;var Conversion=require('./types').Conversion;var cli=require('../cli');exports.items=[{ item:'type',name:'param',parent:'selection',stringifyProperty:'name',requisition:undefined,isIncompleteName:undefined,getSpec:function(){throw new Error('param type is not remotable');},lookup:function(){return exports.getDisplayedParamLookup(this.requisition);},parse:function(arg,context){if(this.isIncompleteName){return SelectionType.prototype.parse.call(this,arg,context);}
else{var message=l10n.lookup('cliUnusedArg');return Promise.resolve(new Conversion(undefined,arg,Status.ERROR,message));}}},{


item:'type',name:'command',parent:'selection',stringifyProperty:'name',allowNonExec:true,getSpec:function(){return{name:'command',allowNonExec:this.allowNonExec};},lookup:function(context){var commands=cli.getMapping(context).requisition.system.commands;return exports.getCommandLookup(commands);},parse:function(arg,context){var conversion=exports.parse(context,arg,this.allowNonExec);return Promise.resolve(conversion);}}];exports.getDisplayedParamLookup=function(requisition){var displayedParams=[];var command=requisition.commandAssignment.value;if(command!=null){command.params.forEach(function(param){var arg=requisition.getAssignment(param.name).arg;if(!param.isPositionalAllowed&&arg.type==='BlankArgument'){displayedParams.push({name:'--'+param.name,value:param});}});}
return displayedParams;};exports.parse=function(context,arg,allowNonExec){var commands=cli.getMapping(context).requisition.system.commands;var lookup=exports.getCommandLookup(commands);var predictions=exports.findPredictions(arg,lookup);return exports.convertPredictions(commands,arg,allowNonExec,predictions);};exports.getCommandLookup=function(commands){var sorted=commands.getAll().sort(function(c1,c2){return c1.name.localeCompare(c2.name);});return sorted.map(function(command){return{name:command.name,value:command};});};exports.findPredictions=function(arg,lookup){var predictions=[];var i,option;var maxPredictions=Conversion.maxPredictions;var match=arg.text.toLowerCase(); var addToPredictions=function(option){if(arg.text.length===0){

if(option.name.indexOf(' ')===-1){predictions.push(option);}}
else{

if(option.value.exec!=null){predictions.push(option);}}};
if(arg.suffix.match(/ +/)){for(i=0;i<lookup.length&&predictions.length<maxPredictions;i++){option=lookup[i];if(option.name===arg.text||option.name.indexOf(arg.text+' ')===0){addToPredictions(option);}}
return predictions;} 
for(i=0;i<lookup.length;i++){option=lookup[i];if(option._gcliLowerName==null){option._gcliLowerName=option.name.toLowerCase();}}
 
for(i=0;i<lookup.length&&predictions.length<maxPredictions;i++){option=lookup[i];if(option.name===arg.text){addToPredictions(option);}} 
for(i=0;i<lookup.length&&predictions.length<maxPredictions;i++){option=lookup[i];if(option._gcliLowerName.indexOf(match)===0&&!option.value.hidden){if(predictions.indexOf(option)===-1){addToPredictions(option);}}} 
if(predictions.length<(maxPredictions/2)){for(i=0;i<lookup.length&&predictions.length<maxPredictions;i++){option=lookup[i];if(option._gcliLowerName.indexOf(match)!==-1&&!option.value.hidden){if(predictions.indexOf(option)===-1){addToPredictions(option);}}}} 
if(predictions.length===0){var names=[];lookup.forEach(function(opt){if(!opt.value.hidden){names.push(opt.name);}});var corrected=spell.correct(match,names);if(corrected){lookup.forEach(function(opt){if(opt.name===corrected){predictions.push(opt);}});}}
return predictions;};exports.convertPredictions=function(commands,arg,allowNonExec,predictions){var command=commands.get(arg.text);

var execWhereNeeded=(allowNonExec||(command!=null&&typeof command.exec==='function'));var isExact=command&&command.name===arg.text&&execWhereNeeded&&predictions.length===1;var alternatives=isExact?[]:predictions;if(command){var status=execWhereNeeded?Status.VALID:Status.INCOMPLETE;return new Conversion(command,arg,status,'',alternatives);}
if(predictions.length===0){var msg=l10n.lookupFormat('typesSelectionNomatch',[arg.text]);return new Conversion(undefined,arg,Status.ERROR,msg,alternatives);}
command=predictions[0].value;if(predictions.length===1){if(command.name===arg.text&&execWhereNeeded){return new Conversion(command,arg,Status.VALID,'');}
return new Conversion(undefined,arg,Status.INCOMPLETE,'',alternatives);} 
if(predictions[0].name===arg.text){return new Conversion(command,arg,Status.VALID,'',alternatives);}
return new Conversion(undefined,arg,Status.INCOMPLETE,'',alternatives);};