"use strict";const acorn=require("acorn/acorn");let js_beautify=function js_beautify(js_source_text,options){var beautifier=new Beautifier(js_source_text,options);return beautifier.beautify();};exports.jsBeautify=js_beautify;function Beautifier(js_source_text,options){var input,output_lines;var token_text,token_type,last_type,last_last_text,indent_string;var flags,previous_flags,flag_store;var whitespace,wordchar,punct,parser_pos,line_starters,reserved_words,digits;var prefix;var input_wanted_newline;var output_space_before_token;var input_length,n_newlines,whitespace_before_token;var handlers,MODE,opt;var preindent_string='';whitespace="\n\r\t ".split('');wordchar='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_$'.split('');digits='0123456789'.split('');punct='+ - * / % & ++ -- = += -= *= /= %= == === != !== > < >= <= >> << >>> >>>= >>= <<= && &= | || ! ~ , : ? ^ ^= |= :: =>';punct+=' <%= <% %> <?= <? ?>'; punct=punct.split(' ');line_starters='continue,try,throw,return,var,let,const,if,switch,case,default,for,while,break,function,yield'.split(',');reserved_words=line_starters.concat(['do','in','else','get','set','new','catch','finally','typeof']);MODE={BlockStatement:'BlockStatement',Statement:'Statement',ObjectLiteral:'ObjectLiteral',ArrayLiteral:'ArrayLiteral',ForInitializer:'ForInitializer',Conditional:'Conditional',Expression:'Expression'};handlers={'TK_START_EXPR':handle_start_expr,'TK_END_EXPR':handle_end_expr,'TK_START_BLOCK':handle_start_block,'TK_END_BLOCK':handle_end_block,'TK_WORD':handle_word,'TK_RESERVED':handle_word,'TK_SEMICOLON':handle_semicolon,'TK_STRING':handle_string,'TK_EQUALS':handle_equals,'TK_OPERATOR':handle_operator,'TK_COMMA':handle_comma,'TK_BLOCK_COMMENT':handle_block_comment,'TK_INLINE_COMMENT':handle_inline_comment,'TK_COMMENT':handle_comment,'TK_DOT':handle_dot,'TK_UNKNOWN':handle_unknown};function create_flags(flags_base,mode){var next_indent_level=0;if(flags_base){next_indent_level=flags_base.indentation_level;if(!just_added_newline()&&flags_base.line_indent_level>next_indent_level){next_indent_level=flags_base.line_indent_level;}}
var next_flags={mode:mode,parent:flags_base,last_text:flags_base?flags_base.last_text:'', last_word:flags_base?flags_base.last_word:'', declaration_statement:false,declaration_assignment:false,in_html_comment:false,multiline_frame:false,if_block:false,else_block:false,do_block:false,do_while:false,in_case_statement:false,in_case:false,case_body:false, indentation_level:next_indent_level,line_indent_level:flags_base?flags_base.line_indent_level:next_indent_level,start_line_index:output_lines.length,had_comment:false,ternary_depth:0};return next_flags;} 
function create_output_line(){return{text:[]};}
options=options?options:{};opt={}; if(options.space_after_anon_function!==undefined&&options.jslint_happy===undefined){options.jslint_happy=options.space_after_anon_function;}
if(options.braces_on_own_line!==undefined){ opt.brace_style=options.braces_on_own_line?"expand":"collapse";}
opt.brace_style=options.brace_style?options.brace_style:(opt.brace_style?opt.brace_style:"collapse"); if(opt.brace_style==="expand-strict"){opt.brace_style="expand";}
opt.indent_size=options.indent_size?parseInt(options.indent_size,10):4;opt.indent_char=options.indent_char?options.indent_char:' ';opt.preserve_newlines=(options.preserve_newlines===undefined)?true:options.preserve_newlines;opt.break_chained_methods=(options.break_chained_methods===undefined)?false:options.break_chained_methods;opt.max_preserve_newlines=(options.max_preserve_newlines===undefined)?0:parseInt(options.max_preserve_newlines,10);opt.space_in_paren=(options.space_in_paren===undefined)?false:options.space_in_paren;opt.space_in_empty_paren=(options.space_in_empty_paren===undefined)?false:options.space_in_empty_paren;opt.jslint_happy=(options.jslint_happy===undefined)?false:options.jslint_happy;opt.keep_array_indentation=(options.keep_array_indentation===undefined)?false:options.keep_array_indentation;opt.space_before_conditional=(options.space_before_conditional===undefined)?true:options.space_before_conditional;opt.unescape_strings=(options.unescape_strings===undefined)?false:options.unescape_strings;opt.wrap_line_length=(options.wrap_line_length===undefined)?0:parseInt(options.wrap_line_length,10);opt.e4x=(options.e4x===undefined)?false:options.e4x;if(options.indent_with_tabs){opt.indent_char='\t';opt.indent_size=1;}
indent_string='';while(opt.indent_size>0){indent_string+=opt.indent_char;opt.indent_size-=1;}
while(js_source_text&&(js_source_text.charAt(0)===' '||js_source_text.charAt(0)==='\t')){preindent_string+=js_source_text.charAt(0);js_source_text=js_source_text.substring(1);}
input=js_source_text;input_length=js_source_text.length;last_type='TK_START_BLOCK'; last_last_text=''; output_lines=[create_output_line()];output_space_before_token=false;whitespace_before_token=[];




flag_store=[];set_mode(MODE.BlockStatement);parser_pos=0;this.beautify=function(){var t,i,keep_whitespace,sweet_code;while(true){t=get_next_token();token_text=t[0];token_type=t[1];if(token_type==='TK_EOF'){ while(flags.mode===MODE.Statement){restore_mode();}
break;}
keep_whitespace=opt.keep_array_indentation&&is_array(flags.mode);input_wanted_newline=n_newlines>0;if(keep_whitespace){for(i=0;i<n_newlines;i+=1){print_newline(i>0);}}else{if(opt.max_preserve_newlines&&n_newlines>opt.max_preserve_newlines){n_newlines=opt.max_preserve_newlines;}
if(opt.preserve_newlines){if(n_newlines>1){print_newline();for(i=1;i<n_newlines;i+=1){print_newline(true);}}}}
handlers[token_type]();if(token_type!=='TK_INLINE_COMMENT'&&token_type!=='TK_COMMENT'&&token_type!=='TK_BLOCK_COMMENT'&&token_type!=='TK_UNKNOWN'){last_last_text=flags.last_text;last_type=token_type;flags.last_text=token_text;}
flags.had_comment=(token_type==='TK_INLINE_COMMENT'||token_type==='TK_COMMENT'||token_type==='TK_BLOCK_COMMENT');}
sweet_code=output_lines[0].text.join('');for(var line_index=1;line_index<output_lines.length;line_index++){sweet_code+='\n'+output_lines[line_index].text.join('');}
sweet_code=sweet_code.replace(/[\r\n ]+$/,'');return sweet_code;};function trim_output(eat_newlines){eat_newlines=(eat_newlines===undefined)?false:eat_newlines;if(output_lines.length){trim_output_line(output_lines[output_lines.length-1],eat_newlines);while(eat_newlines&&output_lines.length>1&&output_lines[output_lines.length-1].text.length===0){output_lines.pop();trim_output_line(output_lines[output_lines.length-1],eat_newlines);}}}
function trim_output_line(line){while(line.text.length&&(line.text[line.text.length-1]===' '||line.text[line.text.length-1]===indent_string||line.text[line.text.length-1]===preindent_string)){line.text.pop();}}
function trim(s){return s.replace(/^\s+|\s+$/g,'');}
 
function split_newlines(s){s=s.replace(/\x0d/g,'');var out=[],idx=s.indexOf("\n");while(idx!==-1){out.push(s.substring(0,idx));s=s.substring(idx+1);idx=s.indexOf("\n");}
if(s.length){out.push(s);}
return out;}
function just_added_newline(){var line=output_lines[output_lines.length-1];return line.text.length===0;}
function just_added_blankline(){if(just_added_newline()){if(output_lines.length===1){return true;}
var line=output_lines[output_lines.length-2];return line.text.length===0;}
return false;}
function allow_wrap_or_preserved_newline(force_linewrap){force_linewrap=(force_linewrap===undefined)?false:force_linewrap;if(opt.wrap_line_length&&!force_linewrap){var line=output_lines[output_lines.length-1];var proposed_line_length=0;if(line.text.length>0){proposed_line_length=line.text.join('').length+token_text.length+
(output_space_before_token?1:0);if(proposed_line_length>=opt.wrap_line_length){force_linewrap=true;}}}
if(((opt.preserve_newlines&&input_wanted_newline)||force_linewrap)&&!just_added_newline()){print_newline(false,true);}}
function print_newline(force_newline,preserve_statement_flags){output_space_before_token=false;if(!preserve_statement_flags){if(flags.last_text!==';'&&flags.last_text!==','&&flags.last_text!=='='&&last_type!=='TK_OPERATOR'){while(flags.mode===MODE.Statement&&!flags.if_block&&!flags.do_block){restore_mode();}}}
if(output_lines.length===1&&just_added_newline()){return;}
if(force_newline||!just_added_newline()){flags.multiline_frame=true;output_lines.push(create_output_line());}}
function print_token_line_indentation(){if(just_added_newline()){var line=output_lines[output_lines.length-1];if(opt.keep_array_indentation&&is_array(flags.mode)&&input_wanted_newline){ line.text.push('');for(var i=0;i<whitespace_before_token.length;i+=1){line.text.push(whitespace_before_token[i]);}}else{if(preindent_string){line.text.push(preindent_string);}
print_indent_string(flags.indentation_level);}}}
function print_indent_string(level){ if(output_lines.length>1){var line=output_lines[output_lines.length-1];flags.line_indent_level=level;for(var i=0;i<level;i+=1){line.text.push(indent_string);}}}
function print_token_space_before(){var line=output_lines[output_lines.length-1];if(output_space_before_token&&line.text.length){var last_output=line.text[line.text.length-1];if(last_output!==' '&&last_output!==indent_string){ line.text.push(' ');}}}
function print_token(printable_token){printable_token=printable_token||token_text;print_token_line_indentation();print_token_space_before();output_space_before_token=false;output_lines[output_lines.length-1].text.push(printable_token);}
function indent(){flags.indentation_level+=1;}
function deindent(){if(flags.indentation_level>0&&((!flags.parent)||flags.indentation_level>flags.parent.indentation_level))
flags.indentation_level-=1;}
function remove_redundant_indentation(frame){


if(frame.multiline_frame)return; var index=frame.start_line_index;var splice_index=0;var line;while(index<output_lines.length){line=output_lines[index];index++; if(line.text.length===0){continue;} 
if(preindent_string&&line.text[0]===preindent_string){splice_index=1;}else{splice_index=0;} 
if(line.text[splice_index]===indent_string){line.text.splice(splice_index,1);}}}
function set_mode(mode){if(flags){flag_store.push(flags);previous_flags=flags;}else{previous_flags=create_flags(null,mode);}
flags=create_flags(previous_flags,mode);}
function is_array(mode){return mode===MODE.ArrayLiteral;}
function is_expression(mode){return in_array(mode,[MODE.Expression,MODE.ForInitializer,MODE.Conditional]);}
function restore_mode(){if(flag_store.length>0){previous_flags=flags;flags=flag_store.pop();if(previous_flags.mode===MODE.Statement){remove_redundant_indentation(previous_flags);}}}
function start_of_object_property(){return flags.parent.mode===MODE.ObjectLiteral&&flags.mode===MODE.Statement&&flags.last_text===':'&&flags.ternary_depth===0;}
function start_of_statement(){if((last_type==='TK_RESERVED'&&in_array(flags.last_text,['var','let','const'])&&token_type==='TK_WORD')||(last_type==='TK_RESERVED'&&flags.last_text==='do')||(last_type==='TK_RESERVED'&&flags.last_text==='return'&&!input_wanted_newline)||(last_type==='TK_RESERVED'&&flags.last_text==='else'&&!(token_type==='TK_RESERVED'&&token_text==='if'))||(last_type==='TK_END_EXPR'&&(previous_flags.mode===MODE.ForInitializer||previous_flags.mode===MODE.Conditional))||(last_type==='TK_WORD'&&flags.mode===MODE.BlockStatement&&!flags.in_case&&!(token_text==='--'||token_text==='++')&&token_type!=='TK_WORD'&&token_type!=='TK_RESERVED')||(flags.mode===MODE.ObjectLiteral&&flags.last_text===':'&&flags.ternary_depth===0)){set_mode(MODE.Statement);indent();if(last_type==='TK_RESERVED'&&in_array(flags.last_text,['var','let','const'])&&token_type==='TK_WORD'){flags.declaration_statement=true;}
if(!start_of_object_property()){allow_wrap_or_preserved_newline(token_type==='TK_RESERVED'&&in_array(token_text,['do','for','if','while']));}
return true;}
return false;}
function all_lines_start_with(lines,c){for(var i=0;i<lines.length;i++){var line=trim(lines[i]);if(line.charAt(0)!==c){return false;}}
return true;}
function each_line_matches_indent(lines,indent){var i=0,len=lines.length,line;for(;i<len;i++){line=lines[i]; if(line&&line.indexOf(indent)!==0){return false;}}
return true;}
function is_special_word(word){return in_array(word,['case','return','do','if','throw','else']);}
function in_array(what,arr){for(var i=0;i<arr.length;i+=1){if(arr[i]===what){return true;}}
return false;}
function unescape_string(s){var esc=false,out='',pos=0,s_hex='',escaped=0,c;while(esc||pos<s.length){c=s.charAt(pos);pos++;if(esc){esc=false;if(c==='x'){ s_hex=s.substr(pos,2);pos+=2;}else if(c==='u'){ s_hex=s.substr(pos,4);pos+=4;}else{ out+='\\'+c;continue;}
if(!s_hex.match(/^[0123456789abcdefABCDEF]+$/)){ return s;}
escaped=parseInt(s_hex,16);if(escaped>=0x00&&escaped<0x20){ if(c==='x'){out+='\\x'+s_hex;}else{out+='\\u'+s_hex;}
continue;}else if(escaped===0x22||escaped===0x27||escaped===0x5c){ out+='\\'+String.fromCharCode(escaped);}else if(c==='x'&&escaped>0x7e&&escaped<=0xff){ return s;}else{out+=String.fromCharCode(escaped);}}else if(c==='\\'){esc=true;}else{out+=c;}}
return out;}
function is_next(find){var local_pos=parser_pos;var c=input.charAt(local_pos);while(in_array(c,whitespace)&&c!==find){local_pos++;if(local_pos>=input_length){return false;}
c=input.charAt(local_pos);}
return c===find;}
function get_next_token(){var i,resulting_string;n_newlines=0;if(parser_pos>=input_length){return['','TK_EOF'];}
input_wanted_newline=false;whitespace_before_token=[];var c=input.charAt(parser_pos);parser_pos+=1;while(in_array(c,whitespace)){if(c==='\n'){n_newlines+=1;whitespace_before_token=[];}else if(n_newlines){if(c===indent_string){whitespace_before_token.push(indent_string);}else if(c!=='\r'){whitespace_before_token.push(' ');}}
if(parser_pos>=input_length){return['','TK_EOF'];}
c=input.charAt(parser_pos);parser_pos+=1;}
if(acorn.isIdentifierChar(input.charCodeAt(parser_pos-1))){if(parser_pos<input_length){while(acorn.isIdentifierChar(input.charCodeAt(parser_pos))){c+=input.charAt(parser_pos);parser_pos+=1;if(parser_pos===input_length){break;}}} 
if(parser_pos!==input_length&&c.match(/^[0-9]+[Ee]$/)&&(input.charAt(parser_pos)==='-'||input.charAt(parser_pos)==='+')){var sign=input.charAt(parser_pos);parser_pos+=1;var t=get_next_token();c+=sign+t[0];return[c,'TK_WORD'];}
if(!(last_type==='TK_DOT'||(last_type==='TK_RESERVED'&&in_array(flags.last_text,['set','get'])))&&in_array(c,reserved_words)){if(c==='in'){ return[c,'TK_OPERATOR'];}
return[c,'TK_RESERVED'];}
return[c,'TK_WORD'];}
if(c==='('||c==='['){return[c,'TK_START_EXPR'];}
if(c===')'||c===']'){return[c,'TK_END_EXPR'];}
if(c==='{'){return[c,'TK_START_BLOCK'];}
if(c==='}'){return[c,'TK_END_BLOCK'];}
if(c===';'){return[c,'TK_SEMICOLON'];}
if(c==='/'){var comment='';var inline_comment=true;if(input.charAt(parser_pos)==='*'){parser_pos+=1;if(parser_pos<input_length){while(parser_pos<input_length&&!(input.charAt(parser_pos)==='*'&&input.charAt(parser_pos+1)&&input.charAt(parser_pos+1)==='/')){c=input.charAt(parser_pos);comment+=c;if(c==="\n"||c==="\r"){inline_comment=false;}
parser_pos+=1;if(parser_pos>=input_length){break;}}}
parser_pos+=2;if(inline_comment&&n_newlines===0){return['/*'+comment+'*/','TK_INLINE_COMMENT'];}else{return['/*'+comment+'*/','TK_BLOCK_COMMENT'];}}
if(input.charAt(parser_pos)==='/'){comment=c;while(input.charAt(parser_pos)!=='\r'&&input.charAt(parser_pos)!=='\n'){comment+=input.charAt(parser_pos);parser_pos+=1;if(parser_pos>=input_length){break;}}
return[comment,'TK_COMMENT'];}}
if(c==='`'||c==="'"||c==='"'||((c==='/')||(opt.e4x&&c==="<"&&input.slice(parser_pos-1).match(/^<([-a-zA-Z:0-9_.]+|{[^{}]*}|!\[CDATA\[[\s\S]*?\]\])\s*([-a-zA-Z:0-9_.]+=('[^']*'|"[^"]*"|{[^{}]*})\s*)*\/?\s*>/))
)&&((last_type==='TK_RESERVED'&&is_special_word(flags.last_text))||(last_type==='TK_END_EXPR'&&in_array(previous_flags.mode,[MODE.Conditional,MODE.ForInitializer]))||(in_array(last_type,['TK_COMMENT','TK_START_EXPR','TK_START_BLOCK','TK_END_BLOCK','TK_OPERATOR','TK_EQUALS','TK_EOF','TK_SEMICOLON','TK_COMMA'])))){var sep=c,esc=false,has_char_escapes=false;resulting_string=c;if(parser_pos<input_length){if(sep==='/'){
var in_char_class=false;while(esc||in_char_class||input.charAt(parser_pos)!==sep){resulting_string+=input.charAt(parser_pos);if(!esc){esc=input.charAt(parser_pos)==='\\';if(input.charAt(parser_pos)==='['){in_char_class=true;}else if(input.charAt(parser_pos)===']'){in_char_class=false;}}else{esc=false;}
parser_pos+=1;if(parser_pos>=input_length){return[resulting_string,'TK_STRING'];}}}else if(opt.e4x&&sep==='<'){
var xmlRegExp=/<(\/?)([-a-zA-Z:0-9_.]+|{[^{}]*}|!\[CDATA\[[\s\S]*?\]\])\s*([-a-zA-Z:0-9_.]+=('[^']*'|"[^"]*"|{[^{}]*})\s*)*(\/?)\s*>/g;var xmlStr=input.slice(parser_pos-1);var match=xmlRegExp.exec(xmlStr);if(match&&match.index===0){var rootTag=match[2];var depth=0;while(match){var isEndTag=!!match[1];var tagName=match[2];var isSingletonTag=(!!match[match.length-1])||(tagName.slice(0,8)==="![CDATA[");if(tagName===rootTag&&!isSingletonTag){if(isEndTag){--depth;}else{++depth;}}
if(depth<=0){break;}
match=xmlRegExp.exec(xmlStr);}
var xmlLength=match?match.index+match[0].length:xmlStr.length;parser_pos+=xmlLength-1;return[xmlStr.slice(0,xmlLength),"TK_STRING"];}}else{
while(esc||input.charAt(parser_pos)!==sep){resulting_string+=input.charAt(parser_pos);if(esc){if(input.charAt(parser_pos)==='x'||input.charAt(parser_pos)==='u'){has_char_escapes=true;}
esc=false;}else{esc=input.charAt(parser_pos)==='\\';}
parser_pos+=1;if(parser_pos>=input_length){return[resulting_string,'TK_STRING'];}}}}
parser_pos+=1;resulting_string+=sep;if(has_char_escapes&&opt.unescape_strings){resulting_string=unescape_string(resulting_string);}
if(sep==='/'){ while(parser_pos<input_length&&in_array(input.charAt(parser_pos),wordchar)){resulting_string+=input.charAt(parser_pos);parser_pos+=1;}}
return[resulting_string,'TK_STRING'];}
if(c==='#'){if(output_lines.length===1&&output_lines[0].text.length===0&&input.charAt(parser_pos)==='!'){ resulting_string=c;while(parser_pos<input_length&&c!=='\n'){c=input.charAt(parser_pos);resulting_string+=c;parser_pos+=1;}
return[trim(resulting_string)+'\n','TK_UNKNOWN'];}

 
var sharp='#';if(parser_pos<input_length&&in_array(input.charAt(parser_pos),digits)){do{c=input.charAt(parser_pos);sharp+=c;parser_pos+=1;}while(parser_pos<input_length&&c!=='#'&&c!=='=');if(c==='#'){}else if(input.charAt(parser_pos)==='['&&input.charAt(parser_pos+1)===']'){sharp+='[]';parser_pos+=2;}else if(input.charAt(parser_pos)==='{'&&input.charAt(parser_pos+1)==='}'){sharp+='{}';parser_pos+=2;}
return[sharp,'TK_WORD'];}}
if(c==='<'&&input.substring(parser_pos-1,parser_pos+3)==='<!--'){parser_pos+=3;c='<!--';while(input.charAt(parser_pos)!=='\n'&&parser_pos<input_length){c+=input.charAt(parser_pos);parser_pos++;}
flags.in_html_comment=true;return[c,'TK_COMMENT'];}
if(c==='-'&&flags.in_html_comment&&input.substring(parser_pos-1,parser_pos+2)==='-->'){flags.in_html_comment=false;parser_pos+=2;return['-->','TK_COMMENT'];}
if(c==='.'){return[c,'TK_DOT'];}
if(in_array(c,punct)){while(parser_pos<input_length&&in_array(c+input.charAt(parser_pos),punct)){c+=input.charAt(parser_pos);parser_pos+=1;if(parser_pos>=input_length){break;}}
if(c===','){return[c,'TK_COMMA'];}else if(c==='='){return[c,'TK_EQUALS'];}else{return[c,'TK_OPERATOR'];}}
return[c,'TK_UNKNOWN'];}
function handle_start_expr(){if(start_of_statement()){}
var next_mode=MODE.Expression;if(token_text==='['){if(last_type==='TK_WORD'||flags.last_text===')'){
if(last_type==='TK_RESERVED'&&in_array(flags.last_text,line_starters)){output_space_before_token=true;}
set_mode(next_mode);print_token();indent();if(opt.space_in_paren){output_space_before_token=true;}
return;}
next_mode=MODE.ArrayLiteral;if(is_array(flags.mode)){if(flags.last_text==='['||(flags.last_text===','&&(last_last_text===']'||last_last_text==='}'))){
 if(!opt.keep_array_indentation){print_newline();}}}}else{if(last_type==='TK_RESERVED'&&flags.last_text==='for'){next_mode=MODE.ForInitializer;}else if(last_type==='TK_RESERVED'&&in_array(flags.last_text,['if','while'])){next_mode=MODE.Conditional;}else{}}
if(flags.last_text===';'||last_type==='TK_START_BLOCK'){print_newline();}else if(last_type==='TK_END_EXPR'||last_type==='TK_START_EXPR'||last_type==='TK_END_BLOCK'||flags.last_text==='.'){allow_wrap_or_preserved_newline(input_wanted_newline);}else if(!(last_type==='TK_RESERVED'&&token_text==='(')&&last_type!=='TK_WORD'&&last_type!=='TK_OPERATOR'){output_space_before_token=true;}else if((last_type==='TK_RESERVED'&&(flags.last_word==='function'||flags.last_word==='typeof'))||(flags.last_text==='*'&&last_last_text==='function')){if(opt.jslint_happy){output_space_before_token=true;}}else if(last_type==='TK_RESERVED'&&(in_array(flags.last_text,line_starters)||flags.last_text==='catch')){if(opt.space_before_conditional){output_space_before_token=true;}}
if(token_text==='('){if(last_type==='TK_EQUALS'||last_type==='TK_OPERATOR'){if(!start_of_object_property()){allow_wrap_or_preserved_newline();}}}
set_mode(next_mode);print_token();if(opt.space_in_paren){output_space_before_token=true;}
indent();}
function handle_end_expr(){ while(flags.mode===MODE.Statement){restore_mode();}
if(flags.multiline_frame){allow_wrap_or_preserved_newline(token_text===']'&&is_array(flags.mode)&&!opt.keep_array_indentation);}
if(opt.space_in_paren){if(last_type==='TK_START_EXPR'&&!opt.space_in_empty_paren){ trim_output();output_space_before_token=false;}else{output_space_before_token=true;}}
if(token_text===']'&&opt.keep_array_indentation){print_token();restore_mode();}else{restore_mode();print_token();}
remove_redundant_indentation(previous_flags); if(flags.do_while&&previous_flags.mode===MODE.Conditional){previous_flags.mode=MODE.Expression;flags.do_block=false;flags.do_while=false;}}
function handle_start_block(){set_mode(MODE.BlockStatement);var empty_braces=is_next('}');var empty_anonymous_function=empty_braces&&flags.last_word==='function'&&last_type==='TK_END_EXPR';if(opt.brace_style==="expand"){if(last_type!=='TK_OPERATOR'&&(empty_anonymous_function||last_type==='TK_EQUALS'||(last_type==='TK_RESERVED'&&is_special_word(flags.last_text)&&flags.last_text!=='else'))){output_space_before_token=true;}else{print_newline(false,true);}}else{ if(last_type!=='TK_OPERATOR'&&last_type!=='TK_START_EXPR'){if(last_type==='TK_START_BLOCK'){print_newline();}else{output_space_before_token=true;}}else{ if(is_array(previous_flags.mode)&&flags.last_text===','){if(last_last_text==='}'){ output_space_before_token=true;}else{print_newline();}}}}
print_token();indent();}
function handle_end_block(){ while(flags.mode===MODE.Statement){restore_mode();}
var empty_braces=last_type==='TK_START_BLOCK';if(opt.brace_style==="expand"){if(!empty_braces){print_newline();}}else{if(!empty_braces){if(is_array(flags.mode)&&opt.keep_array_indentation){ opt.keep_array_indentation=false;print_newline();opt.keep_array_indentation=true;}else{print_newline();}}}
restore_mode();print_token();}
function handle_word(){if(start_of_statement()){}else if(input_wanted_newline&&!is_expression(flags.mode)&&(last_type!=='TK_OPERATOR'||(flags.last_text==='--'||flags.last_text==='++'))&&last_type!=='TK_EQUALS'&&(opt.preserve_newlines||!(last_type==='TK_RESERVED'&&in_array(flags.last_text,['var','let','const','set','get'])))){print_newline();}
if(flags.do_block&&!flags.do_while){if(token_type==='TK_RESERVED'&&token_text==='while'){output_space_before_token=true;print_token();output_space_before_token=true;flags.do_while=true;return;}else{ print_newline();flags.do_block=false;}}


if(flags.if_block){if(!flags.else_block&&(token_type==='TK_RESERVED'&&token_text==='else')){flags.else_block=true;}else{while(flags.mode===MODE.Statement){restore_mode();}
flags.if_block=false;flags.else_block=false;}}
if(token_type==='TK_RESERVED'&&(token_text==='case'||(token_text==='default'&&flags.in_case_statement))){print_newline();if(flags.case_body||opt.jslint_happy){ deindent();flags.case_body=false;}
print_token();flags.in_case=true;flags.in_case_statement=true;return;}
if(token_type==='TK_RESERVED'&&token_text==='function'){if(in_array(flags.last_text,['}',';'])||(just_added_newline()&&!in_array(flags.last_text,['{',':','=',',']))){
 if(!just_added_blankline()&&!flags.had_comment){print_newline();print_newline(true);}}
if(last_type==='TK_RESERVED'||last_type==='TK_WORD'){if(last_type==='TK_RESERVED'&&in_array(flags.last_text,['get','set','new','return'])){output_space_before_token=true;}else{print_newline();}}else if(last_type==='TK_OPERATOR'||flags.last_text==='='){ output_space_before_token=true;}else if(is_expression(flags.mode)){}else{print_newline();}}
if(last_type==='TK_COMMA'||last_type==='TK_START_EXPR'||last_type==='TK_EQUALS'||last_type==='TK_OPERATOR'){if(!start_of_object_property()){allow_wrap_or_preserved_newline();}}
if(token_type==='TK_RESERVED'&&token_text==='function'){print_token();flags.last_word=token_text;return;}
prefix='NONE';if(last_type==='TK_END_BLOCK'){if(!(token_type==='TK_RESERVED'&&in_array(token_text,['else','catch','finally']))){prefix='NEWLINE';}else{if(opt.brace_style==="expand"||opt.brace_style==="end-expand"){prefix='NEWLINE';}else{prefix='SPACE';output_space_before_token=true;}}}else if(last_type==='TK_SEMICOLON'&&flags.mode===MODE.BlockStatement){prefix='NEWLINE';}else if(last_type==='TK_SEMICOLON'&&is_expression(flags.mode)){prefix='SPACE';}else if(last_type==='TK_STRING'){prefix='NEWLINE';}else if(last_type==='TK_RESERVED'||last_type==='TK_WORD'||(flags.last_text==='*'&&last_last_text==='function')){prefix='SPACE';}else if(last_type==='TK_START_BLOCK'){prefix='NEWLINE';}else if(last_type==='TK_END_EXPR'){output_space_before_token=true;prefix='NEWLINE';}
if(token_type==='TK_RESERVED'&&in_array(token_text,line_starters)&&flags.last_text!==')'){if(flags.last_text==='else'){prefix='SPACE';}else{prefix='NEWLINE';}}
if(token_type==='TK_RESERVED'&&in_array(token_text,['else','catch','finally'])){if(last_type!=='TK_END_BLOCK'||opt.brace_style==="expand"||opt.brace_style==="end-expand"){print_newline();}else{trim_output(true);var line=output_lines[output_lines.length-1];
if(line.text[line.text.length-1]!=='}'){print_newline();}
output_space_before_token=true;}}else if(prefix==='NEWLINE'){if(last_type==='TK_RESERVED'&&is_special_word(flags.last_text)){output_space_before_token=true;}else if(last_type!=='TK_END_EXPR'){if((last_type!=='TK_START_EXPR'||!(token_type==='TK_RESERVED'&&in_array(token_text,['var','let','const'])))&&flags.last_text!==':'){if(token_type==='TK_RESERVED'&&token_text==='if'&&flags.last_word==='else'&&flags.last_text!=='{'){output_space_before_token=true;}else{print_newline();}}}else if(token_type==='TK_RESERVED'&&in_array(token_text,line_starters)&&flags.last_text!==')'){print_newline();}}else if(is_array(flags.mode)&&flags.last_text===','&&last_last_text==='}'){print_newline();}else if(prefix==='SPACE'){output_space_before_token=true;}
print_token();flags.last_word=token_text;if(token_type==='TK_RESERVED'&&token_text==='do'){flags.do_block=true;}
if(token_type==='TK_RESERVED'&&token_text==='if'){flags.if_block=true;}}
function handle_semicolon(){if(start_of_statement()){ output_space_before_token=false;}
while(flags.mode===MODE.Statement&&!flags.if_block&&!flags.do_block){restore_mode();}
print_token();if(flags.mode===MODE.ObjectLiteral){
 flags.mode=MODE.BlockStatement;}}
function handle_string(){if(start_of_statement()){ output_space_before_token=true;}else if(last_type==='TK_RESERVED'||last_type==='TK_WORD'){output_space_before_token=true;}else if(last_type==='TK_COMMA'||last_type==='TK_START_EXPR'||last_type==='TK_EQUALS'||last_type==='TK_OPERATOR'){if(!start_of_object_property()){allow_wrap_or_preserved_newline();}}else{print_newline();}
print_token();}
function handle_equals(){if(start_of_statement()){}
if(flags.declaration_statement){ flags.declaration_assignment=true;}
output_space_before_token=true;print_token();output_space_before_token=true;}
function handle_comma(){if(flags.declaration_statement){if(is_expression(flags.parent.mode)){flags.declaration_assignment=false;}
print_token();if(flags.declaration_assignment){flags.declaration_assignment=false;print_newline(false,true);}else{output_space_before_token=true;}
return;}
print_token();if(flags.mode===MODE.ObjectLiteral||(flags.mode===MODE.Statement&&flags.parent.mode===MODE.ObjectLiteral)){if(flags.mode===MODE.Statement){restore_mode();}
print_newline();}else{ output_space_before_token=true;}}
function handle_operator(){ if(token_text===':'&&flags.mode===MODE.BlockStatement&&last_last_text==='{'&&(last_type==='TK_WORD'||last_type==='TK_RESERVED')){flags.mode=MODE.ObjectLiteral;}
if(start_of_statement()){}
var space_before=true;var space_after=true;if(last_type==='TK_RESERVED'&&is_special_word(flags.last_text)){ output_space_before_token=true;print_token();return;}
if(token_text==='*'&&last_type==='TK_DOT'&&!last_last_text.match(/^\d+$/)){print_token();return;}
if(token_text===':'&&flags.in_case){flags.case_body=true;indent();print_token();print_newline();flags.in_case=false;return;}
if(token_text==='::'){ print_token();return;}

if(input_wanted_newline&&(token_text==='--'||token_text==='++')){print_newline();} 
if(last_type==='TK_OPERATOR'){allow_wrap_or_preserved_newline();}
if(in_array(token_text,['--','++','!','~'])||(in_array(token_text,['-','+'])&&(in_array(last_type,['TK_START_BLOCK','TK_START_EXPR','TK_EQUALS','TK_OPERATOR'])||in_array(flags.last_text,line_starters)||flags.last_text===','))){ space_before=false;space_after=false;if(flags.last_text===';'&&is_expression(flags.mode)){
space_before=true;}
if(last_type==='TK_RESERVED'){space_before=true;}
if((flags.mode===MODE.BlockStatement||flags.mode===MODE.Statement)&&(flags.last_text==='{'||flags.last_text===';')){
print_newline();}}else if(token_text===':'){if(flags.ternary_depth===0){if(flags.mode===MODE.BlockStatement){flags.mode=MODE.ObjectLiteral;}
space_before=false;}else{flags.ternary_depth-=1;}}else if(token_text==='?'){flags.ternary_depth+=1;}else if(token_text==='*'&&last_type==='TK_RESERVED'&&flags.last_text==='function'){space_before=false;space_after=false;}
output_space_before_token=output_space_before_token||space_before;print_token();output_space_before_token=space_after;}
function handle_block_comment(){var lines=split_newlines(token_text);var j; var javadoc=false;var starless=false;var lastIndent=whitespace_before_token.join('');var lastIndentLength=lastIndent.length; print_newline(false,true);if(lines.length>1){if(all_lines_start_with(lines.slice(1),'*')){javadoc=true;}
else if(each_line_matches_indent(lines.slice(1),lastIndent)){starless=true;}} 
print_token(lines[0]);for(j=1;j<lines.length;j++){print_newline(false,true);if(javadoc){ print_token(' '+trim(lines[j]));}else if(starless&&lines[j].length>lastIndentLength){ print_token(lines[j].substring(lastIndentLength));}else{ output_lines[output_lines.length-1].text.push(lines[j]);}} 
print_newline(false,true);}
function handle_inline_comment(){output_space_before_token=true;print_token();output_space_before_token=true;}
function handle_comment(){if(input_wanted_newline){print_newline(false,true);}else{trim_output(true);}
output_space_before_token=true;print_token();print_newline(false,true);}
function handle_dot(){if(start_of_statement()){}
if(last_type==='TK_RESERVED'&&is_special_word(flags.last_text)){output_space_before_token=true;}else{
allow_wrap_or_preserved_newline(flags.last_text===')'&&opt.break_chained_methods);}
print_token();}
function handle_unknown(){print_token();if(token_text[token_text.length-1]==='\n'){print_newline();}}}