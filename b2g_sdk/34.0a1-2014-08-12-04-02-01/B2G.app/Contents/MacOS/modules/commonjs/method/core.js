"use strict";var defineProperty=Object.defineProperty||function(object,name,property){object[name]=property.value
return object}
var typefy=Object.prototype.toString


var types={"function":"Object","object":"Object"}

var host=[]


var builtin={}
function Primitive(){}
function ObjectType(){}
ObjectType.prototype=new Primitive()
function ErrorType(){}
ErrorType.prototype=new ObjectType()
var Default=builtin.Default=Primitive.prototype
var Null=builtin.Null=new Primitive()
var Void=builtin.Void=new Primitive()
builtin.String=new Primitive()
builtin.Number=new Primitive()
builtin.Boolean=new Primitive()
builtin.Object=ObjectType.prototype
builtin.Error=ErrorType.prototype
builtin.EvalError=new ErrorType()
builtin.InternalError=new ErrorType()
builtin.RangeError=new ErrorType()
builtin.ReferenceError=new ErrorType()
builtin.StopIteration=new ErrorType()
builtin.SyntaxError=new ErrorType()
builtin.TypeError=new ErrorType()
builtin.URIError=new ErrorType()
function Method(hint){
var name=(hint||"")+"#"+Math.random().toString(32).substr(2)
function dispatch(value){

var type=null
var method=value===null?Null[name]:value===void(0)?Void[name]:

value[name]||
((type=builtin[(value.constructor||"").name])&&type[name])||



host[value["!"+name]||void(0)]||

((type=builtin[types[typeof(value)]])&&type[name])

method=method||Default[name]

if(!method)throw TypeError("Type does not implements method: "+name)
return method.apply(method,arguments)}

dispatch.toString=function toString(){return name}
dispatch.implement=implementMethod
dispatch.define=defineMethod
return dispatch}
var defineMethod=function defineMethod(Type,lambda){return define(this,Type,lambda)}
var implementMethod=function implementMethod(object,lambda){return implement(this,object,lambda)}

var implement=Method("implement")
var define=Method("define")
function _implement(method,object,lambda){return defineProperty(object,method.toString(),{enumerable:false,configurable:false,writable:false,value:lambda})}
function _define(method,Type,lambda){var type=Type&&typefy.call(Type.prototype)

if(!lambda)Default[method]=Type

else if(Type===null)Null[method]=lambda
else if(Type===void(0))Void[method]=lambda



else if(type!=="[object Object]"&&Type.name){var Bulitin=builtin[Type.name]||(builtin[Type.name]=new ObjectType())
Bulitin[method]=lambda}


else if(Type.name==="Object")
builtin.Object[method]=lambda






else if(Type.call===void(0)){var index=host.indexOf(lambda)
if(index<0)index=host.push(lambda)-1


implement("!"+method,Type.prototype,index)}

else
implement(method,Type.prototype,lambda)}
_define(define,_define)
_define(implement,_implement)
Method.implement=implement
Method.define=define
Method.Method=Method
Method.method=Method
Method.builtin=builtin
Method.host=host
module.exports=Method