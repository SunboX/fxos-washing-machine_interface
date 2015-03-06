'use strict';module.metadata={'stability':'experimental'};const{Cu}=require('chrome');const{isNumber}=require('sdk/lang/type');const{TextEncoder,TextDecoder}=Cu.import('resource://gre/modules/commonjs/toolkit/loader.js',{});exports.TextEncoder=TextEncoder;exports.TextDecoder=TextDecoder;const parents=new WeakMap();const views=new WeakMap();function Buffer(subject,encoding){ if(!(this instanceof Buffer))
return new Buffer(subject,encoding,arguments[2]);var type=typeof(subject);switch(type){case'number':try{let buffer=new Uint8Array(subject>0?Math.floor(subject):0);return buffer;}catch(e){if(/size and count too large/.test(e.message)||/invalid arguments/.test(e.message))
throw new RangeError('Could not instantiate buffer: size of buffer may be too large');else
throw new Error('Could not instantiate buffer');}
break;case'string':
encoding=encoding||'utf8';return new Uint8Array(new TextEncoder(encoding).encode(subject).buffer);case'object':



if(arguments.length===3)
return new Uint8Array(subject,encoding,arguments[2]);else
return new Uint8Array(subject);default:throw new TypeError('must start with number, buffer, array or string');}}
exports.Buffer=Buffer;Buffer.isBuffer=value=>value instanceof Buffer

Buffer.isEncoding=function(encoding){if(!encoding)return false;try{new TextDecoder(encoding);}catch(e){return false;}
return true;}

Buffer.byteLength=(value,encoding='utf8')=>new TextEncoder(encoding).encode(value).byteLength

Buffer.concat=function(list,length){if(!Array.isArray(list))
throw new TypeError('Usage: Buffer.concat(list[, length])');if(typeof length==='undefined'){length=0;for(var i=0;i<list.length;i++)
length+=list[i].length;}else{length=~~length;}
if(length<0)
length=0;if(list.length===0)
return new Buffer(0);else if(list.length===1)
return list[0];if(length<0)
throw new RangeError('length is not a positive number');var buffer=new Buffer(length);var pos=0;for(var i=0;i<list.length;i++){var buf=list[i];buf.copy(buffer,pos);pos+=buf.length;}
return buffer;};


Buffer.prototype=Uint8Array.prototype;Object.defineProperties(Buffer.prototype,{parent:{get:function(){return parents.get(this,undefined);}},view:{get:function(){let view=views.get(this,undefined);if(view)return view;view=new DataView(this.buffer);views.set(this,view);return view;}},toString:{value:function(encoding,start,end){encoding=!!encoding?(encoding+'').toLowerCase():'utf8';start=Math.max(0,~~start);end=Math.min(this.length,end===void(0)?this.length:~~end);return new TextDecoder(encoding).decode(this.subarray(start,end));}},toJSON:{value:function(){return{type:'Buffer',data:Array.slice(this,0)};}},get:{value:function(offset){return this[offset];}},set:{value:function(offset,value){this[offset]=value;}},copy:{value:function(target,offset,start,end){let length=this.length;let targetLength=target.length;offset=isNumber(offset)?offset:0;start=isNumber(start)?start:0;if(start<0)
throw new RangeError('sourceStart is outside of valid range');if(end<0)
throw new RangeError('sourceEnd is outside of valid range'); if(start>end||offset>targetLength)
return 0;
 if(end-start>targetLength-offset||end==null){let remainingTarget=targetLength-offset;let remainingSource=length-start;if(remainingSource<=remainingTarget)
end=length;else
end=start+remainingTarget;}
Uint8Array.set(target,this.subarray(start,end),offset);return end-start;}},slice:{value:function(start,end){let length=this.length;start=~~start;end=end!=null?end:length;if(start<0){start+=length;if(start<0)start=0;}else if(start>length)
start=length;if(end<0){end+=length;if(end<0)end=0;}else if(end>length)
end=length;if(end<start)
end=start;
 let buffer=new Buffer(this.buffer,start,end-start);

 if(buffer.length>0)
parents.set(buffer,this.parent||this);return buffer;}},write:{value:function(string,offset,length,encoding='utf8'){if(typeof(offset)==='string'&&Number.isNaN(parseInt(offset))){([offset,length,encoding])=[0,null,offset];}
else if(typeof(length)==='string')
([length,encoding])=[null,length];if(offset<0||offset>this.length)
throw new RangeError('offset is outside of valid range');offset=~~offset;
 if(length==null||length+offset>this.length)
length=this.length-offset;let buffer=new TextEncoder(encoding).encode(string);let result=Math.min(buffer.length,length);if(buffer.length!==length)
buffer=buffer.subarray(0,length);Uint8Array.set(this,buffer,offset);return result;}},fill:{value:function fill(value,start,end){let length=this.length;value=value||0;start=start||0;end=end||length;if(typeof(value)==='string')
value=value.charCodeAt(0);if(typeof(value)!=='number'||isNaN(value))
throw TypeError('value is not a number');if(end<start)
throw new RangeError('end < start'); if(end===start)
return 0;if(length==0)
return 0;if(start<0||start>=length)
throw RangeError('start out of bounds');if(end<0||end>length)
throw RangeError('end out of bounds');let index=start;while(index<end)this[index++]=value;}}});
[['readUInt16LE','getUint16',true],['readUInt16BE','getUint16',false],['readInt16LE','getInt16',true],['readInt16BE','getInt16',false],['readUInt32LE','getUint32',true],['readUInt32BE','getUint32',false],['readInt32LE','getInt32',true],['readInt32BE','getInt32',false],['readFloatLE','getFloat32',true],['readFloatBE','getFloat32',false],['readDoubleLE','getFloat64',true],['readDoubleBE','getFloat64',false],['readUInt8','getUint8'],['readInt8','getInt8']].forEach(([alias,name,littleEndian])=>{Object.defineProperty(Buffer.prototype,alias,{value:function(offset)this.view[name](offset,littleEndian)});});[['writeUInt16LE','setUint16',true],['writeUInt16BE','setUint16',false],['writeInt16LE','setInt16',true],['writeInt16BE','setInt16',false],['writeUInt32LE','setUint32',true],['writeUInt32BE','setUint32',false],['writeInt32LE','setInt32',true],['writeInt32BE','setInt32',false],['writeFloatLE','setFloat32',true],['writeFloatBE','setFloat32',false],['writeDoubleLE','setFloat64',true],['writeDoubleBE','setFloat64',false],['writeUInt8','setUint8'],['writeInt8','setInt8']].forEach(([alias,name,littleEndian])=>{Object.defineProperty(Buffer.prototype,alias,{value:function(value,offset)this.view[name](offset,value,littleEndian)});});