"use strict";module.metadata={"stability":"unstable"};const{isFunction,isNull,isObject,isString,isRegExp,isArray,isDate,isPrimitive,isUndefined,instanceOf,source}=require("../lang/type");function AssertionError(options){let assertionError=Object.create(AssertionError.prototype);if(isString(options))
options={message:options};if("actual"in options)
assertionError.actual=options.actual;if("expected"in options)
assertionError.expected=options.expected;if("operator"in options)
assertionError.operator=options.operator;assertionError.message=options.message;assertionError.stack=new Error().stack;return assertionError;}
AssertionError.prototype=Object.create(Error.prototype,{constructor:{value:AssertionError},name:{value:"AssertionError",enumerable:true},toString:{value:function toString(){let value;if(this.message){value=this.name+" : "+this.message;}
else{value=[this.name+" : ",source(this.expected),this.operator,source(this.actual)].join(" ");}
return value;}}});exports.AssertionError=AssertionError;function Assert(logger){let assert=Object.create(Assert.prototype,{_log:{value:logger}});assert.fail=assert.fail.bind(assert);assert.pass=assert.pass.bind(assert);return assert;}
Assert.prototype={fail:function fail(e){if(!e||typeof(e)!=='object'){this._log.fail(e);return;}
let message=e.message;try{if('operator'in e){message+=[" -",source(e.expected),e.operator,source(e.actual)].join(" ");}}
catch(e){}
this._log.fail(message);},pass:function pass(message){this._log.pass(message);},error:function error(e){this._log.exception(e);},ok:function ok(value,message){if(!!!value){this.fail({actual:value,expected:true,message:message,operator:"=="});}
else{this.pass(message);}},equal:function equal(actual,expected,message){if(actual==expected){this.pass(message);}
else{this.fail({actual:actual,expected:expected,message:message,operator:"=="});}},notEqual:function notEqual(actual,expected,message){if(actual!=expected){this.pass(message);}
else{this.fail({actual:actual,expected:expected,message:message,operator:"!=",});}},deepEqual:function deepEqual(actual,expected,message){if(isDeepEqual(actual,expected)){this.pass(message);}
else{this.fail({actual:actual,expected:expected,message:message,operator:"deepEqual"});}},notDeepEqual:function notDeepEqual(actual,expected,message){if(!isDeepEqual(actual,expected)){this.pass(message);}
else{this.fail({actual:actual,expected:expected,message:message,operator:"notDeepEqual"});}},strictEqual:function strictEqual(actual,expected,message){if(actual===expected){this.pass(message);}
else{this.fail({actual:actual,expected:expected,message:message,operator:"==="});}},notStrictEqual:function notStrictEqual(actual,expected,message){if(actual!==expected){this.pass(message);}
else{this.fail({actual:actual,expected:expected,message:message,operator:"!=="})}},throws:function throws(block,Error,message){let threw=false;let exception=null;

if(isString(Error)&&isUndefined(message)){message=Error;Error=undefined;}
try{block();}
catch(e){threw=true;exception=e;}

if(threw&&(isUndefined(Error)||
(isRegExp(Error)&&Error.test(exception.message))||
(isFunction(Error)&&instanceOf(exception,Error))))
{this.pass(message);}
else{let failure={message:message,operator:"throws"};if(exception)
failure.actual=exception;if(Error)
failure.expected=Error;this.fail(failure);}}};exports.Assert=Assert;function isDeepEqual(actual,expected){if(actual===expected){return true;}

else if(isDate(actual)&&isDate(expected)){return actual.getTime()===expected.getTime();} 
else if(isPrimitive(actual)||isPrimitive(expected)){return expected===actual;}
else if(!isObject(actual)&&!isObject(expected)){return actual==expected;}





else{return actual.prototype===expected.prototype&&isEquivalent(actual,expected);}}
function isEquivalent(a,b,stack){let aKeys=Object.keys(a);let bKeys=Object.keys(b);return aKeys.length===bKeys.length&&isArrayEquivalent(aKeys.sort(),bKeys.sort())&&aKeys.every(function(key){return isDeepEqual(a[key],b[key],stack)});}
function isArrayEquivalent(a,b,stack){return isArray(a)&&isArray(b)&&a.every(function(value,index){return isDeepEqual(value,b[index]);});}