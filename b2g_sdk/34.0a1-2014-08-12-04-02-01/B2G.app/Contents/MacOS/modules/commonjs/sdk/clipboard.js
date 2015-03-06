"use strict";module.metadata={"stability":"stable","engines":{"Firefox":"*"}};const{Cc,Ci}=require("chrome");const{DataURL}=require("./url");const errors=require("./deprecated/errors");const apiUtils=require("./deprecated/api-utils");const kAllowableFlavors=["text/unicode","text/html","image/png"
];const kFlavorMap=[{short:"text",long:"text/unicode"},{short:"html",long:"text/html"},{short:"image",long:"image/png"}];let clipboardService=Cc["@mozilla.org/widget/clipboard;1"].getService(Ci.nsIClipboard);let clipboardHelper=Cc["@mozilla.org/widget/clipboardhelper;1"].getService(Ci.nsIClipboardHelper);let imageTools=Cc["@mozilla.org/image/tools;1"].getService(Ci.imgITools);exports.set=function(aData,aDataType){let options={data:aData,datatype:aDataType||"text"};
 if(aData&&(!aDataType||aDataType==="image")){try{let dataURL=new DataURL(aData);options.datatype=dataURL.mimeType;options.data=dataURL.data;}
catch(e){ if(e.name!=="URIError"){throw e;}}}
options=apiUtils.validateOptions(options,{data:{is:["string"]},datatype:{is:["string"]}});let flavor=fromJetpackFlavor(options.datatype);if(!flavor)
throw new Error("Invalid flavor for "+options.datatype); if(flavor=="text/unicode"){clipboardHelper.copyString(options.data);return true;}
 
var xferable=Cc["@mozilla.org/widget/transferable;1"].createInstance(Ci.nsITransferable);if(!xferable)
throw new Error("Couldn't set the clipboard due to an internal error "+"(couldn't create a Transferable object)."); if("init"in xferable)
xferable.init(null);switch(flavor){case"text/html": let(str=Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString))
{str.data=options.data;xferable.addDataFlavor(flavor);xferable.setTransferData(flavor,str,str.data.length*2);}
let(str=Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString),converter=Cc["@mozilla.org/feed-textconstruct;1"].createInstance(Ci.nsIFeedTextConstruct))
{converter.type="html";converter.text=options.data;str.data=converter.plainText();xferable.addDataFlavor("text/unicode");xferable.setTransferData("text/unicode",str,str.data.length*2);}
break;
 case"image/png":let image=options.data;let container={};try{let input=Cc["@mozilla.org/io/string-input-stream;1"].createInstance(Ci.nsIStringInputStream);input.setData(image,image.length);imageTools.decodeImageData(input,flavor,container);}
catch(e){throw new Error("Unable to decode data given in a valid image.");}

var imgPtr=Cc["@mozilla.org/supports-interface-pointer;1"].createInstance(Ci.nsISupportsInterfacePointer);imgPtr.data=container.value;xferable.addDataFlavor(flavor);xferable.setTransferData(flavor,imgPtr,-1);break;default:throw new Error("Unable to handle the flavor "+flavor+".");} 
try{clipboardService.setData(xferable,null,clipboardService.kGlobalClipboard);}catch(e){throw new Error("Couldn't set clipboard data due to an internal error: "+e);}
return true;};exports.get=function(aDataType){let options={datatype:aDataType}; if(!aDataType){if(~currentFlavors().indexOf("image"))
options.datatype="image";else
options.datatype="text";}
options=apiUtils.validateOptions(options,{datatype:{is:["string"]}});var xferable=Cc["@mozilla.org/widget/transferable;1"].createInstance(Ci.nsITransferable);if(!xferable)
throw new Error("Couldn't set the clipboard due to an internal error "+"(couldn't create a Transferable object)."); if("init"in xferable)
xferable.init(null);var flavor=fromJetpackFlavor(options.datatype);if(!flavor)
throw new Error("Getting the clipboard with the flavor '"+flavor+"' is not supported.");xferable.addDataFlavor(flavor);clipboardService.getData(xferable,clipboardService.kGlobalClipboard);var data={};var dataLen={};try{xferable.getTransferData(flavor,data,dataLen);}catch(e){return null;}
if(data.value===null)
return null;switch(flavor){case"text/unicode":case"text/html":data=data.value.QueryInterface(Ci.nsISupportsString).data;break;case"image/png":let dataURL=new DataURL();dataURL.mimeType=flavor;dataURL.base64=true;let image=data.value;

if(image instanceof Ci.nsISupportsInterfacePointer)
image=image.data;if(image instanceof Ci.imgIContainer)
image=imageTools.encodeImage(image,flavor);if(image instanceof Ci.nsIInputStream){let binaryStream=Cc["@mozilla.org/binaryinputstream;1"].createInstance(Ci.nsIBinaryInputStream);binaryStream.setInputStream(image);dataURL.data=binaryStream.readBytes(binaryStream.available());data=dataURL.toString();}
else
data=null;break;default:data=null;}
return data;};function currentFlavors(){

var currentFlavors=[];for(var flavor of kAllowableFlavors){var matches=clipboardService.hasDataMatchingFlavors([flavor],1,clipboardService.kGlobalClipboard);if(matches)
currentFlavors.push(toJetpackFlavor(flavor));}
return currentFlavors;};Object.defineProperty(exports,"currentFlavors",{get:currentFlavors});function toJetpackFlavor(aFlavor){for(let flavorMap of kFlavorMap)
if(flavorMap.long==aFlavor)
return flavorMap.short; return null;}
function fromJetpackFlavor(aJetpackFlavor){ for(let flavorMap of kFlavorMap)
if(flavorMap.short==aJetpackFlavor||flavorMap.long==aJetpackFlavor)
return flavorMap.long;return null;}