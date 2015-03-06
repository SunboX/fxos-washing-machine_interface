(function(root,factory){if(typeof define==='function'&&define.amd){define(factory);}else if(typeof exports==='object'){module.exports=factory();}else{root.prettyFast=factory();}}(this,function(){"use strict";var acorn=this.acorn||require("acorn/acorn");var sourceMap=this.sourceMap||require("source-map");var SourceNode=sourceMap.SourceNode;




var PRE_ARRAY_LITERAL_TOKENS={"typeof":true,"void":true,"delete":true,"case":true,"do":true,"=":true,"in":true,"{":true,"*":true,"/":true,"%":true,"else":true,";":true,"++":true,"--":true,"+":true,"-":true,"~":true,"!":true,":":true,"?":true,">>":true,">>>":true,"<<":true,"||":true,"&&":true,"<":true,">":true,"<=":true,">=":true,"instanceof":true,"&":true,"^":true,"|":true,"==":true,"!=":true,"===":true,"!==":true,",":true,"}":true};function isArrayLiteral(token,lastToken){if(token.type.type!="["){return false;}
if(!lastToken){return true;}
if(lastToken.type.isAssign){return true;}
return!!PRE_ARRAY_LITERAL_TOKENS[lastToken.type.keyword||lastToken.type.type];}

var PREVENT_ASI_AFTER_TOKENS={"*":true,"/":true,"%":true,"+":true,"-":true,"<<":true,">>":true,">>>":true,"<":true,">":true,"<=":true,">=":true,"instanceof":true,"in":true,"==":true,"!=":true,"===":true,"!==":true,"&":true,"^":true,"|":true,"&&":true,"||":true,",":true,".":true,"=":true,"*=":true,"/=":true,"%=":true,"+=":true,"-=":true,"<<=":true,">>=":true,">>>=":true,"&=":true,"^=":true,"|=":true,"delete":true,"void":true,"typeof":true,"~":true,"!":true,"new":true,"(":true};
var PREVENT_ASI_BEFORE_TOKENS={"*":true,"/":true,"%":true,"<<":true,">>":true,">>>":true,"<":true,">":true,"<=":true,">=":true,"instanceof":true,"in":true,"==":true,"!=":true,"===":true,"!==":true,"&":true,"^":true,"|":true,"&&":true,"||":true,",":true,".":true,"=":true,"*=":true,"/=":true,"%=":true,"+=":true,"-=":true,"<<=":true,">>=":true,">>>=":true,"&=":true,"^=":true,"|=":true,"(":true};function isASI(token,lastToken){if(!lastToken){return false;}
if(token.startLoc.line===lastToken.startLoc.line){return false;}
if(PREVENT_ASI_AFTER_TOKENS[lastToken.type.type||lastToken.type.keyword]){return false;}
if(PREVENT_ASI_BEFORE_TOKENS[token.type.type||token.type.keyword]){return false;}
return true;}
function isGetterOrSetter(token,lastToken,stack){return stack[stack.length-1]=="{"&&lastToken&&lastToken.type.type=="name"&&(lastToken.value=="get"||lastToken.value=="set")&&token.type.type=="name";}
function isLineDelimiter(token,stack){if(token.isArrayLiteral){return true;}
var ttt=token.type.type;var top=stack[stack.length-1];return ttt==";"&&top!="("||ttt=="{"||ttt==","&&top!="("||ttt==":"&&(top=="case"||top=="default");}
function appendNewline(token,write,stack){if(isLineDelimiter(token,stack)){write("\n",token.startLoc.line,token.startLoc.column);return true;}
return false;}
function needsSpaceAfter(token,lastToken){if(lastToken){if(lastToken.type.isLoop){return true;}
if(lastToken.type.isAssign){return true;}
if(lastToken.type.binop!=null){return true;}
var ltt=lastToken.type.type;if(ltt=="?"){return true;}
if(ltt==":"){return true;}
if(ltt==","){return true;}
if(ltt==";"){return true;}
var ltk=lastToken.type.keyword;if(ltk!=null){if(ltk=="break"||ltk=="continue"||ltk=="return"){return token.type.type!=";";}
if(ltk!="debugger"&&ltk!="null"&&ltk!="true"&&ltk!="false"&&ltk!="this"&&ltk!="default"){return true;}}
if(ltt==")"&&(token.type.type!=")"&&token.type.type!="]"&&token.type.type!=";"&&token.type.type!=","&&token.type.type!=".")){return true;}}
if(token.type.isAssign){return true;}
if(token.type.binop!=null){return true;}
if(token.type.type=="?"){return true;}
return false;}
function prependWhiteSpace(token,lastToken,addedNewline,write,options,indentLevel,stack){var ttk=token.type.keyword;var ttt=token.type.type;var newlineAdded=addedNewline;var ltt=lastToken?lastToken.type.type:null;


if(lastToken&&ltt=="}"){if(ttk=="while"&&stack[stack.length-1]=="do"){write(" ",lastToken.startLoc.line,lastToken.startLoc.column);}else if(ttk=="else"||ttk=="catch"||ttk=="finally"){write(" ",lastToken.startLoc.line,lastToken.startLoc.column);}else if(ttt!="("&&ttt!=";"&&ttt!=","&&ttt!=")"&&ttt!="."){write("\n",lastToken.startLoc.line,lastToken.startLoc.column);newlineAdded=true;}}
if(isGetterOrSetter(token,lastToken,stack)){write(" ",lastToken.startLoc.line,lastToken.startLoc.column);}
if(ttt==":"&&stack[stack.length-1]=="?"){write(" ",lastToken.startLoc.line,lastToken.startLoc.column);}
if(lastToken&&ltt!="}"&&ttk=="else"){write(" ",lastToken.startLoc.line,lastToken.startLoc.column);}
function ensureNewline(){if(!newlineAdded){write("\n",lastToken.startLoc.line,lastToken.startLoc.column);newlineAdded=true;}}
if(isASI(token,lastToken)){ensureNewline();}
if(decrementsIndent(ttt,stack)){ensureNewline();}
if(newlineAdded){if(ttk=="case"||ttk=="default"){write(repeat(options.indent,indentLevel-1),token.startLoc.line,token.startLoc.column);}else{write(repeat(options.indent,indentLevel),token.startLoc.line,token.startLoc.column);}}else if(needsSpaceAfter(token,lastToken)){write(" ",lastToken.startLoc.line,lastToken.startLoc.column);}}
function repeat(str,n){var result="";while(n>0){if(n&1){result+=str;}
n>>=1;str+=str;}
return result;}
var sanitize=(function(){var escapeCharacters={"\\":"\\\\","\n":"\\n","\r":"\\r","\t":"\\t","\v":"\\v","\f":"\\f","\0":"\\0","'":"\\'"};var regExpString="("
+Object.keys(escapeCharacters).map(function(c){return escapeCharacters[c];}).join("|")
+")";var escapeCharactersRegExp=new RegExp(regExpString,"g");return function(str){return str.replace(escapeCharactersRegExp,function(_,c){return escapeCharacters[c];});}}());function addToken(token,write,options){if(token.type.type=="string"){write("'"+sanitize(token.value)+"'",token.startLoc.line,token.startLoc.column);}else{write(String(token.value!=null?token.value:token.type.type),token.startLoc.line,token.startLoc.column);}}
function belongsOnStack(token){var ttt=token.type.type;var ttk=token.type.keyword;return ttt=="{"||ttt=="("||ttt=="["||ttt=="?"||ttk=="do"||ttk=="switch"||ttk=="case"||ttk=="default";}
function shouldStackPop(token,stack){var ttt=token.type.type;var ttk=token.type.keyword;var top=stack[stack.length-1];return ttt=="]"||ttt==")"||ttt=="}"||(ttt==":"&&(top=="case"||top=="default"||top=="?"))||(ttk=="while"&&top=="do");}
function decrementsIndent(tokenType,stack){return tokenType=="}"||(tokenType=="]"&&stack[stack.length-1]=="[\n")}
function incrementsIndent(token){return token.type.type=="{"||token.isArrayLiteral||token.type.keyword=="switch";}
function addComment(write,indentLevel,options,block,text,line,column){var indentString=repeat(options.indent,indentLevel);write(indentString,line,column);if(block){write("/*");write(text.split(new RegExp("/\n"+indentString+"/","g")).join("\n"+indentString));write("*/");}else{write("//");write(text);}
write("\n");}
return function prettyFast(input,options){var indentLevel=0;var result=new SourceNode();var write=(function(){var buffer=[];var bufferLine=-1;var bufferColumn=-1;return function write(str,line,column){if(line!=null&&bufferLine===-1){bufferLine=line;}
if(column!=null&&bufferColumn===-1){bufferColumn=column;}
buffer.push(str);if(str=="\n"){var lineStr="";for(var i=0,len=buffer.length;i<len;i++){lineStr+=buffer[i];}
result.add(new SourceNode(bufferLine,bufferColumn,options.url,lineStr));buffer.splice(0,buffer.length);bufferLine=-1;bufferColumn=-1;}}}());var addedNewline=false;var token;
var ttt;
var ttk;var lastToken;





var stack=[];






var commentQueue=[];var getToken=acorn.tokenize(input,{locations:true,sourceFile:options.url,onComment:function(block,text,start,end,startLoc,endLoc){if(lastToken){commentQueue.push({block:block,text:text,line:startLoc.line,column:startLoc.column,trailing:lastToken.endLoc.line==startLoc.line});}else{addComment(write,indentLevel,options,block,text,startLoc.line,startLoc.column);addedNewline=true;}}});while(true){token=getToken();ttk=token.type.keyword;ttt=token.type.type;if(ttt=="eof"){if(!addedNewline){write("\n");}
break;}
token.isArrayLiteral=isArrayLiteral(token,lastToken);if(belongsOnStack(token)){if(token.isArrayLiteral){stack.push("[\n");}else{stack.push(ttt||ttk);}}
if(decrementsIndent(ttt,stack)){indentLevel--;if(ttt=="}"&&stack.length>1&&stack[stack.length-2]=="switch"){indentLevel--;}}
prependWhiteSpace(token,lastToken,addedNewline,write,options,indentLevel,stack);addToken(token,write,options);if(commentQueue.length==0||!commentQueue[0].trailing){addedNewline=appendNewline(token,write,stack);}
if(shouldStackPop(token,stack)){stack.pop();if(token=="}"&&stack.length&&stack[stack.length-1]=="switch"){stack.pop();}}
if(incrementsIndent(token)){indentLevel++;}



if(!lastToken){lastToken={startLoc:{},endLoc:{}};}
lastToken.start=token.start;lastToken.end=token.end;lastToken.startLoc.line=token.startLoc.line;lastToken.startLoc.column=token.startLoc.column;lastToken.endLoc.line=token.endLoc.line;lastToken.endLoc.column=token.endLoc.column;lastToken.type=token.type;lastToken.value=token.value;lastToken.isArrayLiteral=token.isArrayLiteral;if(commentQueue.length){if(!addedNewline&&!commentQueue[0].trailing){write("\n");}
if(commentQueue[0].trailing){write(" ");}
for(var i=0,n=commentQueue.length;i<n;i++){var comment=commentQueue[i];var commentIndentLevel=commentQueue[i].trailing?0:indentLevel;addComment(write,commentIndentLevel,options,comment.block,comment.text,comment.line,comment.column);}
addedNewline=true;commentQueue.splice(0,commentQueue.length);}}
return result.toStringWithSourceMap({file:options.url});};}.bind(this)));