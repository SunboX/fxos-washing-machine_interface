this.EXPORTED_SYMBOLS=["DownloadUtils"];const Cc=Components.classes;const Ci=Components.interfaces;const Cu=Components.utils;Cu.import("resource://gre/modules/XPCOMUtils.jsm");XPCOMUtils.defineLazyModuleGetter(this,"PluralForm","resource://gre/modules/PluralForm.jsm");this.__defineGetter__("gDecimalSymbol",function(){delete this.gDecimalSymbol;return this.gDecimalSymbol=Number(5.4).toLocaleString().match(/\D/);});const kDownloadProperties="chrome://mozapps/locale/downloads/downloads.properties";let gStr={statusFormat:"statusFormat3",statusFormatInfiniteRate:"statusFormatInfiniteRate",statusFormatNoRate:"statusFormatNoRate",transferSameUnits:"transferSameUnits2",transferDiffUnits:"transferDiffUnits2",transferNoTotal:"transferNoTotal2",timePair:"timePair2",timeLeftSingle:"timeLeftSingle2",timeLeftDouble:"timeLeftDouble2",timeFewSeconds:"timeFewSeconds",timeUnknown:"timeUnknown",monthDate:"monthDate2",yesterday:"yesterday",doneScheme:"doneScheme2",doneFileScheme:"doneFileScheme",units:["bytes","kilobyte","megabyte","gigabyte"], timeUnits:["seconds","minutes","hours","days"],infiniteRate:"infiniteRate",};this.__defineGetter__("gBundle",function(){delete gBundle;return this.gBundle=Cc["@mozilla.org/intl/stringbundle;1"].getService(Ci.nsIStringBundleService).createBundle(kDownloadProperties);});
const kCachedLastMaxSize=10;let gCachedLast=[];this.DownloadUtils={getDownloadStatus:function DU_getDownloadStatus(aCurrBytes,aMaxBytes,aSpeed,aLastSec)
{let[transfer,timeLeft,newLast,normalizedSpeed]=this._deriveTransferRate(aCurrBytes,aMaxBytes,aSpeed,aLastSec);let[rate,unit]=DownloadUtils.convertByteUnits(normalizedSpeed);let status;if(rate==="Infinity"){let params=[transfer,gBundle.GetStringFromName(gStr.infiniteRate),timeLeft];status=gBundle.formatStringFromName(gStr.statusFormatInfiniteRate,params,params.length);}
else{let params=[transfer,rate,unit,timeLeft];status=gBundle.formatStringFromName(gStr.statusFormat,params,params.length);}
return[status,newLast];},getDownloadStatusNoRate:function DU_getDownloadStatusNoRate(aCurrBytes,aMaxBytes,aSpeed,aLastSec)
{let[transfer,timeLeft,newLast]=this._deriveTransferRate(aCurrBytes,aMaxBytes,aSpeed,aLastSec);let params=[transfer,timeLeft];let status=gBundle.formatStringFromName(gStr.statusFormatNoRate,params,params.length);return[status,newLast];},_deriveTransferRate:function DU__deriveTransferRate(aCurrBytes,aMaxBytes,aSpeed,aLastSec)
{if(aMaxBytes==null)
aMaxBytes=-1;if(aSpeed==null)
aSpeed=-1;if(aLastSec==null)
aLastSec=Infinity; let seconds=(aSpeed>0)&&(aMaxBytes>0)?(aMaxBytes-aCurrBytes)/aSpeed:-1;let transfer=DownloadUtils.getTransferTotal(aCurrBytes,aMaxBytes);let[timeLeft,newLast]=DownloadUtils.getTimeLeft(seconds,aLastSec);return[transfer,timeLeft,newLast,aSpeed];},getTransferTotal:function DU_getTransferTotal(aCurrBytes,aMaxBytes)
{if(aMaxBytes==null)
aMaxBytes=-1;let[progress,progressUnits]=DownloadUtils.convertByteUnits(aCurrBytes);let[total,totalUnits]=DownloadUtils.convertByteUnits(aMaxBytes); let name,values;if(aMaxBytes<0){name=gStr.transferNoTotal;values=[progress,progressUnits,];}else if(progressUnits==totalUnits){name=gStr.transferSameUnits;values=[progress,total,totalUnits,];}else{name=gStr.transferDiffUnits;values=[progress,progressUnits,total,totalUnits,];}
return gBundle.formatStringFromName(name,values,values.length);},getTimeLeft:function DU_getTimeLeft(aSeconds,aLastSec)
{if(aLastSec==null)
aLastSec=Infinity;if(aSeconds<0)
return[gBundle.GetStringFromName(gStr.timeUnknown),aLastSec]; aLastSec=gCachedLast.reduce(function(aResult,aItem)
aItem[0]==aSeconds?aItem[1]:aResult,aLastSec); gCachedLast.push([aSeconds,aLastSec]);if(gCachedLast.length>kCachedLastMaxSize)
gCachedLast.shift();

 if(aSeconds>aLastSec/2){
let(diff=aSeconds-aLastSec){aSeconds=aLastSec+(diff<0?.3:.1)*diff;} 
let diff=aSeconds-aLastSec;let diffPct=diff/aLastSec*100;if(Math.abs(diff)<5||Math.abs(diffPct)<5)
aSeconds=aLastSec-(diff<0?.4:.2);} 
let timeLeft;if(aSeconds<4){ timeLeft=gBundle.GetStringFromName(gStr.timeFewSeconds);}else{ let[time1,unit1,time2,unit2]=DownloadUtils.convertTimeUnits(aSeconds);let pair1=gBundle.formatStringFromName(gStr.timePair,[time1,unit1],2);let pair2=gBundle.formatStringFromName(gStr.timePair,[time2,unit2],2);if((aSeconds<3600&&time1>=4)||time2==0){timeLeft=gBundle.formatStringFromName(gStr.timeLeftSingle,[pair1],1);}else{ timeLeft=gBundle.formatStringFromName(gStr.timeLeftDouble,[pair1,pair2],2);}}
return[timeLeft,aSeconds];},getReadableDates:function DU_getReadableDates(aDate,aNow)
{if(!aNow){aNow=new Date();}
let dts=Cc["@mozilla.org/intl/scriptabledateformat;1"].getService(Ci.nsIScriptableDateFormat); let today=new Date(aNow.getFullYear(),aNow.getMonth(),aNow.getDate());let dateTimeCompact;if(aDate>=today){ dateTimeCompact=dts.FormatTime("",dts.timeFormatNoSeconds,aDate.getHours(),aDate.getMinutes(),0);}else if(today-aDate<(24*60*60*1000)){ dateTimeCompact=gBundle.GetStringFromName(gStr.yesterday);}else if(today-aDate<(6*24*60*60*1000)){ dateTimeCompact=aDate.toLocaleFormat("%A");}else{ let month=aDate.toLocaleFormat("%B"); let date=Number(aDate.toLocaleFormat("%d"));dateTimeCompact=gBundle.formatStringFromName(gStr.monthDate,[month,date],2);}
let dateTimeFull=dts.FormatDateTime("",dts.dateFormatLong,dts.timeFormatNoSeconds,aDate.getFullYear(),aDate.getMonth()+1,aDate.getDate(),aDate.getHours(),aDate.getMinutes(),0);return[dateTimeCompact,dateTimeFull];},getURIHost:function DU_getURIHost(aURIString)
{let ioService=Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);let eTLDService=Cc["@mozilla.org/network/effective-tld-service;1"].getService(Ci.nsIEffectiveTLDService);let idnService=Cc["@mozilla.org/network/idn-service;1"].getService(Ci.nsIIDNService); let uri=ioService.newURI(aURIString,null,null);if(uri instanceof Ci.nsINestedURI)
uri=uri.innermostURI;let fullHost;try{fullHost=uri.host;}catch(e){fullHost="";}
let displayHost;try{ let baseDomain=eTLDService.getBaseDomain(uri); displayHost=idnService.convertToDisplayIDN(baseDomain,{});}catch(e){ displayHost=fullHost;} 
if(uri.scheme=="file"){ displayHost=gBundle.GetStringFromName(gStr.doneFileScheme);fullHost=displayHost;}else if(displayHost.length==0){displayHost=gBundle.formatStringFromName(gStr.doneScheme,[uri.scheme],1);fullHost=displayHost;}else if(uri.port!=-1){ let port=":"+uri.port;displayHost+=port;fullHost+=port;}
return[displayHost,fullHost];},convertByteUnits:function DU_convertByteUnits(aBytes)
{let unitIndex=0;
 while((aBytes>=999.5)&&(unitIndex<gStr.units.length-1)){aBytes/=1024;unitIndex++;}

 
aBytes=aBytes.toFixed((aBytes>0)&&(aBytes<100)&&(unitIndex!=0)?1:0);if(gDecimalSymbol!=".")
aBytes=aBytes.replace(".",gDecimalSymbol);return[aBytes,gBundle.GetStringFromName(gStr.units[unitIndex])];},convertTimeUnits:function DU_convertTimeUnits(aSecs)
{
 let timeSize=[60,60,24];let time=aSecs;let scale=1;let unitIndex=0;
 while((unitIndex<timeSize.length)&&(time>=timeSize[unitIndex])){time/=timeSize[unitIndex];scale*=timeSize[unitIndex];unitIndex++;}
let value=convertTimeUnitsValue(time);let units=convertTimeUnitsUnits(value,unitIndex);let extra=aSecs-value*scale;let nextIndex=unitIndex-1; for(let index=0;index<nextIndex;index++)
extra/=timeSize[index];let value2=convertTimeUnitsValue(extra);let units2=convertTimeUnitsUnits(value2,nextIndex);return[value,units,value2,units2];},};function convertTimeUnitsValue(aTime)
{return Math.floor(aTime);}
function convertTimeUnitsUnits(aTime,aIndex)
{ if(aIndex<0)
return"";return PluralForm.get(aTime,gBundle.GetStringFromName(gStr.timeUnits[aIndex]));}
function log(aMsg)
{let msg="DownloadUtils.jsm: "+(aMsg.join?aMsg.join(""):aMsg);Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService).logStringMessage(msg);dump(msg+"\n");}