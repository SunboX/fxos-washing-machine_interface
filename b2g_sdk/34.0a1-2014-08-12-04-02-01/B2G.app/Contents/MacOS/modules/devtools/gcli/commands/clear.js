'use strict';var l10n=require('../util/l10n');exports.items=[{ item:'command',name:'clear',description:l10n.lookup('clearDesc'),returnType:'clearoutput',exec:function(args,context){}},{item:'converter',from:'clearoutput',to:'view',exec:function(ignore,conversionContext){return{html:'<span onload="${onload}"></span>',data:{onload:function(ev){
 var element=ev.target;while(element!=null&&element.terminal==null){element=element.parentElement;}
if(element==null){
 throw new Error('Failed to find clear');}
element.terminal.clear();}}};}}];