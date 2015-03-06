'use strict';var util=require('../util/util');var host=require('../util/host');var domtemplate=require('../util/domtemplate');exports.createView=function(options){if(options.html==null){throw new Error('options.html is missing');}
return{isView:true,appendTo:function(element,clear){

if(clear===true){util.clearElement(element);}
element.appendChild(this.toDom(element.ownerDocument));},toDom:function(document){if(options.css){util.importCss(options.css,document,options.cssId);}
var child=host.toDom(document,options.html);domtemplate.template(child,options.data||{},options.options||{});return child;}};};