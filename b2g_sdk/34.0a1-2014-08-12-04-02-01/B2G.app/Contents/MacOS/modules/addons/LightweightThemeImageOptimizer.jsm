"use strict";this.EXPORTED_SYMBOLS=["LightweightThemeImageOptimizer"];const Cu=Components.utils;const Ci=Components.interfaces;Cu.import("resource://gre/modules/XPCOMUtils.jsm");XPCOMUtils.defineLazyModuleGetter(this,"Services","resource://gre/modules/Services.jsm");XPCOMUtils.defineLazyModuleGetter(this,"FileUtils","resource://gre/modules/FileUtils.jsm");const ORIGIN_TOP_RIGHT=1;const ORIGIN_BOTTOM_LEFT=2;this.LightweightThemeImageOptimizer={optimize:function LWTIO_optimize(aThemeData,aScreen){let data=Utils.createCopy(aThemeData);if(!data.headerURL){return data;}
data.headerURL=ImageCropper.getCroppedImageURL(data.headerURL,aScreen,ORIGIN_TOP_RIGHT);if(data.footerURL){data.footerURL=ImageCropper.getCroppedImageURL(data.footerURL,aScreen,ORIGIN_BOTTOM_LEFT);}
return data;},purge:function LWTIO_purge(){let dir=FileUtils.getDir("ProfD",["lwtheme"]);dir.followLinks=false;try{dir.remove(true);}catch(e){}}};Object.freeze(LightweightThemeImageOptimizer);let ImageCropper={_inProgress:{},getCroppedImageURL:function ImageCropper_getCroppedImageURL(aImageURL,aScreen,aOrigin){if(!aImageURL.startsWith("file://")){return aImageURL;}

let uri=Services.io.newURI(aImageURL,null,null);let file=uri.QueryInterface(Ci.nsIFileURL).file;if(!file.exists()){return aImageURL;}
let fileName=file.leafName+"-"+aScreen.width+"x"+aScreen.height;let croppedFile=FileUtils.getFile("ProfD",["lwtheme",fileName]);if(croppedFile.exists()&&!(croppedFile.path in this._inProgress)){let fileURI=Services.io.newFileURI(croppedFile);fileURI.QueryInterface(Ci.nsIURL).query=uri.query;return fileURI.spec;}
this._crop(uri,croppedFile,aScreen,aOrigin);
return aImageURL;},_crop:function ImageCropper_crop(aURI,aTargetFile,aScreen,aOrigin){let inProgress=this._inProgress;inProgress[aTargetFile.path]=true;function resetInProgress(){delete inProgress[aTargetFile.path];}
ImageFile.read(aURI,function crop_readImageFile(aInputStream,aContentType){if(aInputStream&&aContentType){let image=ImageTools.decode(aInputStream,aContentType);if(image&&image.width&&image.height){let stream=ImageTools.encode(image,aScreen,aOrigin,aContentType);if(stream){ImageFile.write(aTargetFile,stream,resetInProgress);return;}}}
resetInProgress();});}};let ImageFile={read:function ImageFile_read(aURI,aCallback){this._netUtil.asyncFetch(aURI,function read_asyncFetch(aInputStream,aStatus,aRequest){if(Components.isSuccessCode(aStatus)&&aRequest instanceof Ci.nsIChannel){let channel=aRequest.QueryInterface(Ci.nsIChannel);aCallback(aInputStream,channel.contentType);}else{aCallback();}});},write:function ImageFile_write(aFile,aInputStream,aCallback){let fos=FileUtils.openSafeFileOutputStream(aFile);this._netUtil.asyncCopy(aInputStream,fos,function write_asyncCopy(aResult){FileUtils.closeSafeFileOutputStream(fos);if(!Components.isSuccessCode(aResult)){try{aFile.remove(false);}catch(e){}}
aCallback();});}};XPCOMUtils.defineLazyModuleGetter(ImageFile,"_netUtil","resource://gre/modules/NetUtil.jsm","NetUtil");let ImageTools={decode:function ImageTools_decode(aInputStream,aContentType){let outParam={value:null};try{this._imgTools.decodeImageData(aInputStream,aContentType,outParam);}catch(e){}
return outParam.value;},encode:function ImageTools_encode(aImage,aScreen,aOrigin,aContentType){let stream;let width=Math.min(aImage.width,aScreen.width);let height=Math.min(aImage.height,aScreen.height);let x=aOrigin==ORIGIN_TOP_RIGHT?aImage.width-width:0;try{stream=this._imgTools.encodeCroppedImage(aImage,aContentType,x,0,width,height);}catch(e){}
return stream;}};XPCOMUtils.defineLazyServiceGetter(ImageTools,"_imgTools","@mozilla.org/image/tools;1","imgITools");let Utils={createCopy:function Utils_createCopy(aData){let copy={};for(let[k,v]in Iterator(aData)){copy[k]=v;}
return copy;}};