'use strict';var util=require('../util/util');var l10n=require('../util/l10n');var Eagerness={NEVER:1,SOMETIMES:2,ALWAYS:3};exports.items=[{item:'setting',name:'eagerHelper',type:{name:'selection',lookup:[{name:'never',value:Eagerness.NEVER},{name:'sometimes',value:Eagerness.SOMETIMES},{name:'always',value:Eagerness.ALWAYS}]},defaultValue:Eagerness.SOMETIMES,description:l10n.lookup('eagerHelperDesc'),ignoreTypeDifference:true}];function FocusManager(document,settings){if(document==null){throw new Error('document == null');}
this.document=document;this.settings=settings;this.debug=false;this.blurDelay=150;this.window=this.document.defaultView;this._blurDelayTimeout=null; this._monitoredElements=[];this._isError=false;this._hasFocus=false;this._helpRequested=false;this._recentOutput=false;this.onVisibilityChange=util.createEvent('FocusManager.onVisibilityChange');this._focused=this._focused.bind(this);if(this.document.addEventListener){this.document.addEventListener('focus',this._focused,true);}
var eagerHelper=this.settings.get('eagerHelper');eagerHelper.onChange.add(this._eagerHelperChanged,this);this.isTooltipVisible=undefined;this.isOutputVisible=undefined;this._checkShow();}
FocusManager.prototype.destroy=function(){var eagerHelper=this.settings.get('eagerHelper');eagerHelper.onChange.remove(this._eagerHelperChanged,this);this.document.removeEventListener('focus',this._focused,true);for(var i=0;i<this._monitoredElements.length;i++){var monitor=this._monitoredElements[i];console.error('Hanging monitored element: ',monitor.element);monitor.element.removeEventListener('focus',monitor.onFocus,true);monitor.element.removeEventListener('blur',monitor.onBlur,true);}
if(this._blurDelayTimeout){this.window.clearTimeout(this._blurDelayTimeout);this._blurDelayTimeout=null;}
this._focused=undefined;this.document=undefined;this.settings=undefined;this.window=undefined;};FocusManager.prototype.addMonitoredElement=function(element,where){if(this.debug){console.log('FocusManager.addMonitoredElement('+(where||'unknown')+')');}
var monitor={element:element,where:where,onFocus:function(){this._reportFocus(where);}.bind(this),onBlur:function(){this._reportBlur(where);}.bind(this)};element.addEventListener('focus',monitor.onFocus,true);element.addEventListener('blur',monitor.onBlur,true);if(this.document.activeElement===element){this._reportFocus(where);}
this._monitoredElements.push(monitor);};FocusManager.prototype.removeMonitoredElement=function(element,where){if(this.debug){console.log('FocusManager.removeMonitoredElement('+(where||'unknown')+')');}
this._monitoredElements=this._monitoredElements.filter(function(monitor){if(monitor.element===element){element.removeEventListener('focus',monitor.onFocus,true);element.removeEventListener('blur',monitor.onBlur,true);return false;}
return true;});};FocusManager.prototype.updatePosition=function(dimensions){var ev={tooltipVisible:this.isTooltipVisible,outputVisible:this.isOutputVisible,dimensions:dimensions};this.onVisibilityChange(ev);};FocusManager.prototype.outputted=function(){this._recentOutput=true;this._helpRequested=false;this._checkShow();};FocusManager.prototype._focused=function(){this._reportBlur('document');};FocusManager.prototype._reportFocus=function(where){if(this.debug){console.log('FocusManager._reportFocus('+(where||'unknown')+')');}
if(this._blurDelayTimeout){if(this.debug){console.log('FocusManager.cancelBlur');}
this.window.clearTimeout(this._blurDelayTimeout);this._blurDelayTimeout=null;}
if(!this._hasFocus){this._hasFocus=true;}
this._checkShow();};FocusManager.prototype._reportBlur=function(where){if(this.debug){console.log('FocusManager._reportBlur('+where+')');}
if(this._hasFocus){if(this._blurDelayTimeout){if(this.debug){console.log('FocusManager.blurPending');}
return;}
this._blurDelayTimeout=this.window.setTimeout(function(){if(this.debug){console.log('FocusManager.blur');}
this._hasFocus=false;this._checkShow();this._blurDelayTimeout=null;}.bind(this),this.blurDelay);}};FocusManager.prototype._eagerHelperChanged=function(){this._checkShow();};FocusManager.prototype.onInputChange=function(){this._recentOutput=false;this._checkShow();};FocusManager.prototype.helpRequest=function(){if(this.debug){console.log('FocusManager.helpRequest');}
this._helpRequested=true;this._recentOutput=false;this._checkShow();};FocusManager.prototype.removeHelp=function(){if(this.debug){console.log('FocusManager.removeHelp');}
this._importantFieldFlag=false;this._isError=false;this._helpRequested=false;this._recentOutput=false;this._checkShow();};FocusManager.prototype.setImportantFieldFlag=function(flag){if(this.debug){console.log('FocusManager.setImportantFieldFlag',flag);}
this._importantFieldFlag=flag;this._checkShow();};FocusManager.prototype.setError=function(isError){if(this.debug){console.log('FocusManager._isError',isError);}
this._isError=isError;this._checkShow();};FocusManager.prototype._checkShow=function(){var fire=false;var ev={tooltipVisible:this.isTooltipVisible,outputVisible:this.isOutputVisible};var showTooltip=this._shouldShowTooltip();if(this.isTooltipVisible!==showTooltip.visible){ev.tooltipVisible=this.isTooltipVisible=showTooltip.visible;fire=true;}
var showOutput=this._shouldShowOutput();if(this.isOutputVisible!==showOutput.visible){ev.outputVisible=this.isOutputVisible=showOutput.visible;fire=true;}
if(fire){if(this.debug){console.log('FocusManager.onVisibilityChange',ev);}
this.onVisibilityChange(ev);}};FocusManager.prototype._shouldShowTooltip=function(){var eagerHelper=this.settings.get('eagerHelper');if(eagerHelper.value===Eagerness.NEVER){return{visible:false,reason:'eagerHelperNever'};}
if(eagerHelper.value===Eagerness.ALWAYS){return{visible:true,reason:'eagerHelperAlways'};}
if(!this._hasFocus){return{visible:false,reason:'notHasFocus'};}
if(this._isError){return{visible:true,reason:'isError'};}
if(this._helpRequested){return{visible:true,reason:'helpRequested'};}
if(this._importantFieldFlag){return{visible:true,reason:'importantFieldFlag'};}
return{visible:false,reason:'default'};};FocusManager.prototype._shouldShowOutput=function(){if(!this._hasFocus){return{visible:false,reason:'notHasFocus'};}
if(this._recentOutput){return{visible:true,reason:'recentOutput'};}
return{visible:false,reason:'default'};};exports.FocusManager=FocusManager;