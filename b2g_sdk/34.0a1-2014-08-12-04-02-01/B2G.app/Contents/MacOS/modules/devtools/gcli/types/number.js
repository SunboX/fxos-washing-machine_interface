'use strict';var Promise=require('../util/promise').Promise;var l10n=require('../util/l10n');var Status=require('./types').Status;var Conversion=require('./types').Conversion;exports.items=[{

 item:'type',name:'number',allowFloat:false,max:undefined,min:undefined,step:1,constructor:function(){if(!this.allowFloat&&(this._isFloat(this.min)||this._isFloat(this.max)||this._isFloat(this.step))){throw new Error('allowFloat is false, but non-integer values given in type spec');}},getSpec:function(){var spec={name:'number'};if(this.step!==1){spec.step=this.step;}
if(this.max!=null){spec.max=this.max;}
if(this.min!=null){spec.min=this.min;}
if(this.allowFloat){spec.allowFloat=true;}
return(Object.keys(spec).length===1)?'number':spec;},stringify:function(value,context){if(value==null){return'';}
return''+value;},getMin:function(context){if(this.min){if(typeof this.min==='function'){return this.min(context);}
if(typeof this.min==='number'){return this.min;}}
return undefined;},getMax:function(context){if(this.max){if(typeof this.max==='function'){return this.max(context);}
if(typeof this.max==='number'){return this.max;}}
return undefined;},parse:function(arg,context){var msg;if(arg.text.replace(/^\s*-?/,'').length===0){return Promise.resolve(new Conversion(undefined,arg,Status.INCOMPLETE,''));}
if(!this.allowFloat&&(arg.text.indexOf('.')!==-1)){msg=l10n.lookupFormat('typesNumberNotInt2',[arg.text]);return Promise.resolve(new Conversion(undefined,arg,Status.ERROR,msg));}
var value;if(this.allowFloat){value=parseFloat(arg.text);}
else{value=parseInt(arg.text,10);}
if(isNaN(value)){msg=l10n.lookupFormat('typesNumberNan',[arg.text]);return Promise.resolve(new Conversion(undefined,arg,Status.ERROR,msg));}
var max=this.getMax(context);if(max!=null&&value>max){msg=l10n.lookupFormat('typesNumberMax',[value,max]);return Promise.resolve(new Conversion(undefined,arg,Status.ERROR,msg));}
var min=this.getMin(context);if(min!=null&&value<min){msg=l10n.lookupFormat('typesNumberMin',[value,min]);return Promise.resolve(new Conversion(undefined,arg,Status.ERROR,msg));}
return Promise.resolve(new Conversion(value,arg));},decrement:function(value,context){if(typeof value!=='number'||isNaN(value)){return this.getMax(context)||1;}
var newValue=value-this.step; newValue=Math.ceil(newValue/this.step)*this.step;return this._boundsCheck(newValue,context);},increment:function(value,context){if(typeof value!=='number'||isNaN(value)){var min=this.getMin(context);return min!=null?min:0;}
var newValue=value+this.step; newValue=Math.floor(newValue/this.step)*this.step;if(this.getMax(context)==null){return newValue;}
return this._boundsCheck(newValue,context);},
_boundsCheck:function(value,context){var min=this.getMin(context);if(min!=null&&value<min){return min;}
var max=this.getMax(context);if(max!=null&&value>max){return max;}
return value;},_isFloat:function(value){return((typeof value==='number')&&isFinite(value)&&(value%1!==0));}}];