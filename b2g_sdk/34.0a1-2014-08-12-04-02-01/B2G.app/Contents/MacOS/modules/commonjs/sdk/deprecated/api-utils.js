"use strict";module.metadata={"stability":"deprecated"};const memory=require("./memory");const{merge}=require("../util/object");const{union}=require("../util/array");const{isNil,isRegExp}=require("../lang/type");const VALID_TYPES=["array","boolean","function","null","number","object","string","undefined","regexp"];const{isArray}=Array;exports.validateOptions=function validateOptions(options,requirements){options=options||{};let validatedOptions={};for(let key in requirements){let isOptional=false;let mapThrew=false;let req=requirements[key];let[optsVal,keyInOpts]=(key in options)?[options[key],true]:[undefined,false];if(req.map){try{optsVal=req.map(optsVal);}
catch(err){if(err instanceof RequirementError)
throw err;mapThrew=true;}}
if(req.is){let types=req.is;if(!isArray(types)&&isArray(types.is))
types=types.is;if(isArray(types)){isOptional=['undefined','null'].every(v=>~types.indexOf(v));types.forEach(function(typ){if(VALID_TYPES.indexOf(typ)<0){let msg='Internal error: invalid requirement type "'+typ+'".';throw new Error(msg);}});if(types.indexOf(getTypeOf(optsVal))<0)
throw new RequirementError(key,req);}}
if(req.ok&&((!isOptional||!isNil(optsVal))&&!req.ok(optsVal)))
throw new RequirementError(key,req);if(keyInOpts||(req.map&&!mapThrew&&optsVal!==undefined))
validatedOptions[key]=optsVal;}
return validatedOptions;};exports.addIterator=function addIterator(obj,keysValsGenerator){obj.__iterator__=function(keysOnly,keysVals){let keysValsIterator=keysValsGenerator.call(this);let index=keysOnly?0:1;while(true)
yield keysVals?keysValsIterator.next():keysValsIterator.next()[index];};};
let getTypeOf=exports.getTypeOf=function getTypeOf(val){let typ=typeof(val);if(typ==="object"){if(!val)
return"null";if(isArray(val))
return"array";if(isRegExp(val))
return"regexp";}
return typ;}
function RequirementError(key,requirement){Error.call(this);this.name="RequirementError";let msg=requirement.msg;if(!msg){msg='The option "'+key+'" ';msg+=requirement.is?"must be one of the following types: "+requirement.is.join(", "):"is invalid.";}
this.message=msg;}
RequirementError.prototype=Object.create(Error.prototype);let string={is:['string','undefined','null']};exports.string=string;let number={is:['number','undefined','null']};exports.number=number;let boolean={is:['boolean','undefined','null']};exports.boolean=boolean;let object={is:['object','undefined','null']};exports.object=object;let array={is:['array','undefined','null']};exports.array=array;let isTruthyType=type=>!(type==='undefined'||type==='null');let findTypes=v=>{while(!isArray(v)&&v.is)v=v.is;return v};function required(req){let types=(findTypes(req)||VALID_TYPES).filter(isTruthyType);return merge({},req,{is:types});}
exports.required=required;function optional(req){req=merge({is:[]},req);req.is=findTypes(req).filter(isTruthyType).concat('undefined','null');return req;}
exports.optional=optional;function either(...types){return union.apply(null,types.map(findTypes));}
exports.either=either;