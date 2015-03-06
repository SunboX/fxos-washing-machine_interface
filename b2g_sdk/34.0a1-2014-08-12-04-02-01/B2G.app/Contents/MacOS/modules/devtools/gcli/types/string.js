'use strict';var Promise=require('../util/promise').Promise;var Status=require('./types').Status;var Conversion=require('./types').Conversion;exports.items=[{




 
item:'type',name:'string',allowBlank:false,getSpec:function(){return this.allowBlank?{name:'string',allowBlank:true}:'string';},stringify:function(value,context){if(value==null){return'';}
return value.replace(/\\/g, '\\\\').replace(/\f/g,'\\f').replace(/\n/g,'\\n').replace(/\r/g,'\\r').replace(/\t/g,'\\t').replace(/\v/g,'\\v').replace(/\n/g,'\\n').replace(/\r/g,'\\r').replace(/ /g,'\\ ').replace(/'/g,'\\\'').replace(/"/g,'\\"').replace(/{/g,'\\{').replace(/}/g,'\\}');},parse:function(arg,context){if(!this.allowBlank&&(arg.text==null||arg.text==='')){return Promise.resolve(new Conversion(undefined,arg,Status.INCOMPLETE,''));}



var value=arg.text.replace(/\\\\/g, '\uF000').replace(/\\f/g,'\f').replace(/\\n/g,'\n').replace(/\\r/g,'\r').replace(/\\t/g,'\t').replace(/\\v/g,'\v').replace(/\\n/g,'\n').replace(/\\r/g,'\r').replace(/\\ /g,' ').replace(/\\'/g,'\'').replace(/\\"/g,'"').replace(/\\{/g,'{').replace(/\\}/g,'}').replace(/\uF000/g,'\\');return Promise.resolve(new Conversion(value,arg));}}];