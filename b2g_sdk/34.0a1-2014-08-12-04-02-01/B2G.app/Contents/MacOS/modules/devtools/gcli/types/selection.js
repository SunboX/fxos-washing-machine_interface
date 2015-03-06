'use strict';var Promise=require('../util/promise').Promise;var l10n=require('../util/l10n');var spell=require('../util/spell');var Type=require('./types').Type;var Status=require('./types').Status;var Conversion=require('./types').Conversion;var BlankArgument=require('./types').BlankArgument;function SelectionType(typeSpec){if(typeSpec){Object.keys(typeSpec).forEach(function(key){this[key]=typeSpec[key];},this);}
if(this.name!=='selection'&&this.lookup==null&&this.data==null){throw new Error(this.name+' has no lookup or data');}
this._dataToLookup=this._dataToLookup.bind(this);}
SelectionType.prototype=Object.create(Type.prototype);SelectionType.prototype.getSpec=function(commandName,paramName){var spec={name:'selection'};if(this.lookup!=null&&typeof this.lookup!=='function'){spec.lookup=this.lookup;}
if(this.data!=null&&typeof this.data!=='function'){spec.data=this.data;}
if(this.stringifyProperty!=null){spec.stringifyProperty=this.stringifyProperty;}
if(this.cacheable){spec.cacheable=true;}
if(typeof this.lookup==='function'||typeof this.data==='function'){spec.commandName=commandName;spec.paramName=paramName;spec.remoteLookup=(typeof this.lookup==='function');spec.remoteData=(typeof this.data==='function');}
return spec;};SelectionType.prototype.stringify=function(value,context){if(value==null){return'';}
if(this.stringifyProperty!=null){return value[this.stringifyProperty];}
return this.getLookup(context).then(function(lookup){var name=null;lookup.some(function(item){if(item.value===value){name=item.name;return true;}
return false;},this);return name;}.bind(this));};SelectionType.prototype.clearCache=function(){this._cachedLookup=undefined;};SelectionType.prototype.getLookup=function(context){if(this._cachedLookup!=null){return this._cachedLookup;}
var reply;if(this.remoteLookup){reply=this.connection.call('selectioninfo',{action:'lookup',commandName:this.commandName,paramName:this.paramName});reply=resolve(reply,context);}
else if(this.remoteData){reply=this.connection.call('selectioninfo',{action:'data',commandName:this.commandName,paramName:this.paramName});reply=resolve(reply,context).then(this._dataToLookup);}
else if(typeof this.lookup==='function'){reply=resolve(this.lookup.bind(this),context);}
else if(this.lookup!=null){reply=resolve(this.lookup,context);}
else if(this.data!=null){reply=resolve(this.data,context).then(this._dataToLookup);}
else{throw new Error(this.name+' has no lookup or data');}
if(this.cacheable){this._cachedLookup=reply;}
if(reply==null){console.error(arguments);}
return reply;};function resolve(thing,context){return Promise.resolve(thing).then(function(resolved){if(typeof resolved==='function'){return resolve(resolved(context),context);}
return resolved;});}
SelectionType.prototype._dataToLookup=function(data){if(!Array.isArray(data)){throw new Error('data for '+this.name+' resolved to non-array');}
return data.map(function(option){return{name:option,value:option};});};exports.findPredictions=function(arg,lookup){var predictions=[];var i,option;var maxPredictions=Conversion.maxPredictions;var match=arg.text.toLowerCase();
if(arg.suffix.length>0){for(i=0;i<lookup.length&&predictions.length<maxPredictions;i++){option=lookup[i];if(option.name===arg.text){predictions.push(option);}}
return predictions;} 
for(i=0;i<lookup.length;i++){option=lookup[i];if(option._gcliLowerName==null){option._gcliLowerName=option.name.toLowerCase();}}
 
for(i=0;i<lookup.length&&predictions.length<maxPredictions;i++){option=lookup[i];if(option.name===arg.text){predictions.push(option);}} 
for(i=0;i<lookup.length&&predictions.length<maxPredictions;i++){option=lookup[i];if(option._gcliLowerName.indexOf(match)===0&&!option.value.hidden){if(predictions.indexOf(option)===-1){predictions.push(option);}}} 
if(predictions.length<(maxPredictions/2)){for(i=0;i<lookup.length&&predictions.length<maxPredictions;i++){option=lookup[i];if(option._gcliLowerName.indexOf(match)!==-1&&!option.value.hidden){if(predictions.indexOf(option)===-1){predictions.push(option);}}}} 
if(predictions.length===0){var names=[];lookup.forEach(function(opt){if(!opt.value.hidden){names.push(opt.name);}});var corrected=spell.correct(match,names);if(corrected){lookup.forEach(function(opt){if(opt.name===corrected){predictions.push(opt);}},this);}}
return predictions;};SelectionType.prototype.parse=function(arg,context){return Promise.resolve(this.getLookup(context)).then(function(lookup){var predictions=exports.findPredictions(arg,lookup);return exports.convertPredictions(arg,predictions);}.bind(this));};exports.convertPredictions=function(arg,predictions){if(predictions.length===0){var msg=l10n.lookupFormat('typesSelectionNomatch',[arg.text]);return new Conversion(undefined,arg,Status.ERROR,msg,Promise.resolve(predictions));}
if(predictions[0].name===arg.text){var value=predictions[0].value;return new Conversion(value,arg,Status.VALID,'',Promise.resolve(predictions));}
return new Conversion(undefined,arg,Status.INCOMPLETE,'',Promise.resolve(predictions));};SelectionType.prototype.getBlank=function(context){var predictFunc=function(context2){return Promise.resolve(this.getLookup(context2)).then(function(lookup){return lookup.filter(function(option){return!option.value.hidden;}).slice(0,Conversion.maxPredictions-1);});}.bind(this);return new Conversion(undefined,new BlankArgument(),Status.INCOMPLETE,'',predictFunc);};SelectionType.prototype.decrement=function(value,context){return this.getLookup(context).then(function(lookup){var index=this._findValue(lookup,value);if(index===-1){index=0;}
index++;if(index>=lookup.length){index=0;}
return lookup[index].value;}.bind(this));};SelectionType.prototype.increment=function(value,context){return this.getLookup(context).then(function(lookup){var index=this._findValue(lookup,value);if(index===-1){

index=1;}
index--;if(index<0){index=lookup.length-1;}
return lookup[index].value;}.bind(this));};SelectionType.prototype._findValue=function(lookup,value){var index=-1;for(var i=0;i<lookup.length;i++){var pair=lookup[i];if(pair.value===value){index=i;break;}}
return index;};SelectionType.prototype.hasPredictions=true;SelectionType.prototype.name='selection';exports.SelectionType=SelectionType;exports.items=[SelectionType];