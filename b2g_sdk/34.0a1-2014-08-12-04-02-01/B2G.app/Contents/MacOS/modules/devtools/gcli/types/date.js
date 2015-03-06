'use strict';var Promise=require('../util/promise').Promise;var l10n=require('../util/l10n');var Status=require('./types').Status;var Conversion=require('./types').Conversion;function pad(number){var r=String(number);return r.length===1?'0'+r:r;}
function toDate(str){var millis=Date.parse(str);if(isNaN(millis)){throw new Error(l10n.lookupFormat('typesDateNan',[str]));}
return new Date(millis);}
function isDate(thing){return Object.prototype.toString.call(thing)==='[object Date]'&&!isNaN(thing.getTime());}
exports.items=[{
 item:'type',name:'date',step:1,min:new Date(-8640000000000000),max:new Date(8640000000000000),constructor:function(){this._origMin=this.min;if(this.min!=null){if(typeof this.min==='string'){this.min=toDate(this.min);}
else if(isDate(this.min)||typeof this.min==='function'){this.min=this.min;}
else{throw new Error('date min value must be one of string/date/function');}}
this._origMax=this.max;if(this.max!=null){if(typeof this.max==='string'){this.max=toDate(this.max);}
else if(isDate(this.max)||typeof this.max==='function'){this.max=this.max;}
else{throw new Error('date max value must be one of string/date/function');}}},getSpec:function(){var spec={name:'date'};if(this.step!==1){spec.step=this.step;}
if(this._origMax!=null){spec.max=this._origMax;}
if(this._origMin!=null){spec.min=this._origMin;}
return spec;},stringify:function(value,context){if(!isDate(value)){return'';}
var str=pad(value.getFullYear())+'-'+
pad(value.getMonth()+1)+'-'+
pad(value.getDate()); if(value.getHours()!==0||value.getMinutes()!==0||value.getSeconds()!==0||value.getMilliseconds()!==0){










str+=' '+pad(value.getHours());str+=':'+pad(value.getMinutes()); if(value.getSeconds()!==0||value.getMilliseconds()!==0){str+=':'+pad(value.getSeconds());if(value.getMilliseconds()!==0){var milliVal=(value.getUTCMilliseconds()/1000).toFixed(3);str+='.'+String(milliVal).slice(2,5);}}}
return str;},getMax:function(context){if(typeof this.max==='function'){return this._max(context);}
if(isDate(this.max)){return this.max;}
return undefined;},getMin:function(context){if(typeof this.min==='function'){return this._min(context);}
if(isDate(this.min)){return this.min;}
return undefined;},parse:function(arg,context){var value;if(arg.text.replace(/\s/g,'').length===0){return Promise.resolve(new Conversion(undefined,arg,Status.INCOMPLETE,''));}
if(arg.text.toLowerCase()==='now'||arg.text.toLowerCase()==='today'){value=new Date();}
else if(arg.text.toLowerCase()==='yesterday'){value=new Date();value.setDate(value.getDate()-1);}
else if(arg.text.toLowerCase()==='tomorrow'){value=new Date();value.setDate(value.getDate()+1);}
else{









 if(arg.text.indexOf('Z')!==-1){value=new Date(arg.text);}
else{
value=new Date(arg.text.replace(/-/g,'/'));}
if(isNaN(value.getTime())){var msg=l10n.lookupFormat('typesDateNan',[arg.text]);return Promise.resolve(new Conversion(undefined,arg,Status.ERROR,msg));}}
return Promise.resolve(new Conversion(value,arg));},decrement:function(value,context){if(!isDate(value)){return new Date();}
var newValue=new Date(value);newValue.setDate(value.getDate()-this.step);if(newValue>=this.getMin(context)){return newValue;}
else{return this.getMin(context);}},increment:function(value,context){if(!isDate(value)){return new Date();}
var newValue=new Date(value);newValue.setDate(value.getDate()+this.step);if(newValue<=this.getMax(context)){return newValue;}
else{return this.getMax();}}}];