this.EXPORTED_SYMBOLS=["TelemetryLog"];const Cc=Components.classes;const Ci=Components.interfaces;const Telemetry=Cc["@mozilla.org/base/telemetry;1"].getService(Ci.nsITelemetry);var gLogEntries=[];this.TelemetryLog=Object.freeze({log:function(id,data){id=String(id);var ts;try{ts=Math.floor(Telemetry.msSinceProcessStart());}catch(e){
return;}
var entry=[id,ts];if(data!==undefined){entry=entry.concat(Array.prototype.map.call(data,String));}
gLogEntries.push(entry);},entries:function(){return gLogEntries;}});