const HOURS_TO_MINUTES=60;const MINUTES_TO_SECONDS=60;const SECONDS_TO_MILLISECONDS=1000;const MINUTES_TO_MILLISECONDS=MINUTES_TO_SECONDS*SECONDS_TO_MILLISECONDS;const HOURS_TO_MILLISECONDS=HOURS_TO_MINUTES*MINUTES_TO_MILLISECONDS;this.EXPORTED_SYMBOLS=["ISO8601DateUtils"];debug("*** loading ISO8601DateUtils\n");this.ISO8601DateUtils={parse:function ISO8601_parse(aDateString){var dateString=aDateString;if(!dateString.match('-')){

 var year=dateString.slice(0,4);var month=dateString.slice(4,6);var rest=dateString.slice(6,dateString.length);dateString=year+"-"+month+"-"+rest;}
var parts=dateString.match(/(\d{4})(-(\d{2,3}))?(-(\d{2}))?(T(\d{2}):(\d{2})(:(\d{2})(\.(\d+))?)?(Z|([+-])(\d{2}):(\d{2}))?)?/);




var date=new Date(parts[1],parts[3]-1,parts[5],parts[7]||0,parts[8]||0,parts[10]||0,parts[12]||0);
















var remoteToUTCOffset=0;if(parts[13]&&parts[13]!="Z"){var direction=(parts[14]=="+"?1:-1);if(parts[15])
remoteToUTCOffset+=direction*parts[15]*HOURS_TO_MILLISECONDS;if(parts[16])
remoteToUTCOffset+=direction*parts[16]*MINUTES_TO_MILLISECONDS;}
remoteToUTCOffset=remoteToUTCOffset*-1;
var UTCToLocalOffset=date.getTimezoneOffset()*MINUTES_TO_MILLISECONDS;UTCToLocalOffset=UTCToLocalOffset*-1; date.setTime(date.getTime()+remoteToUTCOffset+UTCToLocalOffset);return date;},create:function ISO8601_create(aDate){function zeropad(s,l){s=s.toString(); while(s.length<l){s='0'+s;}
return s;}
var myDate; if(typeof aDate=='number'){myDate=new Date()
myDate.setTime(aDate);}else{myDate=aDate;} 
var result=zeropad(myDate.getUTCFullYear(),4)+
zeropad(myDate.getUTCMonth()+1,2)+
zeropad(myDate.getUTCDate(),2)+'T'+
zeropad(myDate.getUTCHours(),2)+':'+
zeropad(myDate.getUTCMinutes(),2)+':'+
zeropad(myDate.getUTCSeconds(),2)+'Z';return result;}}