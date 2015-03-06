'use strict';var l10n=require('../util/l10n');var cli=require('../cli');var context={item:'command',name:'context',description:l10n.lookup('contextDesc'),manual:l10n.lookup('contextManual'),params:[{name:'prefix',type:'command',description:l10n.lookup('contextPrefixDesc'),defaultValue:null}],returnType:'string',


 noRemote:true,exec:function echo(args,context){var requisition=cli.getMapping(context).requisition;if(args.prefix==null){requisition.prefix=null;return l10n.lookup('contextEmptyReply');}
if(args.prefix.exec!=null){throw new Error(l10n.lookupFormat('contextNotParentError',[args.prefix.name]));}
requisition.prefix=args.prefix.name;return l10n.lookupFormat('contextReply',[args.prefix.name]);}};exports.items=[context];