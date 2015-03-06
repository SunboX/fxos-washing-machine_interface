
(function(){function css_beautify(source_text,options){options=options||{};var indentSize=options.indent_size||4;var indentCharacter=options.indent_char||' ';var selectorSeparatorNewline=(options.selector_separator_newline===undefined)?true:options.selector_separator_newline;var endWithNewline=(options.end_with_newline===undefined)?false:options.end_with_newline; if(typeof indentSize==="string"){indentSize=parseInt(indentSize,10);} 
var whiteRe=/^\s+$/;var wordRe=/[\w$\-_]/;var pos=-1,ch;function next(){ch=source_text.charAt(++pos);return ch;}
function peek(){return source_text.charAt(pos+1);}
function eatString(endChar){var start=pos;while(next()){if(ch==="\\"){next();next();}else if(ch===endChar){break;}else if(ch==="\n"){break;}}
return source_text.substring(start,pos+1);}
function eatWhitespace(){var start=pos;while(whiteRe.test(peek())){pos++;}
return pos!==start;}
function skipWhitespace(){var start=pos;do{}while(whiteRe.test(next()));return pos!==start+1;}
function eatComment(singleLine){var start=pos;next();while(next()){if(ch==="*"&&peek()==="/"){pos++;break;}else if(singleLine&&ch==="\n"){break;}}
return source_text.substring(start,pos+1);}
function lookBack(str){return source_text.substring(pos-str.length,pos).toLowerCase()===str;}
function isCommentOnLine(){var endOfLine=source_text.indexOf('\n',pos);if(endOfLine===-1){return false;}
var restOfLine=source_text.substring(pos,endOfLine);return restOfLine.indexOf('//')!==-1;} 
var indentString=source_text.match(/^[\r\n]*[\t ]*/)[0];var singleIndent=new Array(indentSize+1).join(indentCharacter);var indentLevel=0;var nestedLevel=0;function indent(){indentLevel++;indentString+=singleIndent;}
function outdent(){indentLevel--;indentString=indentString.slice(0,-indentSize);}
var print={};print["{"]=function(ch){print.singleSpace();output.push(ch);print.newLine();};print["}"]=function(ch){print.newLine();output.push(ch);print.newLine();};print._lastCharWhitespace=function(){return whiteRe.test(output[output.length-1]);};print.newLine=function(keepWhitespace){if(!keepWhitespace){while(print._lastCharWhitespace()){output.pop();}}
if(output.length){output.push('\n');}
if(indentString){output.push(indentString);}};print.singleSpace=function(){if(output.length&&!print._lastCharWhitespace()){output.push(' ');}};var output=[];if(indentString){output.push(indentString);}
var insideRule=false;var enteringConditionalGroup=false;while(true){var isAfterSpace=skipWhitespace();if(!ch){break;}else if(ch==='/'&&peek()==='*'){print.newLine();output.push(eatComment(),"\n",indentString);var header=lookBack("");if(header){print.newLine();}}else if(ch==='/'&&peek()==='/'){ output.push(eatComment(true),indentString);}else if(ch==='@'){ var atRule=eatString(" ").replace(/ $/,''); output.push(atRule,ch); if(atRule in css_beautify.NESTED_AT_RULE){nestedLevel+=1;if(atRule in css_beautify.CONDITIONAL_GROUP_RULE){enteringConditionalGroup=true;}}}else if(ch==='{'){eatWhitespace();if(peek()==='}'){next();output.push(" {}");}else{indent();print["{"](ch); if(enteringConditionalGroup){enteringConditionalGroup=false;insideRule=(indentLevel>nestedLevel);}else{ insideRule=(indentLevel>=nestedLevel);}}}else if(ch==='}'){outdent();print["}"](ch);insideRule=false;if(nestedLevel){nestedLevel--;}}else if(ch===":"){eatWhitespace();if(insideRule||enteringConditionalGroup){
 output.push(ch," ");}else{if(peek()===":"){ next();output.push("::");}else{ output.push(ch);}}}else if(ch==='"'||ch==='\''){output.push(eatString(ch));}else if(ch===';'){if(isCommentOnLine()){var beforeComment=eatString('/');var comment=eatComment(true);output.push(beforeComment,comment.substring(1,comment.length-1),'\n',indentString);}else{output.push(ch,'\n',indentString);}}else if(ch==='('){ if(lookBack("url")){output.push(ch);eatWhitespace();if(next()){if(ch!==')'&&ch!=='"'&&ch!=='\''){output.push(eatString(')'));}else{pos--;}}}else{if(isAfterSpace){print.singleSpace();}
output.push(ch);eatWhitespace();}}else if(ch===')'){output.push(ch);}else if(ch===','){eatWhitespace();output.push(ch);if(!insideRule&&selectorSeparatorNewline){print.newLine();}else{print.singleSpace();}}else if(ch===']'){output.push(ch);}else if(ch==='['){if(isAfterSpace){print.singleSpace();}
output.push(ch);}else if(ch==='='){ eatWhitespace();output.push(ch);}else{if(isAfterSpace){print.singleSpace();}
output.push(ch);}}
var sweetCode=output.join('').replace(/[\n ]+$/,''); var should=endWithNewline;var actually=/\n$/.test(sweetCode);if(should&&!actually){sweetCode+="\n";}else if(!should&&actually){sweetCode=sweetCode.slice(0,-1);}
return sweetCode;} 
css_beautify.NESTED_AT_RULE={"@page":true,"@font-face":true,"@keyframes":true,"@media":true,"@supports":true,"@document":true};css_beautify.CONDITIONAL_GROUP_RULE={"@media":true,"@supports":true,"@document":true};exports.cssBeautify=css_beautify;}());