


"use strict";this.EXPORTED_SYMBOLS=["Battery"];const Ci=Components.interfaces;const Cc=Components.classes;const Cu=Components.utils;Cu.import("resource://gre/modules/XPCOMUtils.jsm",this);XPCOMUtils.defineLazyModuleGetter(this,"Services","resource://gre/modules/Services.jsm");let gFakeBattery={charging:false,chargingTime:0,dischargingTime:Infinity,level:1,}
this.Debugging={fake:false}
this.Battery={};for(let k of["charging","chargingTime","dischargingTime","level"]){let prop=k;Object.defineProperty(this.Battery,prop,{get:function(){ if(Debugging.fake){return gFakeBattery[prop];}
return Services.appShell.hiddenDOMWindow.navigator.battery[prop];},set:function(fakeSetting){if(!Debugging.fake){throw new Error("Tried to set fake battery value when battery spoofing was disabled");}
gFakeBattery[prop]=fakeSetting;}})}