'use strict';var util=require('../util/util');var l10n=require('../util/l10n');function lookup(data,onUndefined){if(data==null){if(onUndefined){return l10n.lookup(onUndefined);}
return data;}
if(typeof data==='string'){return data;}
if(typeof data==='object'){if(data.key){return l10n.lookup(data.key);}
var locales=l10n.getPreferredLocales();var translated;locales.some(function(locale){translated=data[locale];return translated!=null;});if(translated!=null){return translated;}
console.error('Can\'t find locale in descriptions: '+'locales='+JSON.stringify(locales)+', '+'description='+JSON.stringify(data));return'(No description)';}
return l10n.lookup(onUndefined);}
function Command(types,commandSpec){Object.keys(commandSpec).forEach(function(key){this[key]=commandSpec[key];},this);if(!this.name){throw new Error('All registered commands must have a name');}
if(this.params==null){this.params=[];}
if(!Array.isArray(this.params)){throw new Error('command.params must be an array in '+this.name);}
this.hasNamedParameters=false;this.description='description'in this?this.description:undefined;this.description=lookup(this.description,'canonDescNone');this.manual='manual'in this?this.manual:undefined;this.manual=lookup(this.manual);
 var paramSpecs=this.params;this.params=[];this.paramGroups={};this._shortParams={};var addParam=function(param){var groupName=param.groupName||l10n.lookup('canonDefaultGroupName');this.params.push(param);if(!this.paramGroups.hasOwnProperty(groupName)){this.paramGroups[groupName]=[];}
this.paramGroups[groupName].push(param);}.bind(this);


var usingGroups=false;


paramSpecs.forEach(function(spec){if(!spec.group){var param=new Parameter(types,spec,this,null);addParam(param);if(!param.isPositionalAllowed){this.hasNamedParameters=true;}
if(usingGroups&&param.groupName==null){throw new Error('Parameters can\'t come after param groups.'+' Ignoring '+this.name+'/'+spec.name);}
if(param.groupName!=null){usingGroups=true;}}
else{spec.params.forEach(function(ispec){var param=new Parameter(types,ispec,this,spec.group);addParam(param);if(!param.isPositionalAllowed){this.hasNamedParameters=true;}},this);usingGroups=true;}},this);this.params.forEach(function(param){if(param.short!=null){if(this._shortParams[param.short]!=null){throw new Error('Multiple params using short name '+param.short);}
this._shortParams[param.short]=param;}},this);}
Command.prototype.toJson=function(){var json={item:'command',name:this.name,params:this.params.map(function(param){return param.toJson();}),returnType:this.returnType,isParent:(this.exec==null)};if(this.description!==l10n.lookup('canonDescNone')){json.description=this.description;}
if(this.manual!=null){json.manual=this.manual;}
if(this.hidden!=null){json.hidden=this.hidden;}
return json;};Command.prototype.getParameterByShortName=function(short){return this._shortParams[short];};exports.Command=Command;function Parameter(types,paramSpec,command,groupName){this.command=command||{name:'unnamed'};this.paramSpec=paramSpec;this.name=this.paramSpec.name;this.type=this.paramSpec.type;this.short=this.paramSpec.short;if(this.short!=null&&!/[0-9A-Za-z]/.test(this.short)){throw new Error('\'short\' value must be a single alphanumeric digit.');}
this.groupName=groupName;if(this.groupName!=null){if(this.paramSpec.option!=null){throw new Error('Can\'t have a "option" property in a nested parameter');}}
else{if(this.paramSpec.option!=null){this.groupName=(this.paramSpec.option===true)?l10n.lookup('canonDefaultGroupName'):''+this.paramSpec.option;}}
if(!this.name){throw new Error('In '+this.command.name+': all params must have a name');}
var typeSpec=this.type;this.type=types.createType(typeSpec);if(this.type==null){console.error('Known types: '+types.getTypeNames().join(', '));throw new Error('In '+this.command.name+'/'+this.name+': can\'t find type for: '+JSON.stringify(typeSpec));}

if(this.type.name==='boolean'&&this.paramSpec.defaultValue!==undefined){throw new Error('In '+this.command.name+'/'+this.name+': boolean parameters can not have a defaultValue.'+' Ignoring');}
 
if(!this.isPositionalAllowed&&this.paramSpec.defaultValue===undefined&&this.type.getBlank==null&&this.type.name!=='boolean'){throw new Error('In '+this.command.name+'/'+this.name+': Missing defaultValue for optional parameter.');}
this.defaultValue=(this.paramSpec.defaultValue!==undefined)?this.paramSpec.defaultValue:this.type.getBlank().value; this.manual=lookup(this.paramSpec.manual);this.description=lookup(this.paramSpec.description,'canonDescNone');
this.isDataRequired=(this.defaultValue===undefined);
this.isPositionalAllowed=this.groupName==null;}
Parameter.prototype.isKnownAs=function(name){return(name==='--'+this.name)||(name==='-'+this.short);};Object.defineProperty(Parameter.prototype,'hidden',{get:function(){return this.paramSpec.hidden;},enumerable:true});Parameter.prototype.toJson=function(){var json={name:this.name,type:this.type.getSpec(this.command.name,this.name),short:this.short};

 if(this.paramSpec.defaultValue!==undefined){json.defaultValue={};}
if(this.paramSpec.description!=null){json.description=this.paramSpec.description;}
if(this.paramSpec.manual!=null){json.manual=this.paramSpec.manual;}
if(this.paramSpec.hidden!=null){json.hidden=this.paramSpec.hidden;} 
if(this.groupName!=null||this.paramSpec.option!=null){json.option=this.groupName||this.paramSpec.option;}
return json;};exports.Parameter=Parameter;function Commands(types){this.types=types; this._commands={}; this._commandNames=[]; this._commandSpecs={}; this.onCommandsChange=util.createEvent('commands.onCommandsChange');}
Commands.prototype.add=function(commandSpec){if(this._commands[commandSpec.name]!=null){ delete this._commands[commandSpec.name];this._commandNames=this._commandNames.filter(function(test){return test!==commandSpec.name;});}
var command=new Command(this.types,commandSpec);this._commands[commandSpec.name]=command;this._commandNames.push(commandSpec.name);this._commandNames.sort();this._commandSpecs[commandSpec.name]=commandSpec;this.onCommandsChange();return command;};Commands.prototype.remove=function(commandOrName){var name=typeof commandOrName==='string'?commandOrName:commandOrName.name;if(!this._commands[name]){return false;} 
delete this._commands[name];delete this._commandSpecs[name];this._commandNames=this._commandNames.filter(function(test){return test!==name;});this.onCommandsChange();return true;};Commands.prototype.get=function(name){ return this._commands[name]||undefined;};Commands.prototype.getAll=function(){return Object.keys(this._commands).map(function(name){return this._commands[name];},this);};Commands.prototype.getCommandSpecs=function(){var commandSpecs=[];Object.keys(this._commands).forEach(function(name){var command=this._commands[name];if(!command.noRemote){commandSpecs.push(command.toJson());}}.bind(this));return commandSpecs;};Commands.prototype.addProxyCommands=function(commandSpecs,remoter,prefix,to){if(prefix!=null){if(this._commands[prefix]!=null){throw new Error(l10n.lookupFormat('canonProxyExists',[prefix]));}
 
this.add({name:prefix,isProxy:true,description:l10n.lookupFormat('canonProxyDesc',[to]),manual:l10n.lookupFormat('canonProxyManual',[to])});}
commandSpecs.forEach(function(commandSpec){var originalName=commandSpec.name;if(!commandSpec.isParent){commandSpec.exec=function(args,context){context.commandName=originalName;return remoter(args,context);}.bind(this);}
if(prefix!=null){commandSpec.name=prefix+' '+commandSpec.name;}
commandSpec.isProxy=true;this.add(commandSpec);}.bind(this));};Commands.prototype.removeProxyCommands=function(prefix){var toRemove=[];Object.keys(this._commandSpecs).forEach(function(name){if(name.indexOf(prefix)===0){toRemove.push(name);}}.bind(this));var removed=[];toRemove.forEach(function(name){var command=this.get(name);if(command.isProxy){this.remove(name);removed.push(name);}
else{console.error('Skipping removal of \''+name+'\' because it is not a proxy command.');}}.bind(this));return removed;};exports.Commands=Commands;function CommandOutputManager(){this.onOutput=util.createEvent('CommandOutputManager.onOutput');}
exports.CommandOutputManager=CommandOutputManager;