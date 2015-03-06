"use strict";this.EXPORTED_SYMBOLS=["PropertyListUtils"];const Cc=Components.classes;const Ci=Components.interfaces;const Cu=Components.utils;Cu.import("resource://gre/modules/XPCOMUtils.jsm");XPCOMUtils.defineLazyModuleGetter(this,"Dict","resource://gre/modules/Dict.jsm");XPCOMUtils.defineLazyModuleGetter(this,"ctypes","resource://gre/modules/ctypes.jsm");XPCOMUtils.defineLazyModuleGetter(this,"Services","resource://gre/modules/Services.jsm");this.PropertyListUtils=Object.freeze({read:function PLU_read(aFile,aCallback){if(!(aFile instanceof Ci.nsILocalFile||aFile instanceof Ci.nsIDOMFile))
throw new Error("aFile is not a file object");if(typeof(aCallback)!="function")
throw new Error("Invalid value for aCallback");
Services.tm.mainThread.dispatch(function(){let file=aFile;try{if(file instanceof Ci.nsILocalFile){if(!file.exists())
throw new Error("The file pointed by aFile does not exist");file=new File(file);}
let fileReader=Cc["@mozilla.org/files/filereader;1"].createInstance(Ci.nsIDOMFileReader);let onLoadEnd=function(){let root=null;try{fileReader.removeEventListener("loadend",onLoadEnd,false);if(fileReader.readyState!=fileReader.DONE)
throw new Error("Could not read file contents: "+fileReader.error);root=this._readFromArrayBufferSync(fileReader.result);}
finally{aCallback(root);}}.bind(this);fileReader.addEventListener("loadend",onLoadEnd,false);fileReader.readAsArrayBuffer(file);}
catch(ex){aCallback(null);throw ex;}}.bind(this),Ci.nsIThread.DISPATCH_NORMAL);},_readFromArrayBufferSync:function PLU__readFromArrayBufferSync(aBuffer){if(BinaryPropertyListReader.prototype.canProcess(aBuffer))
return new BinaryPropertyListReader(aBuffer).root;let domParser=Cc["@mozilla.org/xmlextras/domparser;1"].createInstance(Ci.nsIDOMParser);let bytesView=new Uint8Array(aBuffer);try{let doc=domParser.parseFromBuffer(bytesView,bytesView.length,"application/xml");return new XMLPropertyListReader(doc).root;}
catch(ex){throw new Error("aBuffer cannot be parsed as a DOM document: "+ex);}
return null;},TYPE_PRIMITIVE:0,TYPE_DATE:1,TYPE_UINT8_ARRAY:2,TYPE_ARRAY:3,TYPE_DICTIONARY:4,TYPE_INT64:5,getObjectType:function PLU_getObjectType(aObject){if(aObject===null||typeof(aObject)!="object")
return this.TYPE_PRIMITIVE;


let global=Cu.getGlobalForObject(aObject);if(global.Dict&&aObject instanceof global.Dict)
return this.TYPE_DICTIONARY;if(Array.isArray(aObject))
return this.TYPE_ARRAY;if(aObject instanceof global.Date)
return this.TYPE_DATE;if(aObject instanceof global.Uint8Array)
return this.TYPE_UINT8_ARRAY;if(aObject instanceof global.String&&"__INT_64_WRAPPER__"in aObject)
return this.TYPE_INT64;throw new Error("aObject is not as a property list object.");},wrapInt64:function PLU_wrapInt64(aPrimitive){if(typeof(aPrimitive)!="string"&&typeof(aPrimitive)!="number")
throw new Error("aPrimitive should be a string primitive");let wrapped=new String(aPrimitive);Object.defineProperty(wrapped,"__INT_64_WRAPPER__",{value:true});return wrapped;}});function BinaryPropertyListReader(aBuffer){this._dataView=new DataView(aBuffer);const JS_MAX_INT=Math.pow(2,53);this._JS_MAX_INT_SIGNED=ctypes.Int64(JS_MAX_INT);this._JS_MAX_INT_UNSIGNED=ctypes.UInt64(JS_MAX_INT);this._JS_MIN_INT=ctypes.Int64(-JS_MAX_INT);try{this._readTrailerInfo();this._readObjectsOffsets();}
catch(ex){throw new Error("Could not read aBuffer as a binary property list");}
this._objects=[];}
BinaryPropertyListReader.prototype={canProcess:function BPLR_canProcess(aBuffer)
[String.fromCharCode(c)for each(c in new Uint8Array(aBuffer,0,8))].join("")=="bplist00",get root()this._readObject(this._rootObjectIndex),_readTrailerInfo:function BPLR__readTrailer(){ let trailerOffset=this._dataView.byteLength-26;[this._offsetTableIntegerSize,this._objectRefSize]=this._readUnsignedInts(trailerOffset,1,2);[this._numberOfObjects,this._rootObjectIndex,this._offsetTableOffset]=this._readUnsignedInts(trailerOffset+2,8,3);},_readObjectsOffsets:function BPLR__readObjectsOffsets(){this._offsetTable=this._readUnsignedInts(this._offsetTableOffset,this._offsetTableIntegerSize,this._numberOfObjects);},_readSignedInt64:function BPLR__readSignedInt64(aByteOffset){let lo=this._dataView.getUint32(aByteOffset+4);let hi=this._dataView.getInt32(aByteOffset);let int64=ctypes.Int64.join(hi,lo);if(ctypes.Int64.compare(int64,this._JS_MAX_INT_SIGNED)==1||ctypes.Int64.compare(int64,this._JS_MIN_INT)==-1)
return PropertyListUtils.wrapInt64(int64.toString());return parseInt(int64.toString(),10);},_readReal:function BPLR__readReal(aByteOffset,aRealSize){if(aRealSize==4)
return this._dataView.getFloat32(aByteOffset);if(aRealSize==8)
return this._dataView.getFloat64(aByteOffset);throw new Error("Unsupported real size: "+aRealSize);},OBJECT_TYPE_BITS:{SIMPLE:parseInt("0000",2),INTEGER:parseInt("0001",2),REAL:parseInt("0010",2),DATE:parseInt("0011",2),DATA:parseInt("0100",2),ASCII_STRING:parseInt("0101",2),UNICODE_STRING:parseInt("0110",2),UID:parseInt("1000",2),ARRAY:parseInt("1010",2),SET:parseInt("1100",2),DICTIONARY:parseInt("1101",2)},ADDITIONAL_INFO_BITS:{ NULL:parseInt("0000",2),FALSE:parseInt("1000",2),TRUE:parseInt("1001",2),FILL_BYTE:parseInt("1111",2), DATE:parseInt("0011",2),LENGTH_INT_SIZE_FOLLOWS:parseInt("1111",2)},_readObjectDescriptor:function BPLR__readObjectDescriptor(aByteOffset){
let byte=this._readUnsignedInts(aByteOffset,1,1)[0];return[(byte&0xF0)>>4,byte&0x0F];},_readDate:function BPLR__readDate(aByteOffset){let date=new Date("1 January 2001, GMT");date.setMilliseconds(this._readReal(aByteOffset,8)*1000);return date;},_readString:function BPLR__readString(aByteOffset,aNumberOfChars,aUnicode){let codes=this._readUnsignedInts(aByteOffset,aUnicode?2:1,aNumberOfChars);return[String.fromCharCode(c)for each(c in codes)].join("");},_readUnsignedInts:function BPLR__readUnsignedInts(aByteOffset,aIntSize,aLength,aBigIntAllowed){let uints=[];for(let offset=aByteOffset;offset<aByteOffset+aIntSize*aLength;offset+=aIntSize){if(aIntSize==1){uints.push(this._dataView.getUint8(offset));}
else if(aIntSize==2){uints.push(this._dataView.getUint16(offset));}
else if(aIntSize==3){let int24=Uint8Array(4);int24[3]=0;int24[2]=this._dataView.getUint8(offset);int24[1]=this._dataView.getUint8(offset+1);int24[0]=this._dataView.getUint8(offset+2);uints.push(Uint32Array(int24.buffer)[0]);}
else if(aIntSize==4){uints.push(this._dataView.getUint32(offset));}
else if(aIntSize==8){let lo=this._dataView.getUint32(offset+4);let hi=this._dataView.getUint32(offset);let uint64=ctypes.UInt64.join(hi,lo);if(ctypes.UInt64.compare(uint64,this._JS_MAX_INT_UNSIGNED)==1){if(aBigIntAllowed===true)
uints.push(PropertyListUtils.wrapInt64(uint64.toString()));else
throw new Error("Integer too big to be read as float 64");}
else{uints.push(parseInt(uint64,10));}}
else{throw new Error("Unsupported size: "+aIntSize);}}
return uints;},_readDataOffsetAndCount:function BPLR__readDataOffsetAndCount(aObjectOffset){


let[,maybeLength]=this._readObjectDescriptor(aObjectOffset);if(maybeLength!=this.ADDITIONAL_INFO_BITS.LENGTH_INT_SIZE_FOLLOWS)
return[aObjectOffset+1,maybeLength];let[,intSizeInfo]=this._readObjectDescriptor(aObjectOffset+1);let intSize=Math.pow(2,intSizeInfo);let dataLength=this._readUnsignedInts(aObjectOffset+2,intSize,1)[0];return[aObjectOffset+2+intSize,dataLength];},_wrapArray:function BPLR__wrapArray(aObjectOffset,aNumberOfObjects){let refs=this._readUnsignedInts(aObjectOffset,this._objectRefSize,aNumberOfObjects);let array=new Array(aNumberOfObjects);let readObjectBound=this._readObject.bind(this);Array.prototype.forEach.call(refs,function(ref,objIndex){Object.defineProperty(array,objIndex,{get:function(){delete array[objIndex];return array[objIndex]=readObjectBound(ref);},configurable:true,enumerable:true});},this);return array;},_wrapDictionary:function(aObjectOffset,aNumberOfObjects){

let dict=new Dict();if(aNumberOfObjects==0)
return dict;let keyObjsRefs=this._readUnsignedInts(aObjectOffset,this._objectRefSize,aNumberOfObjects);let valObjsRefs=this._readUnsignedInts(aObjectOffset+aNumberOfObjects*this._objectRefSize,this._objectRefSize,aNumberOfObjects);for(let i=0;i<aNumberOfObjects;i++){let key=this._readObject(keyObjsRefs[i]);let readBound=this._readObject.bind(this,valObjsRefs[i]);dict.setAsLazyGetter(key,readBound);}
return dict;},_readObject:function BPLR__readObject(aObjectIndex){if(this._objects[aObjectIndex]!==undefined)
return this._objects[aObjectIndex];let objOffset=this._offsetTable[aObjectIndex];let[objType,additionalInfo]=this._readObjectDescriptor(objOffset);let value;switch(objType){case this.OBJECT_TYPE_BITS.SIMPLE:{switch(additionalInfo){case this.ADDITIONAL_INFO_BITS.NULL:value=null;break;case this.ADDITIONAL_INFO_BITS.FILL_BYTE:value=undefined;break;case this.ADDITIONAL_INFO_BITS.FALSE:value=false;break;case this.ADDITIONAL_INFO_BITS.TRUE:value=true;break;default:throw new Error("Unexpected value!");}
break;}
case this.OBJECT_TYPE_BITS.INTEGER:{let intSize=Math.pow(2,additionalInfo);
if(intSize==8)
value=this._readSignedInt64(objOffset+1);else
value=this._readUnsignedInts(objOffset+1,intSize,1,true)[0];break;}
case this.OBJECT_TYPE_BITS.REAL:{value=this._readReal(objOffset+1,Math.pow(2,additionalInfo));break;}
case this.OBJECT_TYPE_BITS.DATE:{if(additionalInfo!=this.ADDITIONAL_INFO_BITS.DATE)
throw new Error("Unexpected value");value=this._readDate(objOffset+1);break;}
case this.OBJECT_TYPE_BITS.DATA:{let[offset,bytesCount]=this._readDataOffsetAndCount(objOffset);value=new Uint8Array(this._readUnsignedInts(offset,1,bytesCount));break;}
case this.OBJECT_TYPE_BITS.ASCII_STRING:{let[offset,charsCount]=this._readDataOffsetAndCount(objOffset);value=this._readString(offset,charsCount,false);break;}
case this.OBJECT_TYPE_BITS.UNICODE_STRING:{let[offset,unicharsCount]=this._readDataOffsetAndCount(objOffset);value=this._readString(offset,unicharsCount,true);break;}
case this.OBJECT_TYPE_BITS.UID:{throw new Error("Keyed Archives are not supported");}
case this.OBJECT_TYPE_BITS.ARRAY:case this.OBJECT_TYPE_BITS.SET:{
let[offset,objectsCount]=this._readDataOffsetAndCount(objOffset);value=this._wrapArray(offset,objectsCount);break;}
case this.OBJECT_TYPE_BITS.DICTIONARY:{let[offset,objectsCount]=this._readDataOffsetAndCount(objOffset);value=this._wrapDictionary(offset,objectsCount);break;}
default:{throw new Error("Unknown object type: "+objType);}}
return this._objects[aObjectIndex]=value;}};function XMLPropertyListReader(aDOMDoc){let docElt=aDOMDoc.documentElement;if(!docElt||docElt.localName!="plist"||!docElt.firstElementChild)
throw new Error("aDoc is not a property list document");this._plistRootElement=docElt.firstElementChild;}
XMLPropertyListReader.prototype={get root()this._readObject(this._plistRootElement),_readObject:function XPLR__readObject(aDOMElt){switch(aDOMElt.localName){case"true":return true;case"false":return false;case"string":case"key":return aDOMElt.textContent;case"integer":return this._readInteger(aDOMElt);case"real":{let number=parseFloat(aDOMElt.textContent.trim());if(isNaN(number))
throw"Could not parse float value";return number;}
case"date":return new Date(aDOMElt.textContent);case"data":let base64str=aDOMElt.textContent.replace(/\s*/g,"");let decoded=atob(base64str);return new Uint8Array([decoded.charCodeAt(i)for(i in decoded)]);case"dict":return this._wrapDictionary(aDOMElt);case"array":return this._wrapArray(aDOMElt);default:throw new Error("Unexpected tagname");}},_readInteger:function XPLR__readInteger(aDOMElt){
let numberAsString=aDOMElt.textContent.toString();let parsedNumber=parseInt(numberAsString,10);if(isNaN(parsedNumber))
throw new Error("Could not parse integer value");if(parsedNumber.toString()==numberAsString)
return parsedNumber;return PropertyListUtils.wrapInt64(numberAsString);},_wrapDictionary:function XPLR__wrapDictionary(aDOMElt){if(aDOMElt.children.length%2!=0)
throw new Error("Invalid dictionary");let dict=new Dict();for(let i=0;i<aDOMElt.children.length;i+=2){let keyElem=aDOMElt.children[i];let valElem=aDOMElt.children[i+1];if(keyElem.localName!="key")
throw new Error("Invalid dictionary");let keyName=this._readObject(keyElem);let readBound=this._readObject.bind(this,valElem);dict.setAsLazyGetter(keyName,readBound);}
return dict;},_wrapArray:function XPLR__wrapArray(aDOMElt){let array=[];let readObjectBound=this._readObject.bind(this);Array.prototype.forEach.call(aDOMElt.children,function(elem,elemIndex){Object.defineProperty(array,elemIndex,{get:function(){delete array[elemIndex];return array[elemIndex]=readObjectBound(elem);},configurable:true,enumerable:true});});return array;}};