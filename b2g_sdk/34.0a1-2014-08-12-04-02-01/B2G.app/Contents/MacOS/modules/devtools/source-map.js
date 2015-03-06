function define(moduleName,deps,payload){if(typeof moduleName!="string"){throw new TypeError('Expected string, got: '+moduleName);}
if(arguments.length==2){payload=deps;}
if(moduleName in define.modules){throw new Error("Module already defined: "+moduleName);}
define.modules[moduleName]=payload;};define.modules={};function Domain(){this.modules={};this._currentModule=null;}
(function(){Domain.prototype.require=function(deps,callback){if(Array.isArray(deps)){var params=deps.map(function(dep){return this.lookup(dep);},this);if(callback){callback.apply(null,params);}
return undefined;}
else{return this.lookup(deps);}};function normalize(path){var bits=path.split('/');var i=1;while(i<bits.length){if(bits[i]==='..'){bits.splice(i-1,1);}else if(bits[i]==='.'){bits.splice(i,1);}else{i++;}}
return bits.join('/');}
function join(a,b){a=a.trim();b=b.trim();if(/^\//.test(b)){return b;}else{return a.replace(/\/*$/,'/')+b;}}
function dirname(path){var bits=path.split('/');bits.pop();return bits.join('/');}
Domain.prototype.lookup=function(moduleName){if(/^\./.test(moduleName)){moduleName=normalize(join(dirname(this._currentModule),moduleName));}
if(moduleName in this.modules){var module=this.modules[moduleName];return module;}
if(!(moduleName in define.modules)){throw new Error("Module not defined: "+moduleName);}
var module=define.modules[moduleName];if(typeof module=="function"){var exports={};var previousModule=this._currentModule;this._currentModule=moduleName;module(this.require.bind(this),exports,{id:moduleName,uri:""});this._currentModule=previousModule;module=exports;} 
this.modules[moduleName]=module;return module;};}());define.Domain=Domain;define.globalDomain=new Domain();var require=define.globalDomain.require.bind(define.globalDomain);define('source-map/source-map-generator',['require','exports','module','source-map/base64-vlq','source-map/util','source-map/array-set'],function(require,exports,module){var base64VLQ=require('./base64-vlq');var util=require('./util');var ArraySet=require('./array-set').ArraySet;function SourceMapGenerator(aArgs){this._file=util.getArg(aArgs,'file');this._sourceRoot=util.getArg(aArgs,'sourceRoot',null);this._sources=new ArraySet();this._names=new ArraySet();this._mappings=[];this._sourcesContents=null;}
SourceMapGenerator.prototype._version=3;SourceMapGenerator.fromSourceMap=function SourceMapGenerator_fromSourceMap(aSourceMapConsumer){var sourceRoot=aSourceMapConsumer.sourceRoot;var generator=new SourceMapGenerator({file:aSourceMapConsumer.file,sourceRoot:sourceRoot});aSourceMapConsumer.eachMapping(function(mapping){var newMapping={generated:{line:mapping.generatedLine,column:mapping.generatedColumn}};if(mapping.source){newMapping.source=mapping.source;if(sourceRoot){newMapping.source=util.relative(sourceRoot,newMapping.source);}
newMapping.original={line:mapping.originalLine,column:mapping.originalColumn};if(mapping.name){newMapping.name=mapping.name;}}
generator.addMapping(newMapping);});aSourceMapConsumer.sources.forEach(function(sourceFile){var content=aSourceMapConsumer.sourceContentFor(sourceFile);if(content){generator.setSourceContent(sourceFile,content);}});return generator;};SourceMapGenerator.prototype.addMapping=function SourceMapGenerator_addMapping(aArgs){var generated=util.getArg(aArgs,'generated');var original=util.getArg(aArgs,'original',null);var source=util.getArg(aArgs,'source',null);var name=util.getArg(aArgs,'name',null);this._validateMapping(generated,original,source,name);if(source&&!this._sources.has(source)){this._sources.add(source);}
if(name&&!this._names.has(name)){this._names.add(name);}
this._mappings.push({generatedLine:generated.line,generatedColumn:generated.column,originalLine:original!=null&&original.line,originalColumn:original!=null&&original.column,source:source,name:name});};SourceMapGenerator.prototype.setSourceContent=function SourceMapGenerator_setSourceContent(aSourceFile,aSourceContent){var source=aSourceFile;if(this._sourceRoot){source=util.relative(this._sourceRoot,source);}
if(aSourceContent!==null){if(!this._sourcesContents){this._sourcesContents={};}
this._sourcesContents[util.toSetString(source)]=aSourceContent;}else{delete this._sourcesContents[util.toSetString(source)];if(Object.keys(this._sourcesContents).length===0){this._sourcesContents=null;}}};SourceMapGenerator.prototype.applySourceMap=function SourceMapGenerator_applySourceMap(aSourceMapConsumer,aSourceFile){ if(!aSourceFile){aSourceFile=aSourceMapConsumer.file;}
var sourceRoot=this._sourceRoot;if(sourceRoot){aSourceFile=util.relative(sourceRoot,aSourceFile);}

var newSources=new ArraySet();var newNames=new ArraySet();this._mappings.forEach(function(mapping){if(mapping.source===aSourceFile&&mapping.originalLine){var original=aSourceMapConsumer.originalPositionFor({line:mapping.originalLine,column:mapping.originalColumn});if(original.source!==null){ if(sourceRoot){mapping.source=util.relative(sourceRoot,original.source);}else{mapping.source=original.source;}
mapping.originalLine=original.line;mapping.originalColumn=original.column;if(original.name!==null&&mapping.name!==null){
 mapping.name=original.name;}}}
var source=mapping.source;if(source&&!newSources.has(source)){newSources.add(source);}
var name=mapping.name;if(name&&!newNames.has(name)){newNames.add(name);}},this);this._sources=newSources;this._names=newNames;aSourceMapConsumer.sources.forEach(function(sourceFile){var content=aSourceMapConsumer.sourceContentFor(sourceFile);if(content){if(sourceRoot){sourceFile=util.relative(sourceRoot,sourceFile);}
this.setSourceContent(sourceFile,content);}},this);};SourceMapGenerator.prototype._validateMapping=function SourceMapGenerator_validateMapping(aGenerated,aOriginal,aSource,aName){if(aGenerated&&'line'in aGenerated&&'column'in aGenerated&&aGenerated.line>0&&aGenerated.column>=0&&!aOriginal&&!aSource&&!aName){return;}
else if(aGenerated&&'line'in aGenerated&&'column'in aGenerated&&aOriginal&&'line'in aOriginal&&'column'in aOriginal&&aGenerated.line>0&&aGenerated.column>=0&&aOriginal.line>0&&aOriginal.column>=0&&aSource){return;}
else{throw new Error('Invalid mapping: '+JSON.stringify({generated:aGenerated,source:aSource,orginal:aOriginal,name:aName}));}};SourceMapGenerator.prototype._serializeMappings=function SourceMapGenerator_serializeMappings(){var previousGeneratedColumn=0;var previousGeneratedLine=1;var previousOriginalColumn=0;var previousOriginalLine=0;var previousName=0;var previousSource=0;var result='';var mapping;



this._mappings.sort(util.compareByGeneratedPositions);for(var i=0,len=this._mappings.length;i<len;i++){mapping=this._mappings[i];if(mapping.generatedLine!==previousGeneratedLine){previousGeneratedColumn=0;while(mapping.generatedLine!==previousGeneratedLine){result+=';';previousGeneratedLine++;}}
else{if(i>0){if(!util.compareByGeneratedPositions(mapping,this._mappings[i-1])){continue;}
result+=',';}}
result+=base64VLQ.encode(mapping.generatedColumn
-previousGeneratedColumn);previousGeneratedColumn=mapping.generatedColumn;if(mapping.source){result+=base64VLQ.encode(this._sources.indexOf(mapping.source)
-previousSource);previousSource=this._sources.indexOf(mapping.source); result+=base64VLQ.encode(mapping.originalLine-1
-previousOriginalLine);previousOriginalLine=mapping.originalLine-1;result+=base64VLQ.encode(mapping.originalColumn
-previousOriginalColumn);previousOriginalColumn=mapping.originalColumn;if(mapping.name){result+=base64VLQ.encode(this._names.indexOf(mapping.name)
-previousName);previousName=this._names.indexOf(mapping.name);}}}
return result;};SourceMapGenerator.prototype._generateSourcesContent=function SourceMapGenerator_generateSourcesContent(aSources,aSourceRoot){return aSources.map(function(source){if(!this._sourcesContents){return null;}
if(aSourceRoot){source=util.relative(aSourceRoot,source);}
var key=util.toSetString(source);return Object.prototype.hasOwnProperty.call(this._sourcesContents,key)?this._sourcesContents[key]:null;},this);};SourceMapGenerator.prototype.toJSON=function SourceMapGenerator_toJSON(){var map={version:this._version,file:this._file,sources:this._sources.toArray(),names:this._names.toArray(),mappings:this._serializeMappings()};if(this._sourceRoot){map.sourceRoot=this._sourceRoot;}
if(this._sourcesContents){map.sourcesContent=this._generateSourcesContent(map.sources,map.sourceRoot);}
return map;};SourceMapGenerator.prototype.toString=function SourceMapGenerator_toString(){return JSON.stringify(this);};exports.SourceMapGenerator=SourceMapGenerator;});define('source-map/base64-vlq',['require','exports','module','source-map/base64'],function(require,exports,module){var base64=require('./base64');





 var VLQ_BASE_SHIFT=5; var VLQ_BASE=1<<VLQ_BASE_SHIFT; var VLQ_BASE_MASK=VLQ_BASE-1; var VLQ_CONTINUATION_BIT=VLQ_BASE;function toVLQSigned(aValue){return aValue<0?((-aValue)<<1)+1:(aValue<<1)+0;}
function fromVLQSigned(aValue){var isNegative=(aValue&1)===1;var shifted=aValue>>1;return isNegative?-shifted:shifted;}
exports.encode=function base64VLQ_encode(aValue){var encoded="";var digit;var vlq=toVLQSigned(aValue);do{digit=vlq&VLQ_BASE_MASK;vlq>>>=VLQ_BASE_SHIFT;if(vlq>0){
digit|=VLQ_CONTINUATION_BIT;}
encoded+=base64.encode(digit);}while(vlq>0);return encoded;};exports.decode=function base64VLQ_decode(aStr){var i=0;var strLen=aStr.length;var result=0;var shift=0;var continuation,digit;do{if(i>=strLen){throw new Error("Expected more digits in base 64 VLQ value.");}
digit=base64.decode(aStr.charAt(i++));continuation=!!(digit&VLQ_CONTINUATION_BIT);digit&=VLQ_BASE_MASK;result=result+(digit<<shift);shift+=VLQ_BASE_SHIFT;}while(continuation);return{value:fromVLQSigned(result),rest:aStr.slice(i)};};});define('source-map/base64',['require','exports','module',],function(require,exports,module){var charToIntMap={};var intToCharMap={};'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split('').forEach(function(ch,index){charToIntMap[ch]=index;intToCharMap[index]=ch;});exports.encode=function base64_encode(aNumber){if(aNumber in intToCharMap){return intToCharMap[aNumber];}
throw new TypeError("Must be between 0 and 63: "+aNumber);};exports.decode=function base64_decode(aChar){if(aChar in charToIntMap){return charToIntMap[aChar];}
throw new TypeError("Not a valid base 64 digit: "+aChar);};});define('source-map/util',['require','exports','module',],function(require,exports,module){function getArg(aArgs,aName,aDefaultValue){if(aName in aArgs){return aArgs[aName];}else if(arguments.length===3){return aDefaultValue;}else{throw new Error('"'+aName+'" is a required argument.');}}
exports.getArg=getArg;var urlRegexp=/([\w+\-.]+):\/\/((\w+:\w+)@)?([\w.]+)?(:(\d+))?(\S+)?/;var dataUrlRegexp=/^data:.+\,.+/;function urlParse(aUrl){var match=aUrl.match(urlRegexp);if(!match){return null;}
return{scheme:match[1],auth:match[3],host:match[4],port:match[6],path:match[7]};}
exports.urlParse=urlParse;function urlGenerate(aParsedUrl){var url=aParsedUrl.scheme+"://";if(aParsedUrl.auth){url+=aParsedUrl.auth+"@"}
if(aParsedUrl.host){url+=aParsedUrl.host;}
if(aParsedUrl.port){url+=":"+aParsedUrl.port}
if(aParsedUrl.path){url+=aParsedUrl.path;}
return url;}
exports.urlGenerate=urlGenerate;function join(aRoot,aPath){var url;if(aPath.match(urlRegexp)||aPath.match(dataUrlRegexp)){return aPath;}
if(aPath.charAt(0)==='/'&&(url=urlParse(aRoot))){url.path=aPath;return urlGenerate(url);}
return aRoot.replace(/\/$/,'')+'/'+aPath;}
exports.join=join;function toSetString(aStr){return'$'+aStr;}
exports.toSetString=toSetString;function fromSetString(aStr){return aStr.substr(1);}
exports.fromSetString=fromSetString;function relative(aRoot,aPath){aRoot=aRoot.replace(/\/$/,'');var url=urlParse(aRoot);if(aPath.charAt(0)=="/"&&url&&url.path=="/"){return aPath.slice(1);}
return aPath.indexOf(aRoot+'/')===0?aPath.substr(aRoot.length+1):aPath;}
exports.relative=relative;function strcmp(aStr1,aStr2){var s1=aStr1||"";var s2=aStr2||"";return(s1>s2)-(s1<s2);}
function compareByOriginalPositions(mappingA,mappingB,onlyCompareOriginal){var cmp;cmp=strcmp(mappingA.source,mappingB.source);if(cmp){return cmp;}
cmp=mappingA.originalLine-mappingB.originalLine;if(cmp){return cmp;}
cmp=mappingA.originalColumn-mappingB.originalColumn;if(cmp||onlyCompareOriginal){return cmp;}
cmp=strcmp(mappingA.name,mappingB.name);if(cmp){return cmp;}
cmp=mappingA.generatedLine-mappingB.generatedLine;if(cmp){return cmp;}
return mappingA.generatedColumn-mappingB.generatedColumn;};exports.compareByOriginalPositions=compareByOriginalPositions;function compareByGeneratedPositions(mappingA,mappingB,onlyCompareGenerated){var cmp;cmp=mappingA.generatedLine-mappingB.generatedLine;if(cmp){return cmp;}
cmp=mappingA.generatedColumn-mappingB.generatedColumn;if(cmp||onlyCompareGenerated){return cmp;}
cmp=strcmp(mappingA.source,mappingB.source);if(cmp){return cmp;}
cmp=mappingA.originalLine-mappingB.originalLine;if(cmp){return cmp;}
cmp=mappingA.originalColumn-mappingB.originalColumn;if(cmp){return cmp;}
return strcmp(mappingA.name,mappingB.name);};exports.compareByGeneratedPositions=compareByGeneratedPositions;});define('source-map/array-set',['require','exports','module','source-map/util'],function(require,exports,module){var util=require('./util');function ArraySet(){this._array=[];this._set={};}
ArraySet.fromArray=function ArraySet_fromArray(aArray,aAllowDuplicates){var set=new ArraySet();for(var i=0,len=aArray.length;i<len;i++){set.add(aArray[i],aAllowDuplicates);}
return set;};ArraySet.prototype.add=function ArraySet_add(aStr,aAllowDuplicates){var isDuplicate=this.has(aStr);var idx=this._array.length;if(!isDuplicate||aAllowDuplicates){this._array.push(aStr);}
if(!isDuplicate){this._set[util.toSetString(aStr)]=idx;}};ArraySet.prototype.has=function ArraySet_has(aStr){return Object.prototype.hasOwnProperty.call(this._set,util.toSetString(aStr));};ArraySet.prototype.indexOf=function ArraySet_indexOf(aStr){if(this.has(aStr)){return this._set[util.toSetString(aStr)];}
throw new Error('"'+aStr+'" is not in the set.');};ArraySet.prototype.at=function ArraySet_at(aIdx){if(aIdx>=0&&aIdx<this._array.length){return this._array[aIdx];}
throw new Error('No element indexed by '+aIdx);};ArraySet.prototype.toArray=function ArraySet_toArray(){return this._array.slice();};exports.ArraySet=ArraySet;});define('source-map/source-map-consumer',['require','exports','module','source-map/util','source-map/binary-search','source-map/array-set','source-map/base64-vlq'],function(require,exports,module){var util=require('./util');var binarySearch=require('./binary-search');var ArraySet=require('./array-set').ArraySet;var base64VLQ=require('./base64-vlq');function SourceMapConsumer(aSourceMap){var sourceMap=aSourceMap;if(typeof aSourceMap==='string'){sourceMap=JSON.parse(aSourceMap.replace(/^\)\]\}'/,''));}
var version=util.getArg(sourceMap,'version');var sources=util.getArg(sourceMap,'sources');var names=util.getArg(sourceMap,'names');var sourceRoot=util.getArg(sourceMap,'sourceRoot',null);var sourcesContent=util.getArg(sourceMap,'sourcesContent',null);var mappings=util.getArg(sourceMap,'mappings');var file=util.getArg(sourceMap,'file',null);if(version!==this._version){throw new Error('Unsupported version: '+version);}



this._names=ArraySet.fromArray(names,true);this._sources=ArraySet.fromArray(sources,true);this.sourceRoot=sourceRoot;this.sourcesContent=sourcesContent;this._mappings=mappings;this.file=file;}
SourceMapConsumer.fromSourceMap=function SourceMapConsumer_fromSourceMap(aSourceMap){var smc=Object.create(SourceMapConsumer.prototype);smc._names=ArraySet.fromArray(aSourceMap._names.toArray(),true);smc._sources=ArraySet.fromArray(aSourceMap._sources.toArray(),true);smc.sourceRoot=aSourceMap._sourceRoot;smc.sourcesContent=aSourceMap._generateSourcesContent(smc._sources.toArray(),smc.sourceRoot);smc.file=aSourceMap._file;smc.__generatedMappings=aSourceMap._mappings.slice().sort(util.compareByGeneratedPositions);smc.__originalMappings=aSourceMap._mappings.slice().sort(util.compareByOriginalPositions);return smc;};SourceMapConsumer.prototype._version=3;Object.defineProperty(SourceMapConsumer.prototype,'sources',{get:function(){return this._sources.toArray().map(function(s){return this.sourceRoot?util.join(this.sourceRoot,s):s;},this);}});











SourceMapConsumer.prototype.__generatedMappings=null;Object.defineProperty(SourceMapConsumer.prototype,'_generatedMappings',{get:function(){if(!this.__generatedMappings){this.__generatedMappings=[];this.__originalMappings=[];this._parseMappings(this._mappings,this.sourceRoot);}
return this.__generatedMappings;}});SourceMapConsumer.prototype.__originalMappings=null;Object.defineProperty(SourceMapConsumer.prototype,'_originalMappings',{get:function(){if(!this.__originalMappings){this.__generatedMappings=[];this.__originalMappings=[];this._parseMappings(this._mappings,this.sourceRoot);}
return this.__originalMappings;}});SourceMapConsumer.prototype._parseMappings=function SourceMapConsumer_parseMappings(aStr,aSourceRoot){var generatedLine=1;var previousGeneratedColumn=0;var previousOriginalLine=0;var previousOriginalColumn=0;var previousSource=0;var previousName=0;var mappingSeparator=/^[,;]/;var str=aStr;var mapping;var temp;while(str.length>0){if(str.charAt(0)===';'){generatedLine++;str=str.slice(1);previousGeneratedColumn=0;}
else if(str.charAt(0)===','){str=str.slice(1);}
else{mapping={};mapping.generatedLine=generatedLine;temp=base64VLQ.decode(str);mapping.generatedColumn=previousGeneratedColumn+temp.value;previousGeneratedColumn=mapping.generatedColumn;str=temp.rest;if(str.length>0&&!mappingSeparator.test(str.charAt(0))){temp=base64VLQ.decode(str);mapping.source=this._sources.at(previousSource+temp.value);previousSource+=temp.value;str=temp.rest;if(str.length===0||mappingSeparator.test(str.charAt(0))){throw new Error('Found a source, but no line and column');}
temp=base64VLQ.decode(str);mapping.originalLine=previousOriginalLine+temp.value;previousOriginalLine=mapping.originalLine; mapping.originalLine+=1;str=temp.rest;if(str.length===0||mappingSeparator.test(str.charAt(0))){throw new Error('Found a source and line, but no column');}
temp=base64VLQ.decode(str);mapping.originalColumn=previousOriginalColumn+temp.value;previousOriginalColumn=mapping.originalColumn;str=temp.rest;if(str.length>0&&!mappingSeparator.test(str.charAt(0))){temp=base64VLQ.decode(str);mapping.name=this._names.at(previousName+temp.value);previousName+=temp.value;str=temp.rest;}}
this.__generatedMappings.push(mapping);if(typeof mapping.originalLine==='number'){this.__originalMappings.push(mapping);}}}
this.__originalMappings.sort(util.compareByOriginalPositions);};SourceMapConsumer.prototype._findMapping=function SourceMapConsumer_findMapping(aNeedle,aMappings,aLineName,aColumnName,aComparator){


if(aNeedle[aLineName]<=0){throw new TypeError('Line must be greater than or equal to 1, got '
+aNeedle[aLineName]);}
if(aNeedle[aColumnName]<0){throw new TypeError('Column must be greater than or equal to 0, got '
+aNeedle[aColumnName]);}
return binarySearch.search(aNeedle,aMappings,aComparator);};SourceMapConsumer.prototype.originalPositionFor=function SourceMapConsumer_originalPositionFor(aArgs){var needle={generatedLine:util.getArg(aArgs,'line'),generatedColumn:util.getArg(aArgs,'column')};var mapping=this._findMapping(needle,this._generatedMappings,"generatedLine","generatedColumn",util.compareByGeneratedPositions);if(mapping){var source=util.getArg(mapping,'source',null);if(source&&this.sourceRoot){source=util.join(this.sourceRoot,source);}
return{source:source,line:util.getArg(mapping,'originalLine',null),column:util.getArg(mapping,'originalColumn',null),name:util.getArg(mapping,'name',null)};}
return{source:null,line:null,column:null,name:null};};SourceMapConsumer.prototype.sourceContentFor=function SourceMapConsumer_sourceContentFor(aSource){if(!this.sourcesContent){return null;}
if(this.sourceRoot){aSource=util.relative(this.sourceRoot,aSource);}
if(this._sources.has(aSource)){return this.sourcesContent[this._sources.indexOf(aSource)];}
var url;if(this.sourceRoot&&(url=util.urlParse(this.sourceRoot))){


var fileUriAbsPath=aSource.replace(/^file:\/\//,"");if(url.scheme=="file"&&this._sources.has(fileUriAbsPath)){return this.sourcesContent[this._sources.indexOf(fileUriAbsPath)]}
if((!url.path||url.path=="/")&&this._sources.has("/"+aSource)){return this.sourcesContent[this._sources.indexOf("/"+aSource)];}}
throw new Error('"'+aSource+'" is not in the SourceMap.');};SourceMapConsumer.prototype.generatedPositionFor=function SourceMapConsumer_generatedPositionFor(aArgs){var needle={source:util.getArg(aArgs,'source'),originalLine:util.getArg(aArgs,'line'),originalColumn:util.getArg(aArgs,'column')};if(this.sourceRoot){needle.source=util.relative(this.sourceRoot,needle.source);}
var mapping=this._findMapping(needle,this._originalMappings,"originalLine","originalColumn",util.compareByOriginalPositions);if(mapping){return{line:util.getArg(mapping,'generatedLine',null),column:util.getArg(mapping,'generatedColumn',null)};}
return{line:null,column:null};};SourceMapConsumer.GENERATED_ORDER=1;SourceMapConsumer.ORIGINAL_ORDER=2;SourceMapConsumer.prototype.eachMapping=function SourceMapConsumer_eachMapping(aCallback,aContext,aOrder){var context=aContext||null;var order=aOrder||SourceMapConsumer.GENERATED_ORDER;var mappings;switch(order){case SourceMapConsumer.GENERATED_ORDER:mappings=this._generatedMappings;break;case SourceMapConsumer.ORIGINAL_ORDER:mappings=this._originalMappings;break;default:throw new Error("Unknown order of iteration.");}
var sourceRoot=this.sourceRoot;mappings.map(function(mapping){var source=mapping.source;if(source&&sourceRoot){source=util.join(sourceRoot,source);}
return{source:source,generatedLine:mapping.generatedLine,generatedColumn:mapping.generatedColumn,originalLine:mapping.originalLine,originalColumn:mapping.originalColumn,name:mapping.name};}).forEach(aCallback,context);};exports.SourceMapConsumer=SourceMapConsumer;});define('source-map/binary-search',['require','exports','module',],function(require,exports,module){function recursiveSearch(aLow,aHigh,aNeedle,aHaystack,aCompare){


var mid=Math.floor((aHigh-aLow)/2)+aLow;var cmp=aCompare(aNeedle,aHaystack[mid],true);if(cmp===0){return aHaystack[mid];}
else if(cmp>0){if(aHigh-mid>1){return recursiveSearch(mid,aHigh,aNeedle,aHaystack,aCompare);}

return aHaystack[mid];}
else{if(mid-aLow>1){return recursiveSearch(aLow,mid,aNeedle,aHaystack,aCompare);}

return aLow<0?null:aHaystack[aLow];}}
exports.search=function search(aNeedle,aHaystack,aCompare){return aHaystack.length>0?recursiveSearch(-1,aHaystack.length,aNeedle,aHaystack,aCompare):null;};});define('source-map/source-node',['require','exports','module','source-map/source-map-generator','source-map/util'],function(require,exports,module){var SourceMapGenerator=require('./source-map-generator').SourceMapGenerator;var util=require('./util');function SourceNode(aLine,aColumn,aSource,aChunks,aName){this.children=[];this.sourceContents={};this.line=aLine===undefined?null:aLine;this.column=aColumn===undefined?null:aColumn;this.source=aSource===undefined?null:aSource;this.name=aName===undefined?null:aName;if(aChunks!=null)this.add(aChunks);}
SourceNode.fromStringWithSourceMap=function SourceNode_fromStringWithSourceMap(aGeneratedCode,aSourceMapConsumer){
 var node=new SourceNode();
var remainingLines=aGeneratedCode.split('\n');var lastGeneratedLine=1,lastGeneratedColumn=0;var lastMapping=null;aSourceMapConsumer.eachMapping(function(mapping){if(lastMapping===null){
while(lastGeneratedLine<mapping.generatedLine){node.add(remainingLines.shift()+"\n");lastGeneratedLine++;}
if(lastGeneratedColumn<mapping.generatedColumn){var nextLine=remainingLines[0];node.add(nextLine.substr(0,mapping.generatedColumn));remainingLines[0]=nextLine.substr(mapping.generatedColumn);lastGeneratedColumn=mapping.generatedColumn;}}else{if(lastGeneratedLine<mapping.generatedLine){var code="";do{code+=remainingLines.shift()+"\n";lastGeneratedLine++;lastGeneratedColumn=0;}while(lastGeneratedLine<mapping.generatedLine);
if(lastGeneratedColumn<mapping.generatedColumn){var nextLine=remainingLines[0];code+=nextLine.substr(0,mapping.generatedColumn);remainingLines[0]=nextLine.substr(mapping.generatedColumn);lastGeneratedColumn=mapping.generatedColumn;}
addMappingWithCode(lastMapping,code);}else{
var nextLine=remainingLines[0];var code=nextLine.substr(0,mapping.generatedColumn-
lastGeneratedColumn);remainingLines[0]=nextLine.substr(mapping.generatedColumn-
lastGeneratedColumn);lastGeneratedColumn=mapping.generatedColumn;addMappingWithCode(lastMapping,code);}}
lastMapping=mapping;},this); addMappingWithCode(lastMapping,remainingLines.join("\n")); aSourceMapConsumer.sources.forEach(function(sourceFile){var content=aSourceMapConsumer.sourceContentFor(sourceFile);if(content){node.setSourceContent(sourceFile,content);}});return node;function addMappingWithCode(mapping,code){if(mapping===null||mapping.source===undefined){node.add(code);}else{node.add(new SourceNode(mapping.originalLine,mapping.originalColumn,mapping.source,code,mapping.name));}}};SourceNode.prototype.add=function SourceNode_add(aChunk){if(Array.isArray(aChunk)){aChunk.forEach(function(chunk){this.add(chunk);},this);}
else if(aChunk instanceof SourceNode||typeof aChunk==="string"){if(aChunk){this.children.push(aChunk);}}
else{throw new TypeError("Expected a SourceNode, string, or an array of SourceNodes and strings. Got "+aChunk);}
return this;};SourceNode.prototype.prepend=function SourceNode_prepend(aChunk){if(Array.isArray(aChunk)){for(var i=aChunk.length-1;i>=0;i--){this.prepend(aChunk[i]);}}
else if(aChunk instanceof SourceNode||typeof aChunk==="string"){this.children.unshift(aChunk);}
else{throw new TypeError("Expected a SourceNode, string, or an array of SourceNodes and strings. Got "+aChunk);}
return this;};SourceNode.prototype.walk=function SourceNode_walk(aFn){var chunk;for(var i=0,len=this.children.length;i<len;i++){chunk=this.children[i];if(chunk instanceof SourceNode){chunk.walk(aFn);}
else{if(chunk!==''){aFn(chunk,{source:this.source,line:this.line,column:this.column,name:this.name});}}}};SourceNode.prototype.join=function SourceNode_join(aSep){var newChildren;var i;var len=this.children.length;if(len>0){newChildren=[];for(i=0;i<len-1;i++){newChildren.push(this.children[i]);newChildren.push(aSep);}
newChildren.push(this.children[i]);this.children=newChildren;}
return this;};SourceNode.prototype.replaceRight=function SourceNode_replaceRight(aPattern,aReplacement){var lastChild=this.children[this.children.length-1];if(lastChild instanceof SourceNode){lastChild.replaceRight(aPattern,aReplacement);}
else if(typeof lastChild==='string'){this.children[this.children.length-1]=lastChild.replace(aPattern,aReplacement);}
else{this.children.push(''.replace(aPattern,aReplacement));}
return this;};SourceNode.prototype.setSourceContent=function SourceNode_setSourceContent(aSourceFile,aSourceContent){this.sourceContents[util.toSetString(aSourceFile)]=aSourceContent;};SourceNode.prototype.walkSourceContents=function SourceNode_walkSourceContents(aFn){for(var i=0,len=this.children.length;i<len;i++){if(this.children[i]instanceof SourceNode){this.children[i].walkSourceContents(aFn);}}
var sources=Object.keys(this.sourceContents);for(var i=0,len=sources.length;i<len;i++){aFn(util.fromSetString(sources[i]),this.sourceContents[sources[i]]);}};SourceNode.prototype.toString=function SourceNode_toString(){var str="";this.walk(function(chunk){str+=chunk;});return str;};SourceNode.prototype.toStringWithSourceMap=function SourceNode_toStringWithSourceMap(aArgs){var generated={code:"",line:1,column:0};var map=new SourceMapGenerator(aArgs);var sourceMappingActive=false;var lastOriginalSource=null;var lastOriginalLine=null;var lastOriginalColumn=null;var lastOriginalName=null;this.walk(function(chunk,original){generated.code+=chunk;if(original.source!==null&&original.line!==null&&original.column!==null){if(lastOriginalSource!==original.source||lastOriginalLine!==original.line||lastOriginalColumn!==original.column||lastOriginalName!==original.name){map.addMapping({source:original.source,original:{line:original.line,column:original.column},generated:{line:generated.line,column:generated.column},name:original.name});}
lastOriginalSource=original.source;lastOriginalLine=original.line;lastOriginalColumn=original.column;lastOriginalName=original.name;sourceMappingActive=true;}else if(sourceMappingActive){map.addMapping({generated:{line:generated.line,column:generated.column}});lastOriginalSource=null;sourceMappingActive=false;}
chunk.split('').forEach(function(ch){if(ch==='\n'){generated.line++;generated.column=0;}else{generated.column++;}});});this.walkSourceContents(function(sourceFile,sourceContent){map.setSourceContent(sourceFile,sourceContent);});return{code:generated.code,map:map};};exports.SourceNode=SourceNode;});this.sourceMap={SourceMapConsumer:require('source-map/source-map-consumer').SourceMapConsumer,SourceMapGenerator:require('source-map/source-map-generator').SourceMapGenerator,SourceNode:require('source-map/source-node').SourceNode};