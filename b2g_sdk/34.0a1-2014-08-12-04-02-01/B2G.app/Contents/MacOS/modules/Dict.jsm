"use strict";this.EXPORTED_SYMBOLS=["Dict"];function convert(aKey){return":"+aKey;}
function unconvert(aProp){return aProp.substr(1);}
this.Dict=function Dict(aInitial){if(aInitial===undefined)
aInitial={};if(typeof aInitial=="string")
aInitial=JSON.parse(aInitial);var items={},count=0;for(var[key,val]in Iterator(aInitial)){items[convert(key)]=val;count++;}
this._state={count:count,items:items};return Object.freeze(this);}
Dict.prototype=Object.freeze({get count(){return this._state.count;},get:function Dict_get(aKey,aDefault){var prop=convert(aKey);var items=this._state.items;return items.hasOwnProperty(prop)?items[prop]:aDefault;},set:function Dict_set(aKey,aValue){var prop=convert(aKey);var items=this._state.items;if(!items.hasOwnProperty(prop))
this._state.count++;items[prop]=aValue;},setAsLazyGetter:function Dict_setAsLazyGetter(aKey,aThunk){let prop=convert(aKey);let items=this._state.items;if(!items.hasOwnProperty(prop))
this._state.count++;Object.defineProperty(items,prop,{get:function(){delete items[prop];return items[prop]=aThunk();},configurable:true,enumerable:true});},isLazyGetter:function Dict_isLazyGetter(aKey){let descriptor=Object.getOwnPropertyDescriptor(this._state.items,convert(aKey));return(descriptor&&descriptor.get!=null);},has:function Dict_has(aKey){return(this._state.items.hasOwnProperty(convert(aKey)));},del:function Dict_del(aKey){var prop=convert(aKey);if(this._state.items.hasOwnProperty(prop)){delete this._state.items[prop];this._state.count--;return true;}
return false;},copy:function Dict_copy(){var newItems={};for(var[key,val]in this.items)
newItems[key]=val;return new Dict(newItems);},listkeys:function Dict_listkeys(){return[unconvert(k)for(k in this._state.items)];},listvalues:function Dict_listvalues(){var items=this._state.items;return[items[k]for(k in items)];},listitems:function Dict_listitems(){var items=this._state.items;return[[unconvert(k),items[k]]for(k in items)];},get keys(){
 var items=this._state.items;return(unconvert(k)for(k in items));},get values(){
 var items=this._state.items;return(items[k]for(k in items));},get items(){
 var items=this._state.items;return([unconvert(k),items[k]]for(k in items));},toString:function Dict_toString(){return"{"+
[(key+": "+val)for([key,val]in this.items)].join(", ")+"}";},toJSON:function Dict_toJSON(){let obj={};for(let[key,item]of Iterator(this._state.items)){obj[unconvert(key)]=item;}
return JSON.stringify(obj);},});