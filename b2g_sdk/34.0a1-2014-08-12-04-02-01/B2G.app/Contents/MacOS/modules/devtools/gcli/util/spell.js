'use strict';var CASE_CHANGE_COST=1;var INSERTION_COST=10;var DELETION_COST=10;var SWAP_COST=10;var SUBSTITUTION_COST=20;var MAX_EDIT_DISTANCE=40;var distance=exports.distance=function(wordi,wordj){var wordiLen=wordi.length;var wordjLen=wordj.length;var row0=new Array(wordiLen+1);var row1=new Array(wordiLen+1);var row2=new Array(wordiLen+1);var tmp;var i,j;
for(i=0;i<=wordiLen;i++){row1[i]=i*INSERTION_COST;}
for(j=1;j<=wordjLen;j++){
row0[0]=j*INSERTION_COST;for(i=1;i<=wordiLen;i++){

var dc=row0[i-1]+DELETION_COST;var ic=row1[i]+INSERTION_COST;var sc0;if(wordi[i-1]===wordj[j-1]){sc0=0;}
else{if(wordi[i-1].toLowerCase()===wordj[j-1].toLowerCase()){sc0=CASE_CHANGE_COST;}
else{sc0=SUBSTITUTION_COST;}}
var sc=row1[i-1]+sc0;row0[i]=Math.min(dc,ic,sc);
if(i>1&&j>1&&wordi[i-1]===wordj[j-2]&&wordj[j-1]===wordi[i-2]){row0[i]=Math.min(row0[i],row2[i-2]+SWAP_COST);}}
tmp=row2;row2=row1;row1=row0;row0=tmp;}
return row1[wordiLen];};var distancePrefix=exports.distancePrefix=function(word,name){var dist=0;for(var i=0;i<word.length;i++){if(name[i]!==word[i]){if(name[i].toLowerCase()===word[i].toLowerCase()){dist++;}
else{
 return exports.distance(word,name);}}}
return dist;};exports.correct=function(word,names){if(names.length===0){return undefined;}
var distances={};var sortedCandidates;names.forEach(function(candidate){distances[candidate]=exports.distance(word,candidate);});sortedCandidates=names.sort(function(worda,wordb){if(distances[worda]!==distances[wordb]){return distances[worda]-distances[wordb];}
else{
 return worda<wordb;}});if(distances[sortedCandidates[0]]<=MAX_EDIT_DISTANCE){return sortedCandidates[0];}
else{return undefined;}};exports.rank=function(word,names,options){options=options||{};var reply=names.map(function(name){
 var algo=options.prefixZero?distancePrefix:distance;return{name:name,dist:algo(word,name)};});if(!options.noSort){reply=reply.sort(function(d1,d2){return d1.dist-d2.dist;});}
return reply;};