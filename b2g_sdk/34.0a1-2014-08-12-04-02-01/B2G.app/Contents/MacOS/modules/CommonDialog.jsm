this.EXPORTED_SYMBOLS=["CommonDialog"];const Ci=Components.interfaces;const Cr=Components.results;const Cc=Components.classes;const Cu=Components.utils;Cu.import("resource://gre/modules/Services.jsm");this.CommonDialog=function CommonDialog(args,ui){this.args=args;this.ui=ui;}
CommonDialog.prototype={args:null,ui:null,hasInputField:true,numButtons:undefined,iconClass:undefined,soundID:undefined,focusTimer:null,onLoad:function(xulDialog){switch(this.args.promptType){case"alert":case"alertCheck":this.hasInputField=false;this.numButtons=1;this.iconClass=["alert-icon"];this.soundID=Ci.nsISound.EVENT_ALERT_DIALOG_OPEN;break;case"confirmCheck":case"confirm":this.hasInputField=false;this.numButtons=2;this.iconClass=["question-icon"];this.soundID=Ci.nsISound.EVENT_CONFIRM_DIALOG_OPEN;break;case"confirmEx":var numButtons=0;if(this.args.button0Label)
numButtons++;if(this.args.button1Label)
numButtons++;if(this.args.button2Label)
numButtons++;if(this.args.button3Label)
numButtons++;if(numButtons==0)
throw"A dialog with no buttons? Can not haz.";this.numButtons=numButtons;this.hasInputField=false;this.iconClass=["question-icon"];this.soundID=Ci.nsISound.EVENT_CONFIRM_DIALOG_OPEN;break;case"prompt":this.numButtons=2;this.iconClass=["question-icon"];this.soundID=Ci.nsISound.EVENT_PROMPT_DIALOG_OPEN;this.initTextbox("login",this.args.value);this.ui.loginLabel.setAttribute("value","");break;case"promptUserAndPass":this.numButtons=2;this.iconClass=["authentication-icon","question-icon"];this.soundID=Ci.nsISound.EVENT_PROMPT_DIALOG_OPEN;this.initTextbox("login",this.args.user);this.initTextbox("password1",this.args.pass);break;case"promptPassword":this.numButtons=2;this.iconClass=["authentication-icon","question-icon"];this.soundID=Ci.nsISound.EVENT_PROMPT_DIALOG_OPEN;this.initTextbox("password1",this.args.pass);this.ui.password1Label.setAttribute("value","");break;default:Cu.reportError("commonDialog opened for unknown type: "+this.args.promptType);throw"unknown dialog type";} 
let title=this.args.title;let infoTitle=this.ui.infoTitle;infoTitle.appendChild(infoTitle.ownerDocument.createTextNode(title));if(xulDialog)
xulDialog.ownerDocument.title=title;


switch(this.numButtons){case 4:this.setLabelForNode(this.ui.button3,this.args.button3Label);this.ui.button3.hidden=false; case 3:this.setLabelForNode(this.ui.button2,this.args.button2Label);this.ui.button2.hidden=false; case 2: if(this.args.button1Label)
this.setLabelForNode(this.ui.button1,this.args.button1Label);break;case 1:this.ui.button1.hidden=true;break;} 
if(this.args.button0Label)
this.setLabelForNode(this.ui.button0,this.args.button0Label);
let croppedMessage=this.args.text.substr(0,10000);let infoBody=this.ui.infoBody;infoBody.appendChild(infoBody.ownerDocument.createTextNode(croppedMessage));let label=this.args.checkLabel;if(label){this.ui.checkboxContainer.hidden=false;this.setLabelForNode(this.ui.checkbox,label);this.ui.checkbox.checked=this.args.checked;} 
let icon=this.ui.infoIcon;if(icon)
this.iconClass.forEach(function(el,idx,arr)icon.classList.add(el)); this.args.ok=false;this.args.buttonNumClicked=1; let b=(this.args.defaultButtonNum||0);let button=this.ui["button"+b];if(xulDialog)
xulDialog.defaultButton=['accept','cancel','extra1','extra2'][b];else
button.setAttribute("default","true");this.setDefaultFocus(true);if(this.args.enableDelay){this.setButtonsEnabledState(false);let delayTime=Services.prefs.getIntPref("security.dialog_enable_delay");this.startOnFocusDelay(delayTime);let self=this;this.ui.focusTarget.addEventListener("blur",function(e){self.onBlur(e);},false);this.ui.focusTarget.addEventListener("focus",function(e){self.onFocus(e);},false);}
try{if(xulDialog&&this.soundID){Cc["@mozilla.org/sound;1"].createInstance(Ci.nsISound).playEventSound(this.soundID);}}catch(e){Cu.reportError("Couldn't play common dialog event sound: "+e);}
let topic="common-dialog-loaded";if(!xulDialog)
topic="tabmodal-dialog-loaded";Services.obs.notifyObservers(this.ui.prompt,topic,null);},setLabelForNode:function(aNode,aLabel){


var accessKey=null;if(/ *\(\&([^&])\)(:?)$/.test(aLabel)){aLabel=RegExp.leftContext+RegExp.$2;accessKey=RegExp.$1;}else if(/^([^&]*)\&(([^&]).*$)/.test(aLabel)){aLabel=RegExp.$1+RegExp.$2;accessKey=RegExp.$3;}
aLabel=aLabel.replace(/\&\&/g,"&");aNode.label=aLabel;
if(accessKey)
aNode.accessKey=accessKey;},initTextbox:function(aName,aValue){this.ui[aName+"Container"].hidden=false;this.ui[aName+"Textbox"].setAttribute("value",aValue!==null?aValue:"");},setButtonsEnabledState:function(enabled){this.ui.button0.disabled=!enabled;this.ui.button2.disabled=!enabled;this.ui.button3.disabled=!enabled;},onBlur:function(aEvent){if(aEvent.target!=this.ui.focusTarget)
return;this.setButtonsEnabledState(false);
if(this.focusTimer){this.focusTimer.cancel();this.focusTimer=null;}},onFocus:function(aEvent){if(aEvent.target!=this.ui.focusTarget)
return;this.startOnFocusDelay();},startOnFocusDelay:function(delayTime){if(this.focusTimer)
return;
if(!delayTime)
delayTime=250;let self=this;this.focusTimer=Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);this.focusTimer.initWithCallback(function(){self.onFocusTimeout();},delayTime,Ci.nsITimer.TYPE_ONE_SHOT);},onFocusTimeout:function(){this.focusTimer=null;this.setButtonsEnabledState(true);},setDefaultFocus:function(isInitialLoad){let b=(this.args.defaultButtonNum||0);let button=this.ui["button"+b];if(!this.hasInputField){let isOSX=("nsILocalFileMac"in Components.interfaces);if(isOSX)
this.ui.infoBody.focus();else
button.focus();}else{
if(this.args.promptType=="promptPassword"){if(isInitialLoad)
this.ui.password1Textbox.select();else
this.ui.password1Textbox.focus();}else{if(isInitialLoad)
this.ui.loginTextbox.select();else
this.ui.loginTextbox.focus();}}},onCheckbox:function(){this.args.checked=this.ui.checkbox.checked;},onButton0:function(){this.args.promptActive=false;this.args.ok=true;this.args.buttonNumClicked=0;let username=this.ui.loginTextbox.value;let password=this.ui.password1Textbox.value; switch(this.args.promptType){case"prompt":this.args.value=username;break;case"promptUserAndPass":this.args.user=username;this.args.pass=password;break;case"promptPassword":this.args.pass=password;break;}},onButton1:function(){this.args.promptActive=false;this.args.buttonNumClicked=1;},onButton2:function(){this.args.promptActive=false;this.args.buttonNumClicked=2;},onButton3:function(){this.args.promptActive=false;this.args.buttonNumClicked=3;},abortPrompt:function(){this.args.promptActive=false;this.args.promptAborted=true;},};