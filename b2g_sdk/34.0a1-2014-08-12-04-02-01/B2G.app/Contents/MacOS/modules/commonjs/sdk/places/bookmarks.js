"use strict";module.metadata={"stability":"unstable","engines":{"Firefox":"*"}};require('./host/host-bookmarks');require('./host/host-tags');require('./host/host-query');const{Cc,Ci}=require('chrome');const{Class}=require('../core/heritage');const{send}=require('../addon/events');const{defer,reject,all,resolve,promised}=require('../core/promise');const{EventTarget}=require('../event/target');const{emit}=require('../event/core');const{identity,defer:async}=require('../lang/functional');const{extend,merge}=require('../util/object');const{fromIterator}=require('../util/array');const{constructTree,fetchItem,createQuery,isRootGroup,createQueryOptions}=require('./utils');const{bookmarkContract,groupContract,separatorContract}=require('./contract');const bmsrv=Cc["@mozilla.org/browser/nav-bookmarks-service;1"].getService(Ci.nsINavBookmarksService);const itemMap=new WeakMap();const BOOKMARK_QUERY=1;const Bookmark=Class({extends:[bookmarkContract.properties(identity)],initialize:function initialize(options){merge(this,bookmarkContract(extend(defaults,options)));},type:'bookmark',toString:function()'[object Bookmark]'});exports.Bookmark=Bookmark;const Group=Class({extends:[groupContract.properties(identity)],initialize:function initialize(options){ if(isRootGroup(options))
merge(this,options);else
merge(this,groupContract(extend(defaults,options)));},type:'group',toString:function()'[object Group]'});exports.Group=Group;const Separator=Class({extends:[separatorContract.properties(identity)],initialize:function initialize(options){merge(this,separatorContract(extend(defaults,options)));},type:'separator',toString:function()'[object Separator]'});exports.Separator=Separator;function save(items,options){items=[].concat(items);options=options||{};let emitter=EventTarget();let results=[];let errors=[];let root=constructTree(items);let cache=new Map();let isExplicitSave=item=>!!~items.indexOf(item);




 async(()=>root.walk(preCommitItem).then(commitComplete))();function preCommitItem({value:item}){
 if(item===null|| isRootGroup(item)||(getId(item)&&!isExplicitSave(item)))
return;return promised(validate)(item).then(()=>commitItem(item,options)).then(data=>construct(data,cache)).then(savedItem=>{
 if(!getId(item))
saveId(item,savedItem.id);
 emit(emitter,'data',savedItem,item); if(isExplicitSave(item))
results[items.indexOf(item)]=savedItem;},reason=>{ reason=reason+'';
 emit(emitter,'error',reason+'',item); results[items.indexOf(item)]=item;errors.push(reason);});}
 
function commitComplete(){emit(emitter,'end',results);}
return emitter;}
exports.save=save;function search(queries,options){queries=[].concat(queries);let emitter=EventTarget();let cache=new Map();let queryObjs=queries.map(createQuery.bind(null,BOOKMARK_QUERY));let optionsObj=createQueryOptions(BOOKMARK_QUERY,options); async(()=>{send('sdk-places-query',{queries:queryObjs,options:optionsObj}).then(handleQueryResponse);})();function handleQueryResponse(data){let deferreds=data.map(item=>{return construct(item,cache).then(bookmark=>{emit(emitter,'data',bookmark);return bookmark;},reason=>{emit(emitter,'error',reason);errors.push(reason);});});all(deferreds).then(data=>{emit(emitter,'end',data);},()=>emit(emitter,'end',[]));}
return emitter;}
exports.search=search;function remove(items){return[].concat(items).map(item=>{item.remove=true;return item;});}
exports.remove=remove;function commitItem(item,options){ let id=getId(item);let data=normalize(item);let promise;data.id=id;if(!id){promise=send('sdk-places-bookmarks-create',data);}else if(item.remove){promise=send('sdk-places-bookmarks-remove',{id:id});}else{promise=send('sdk-places-bookmarks-last-updated',{id:id}).then(function(updated){

 if(updated!==item.updated&&options.resolve)
return fetchItem(id).then(options.resolve.bind(null,data));else
return data;}).then(send.bind(null,'sdk-places-bookmarks-save'));}
return promise;}
function normalize(item){let data=merge({},item);delete data.type;data.type=item.type;data.tags=[];if(item.tags){data.tags=fromIterator(item.tags);}
data.group=getId(data.group)||exports.UNSORTED.id;return data;}
function construct(object,cache,forced){let item=instantiate(object);let deferred=defer(); if(!item)
return resolve(null);

 if(cache.has(item.id)&&!forced)
return cache.get(item.id).promise;else if(cache.has(item.id))
deferred=cache.get(item.id);else
cache.set(item.id,deferred);
 if(item.group&&cache.has(item.group)){cache.get(item.group).promise.then(group=>{item.group=group;deferred.resolve(item);});
}else if(rootGroups.get(item.group)){item.group=rootGroups.get(item.group);deferred.resolve(item);}else{cache.set(item.group,defer());fetchItem(item.group).then(group=>{return construct(group,cache,true);}).then(group=>{item.group=group;deferred.resolve(item);},deferred.reject);}
return deferred.promise;}
function instantiate(object){if(object.type==='bookmark')
return Bookmark(object);if(object.type==='group')
return Group(object);if(object.type==='separator')
return Separator(object);return null;}
function validate(object){if(!isDuckType(object))return true;let contract=object.type==='bookmark'?bookmarkContract:object.type==='group'?groupContract:object.type==='separator'?separatorContract:null;if(!contract){throw Error('No type specified');} 
let withDefaults=Object.keys(defaults).reduce((obj,prop)=>{if(obj[prop]==null)obj[prop]=defaults[prop];return obj;},extend(object));contract(withDefaults);}
function isDuckType(item){return!(item instanceof Bookmark)&&!(item instanceof Group)&&!(item instanceof Separator);}
function saveId(unsaved,id){itemMap.set(unsaved,id);}
function getId(item){return typeof item==='number'?item:item?item.id||itemMap.get(item):null;}
let defaultGroupMap={MENU:bmsrv.bookmarksMenuFolder,TOOLBAR:bmsrv.toolbarFolder,UNSORTED:bmsrv.unfiledBookmarksFolder};let rootGroups=new Map();for(let i in defaultGroupMap){let group=Object.freeze(Group({title:i,id:defaultGroupMap[i]}));rootGroups.set(defaultGroupMap[i],group);exports[i]=group;}
let defaults={group:exports.UNSORTED,index:-1};