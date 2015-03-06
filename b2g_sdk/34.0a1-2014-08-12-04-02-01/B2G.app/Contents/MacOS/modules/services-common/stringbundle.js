this.EXPORTED_SYMBOLS=["StringBundle"];const{classes:Cc,interfaces:Ci,results:Cr,utils:Cu}=Components;this.StringBundle=function StringBundle(url){this.url=url;}
StringBundle.prototype={get _appLocale(){try{return Cc["@mozilla.org/intl/nslocaleservice;1"].getService(Ci.nsILocaleService).getApplicationLocale();}
catch(ex){return null;}},get _stringBundle(){let stringBundle=Cc["@mozilla.org/intl/stringbundle;1"].getService(Ci.nsIStringBundleService).createBundle(this.url,this._appLocale);this.__defineGetter__("_stringBundle",function()stringBundle);return this._stringBundle;},_url:null,get url(){return this._url;},set url(newVal){this._url=newVal;delete this._stringBundle;},get:function(key,args){if(args)
return this.stringBundle.formatStringFromName(key,args,args.length);else
return this.stringBundle.GetStringFromName(key);},getAll:function(){let strings=[];
let enumerator=this.stringBundle.getSimpleEnumeration();while(enumerator.hasMoreElements()){

let string=enumerator.getNext().QueryInterface(Ci.nsIPropertyElement);strings.push({key:string.key,value:string.value});}
return strings;},get src(){return this.url;},set src(newVal){this.url=newVal;},get appLocale(){return this._appLocale;},get stringBundle(){return this._stringBundle;},getString:function(key){return this.get(key);},getFormattedString:function(key,args){return this.get(key,args);},get strings(){return this.stringBundle.getSimpleEnumeration();}}