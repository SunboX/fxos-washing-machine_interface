(function(){function trim(s){return s.replace(/^\s+|\s+$/g,'');}
function ltrim(s){return s.replace(/^\s+/g,'');}
function style_html(html_source,options,js_beautify,css_beautify){var multi_parser,indent_inner_html,indent_size,indent_character,wrap_line_length,brace_style,unformatted,preserve_newlines,max_preserve_newlines,indent_handlebars;options=options||{}; if((options.wrap_line_length===undefined||parseInt(options.wrap_line_length,10)===0)&&(options.max_char!==undefined&&parseInt(options.max_char,10)!==0)){options.wrap_line_length=options.max_char;}
indent_inner_html=(options.indent_inner_html===undefined)?false:options.indent_inner_html;indent_size=(options.indent_size===undefined)?4:parseInt(options.indent_size,10);indent_character=(options.indent_char===undefined)?' ':options.indent_char;brace_style=(options.brace_style===undefined)?'collapse':options.brace_style;wrap_line_length=parseInt(options.wrap_line_length,10)===0?32786:parseInt(options.wrap_line_length||250,10);unformatted=options.unformatted||['a','span','bdo','em','strong','dfn','code','samp','kbd','var','cite','abbr','acronym','q','sub','sup','tt','i','b','big','small','u','s','strike','font','ins','del','pre','address','dt','h1','h2','h3','h4','h5','h6'];preserve_newlines=(options.preserve_newlines===undefined)?true:options.preserve_newlines;max_preserve_newlines=preserve_newlines?(isNaN(parseInt(options.max_preserve_newlines,10))?32786:parseInt(options.max_preserve_newlines,10)):0;indent_handlebars=(options.indent_handlebars===undefined)?false:options.indent_handlebars;function Parser(){this.pos=0; this.token='';this.current_mode='CONTENT'; this.tags={ parent:'parent1',parentcount:1,parent1:''};this.tag_type='';this.token_text=this.last_token=this.last_text=this.token_type='';this.newlines=0;this.indent_content=indent_inner_html;this.Utils={ whitespace:"\n\r\t ".split(''),single_token:'br,input,link,meta,!doctype,basefont,base,area,hr,wbr,param,img,isindex,?xml,embed,?php,?,?='.split(','), extra_liners:'head,body,/html'.split(','), in_array:function(what,arr){for(var i=0;i<arr.length;i++){if(what===arr[i]){return true;}}
return false;}};this.traverse_whitespace=function(){var input_char='';input_char=this.input.charAt(this.pos);if(this.Utils.in_array(input_char,this.Utils.whitespace)){this.newlines=0;while(this.Utils.in_array(input_char,this.Utils.whitespace)){if(preserve_newlines&&input_char==='\n'&&this.newlines<=max_preserve_newlines){this.newlines+=1;}
this.pos++;input_char=this.input.charAt(this.pos);}
return true;}
return false;};this.get_content=function(){ var input_char='',content=[],space=false; while(this.input.charAt(this.pos)!=='<'){if(this.pos>=this.input.length){return content.length?content.join(''):['','TK_EOF'];}
if(this.traverse_whitespace()){if(content.length){space=true;}
continue;}
if(indent_handlebars){var peek3=this.input.substr(this.pos,3);if(peek3==='{{#'||peek3==='{{/'){break;}else if(this.input.substr(this.pos,2)==='{{'){if(this.get_tag(true)==='{{else}}'){break;}}}
input_char=this.input.charAt(this.pos);this.pos++;if(space){if(this.line_char_count>=this.wrap_line_length){ this.print_newline(false,content);this.print_indentation(content);}else{this.line_char_count++;content.push(' ');}
space=false;}
this.line_char_count++;content.push(input_char);}
return content.length?content.join(''):'';};this.get_contents_to=function(name){ if(this.pos===this.input.length){return['','TK_EOF'];}
var input_char='';var content='';var reg_match=new RegExp('</'+name+'\\s*>','igm');reg_match.lastIndex=this.pos;var reg_array=reg_match.exec(this.input);var end_script=reg_array?reg_array.index:this.input.length; if(this.pos<end_script){ content=this.input.substring(this.pos,end_script);this.pos=end_script;}
return content;};this.record_tag=function(tag){ if(this.tags[tag+'count']){ this.tags[tag+'count']++;this.tags[tag+this.tags[tag+'count']]=this.indent_level;}else{ this.tags[tag+'count']=1;this.tags[tag+this.tags[tag+'count']]=this.indent_level;}
this.tags[tag+this.tags[tag+'count']+'parent']=this.tags.parent;this.tags.parent=tag+this.tags[tag+'count'];};this.retrieve_tag=function(tag){ if(this.tags[tag+'count']){ var temp_parent=this.tags.parent;while(temp_parent){if(tag+this.tags[tag+'count']===temp_parent){ break;}
temp_parent=this.tags[temp_parent+'parent'];}
if(temp_parent){ this.indent_level=this.tags[tag+this.tags[tag+'count']]; this.tags.parent=this.tags[temp_parent+'parent'];}
delete this.tags[tag+this.tags[tag+'count']+'parent'];delete this.tags[tag+this.tags[tag+'count']]; if(this.tags[tag+'count']===1){delete this.tags[tag+'count'];}else{this.tags[tag+'count']--;}}};this.indent_to_tag=function(tag){if(!this.tags[tag+'count']){return;}
var temp_parent=this.tags.parent;while(temp_parent){if(tag+this.tags[tag+'count']===temp_parent){break;}
temp_parent=this.tags[temp_parent+'parent'];}
if(temp_parent){this.indent_level=this.tags[tag+this.tags[tag+'count']];}};this.get_tag=function(peek){ var input_char='',content=[],comment='',space=false,tag_start,tag_end,tag_start_char,orig_pos=this.pos,orig_line_char_count=this.line_char_count;peek=peek!==undefined?peek:false;do{if(this.pos>=this.input.length){if(peek){this.pos=orig_pos;this.line_char_count=orig_line_char_count;}
return content.length?content.join(''):['','TK_EOF'];}
input_char=this.input.charAt(this.pos);this.pos++;if(this.Utils.in_array(input_char,this.Utils.whitespace)){ space=true;continue;}
if(input_char==="'"||input_char==='"'){input_char+=this.get_unformatted(input_char);space=true;}
if(input_char==='='){space=false;}
if(content.length&&content[content.length-1]!=='='&&input_char!=='>'&&space){if(this.line_char_count>=this.wrap_line_length){this.print_newline(false,content);this.print_indentation(content);}else{content.push(' ');this.line_char_count++;}
space=false;}
if(indent_handlebars&&tag_start_char==='<'){
if((input_char+this.input.charAt(this.pos))==='{{'){input_char+=this.get_unformatted('}}');if(content.length&&content[content.length-1]!==' '&&content[content.length-1]!=='<'){input_char=' '+input_char;}
space=true;}}
if(input_char==='<'&&!tag_start_char){tag_start=this.pos-1;tag_start_char='<';}
if(indent_handlebars&&!tag_start_char){if(content.length>=2&&content[content.length-1]==='{'&&content[content.length-2]=='{'){if(input_char==='#'||input_char==='/'){tag_start=this.pos-3;}else{tag_start=this.pos-2;}
tag_start_char='{';}}
this.line_char_count++;content.push(input_char);if(content[1]&&content[1]==='!'){

 content=[this.get_comment(tag_start)];break;}
if(indent_handlebars&&tag_start_char==='{'&&content.length>2&&content[content.length-2]==='}'&&content[content.length-1]==='}'){break;}}while(input_char!=='>');var tag_complete=content.join('');var tag_index;var tag_offset;if(tag_complete.indexOf(' ')!==-1){ tag_index=tag_complete.indexOf(' ');}else if(tag_complete[0]==='{'){tag_index=tag_complete.indexOf('}');}else{ tag_index=tag_complete.indexOf('>');}
if(tag_complete[0]==='<'||!indent_handlebars){tag_offset=1;}else{tag_offset=tag_complete[2]==='#'?3:2;}
var tag_check=tag_complete.substring(tag_offset,tag_index).toLowerCase();if(tag_complete.charAt(tag_complete.length-2)==='/'||this.Utils.in_array(tag_check,this.Utils.single_token)){if(!peek){this.tag_type='SINGLE';}}else if(indent_handlebars&&tag_complete[0]==='{'&&tag_check==='else'){if(!peek){this.indent_to_tag('if');this.tag_type='HANDLEBARS_ELSE';this.indent_content=true;this.traverse_whitespace();}}else if(tag_check==='script'&&(tag_complete.search('type')===-1||(tag_complete.search('type')>-1&&tag_complete.search(/\b(text|application)\/(x-)?(javascript|ecmascript|jscript|livescript)/)>-1))){if(!peek){this.record_tag(tag_check);this.tag_type='SCRIPT';}}else if(tag_check==='style'&&(tag_complete.search('type')===-1||(tag_complete.search('type')>-1&&tag_complete.search('text/css')>-1))){if(!peek){this.record_tag(tag_check);this.tag_type='STYLE';}}else if(this.is_unformatted(tag_check,unformatted)){ comment=this.get_unformatted('</'+tag_check+'>',tag_complete); content.push(comment);if(tag_start>0&&this.Utils.in_array(this.input.charAt(tag_start-1),this.Utils.whitespace)){content.splice(0,0,this.input.charAt(tag_start-1));}
tag_end=this.pos-1;if(this.Utils.in_array(this.input.charAt(tag_end+1),this.Utils.whitespace)){content.push(this.input.charAt(tag_end+1));}
this.tag_type='SINGLE';}else if(tag_check.charAt(0)==='!'){
if(!peek){this.tag_type='SINGLE';this.traverse_whitespace();}}else if(!peek){if(tag_check.charAt(0)==='/'){ this.retrieve_tag(tag_check.substring(1)); this.tag_type='END';this.traverse_whitespace();}else{ this.record_tag(tag_check); if(tag_check.toLowerCase()!=='html'){this.indent_content=true;}
this.tag_type='START'; this.traverse_whitespace();}
if(this.Utils.in_array(tag_check,this.Utils.extra_liners)){ this.print_newline(false,this.output);if(this.output.length&&this.output[this.output.length-2]!=='\n'){this.print_newline(true,this.output);}}}
if(peek){this.pos=orig_pos;this.line_char_count=orig_line_char_count;}
return content.join('');};this.get_comment=function(start_pos){
var comment='',delimiter='>',matched=false;this.pos=start_pos;input_char=this.input.charAt(this.pos);this.pos++;while(this.pos<=this.input.length){comment+=input_char; if(comment[comment.length-1]===delimiter[delimiter.length-1]&&comment.indexOf(delimiter)!==-1){break;} 
if(!matched&&comment.length<10){if(comment.indexOf('<![if')===0){ delimiter='<![endif]>';matched=true;}else if(comment.indexOf('<![cdata[')===0){delimiter=']]>';matched=true;}else if(comment.indexOf('<![')===0){delimiter=']>';matched=true;}else if(comment.indexOf('<!--')===0){delimiter='-->';matched=true;}}
input_char=this.input.charAt(this.pos);this.pos++;}
return comment;};this.get_unformatted=function(delimiter,orig_tag){ if(orig_tag&&orig_tag.toLowerCase().indexOf(delimiter)!==-1){return'';}
var input_char='';var content='';var min_index=0;var space=true;do{if(this.pos>=this.input.length){return content;}
input_char=this.input.charAt(this.pos);this.pos++;if(this.Utils.in_array(input_char,this.Utils.whitespace)){if(!space){this.line_char_count--;continue;}
if(input_char==='\n'||input_char==='\r'){content+='\n';this.line_char_count=0;continue;}}
content+=input_char;this.line_char_count++;space=true;if(indent_handlebars&&input_char==='{'&&content.length&&content[content.length-2]==='{'){content+=this.get_unformatted('}}');min_index=content.length;}}while(content.toLowerCase().indexOf(delimiter,min_index)===-1);return content;};this.get_token=function(){ var token;if(this.last_token==='TK_TAG_SCRIPT'||this.last_token==='TK_TAG_STYLE'){ var type=this.last_token.substr(7);token=this.get_contents_to(type);if(typeof token!=='string'){return token;}
return[token,'TK_'+type];}
if(this.current_mode==='CONTENT'){token=this.get_content();if(typeof token!=='string'){return token;}else{return[token,'TK_CONTENT'];}}
if(this.current_mode==='TAG'){token=this.get_tag();if(typeof token!=='string'){return token;}else{var tag_name_type='TK_TAG_'+this.tag_type;return[token,tag_name_type];}}};this.get_full_indent=function(level){level=this.indent_level+level||0;if(level<1){return'';}
return Array(level+1).join(this.indent_string);};this.is_unformatted=function(tag_check,unformatted){if(!this.Utils.in_array(tag_check,unformatted)){return false;}
if(tag_check.toLowerCase()!=='a'||!this.Utils.in_array('a',unformatted)){return true;}

var next_tag=this.get_tag(true);var tag=(next_tag||"").match(/^\s*<\s*\/?([a-z]*)\s*[^>]*>\s*$/);

 if(!tag||this.Utils.in_array(tag,unformatted)){return true;}else{return false;}};this.printer=function(js_source,indent_character,indent_size,wrap_line_length,brace_style){ this.input=js_source||''; this.output=[];this.indent_character=indent_character;this.indent_string='';this.indent_size=indent_size;this.brace_style=brace_style;this.indent_level=0;this.wrap_line_length=wrap_line_length;this.line_char_count=0; for(var i=0;i<this.indent_size;i++){this.indent_string+=this.indent_character;}
this.print_newline=function(force,arr){this.line_char_count=0;if(!arr||!arr.length){return;}
if(force||(arr[arr.length-1]!=='\n')){ arr.push('\n');}};this.print_indentation=function(arr){for(var i=0;i<this.indent_level;i++){arr.push(this.indent_string);this.line_char_count+=this.indent_string.length;}};this.print_token=function(text){if(text||text!==''){if(this.output.length&&this.output[this.output.length-1]==='\n'){this.print_indentation(this.output);text=ltrim(text);}}
this.print_token_raw(text);};this.print_token_raw=function(text){if(text&&text!==''){if(text.length>1&&text[text.length-1]==='\n'){ this.output.push(text.slice(0,-1));this.print_newline(false,this.output);}else{this.output.push(text);}}
for(var n=0;n<this.newlines;n++){this.print_newline(n>0,this.output);}
this.newlines=0;};this.indent=function(){this.indent_level++;};this.unindent=function(){if(this.indent_level>0){this.indent_level--;}};};return this;}
multi_parser=new Parser(); multi_parser.printer(html_source,indent_character,indent_size,wrap_line_length,brace_style); while(true){var t=multi_parser.get_token();multi_parser.token_text=t[0];multi_parser.token_type=t[1];if(multi_parser.token_type==='TK_EOF'){break;}
switch(multi_parser.token_type){case'TK_TAG_START':multi_parser.print_newline(false,multi_parser.output);multi_parser.print_token(multi_parser.token_text);if(multi_parser.indent_content){multi_parser.indent();multi_parser.indent_content=false;}
multi_parser.current_mode='CONTENT';break;case'TK_TAG_STYLE':case'TK_TAG_SCRIPT':multi_parser.print_newline(false,multi_parser.output);multi_parser.print_token(multi_parser.token_text);multi_parser.current_mode='CONTENT';break;case'TK_TAG_END': if(multi_parser.last_token==='TK_CONTENT'&&multi_parser.last_text===''){var tag_name=multi_parser.token_text.match(/\w+/)[0];var tag_extracted_from_last_output=null;if(multi_parser.output.length){tag_extracted_from_last_output=multi_parser.output[multi_parser.output.length-1].match(/(?:<|{{#)\s*(\w+)/);}
if(tag_extracted_from_last_output===null||tag_extracted_from_last_output[1]!==tag_name){multi_parser.print_newline(false,multi_parser.output);}}
multi_parser.print_token(multi_parser.token_text);multi_parser.current_mode='CONTENT';break;case'TK_TAG_SINGLE':var tag_check=multi_parser.token_text.match(/^\s*<([a-z]+)/i);if(!tag_check||!multi_parser.Utils.in_array(tag_check[1],unformatted)){multi_parser.print_newline(false,multi_parser.output);}
multi_parser.print_token(multi_parser.token_text);multi_parser.current_mode='CONTENT';break;case'TK_TAG_HANDLEBARS_ELSE':multi_parser.print_token(multi_parser.token_text);if(multi_parser.indent_content){multi_parser.indent();multi_parser.indent_content=false;}
multi_parser.current_mode='CONTENT';break;case'TK_CONTENT':multi_parser.print_token(multi_parser.token_text);multi_parser.current_mode='TAG';break;case'TK_STYLE':case'TK_SCRIPT':if(multi_parser.token_text!==''){multi_parser.print_newline(false,multi_parser.output);var text=multi_parser.token_text,_beautifier,script_indent_level=1;if(multi_parser.token_type==='TK_SCRIPT'){_beautifier=typeof js_beautify==='function'&&js_beautify;}else if(multi_parser.token_type==='TK_STYLE'){_beautifier=typeof css_beautify==='function'&&css_beautify;}
if(options.indent_scripts==="keep"){script_indent_level=0;}else if(options.indent_scripts==="separate"){script_indent_level=-multi_parser.indent_level;}
var indentation=multi_parser.get_full_indent(script_indent_level);if(_beautifier){ text=_beautifier(text.replace(/^\s*/,indentation),options);}else{ var white=text.match(/^\s*/)[0];var _level=white.match(/[^\n\r]*$/)[0].split(multi_parser.indent_string).length-1;var reindent=multi_parser.get_full_indent(script_indent_level-_level);text=text.replace(/^\s*/,indentation).replace(/\r\n|\r|\n/g,'\n'+reindent).replace(/\s+$/,'');}
if(text){multi_parser.print_token_raw(indentation+trim(text));multi_parser.print_newline(false,multi_parser.output);}}
multi_parser.current_mode='TAG';break;}
multi_parser.last_token=multi_parser.token_type;multi_parser.last_text=multi_parser.token_text;}
return multi_parser.output.join('');}
var beautify=require('devtools/jsbeautify');exports.htmlBeautify=function(html_source,options){return style_html(html_source,options,beautify.js,beautify.css);};}());