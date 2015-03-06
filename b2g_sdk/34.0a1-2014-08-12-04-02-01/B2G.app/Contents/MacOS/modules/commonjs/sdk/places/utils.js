'use strict';module.metadata={"stability":"experimental","engines":{"Firefox":"*"}};const{Cc,Ci}=require('chrome');const{Class}=require('../core/heritage');const{method}=require('../lang/functional');const{defer,promised,all}=require('../core/promise');const{send}=require('../addon/events');const{EventTarget}=require('../event/target');const{merge}=require('../util/object');const bmsrv=Cc["@mozilla.org/browser/nav-bookmarks-service;1"].getService(Ci.nsINavBookmarksService);let TreeNode=Class({initialize:function(value){this.value=value;this.children=[];},add:function(values){[].concat(values).forEach(value=>{this.children.push(value instanceof TreeNode?value:TreeNode(value));});},get length(){let count=0;this.walk(()=>count++); return--count;},get:method(get),walk:method(walk),toString:function()'[object TreeNode]'});exports.TreeNode=TreeNode;function walk(curr,fn){return promised(fn)(curr).then(val=>{return all(curr.children.map(child=>walk(child,fn)));});}
function get(node,value){if(node.value===value)return node;for(let child of node.children){let found=get(child,value);if(found)return found;}
return null;}
function constructTree(items){let root=TreeNode(null);items.forEach(treeify.bind(null,root));function treeify(root,item){ let node=root.get(item);if(node)return node;node=TreeNode(item);let parentNode=item.group?treeify(root,item.group):root;parentNode.add(node);return node;}
return root;}
exports.constructTree=constructTree;function fetchItem(item)
send('sdk-places-bookmarks-get',{id:item.id||item})
exports.fetchItem=fetchItem;function isRootGroup(id){id=id&&id.id;return~[bmsrv.bookmarksMenuFolder,bmsrv.toolbarFolder,bmsrv.unfiledBookmarksFolder].indexOf(id);}
exports.isRootGroup=isRootGroup;function urlQueryParser(query,url){if(!url)return;if(/^https?:\/\//.test(url)){query.uri=url.charAt(url.length-1)==='/'?url:url+'/';if(/\*$/.test(url)){query.uri=url.replace(/\*$/,'');query.uriIsPrefix=true;}}else{if(/^\*/.test(url)){query.domain=url.replace(/^\*\./,'');query.domainIsHost=false;}else{query.domain=url;query.domainIsHost=true;}}}
exports.urlQueryParser=urlQueryParser;function promisedEmitter(emitter){let{promise,resolve,reject}=defer();let errors=[];emitter.on('error',error=>errors.push(error));emitter.on('end',(items)=>{if(errors.length)reject(errors[0]);else resolve(items);});return promise;}
exports.promisedEmitter=promisedEmitter;function createQuery(type,query){query=query||{};let qObj={searchTerms:query.query};urlQueryParser(qObj,query.url); if(type===0){ qObj.beginTime=(query.from||0)*1000;qObj.endTime=(query.to||new Date())*1000; qObj.beginTimeReference=0;qObj.endTimeReference=0;} 
else if(type===1){qObj.tags=query.tags;qObj.folder=query.group&&query.group.id;}
else if(type===2){}
return qObj;}
exports.createQuery=createQuery;const SORT_MAP={title:1,date:3, url:5,visitCount:7,
dateAdded:11, lastModified:13
};function createQueryOptions(type,options){options=options||{};let oObj={};oObj.sortingMode=SORT_MAP[options.sort]||0;if(options.descending&&options.sort)
oObj.sortingMode++; if(type===0&&(options.sort==='dateAdded'||options.sort==='lastModified'))
oObj.sortingMode=0;oObj.maxResults=typeof options.count==='number'?options.count:0;oObj.queryType=type;return oObj;}
exports.createQueryOptions=createQueryOptions;function mapBookmarkItemType(type){if(typeof type==='number'){if(bmsrv.TYPE_BOOKMARK===type)return'bookmark';if(bmsrv.TYPE_FOLDER===type)return'group';if(bmsrv.TYPE_SEPARATOR===type)return'separator';}else{if('bookmark'===type)return bmsrv.TYPE_BOOKMARK;if('group'===type)return bmsrv.TYPE_FOLDER;if('separator'===type)return bmsrv.TYPE_SEPARATOR;}}
exports.mapBookmarkItemType=mapBookmarkItemType;