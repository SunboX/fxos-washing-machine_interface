'use strict';var util=require('./util');var l10n=require('./l10n');var spell=require('./spell');var filesystem=require('./filesystem');var Status=require('../types/types').Status;exports.parse=function(context,typed,options){return filesystem.stat(typed).then(function(stats){ if(options.existing==='no'&&stats.exists){return{value:undefined,status:Status.INCOMPLETE,message:l10n.lookupFormat('fileErrExists',[typed]),predictor:undefined
};}
if(stats.exists){if(options.filetype==='file'&&!stats.isFile){return{value:undefined,status:Status.INCOMPLETE,message:l10n.lookupFormat('fileErrIsNotFile',[typed]),predictor:getPredictor(typed,options)};}
if(options.filetype==='directory'&&!stats.isDir){return{value:undefined,status:Status.INCOMPLETE,message:l10n.lookupFormat('fileErrIsNotDirectory',[typed]),predictor:getPredictor(typed,options)};} 
if(options.matches!=null&&!options.matches.test(typed)){return{value:undefined,status:Status.INCOMPLETE,message:l10n.lookupFormat('fileErrDoesntMatch',[typed,options.source]),predictor:getPredictor(typed,options)};}}
else{if(options.existing==='yes'){
 var parentName=filesystem.dirname(typed);return filesystem.stat(parentName).then(function(stats){return{value:undefined,status:stats.isDir?Status.INCOMPLETE:Status.ERROR,message:l10n.lookupFormat('fileErrNotExists',[typed]),predictor:getPredictor(typed,options)};});}} 
return{value:typed,status:Status.VALID,message:undefined,predictor:getPredictor(typed,options)};});};var RANK_OPTIONS={noSort:true,prefixZero:true};exports.supportsPredictions=true;function getPredictor(typed,options){if(!exports.supportsPredictions){return undefined;}
return function(){var allowFile=(options.filetype!=='directory');var parts=filesystem.split(typed);var absolute=(typed.indexOf('/')===0);var roots;if(absolute){roots=[{name:'/',dist:0,original:'/'}];}
else{roots=dirHistory.getCommonDirectories().map(function(root){return{name:root,dist:0,original:root};});}
 
var partsAdded=util.promiseEach(parts,function(part,index){var partsSoFar=filesystem.join.apply(filesystem,parts.slice(0,index+1));
 var allowFileForPart=(allowFile&&index>=parts.length-1);var rootsPromise=util.promiseEach(roots,function(root){ var matchFile=allowFileForPart?options.matches:null;var promise=filesystem.ls(root.name,matchFile);var onSuccess=function(entries){ if(!allowFileForPart){entries=entries.filter(function(entry){return entry.isDir;});}
var entryMap={};entries.forEach(function(entry){entryMap[entry.pathname]=entry;});return entryMap;};var onError=function(err){
return{};};promise=promise.then(onSuccess,onError);
 var compare=filesystem.join(root.original,partsSoFar);return promise.then(function(entryMap){var ranks=spell.rank(compare,Object.keys(entryMap),RANK_OPTIONS); ranks.forEach(function(rank){rank.original=root.original;rank.stats=entryMap[rank.name];});return ranks;});});return rootsPromise.then(function(data){data=data.reduce(function(prev,curr){return prev.concat(curr);},[]);data.sort(function(r1,r2){return r1.dist-r2.dist;});




 var isLast=index>=parts.length-1;var start=isLast?1:5;var end=isLast?7:10;var maxDeltaAt=start;var maxDelta=data[start].dist-data[start-1].dist;for(var i=start+1;i<end;i++){var delta=data[i].dist-data[i-1].dist;if(delta>=maxDelta){maxDelta=delta;maxDeltaAt=i;}} 
roots=data.slice(0,maxDeltaAt);});});return partsAdded.then(function(){var predictions=roots.map(function(root){var isFile=root.stats&&root.stats.isFile;var isDir=root.stats&&root.stats.isDir;var name=root.name;if(isDir&&name.charAt(name.length)!==filesystem.sep){name+=filesystem.sep;}
return{name:name,incomplete:!(allowFile&&isFile),isFile:isFile, dist:root.dist,};});return util.promiseEach(predictions,function(prediction){if(!prediction.isFile){prediction.description='('+prediction.dist+')';prediction.dist=undefined;prediction.isFile=undefined;return prediction;}
return filesystem.describe(prediction.name).then(function(description){prediction.description=description;prediction.dist=undefined;prediction.isFile=undefined;return prediction;});});});};}
var dirHistory={getCommonDirectories:function(){return[filesystem.sep, filesystem.home
];},addCommonDirectory:function(ignore){}};