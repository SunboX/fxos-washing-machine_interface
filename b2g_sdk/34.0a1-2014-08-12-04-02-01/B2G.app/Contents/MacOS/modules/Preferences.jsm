this.EXPORTED_SYMBOLS=["Preferences"];const Cc=Components.classes;const Ci=Components.interfaces;const Cr=Components.results;const Cu=Components.utils;Cu.import("resource://gre/modules/XPCOMUtils.jsm");
const MAX_INT=Math.pow(2,31)-1;const MIN_INT=-MAX_INT;this.Preferences=function Preferences(args){if(isObject(args)){if(args.branch)
this._prefBranch=args.branch;if(args.defaultBranch)
this._defaultBranch=args.defaultBranch;if(args.privacyContext)
this._privacyContext=args.privacyContext;}
else if(args)
this._prefBranch=args;}
Preferences.prototype={get:function(prefName,defaultValue){if(Array.isArray(prefName))
return prefName.map(function(v)this.get(v,defaultValue),this);return this._get(prefName,defaultValue);},_get:function(prefName,defaultValue){switch(this._prefSvc.getPrefType(prefName)){case Ci.nsIPrefBranch.PREF_STRING:return this._prefSvc.getComplexValue(prefName,Ci.nsISupportsString).data;case Ci.nsIPrefBranch.PREF_INT:return this._prefSvc.getIntPref(prefName);case Ci.nsIPrefBranch.PREF_BOOL:return this._prefSvc.getBoolPref(prefName);case Ci.nsIPrefBranch.PREF_INVALID:return defaultValue;default:throw"Error getting pref "+prefName+"; its value's type is "+
this._prefSvc.getPrefType(prefName)+", which I don't know "+"how to handle.";}},set:function(prefName,prefValue){if(isObject(prefName)){for(let[name,value]in Iterator(prefName))
this.set(name,value);return;}
this._set(prefName,prefValue);},_set:function(prefName,prefValue){let prefType;if(typeof prefValue!="undefined"&&prefValue!=null)
prefType=prefValue.constructor.name;switch(prefType){case"String":{let string=Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);string.data=prefValue;this._prefSvc.setComplexValue(prefName,Ci.nsISupportsString,string);}
break;case"Number":


if(prefValue>MAX_INT||prefValue<MIN_INT)
throw("you cannot set the "+prefName+" pref to the number "+
prefValue+", as number pref values must be in the signed "+"32-bit integer range -(2^31-1) to 2^31-1.  To store numbers "+"outside that range, store them as strings.");this._prefSvc.setIntPref(prefName,prefValue);if(prefValue%1!=0)
Cu.reportError("Warning: setting the "+prefName+" pref to the "+"non-integer number "+prefValue+" converted it "+"to the integer number "+this.get(prefName)+"; to retain fractional precision, store non-integer "+"numbers as strings.");break;case"Boolean":this._prefSvc.setBoolPref(prefName,prefValue);break;default:throw"can't set pref "+prefName+" to value '"+prefValue+"'; it isn't a String, Number, or Boolean";}},has:function(prefName){if(Array.isArray(prefName))
return prefName.map(this.has,this);return this._has(prefName);},_has:function(prefName){return(this._prefSvc.getPrefType(prefName)!=Ci.nsIPrefBranch.PREF_INVALID);},isSet:function(prefName){if(Array.isArray(prefName))
return prefName.map(this.isSet,this);return(this.has(prefName)&&this._prefSvc.prefHasUserValue(prefName));},modified:function(prefName){return this.isSet(prefName)},reset:function(prefName){if(Array.isArray(prefName)){prefName.map(function(v)this.reset(v),this);return;}
this._prefSvc.clearUserPref(prefName);},lock:function(prefName){if(Array.isArray(prefName))
prefName.map(this.lock,this);this._prefSvc.lockPref(prefName);},unlock:function(prefName){if(Array.isArray(prefName))
prefName.map(this.unlock,this);this._prefSvc.unlockPref(prefName);},locked:function(prefName){if(Array.isArray(prefName))
return prefName.map(this.locked,this);return this._prefSvc.prefIsLocked(prefName);},observe:function(prefName,callback,thisObject){let fullPrefName=this._prefBranch+(prefName||"");let observer=new PrefObserver(fullPrefName,callback,thisObject);Preferences._prefSvc.addObserver(fullPrefName,observer,true);observers.push(observer);return observer;},ignore:function(prefName,callback,thisObject){let fullPrefName=this._prefBranch+(prefName||"");


let[observer]=observers.filter(function(v)v.prefName==fullPrefName&&v.callback==callback&&v.thisObject==thisObject);if(observer){Preferences._prefSvc.removeObserver(fullPrefName,observer);observers.splice(observers.indexOf(observer),1);}},resetBranch:function(prefBranch=""){try{this._prefSvc.resetBranch(prefBranch);}
catch(ex){
if(ex.result==Cr.NS_ERROR_NOT_IMPLEMENTED)
this.reset(this._prefSvc.getChildList(prefBranch,[]));else
throw ex;}},_prefBranch:"",get _prefSvc(){let prefSvc=Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService);if(this._defaultBranch){prefSvc=prefSvc.getDefaultBranch(this._prefBranch);}else{prefSvc=prefSvc.getBranch(this._prefBranch);}
this.__defineGetter__("_prefSvc",function()prefSvc);return this._prefSvc;},get _ioSvc(){let ioSvc=Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);this.__defineGetter__("_ioSvc",function()ioSvc);return this._ioSvc;}};

Preferences.__proto__=Preferences.prototype;let observers=[];function PrefObserver(prefName,callback,thisObject){this.prefName=prefName;this.callback=callback;this.thisObject=thisObject;}
PrefObserver.prototype={QueryInterface:XPCOMUtils.generateQI([Ci.nsIObserver,Ci.nsISupportsWeakReference]),observe:function(subject,topic,data){

if(data.indexOf(this.prefName)!=0)
return;if(typeof this.callback=="function"){let prefValue=Preferences.get(data);if(this.thisObject)
this.callback.call(this.thisObject,prefValue);else
this.callback(prefValue);}
else
this.callback.observe(subject,topic,data);}};function isObject(val){

return(typeof val!="undefined"&&val!=null&&typeof val=="object"&&val.constructor.name=="Object");}