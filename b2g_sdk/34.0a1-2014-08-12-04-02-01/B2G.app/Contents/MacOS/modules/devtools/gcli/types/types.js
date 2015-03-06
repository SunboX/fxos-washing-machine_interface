'use strict';var util=require('../util/util');var Promise=require('../util/promise').Promise;function Argument(text,prefix,suffix){if(text===undefined){this.text='';this.prefix='';this.suffix='';}
else{this.text=text;this.prefix=prefix!==undefined?prefix:'';this.suffix=suffix!==undefined?suffix:'';}}
Argument.prototype.type='Argument';Argument.prototype.merge=function(following){
return new Argument(this.text+this.suffix+following.prefix+following.text,this.prefix,following.suffix);};Argument.prototype.beget=function(options){var text=this.text;var prefix=this.prefix;var suffix=this.suffix;if(options.text!=null){text=options.text; if(!options.dontQuote){var needsQuote=text.indexOf(' ')>=0||text.length===0;var hasQuote=/['"]$/.test(prefix);if(needsQuote&&!hasQuote){prefix=prefix+'\'';suffix='\''+suffix;}}}
if(options.prefixSpace&&prefix.charAt(0)!==' '){prefix=' '+prefix;}
if(options.prefixPostSpace&&prefix.charAt(prefix.length-1)!==' '){prefix=prefix+' ';}
if(options.suffixSpace&&suffix.charAt(suffix.length-1)!==' '){suffix=suffix+' ';}
if(text===this.text&&suffix===this.suffix&&prefix===this.prefix){return this;}
var ArgumentType=options.type||Argument;return new ArgumentType(text,prefix,suffix);};Object.defineProperty(Argument.prototype,'assignment',{get:function(){return this._assignment;},set:function(assignment){this._assignment=assignment;},enumerable:true});Argument.prototype.getArgs=function(){return[this];};Argument.prototype.equals=function(that){if(this===that){return true;}
if(that==null||!(that instanceof Argument)){return false;}
return this.text===that.text&&this.prefix===that.prefix&&this.suffix===that.suffix;};Argument.prototype.toString=function(){
return this.prefix+this.text+this.suffix;};Argument.merge=function(argArray,start,end){start=(start===undefined)?0:start;end=(end===undefined)?argArray.length:end;var joined;for(var i=start;i<end;i++){var arg=argArray[i];if(!joined){joined=arg;}
else{joined=joined.merge(arg);}}
return joined;};Object.defineProperty(Argument.prototype,'_summaryJson',{get:function(){var assignStatus=this.assignment==null?'null':this.assignment.param.name;return'<'+this.prefix+':'+this.text+':'+this.suffix+'>'+' (a='+assignStatus+','+' t='+this.type+')';},enumerable:true});exports.Argument=Argument;function BlankArgument(){this.text='';this.prefix='';this.suffix='';}
BlankArgument.prototype=Object.create(Argument.prototype);BlankArgument.prototype.type='BlankArgument';exports.BlankArgument=BlankArgument;function ScriptArgument(text,prefix,suffix){this.text=text!==undefined?text:'';this.prefix=prefix!==undefined?prefix:'';this.suffix=suffix!==undefined?suffix:'';ScriptArgument._moveSpaces(this);}
ScriptArgument.prototype=Object.create(Argument.prototype);ScriptArgument.prototype.type='ScriptArgument';ScriptArgument._moveSpaces=function(arg){while(arg.text.charAt(0)===' '){arg.prefix=arg.prefix+' ';arg.text=arg.text.substring(1);}
while(arg.text.charAt(arg.text.length-1)===' '){arg.suffix=' '+arg.suffix;arg.text=arg.text.slice(0,-1);}};ScriptArgument.prototype.beget=function(options){options.type=ScriptArgument;var begotten=Argument.prototype.beget.call(this,options);ScriptArgument._moveSpaces(begotten);return begotten;};exports.ScriptArgument=ScriptArgument;function MergedArgument(args,start,end){if(!Array.isArray(args)){throw new Error('args is not an array of Arguments');}
if(start===undefined){this.args=args;}
else{this.args=args.slice(start,end);}
var arg=Argument.merge(this.args);this.text=arg.text;this.prefix=arg.prefix;this.suffix=arg.suffix;}
MergedArgument.prototype=Object.create(Argument.prototype);MergedArgument.prototype.type='MergedArgument';Object.defineProperty(MergedArgument.prototype,'assignment',{get:function(){return this._assignment;},set:function(assignment){this._assignment=assignment;this.args.forEach(function(arg){arg.assignment=assignment;},this);},enumerable:true});MergedArgument.prototype.getArgs=function(){return this.args;};MergedArgument.prototype.equals=function(that){if(this===that){return true;}
if(that==null||!(that instanceof MergedArgument)){return false;} 
return this.text===that.text&&this.prefix===that.prefix&&this.suffix===that.suffix;};exports.MergedArgument=MergedArgument;function TrueNamedArgument(arg){this.arg=arg;this.text=arg.text;this.prefix=arg.prefix;this.suffix=arg.suffix;}
TrueNamedArgument.prototype=Object.create(Argument.prototype);TrueNamedArgument.prototype.type='TrueNamedArgument';Object.defineProperty(TrueNamedArgument.prototype,'assignment',{get:function(){return this._assignment;},set:function(assignment){this._assignment=assignment;if(this.arg){this.arg.assignment=assignment;}},enumerable:true});TrueNamedArgument.prototype.getArgs=function(){return[this.arg];};TrueNamedArgument.prototype.equals=function(that){if(this===that){return true;}
if(that==null||!(that instanceof TrueNamedArgument)){return false;}
return this.text===that.text&&this.prefix===that.prefix&&this.suffix===that.suffix;};TrueNamedArgument.prototype.beget=function(options){if(options.text){console.error('Can\'t change text of a TrueNamedArgument',this,options);}
options.type=TrueNamedArgument;var begotten=Argument.prototype.beget.call(this,options);begotten.arg=new Argument(begotten.text,begotten.prefix,begotten.suffix);return begotten;};exports.TrueNamedArgument=TrueNamedArgument;function FalseNamedArgument(){this.text='';this.prefix='';this.suffix='';}
FalseNamedArgument.prototype=Object.create(Argument.prototype);FalseNamedArgument.prototype.type='FalseNamedArgument';FalseNamedArgument.prototype.getArgs=function(){return[];};FalseNamedArgument.prototype.equals=function(that){if(this===that){return true;}
if(that==null||!(that instanceof FalseNamedArgument)){return false;}
return this.text===that.text&&this.prefix===that.prefix&&this.suffix===that.suffix;};exports.FalseNamedArgument=FalseNamedArgument;function NamedArgument(){if(typeof arguments[0]==='string'){this.nameArg=null;this.valueArg=null;this.text=arguments[0];this.prefix=arguments[1];this.suffix=arguments[2];}
else if(arguments[1]==null){this.nameArg=arguments[0];this.valueArg=null;this.text='';this.prefix=this.nameArg.toString();this.suffix='';}
else{this.nameArg=arguments[0];this.valueArg=arguments[1];this.text=this.valueArg.text;this.prefix=this.nameArg.toString()+this.valueArg.prefix;this.suffix=this.valueArg.suffix;}}
NamedArgument.prototype=Object.create(Argument.prototype);NamedArgument.prototype.type='NamedArgument';Object.defineProperty(NamedArgument.prototype,'assignment',{get:function(){return this._assignment;},set:function(assignment){this._assignment=assignment;this.nameArg.assignment=assignment;if(this.valueArg!=null){this.valueArg.assignment=assignment;}},enumerable:true});NamedArgument.prototype.getArgs=function(){return this.valueArg?[this.nameArg,this.valueArg]:[this.nameArg];};NamedArgument.prototype.equals=function(that){if(this===that){return true;}
if(that==null){return false;}
if(!(that instanceof NamedArgument)){return false;} 
return this.text===that.text&&this.prefix===that.prefix&&this.suffix===that.suffix;};NamedArgument.prototype.beget=function(options){options.type=NamedArgument;var begotten=Argument.prototype.beget.call(this,options);
 var matches=/^([\s]*)([^\s]*)([\s]*['"]?)$/.exec(begotten.prefix);if(this.valueArg==null&&begotten.text===''){begotten.nameArg=new Argument(matches[2],matches[1],matches[3]);begotten.valueArg=null;}
else{begotten.nameArg=new Argument(matches[2],matches[1],'');begotten.valueArg=new Argument(begotten.text,matches[3],begotten.suffix);}
return begotten;};exports.NamedArgument=NamedArgument;function ArrayArgument(){this.args=[];}
ArrayArgument.prototype=Object.create(Argument.prototype);ArrayArgument.prototype.type='ArrayArgument';ArrayArgument.prototype.addArgument=function(arg){this.args.push(arg);};ArrayArgument.prototype.addArguments=function(args){Array.prototype.push.apply(this.args,args);};ArrayArgument.prototype.getArguments=function(){return this.args;};Object.defineProperty(ArrayArgument.prototype,'assignment',{get:function(){return this._assignment;},set:function(assignment){this._assignment=assignment;this.args.forEach(function(arg){arg.assignment=assignment;},this);},enumerable:true});ArrayArgument.prototype.getArgs=function(){return this.args;};ArrayArgument.prototype.equals=function(that){if(this===that){return true;}
if(that==null){return false;}
if(that.type!=='ArrayArgument'){return false;}
if(this.args.length!==that.args.length){return false;}
for(var i=0;i<this.args.length;i++){if(!this.args[i].equals(that.args[i])){return false;}}
return true;};ArrayArgument.prototype.toString=function(){return'{'+this.args.map(function(arg){return arg.toString();},this).join(',')+'}';};exports.ArrayArgument=ArrayArgument;var Status={VALID:{toString:function(){return'VALID';},valueOf:function(){return 0;}},INCOMPLETE:{toString:function(){return'INCOMPLETE';},valueOf:function(){return 1;}},ERROR:{toString:function(){return'ERROR';},valueOf:function(){return 2;}},combine:function(){var combined=Status.VALID;for(var i=0;i<arguments.length;i++){var status=arguments[i];if(Array.isArray(status)){status=Status.combine.apply(null,status);}
if(status>combined){combined=status;}}
return combined;},fromString:function(str){switch(str){case Status.VALID.toString():return Status.VALID;case Status.INCOMPLETE.toString():return Status.INCOMPLETE;case Status.ERROR.toString():return Status.ERROR;default:throw new Error('\''+str+'\' is not a status');}}};exports.Status=Status;function Conversion(value,arg,status,message,predictions){if(arg==null){throw new Error('Missing arg');}
if(predictions!=null&&typeof predictions!=='function'&&!Array.isArray(predictions)&&typeof predictions.then!=='function'){throw new Error('predictions exists but is not a promise, function or array');}
if(status===Status.ERROR&&!message){throw new Error('Conversion has status=ERROR but no message');}
this.value=value;this.arg=arg;this._status=status||Status.VALID;this.message=message;this.predictions=predictions;}
Object.defineProperty(Conversion.prototype,'assignment',{get:function(){return this.arg.assignment;},set:function(assignment){this.arg.assignment=assignment;},enumerable:true});Conversion.prototype.isDataProvided=function(){return this.arg.type!=='BlankArgument';};Conversion.prototype.equals=function(that){if(this===that){return true;}
if(that==null){return false;}
return this.valueEquals(that)&&this.argEquals(that);};Conversion.prototype.valueEquals=function(that){return that!=null&&this.value===that.value;};Conversion.prototype.argEquals=function(that){return that==null?false:this.arg.equals(that.arg);};Conversion.prototype.getStatus=function(arg){return this._status;};Conversion.prototype.toString=function(){return this.arg.toString();};Conversion.prototype.getPredictions=function(context){if(typeof this.predictions==='function'){return this.predictions(context);}
return Promise.resolve(this.predictions||[]);};Conversion.prototype.constrainPredictionIndex=function(context,index){if(index==null){return Promise.resolve();}
return this.getPredictions(context).then(function(value){if(value.length===0){return undefined;}
index=index%value.length;if(index<0){index=value.length+index;}
return index;}.bind(this));};Conversion.maxPredictions=9;exports.Conversion=Conversion;function ArrayConversion(conversions,arg){this.arg=arg;this.conversions=conversions;this.value=conversions.map(function(conversion){return conversion.value;},this);this._status=Status.combine(conversions.map(function(conversion){return conversion.getStatus();}));this.message=''; this.predictions=[];}
ArrayConversion.prototype=Object.create(Conversion.prototype);Object.defineProperty(ArrayConversion.prototype,'assignment',{get:function(){return this._assignment;},set:function(assignment){this._assignment=assignment;this.conversions.forEach(function(conversion){conversion.assignment=assignment;},this);},enumerable:true});ArrayConversion.prototype.getStatus=function(arg){if(arg&&arg.conversion){return arg.conversion.getStatus();}
return this._status;};ArrayConversion.prototype.isDataProvided=function(){return this.conversions.length>0;};ArrayConversion.prototype.valueEquals=function(that){if(that==null){return false;}
if(!(that instanceof ArrayConversion)){throw new Error('Can\'t compare values with non ArrayConversion');}
if(this.value===that.value){return true;}
if(this.value.length!==that.value.length){return false;}
for(var i=0;i<this.conversions.length;i++){if(!this.conversions[i].valueEquals(that.conversions[i])){return false;}}
return true;};ArrayConversion.prototype.toString=function(){return'[ '+this.conversions.map(function(conversion){return conversion.toString();},this).join(', ')+' ]';};exports.ArrayConversion=ArrayConversion;function Type(){}
Type.prototype.getSpec=function(commandName,paramName){throw new Error('Not implemented');};Type.prototype.stringify=function(value,context){throw new Error('Not implemented');};Type.prototype.parse=function(arg,context){throw new Error('Not implemented');};Type.prototype.parseString=function(str,context){return this.parse(new Argument(str),context);};Type.prototype.name=undefined;Type.prototype.increment=function(value,context){return undefined;};Type.prototype.decrement=function(value,context){return undefined;};Type.prototype.getBlank=function(context){return new Conversion(undefined,new BlankArgument(),Status.INCOMPLETE,'');};Type.prototype.getType=function(context){return this;};Type.prototype.item='type';exports.Type=Type;function Types(){ this._registered={};}
exports.Types=Types;Types.prototype.getTypeNames=function(){return Object.keys(this._registered);};Types.prototype.add=function(type){if(typeof type==='object'){if(!type.name){throw new Error('All registered types must have a name');}
if(type instanceof Type){this._registered[type.name]=type;}
else{var name=type.name;var parent=type.parent;type.name=parent;delete type.parent;this._registered[name]=this.createType(type);type.name=name;type.parent=parent;}}
else if(typeof type==='function'){if(!type.prototype.name){throw new Error('All registered types must have a name');}
this._registered[type.prototype.name]=type;}
else{throw new Error('Unknown type: '+type);}};Types.prototype.remove=function(type){delete this._registered[type.name];};Types.prototype.createType=function(typeSpec){if(typeof typeSpec==='string'){typeSpec={name:typeSpec};}
if(typeof typeSpec!=='object'){throw new Error('Can\'t extract type from '+typeSpec);}
var NewTypeCtor,newType;if(typeSpec.name==null||typeSpec.name=='type'){NewTypeCtor=Type;}
else{NewTypeCtor=this._registered[typeSpec.name];}
if(!NewTypeCtor){console.error('Known types: '+Object.keys(this._registered).join(', '));throw new Error('Unknown type: \''+typeSpec.name+'\'');}
if(typeof NewTypeCtor==='function'){newType=new NewTypeCtor(typeSpec);}
else{newType={};util.copyProperties(NewTypeCtor,newType);} 
util.copyProperties(typeSpec,newType); newType.types=this;if(typeof NewTypeCtor!=='function'){if(typeof newType.constructor==='function'){newType.constructor();}}
return newType;};