this.EXPORTED_SYMBOLS=['GlobalSimulatorScreen'];const Cu=Components.utils;Cu.import('resource://gre/modules/XPCOMUtils.jsm');Cu.import('resource://gre/modules/Services.jsm');this.GlobalSimulatorScreen={mozOrientationLocked:false, mozOrientation:'portrait',
 lockedOrientation:[],


 screenOrientation:'portrait', width:0,height:0,lock:function(orientation){this.mozOrientationLocked=true; function normalize(str){if(str.match(/^portrait/)){return'portrait';}else if(str.match(/^landscape/)){return'landscape';}else{return'portrait';}}
this.lockedOrientation=orientation.map(normalize);this.updateOrientation();},unlock:function(){this.mozOrientationLocked=false;this.updateOrientation();},updateOrientation:function(){let orientation=this.screenOrientation;


if(this.mozOrientationLocked&&this.lockedOrientation.indexOf(this.screenOrientation)==-1){orientation=this.lockedOrientation[0];} 
if(this.mozOrientation!=orientation){this.mozOrientation=orientation; Services.obs.notifyObservers(null,'simulator-orientation-change',null);}

Services.obs.notifyObservers({wrappedJSObject:this},'simulator-adjust-window-size',null);},flipScreen:function(){if(this.screenOrientation=='portrait'){this.screenOrientation='landscape';}else if(this.screenOrientation=='landscape'){this.screenOrientation='portrait';}
this.updateOrientation();}}