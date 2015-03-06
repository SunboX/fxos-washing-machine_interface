'use strict';module.metadata={"stability":"unstable"};let unescape=decodeURIComponent;exports.unescape=unescape;

function escape(query){return encodeURIComponent(query).replace(/%20/g,'+').replace(/!/g,'%21').replace(/'/g,'%27').replace(/\(/g,'%28').replace(/\)/g,'%29').replace(/\*/g,'%2A');}
exports.escape=escape;
function stringify(options,separator,assigner){separator=separator||'&';assigner=assigner||'=';if(!options)
return'';if(typeof(options)=='string')
return options;




let encodedContent=[];function add(key,val){encodedContent.push(escape(key)+assigner+escape(val));}
function make(key,value){if(value&&typeof(value)==='object')
Object.keys(value).forEach(function(name){make(key+'['+name+']',value[name]);});else
add(key,value);}
Object.keys(options).forEach(function(name){make(name,options[name]);});return encodedContent.join(separator);


}
exports.stringify=stringify;
exports.encode=stringify;exports.serialize=stringify;

function parse(query,separator,assigner){separator=separator||'&';assigner=assigner||'=';let result={};if(typeof query!=='string'||query.length===0)
return result;query.split(separator).forEach(function(chunk){let pair=chunk.split(assigner);let key=unescape(pair[0]);let value=unescape(pair.slice(1).join(assigner));if(!(key in result))
result[key]=value;else if(Array.isArray(result[key]))
result[key].push(value);else
result[key]=[result[key],value];});return result;};exports.parse=parse;
exports.decode=parse;