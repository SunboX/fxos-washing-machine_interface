Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");Components.utils.import("resource://gre/modules/vtt.jsm");var Ci=Components.interfaces;var WEBVTTPARSERWRAPPER_CID="{acf6e493-0092-4b26-b172-241e375c57ab}";var WEBVTTPARSERWRAPPER_CONTRACTID="@mozilla.org/webvttParserWrapper;1";function WebVTTParserWrapper()
{}
WebVTTParserWrapper.prototype={loadParser:function(window)
{this.parser=new WebVTT.Parser(window,new TextDecoder("utf8"));},parse:function(data)
{
 var buffer=new Uint8Array(data.length);for(var i=0;i<data.length;i++){buffer[i]=data.charCodeAt(i);}
this.parser.parse(buffer);},flush:function()
{this.parser.flush();},watch:function(callback)
{this.parser.oncue=callback.onCue;this.parser.onregion=callback.onRegion;this.parser.onparsingerror=function(e){callback.onParsingError(("code"in e)?e.code:-1);};},convertCueToDOMTree:function(window,cue)
{return WebVTT.convertCueToDOMTree(window,cue.text);},processCues:function(window,cues,overlay)
{WebVTT.processCues(window,cues,overlay);},classDescription:"Wrapper for the JS WebVTT implementation (vtt.js)",classID:Components.ID(WEBVTTPARSERWRAPPER_CID),QueryInterface:XPCOMUtils.generateQI([Ci.nsIWebVTTParserWrapper]),classInfo:XPCOMUtils.generateCI({classID:WEBVTTPARSERWRAPPER_CID,contractID:WEBVTTPARSERWRAPPER_CONTRACTID,interfaces:[Ci.nsIWebVTTParserWrapper]})};this.NSGetFactory=XPCOMUtils.generateNSGetFactory([WebVTTParserWrapper]);