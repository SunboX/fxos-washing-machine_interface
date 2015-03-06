"use strict";this.EXPORTED_SYMBOLS=["PhoneNumber"];const Cu=Components.utils;Cu.import('resource://gre/modules/XPCOMUtils.jsm');XPCOMUtils.defineLazyModuleGetter(this,"PHONE_NUMBER_META_DATA","resource://gre/modules/PhoneNumberMetaData.jsm");XPCOMUtils.defineLazyModuleGetter(this,"PhoneNumberNormalizer","resource://gre/modules/PhoneNumberNormalizer.jsm");this.PhoneNumber=(function(dataBase){'use strict';const MAX_PHONE_NUMBER_LENGTH=50;const NON_ALPHA_CHARS=/[^a-zA-Z]/g;const NON_DIALABLE_CHARS=/[^,#+\*\d]/g;const NON_DIALABLE_CHARS_ONCE=new RegExp(NON_DIALABLE_CHARS.source);const BACKSLASH=/\\/g;  const SPLIT_FIRST_GROUP = /^(\d+)(.*)$/;const LEADING_PLUS_CHARS_PATTERN=/^[+\uFF0B]+/g;
const META_DATA_ENCODING=["region","^(?:internationalPrefix)","nationalPrefix","^(?:nationalPrefixForParsing)","nationalPrefixTransformRule","nationalPrefixFormattingRule","^possiblePattern$","^nationalPattern$","formats"];const FORMAT_ENCODING=["^pattern$","nationalFormat","^leadingDigits","nationalPrefixFormattingRule","internationalFormat"];var regionCache=Object.create(null);
function ParseArray(array,encoding,obj){for(var n=0;n<encoding.length;++n){var value=array[n];if(!value)
continue;var field=encoding[n];var fieldAlpha=field.replace(NON_ALPHA_CHARS,"");if(field!=fieldAlpha)
value=new RegExp(field.replace(fieldAlpha,value));obj[fieldAlpha]=value;}
return obj;}

function ParseMetaData(countryCode,md){var array=eval(md.replace(BACKSLASH,"\\\\"));md=ParseArray(array,META_DATA_ENCODING,{countryCode:countryCode});regionCache[md.region]=md;return md;}

function ParseFormat(md){var formats=md.formats;if(!formats){return null;}
if(!(Array.isArray(formats[0])))
return;for(var n=0;n<formats.length;++n){formats[n]=ParseArray(formats[n],FORMAT_ENCODING,{});}}



function FindMetaDataForRegion(region){
var md=regionCache[region];if(md)
return md;for(var countryCode in dataBase){var entry=dataBase[countryCode];





if(Array.isArray(entry)){for(var n=0;n<entry.length;n++){if(typeof entry[n]=="string"&&entry[n].substr(2,2)==region){if(n>0){
if(typeof entry[0]=="string")
entry[0]=ParseMetaData(countryCode,entry[0]);let formats=entry[0].formats;let current=ParseMetaData(countryCode,entry[n]);current.formats=formats;return entry[n]=current;}
entry[n]=ParseMetaData(countryCode,entry[n]);return entry[n];}}
continue;}
if(typeof entry=="string"&&entry.substr(2,2)==region)
return dataBase[countryCode]=ParseMetaData(countryCode,entry);}}
function FormatNumber(regionMetaData,number,intl){ParseFormat(regionMetaData);var formats=regionMetaData.formats;if(!formats){return null;}
for(var n=0;n<formats.length;++n){var format=formats[n];
if(format.leadingDigits&&!format.leadingDigits.test(number))
continue;if(!format.pattern.test(number))
continue;if(intl){
var internationalFormat=format.internationalFormat;if(!internationalFormat)
internationalFormat=format.nationalFormat;

if(internationalFormat=="NA")
return null;number="+"+regionMetaData.countryCode+" "+
number.replace(format.pattern,internationalFormat);}else{number=number.replace(format.pattern,format.nationalFormat);
var nationalPrefixFormattingRule=regionMetaData.nationalPrefixFormattingRule;if(format.nationalPrefixFormattingRule)
nationalPrefixFormattingRule=format.nationalPrefixFormattingRule;if(nationalPrefixFormattingRule){
var match=number.match(SPLIT_FIRST_GROUP);if(match){var firstGroup=match[1];var rest=match[2];var prefix=nationalPrefixFormattingRule;prefix=prefix.replace("$NP",regionMetaData.nationalPrefix);prefix=prefix.replace("$FG",firstGroup);number=prefix+rest;}}}
return(number=="NA")?null:number;}
return null;}
function NationalNumber(regionMetaData,number){this.region=regionMetaData.region;this.regionMetaData=regionMetaData;this.nationalNumber=number;}



NationalNumber.prototype={ get internationalFormat(){var value=FormatNumber(this.regionMetaData,this.nationalNumber,true);Object.defineProperty(this,"internationalFormat",{value:value,enumerable:true});return value;}, get nationalFormat(){var value=FormatNumber(this.regionMetaData,this.nationalNumber,false);Object.defineProperty(this,"nationalFormat",{value:value,enumerable:true});return value;}, get internationalNumber(){var value=this.internationalFormat?this.internationalFormat.replace(NON_DIALABLE_CHARS,""):null;Object.defineProperty(this,"internationalNumber",{value:value,enumerable:true});return value;},get countryName(){var value=this.region?this.region:null;Object.defineProperty(this,"countryName",{value:value,enumerable:true});return value;}};function IsValidNumber(number,md){return md.possiblePattern.test(number);}
function IsNationalNumber(number,md){return IsValidNumber(number,md)&&md.nationalPattern.test(number);}

function ParseCountryCode(number){for(var n=1;n<=3;++n){var cc=number.substr(0,n);if(dataBase[cc])
return cc;}
return null;}

function ParseInternationalNumber(number){var ret;var countryCode=ParseCountryCode(number);if(!countryCode)
return null;number=number.substr(countryCode.length);
var entry=dataBase[countryCode];if(Array.isArray(entry)){for(var n=0;n<entry.length;++n){if(typeof entry[n]=="string")
entry[n]=ParseMetaData(countryCode,entry[n]);if(n>0)
entry[n].formats=entry[0].formats;ret=ParseNationalNumber(number,entry[n])
if(ret)
return ret;}
return null;}
if(typeof entry=="string")
entry=dataBase[countryCode]=ParseMetaData(countryCode,entry);return ParseNationalNumber(number,entry);}


function ParseNationalNumber(number,md){if(!md.possiblePattern.test(number)||!md.nationalPattern.test(number)){return null;}
return new NationalNumber(md,number);}

function ParseNumber(number,defaultRegion){var ret;number=PhoneNumberNormalizer.Normalize(number);if(!defaultRegion&&number[0]!=='+')
return null;if(number[0]==='+')
return ParseInternationalNumber(number.replace(LEADING_PLUS_CHARS_PATTERN,""));var md=FindMetaDataForRegion(defaultRegion.toUpperCase());

if(md.internationalPrefix.test(number)){var possibleNumber=number.replace(md.internationalPrefix,"");ret=ParseInternationalNumber(possibleNumber)
if(ret)
return ret;}


if(md.nationalPrefixForParsing){var withoutPrefix=number.replace(md.nationalPrefixForParsing,md.nationalPrefixTransformRule||'');ret=ParseNationalNumber(withoutPrefix,md)
if(ret)
return ret;}else{
var nationalPrefix=md.nationalPrefix;if(nationalPrefix&&number.indexOf(nationalPrefix)==0&&(ret=ParseNationalNumber(number.substr(nationalPrefix.length),md))){return ret;}}
ret=ParseNationalNumber(number,md)
if(ret)
return ret;
ret=ParseInternationalNumber(number)
if(ret)
return ret;if(md.possiblePattern.test(number))
return new NationalNumber(md,number);return null;}
function IsPlainPhoneNumber(number){if(typeof number!=='string'){return false;}
var length=number.length;var isTooLong=(length>MAX_PHONE_NUMBER_LENGTH);var isEmpty=(length===0);return!(isTooLong||isEmpty||NON_DIALABLE_CHARS_ONCE.test(number));}
return{IsPlain:IsPlainPhoneNumber,Parse:ParseNumber,};})(PHONE_NUMBER_META_DATA);