this.EXPORTED_SYMBOLS=["PopupNotifications"];var Cc=Components.classes,Ci=Components.interfaces,Cu=Components.utils;Cu.import("resource://gre/modules/Services.jsm");const NOTIFICATION_EVENT_DISMISSED="dismissed";const NOTIFICATION_EVENT_REMOVED="removed";const NOTIFICATION_EVENT_SHOWING="showing";const NOTIFICATION_EVENT_SHOWN="shown";const NOTIFICATION_EVENT_SWAPPING="swapping";const ICON_SELECTOR=".notification-anchor-icon";const ICON_ATTRIBUTE_SHOWING="showing";const PREF_SECURITY_DELAY="security.notification_enable_delay";let popupNotificationsMap=new WeakMap();let gNotificationParents=new WeakMap;function getAnchorFromBrowser(aBrowser){let anchor=aBrowser.getAttribute("popupnotificationanchor")||aBrowser.popupnotificationanchor;if(anchor){if(anchor instanceof Ci.nsIDOMXULElement){return anchor;}
return aBrowser.ownerDocument.getElementById(anchor);}
return null;}
function Notification(id,message,anchorID,mainAction,secondaryActions,browser,owner,options){this.id=id;this.message=message;this.anchorID=anchorID;this.mainAction=mainAction;this.secondaryActions=secondaryActions||[];this.browser=browser;this.owner=owner;this.options=options||{};}
Notification.prototype={id:null,message:null,anchorID:null,mainAction:null,secondaryActions:null,browser:null,owner:null,options:null,timeShown:null,remove:function Notification_remove(){this.owner.remove(this);},get anchorElement(){let iconBox=this.owner.iconBox;let anchorElement=getAnchorFromBrowser(this.browser);if(!iconBox)
return anchorElement;if(!anchorElement&&this.anchorID)
anchorElement=iconBox.querySelector("#"+this.anchorID); if(!anchorElement)
anchorElement=iconBox.querySelector("#default-notification-icon")||iconBox;return anchorElement;},reshow:function(){this.owner._reshowNotifications(this.anchorElement,this.browser);}};this.PopupNotifications=function PopupNotifications(tabbrowser,panel,iconBox){if(!(tabbrowser instanceof Ci.nsIDOMXULElement))
throw"Invalid tabbrowser";if(iconBox&&!(iconBox instanceof Ci.nsIDOMXULElement))
throw"Invalid iconBox";if(!(panel instanceof Ci.nsIDOMXULElement))
throw"Invalid panel";this.window=tabbrowser.ownerDocument.defaultView;this.panel=panel;this.tabbrowser=tabbrowser;this.iconBox=iconBox;this.buttonDelay=Services.prefs.getIntPref(PREF_SECURITY_DELAY);this.panel.addEventListener("popuphidden",this,true);this.window.addEventListener("activate",this,true);if(this.tabbrowser.tabContainer)
this.tabbrowser.tabContainer.addEventListener("TabSelect",this,true);}
PopupNotifications.prototype={window:null,panel:null,tabbrowser:null,_iconBox:null,set iconBox(iconBox){ if(this._iconBox){this._iconBox.removeEventListener("click",this,false);this._iconBox.removeEventListener("keypress",this,false);}
this._iconBox=iconBox;if(iconBox){iconBox.addEventListener("click",this,false);iconBox.addEventListener("keypress",this,false);}},get iconBox(){return this._iconBox;},set transitionsEnabled(state){if(state){this.panel.removeAttribute("animate");}
else{this.panel.setAttribute("animate","false");}},getNotification:function PopupNotifications_getNotification(id,browser){let n=null;let notifications=this._getNotificationsForBrowser(browser||this.tabbrowser.selectedBrowser);notifications.some(function(x)x.id==id&&(n=x));return n;},show:function PopupNotifications_show(browser,id,message,anchorID,mainAction,secondaryActions,options){function isInvalidAction(a){return!a||!(typeof(a.callback)=="function")||!a.label||!a.accessKey;}
if(!browser)
throw"PopupNotifications_show: invalid browser";if(!id)
throw"PopupNotifications_show: invalid ID";if(mainAction&&isInvalidAction(mainAction))
throw"PopupNotifications_show: invalid mainAction";if(secondaryActions&&secondaryActions.some(isInvalidAction))
throw"PopupNotifications_show: invalid secondaryActions";if(options&&options.hideNotNow&&(!secondaryActions||!secondaryActions.length||!secondaryActions.concat(mainAction).some(action=>action.dismiss)))
throw"PopupNotifications_show: 'Not Now' item hidden without replacement";let notification=new Notification(id,message,anchorID,mainAction,secondaryActions,browser,this,options);if(options&&options.dismissed)
notification.dismissed=true;let existingNotification=this.getNotification(id,browser);if(existingNotification)
this._remove(existingNotification);let notifications=this._getNotificationsForBrowser(browser);notifications.push(notification);let isActive=this._isActiveBrowser(browser);let fm=Cc["@mozilla.org/focus-manager;1"].getService(Ci.nsIFocusManager);if(isActive&&fm.activeWindow==this.window){ this._update(notifications,notification.anchorElement,true);}else{





if(!notification.dismissed&&isActive){this.window.getAttention();if(notification.anchorElement.parentNode!=this.iconBox){this._updateAnchorIcon(notifications,notification.anchorElement);}}
this._notify("backgroundShow");}
return notification;},get isPanelOpen(){let panelState=this.panel.state;return panelState=="showing"||panelState=="open";},locationChange:function PopupNotifications_locationChange(aBrowser){if(!aBrowser)
throw"PopupNotifications_locationChange: invalid browser";let notifications=this._getNotificationsForBrowser(aBrowser);notifications=notifications.filter(function(notification){
 if(notification.options.persistWhileVisible&&this.isPanelOpen){if("persistence"in notification.options&&notification.options.persistence)
notification.options.persistence--;return true;}
 
if("persistence"in notification.options&&notification.options.persistence){notification.options.persistence--;return true;} 
if("timeout"in notification.options&&Date.now()<=notification.options.timeout){return true;}
this._fireCallback(notification,NOTIFICATION_EVENT_REMOVED);return false;},this);this._setNotificationsForBrowser(aBrowser,notifications);if(this._isActiveBrowser(aBrowser)){

let anchorElement=notifications.length>0?notifications[0].anchorElement:null;if(!anchorElement)
anchorElement=getAnchorFromBrowser(aBrowser);this._update(notifications,anchorElement);}},remove:function PopupNotifications_remove(notification){this._remove(notification);if(this._isActiveBrowser(notification.browser)){let notifications=this._getNotificationsForBrowser(notification.browser);this._update(notifications,notification.anchorElement);}},handleEvent:function(aEvent){switch(aEvent.type){case"popuphidden":this._onPopupHidden(aEvent);break;case"activate":case"TabSelect":let self=this;
this.window.setTimeout(function(){self._update();},0);break;case"click":case"keypress":this._onIconBoxCommand(aEvent);break;}},
_ignoreDismissal:null,_currentAnchorElement:null,get _currentNotifications(){return this.tabbrowser.selectedBrowser?this._getNotificationsForBrowser(this.tabbrowser.selectedBrowser):[];},_remove:function PopupNotifications_removeHelper(notification){
let notifications=this._getNotificationsForBrowser(notification.browser);if(!notifications)
return;var index=notifications.indexOf(notification);if(index==-1)
return;if(this._isActiveBrowser(notification.browser))
notification.anchorElement.removeAttribute(ICON_ATTRIBUTE_SHOWING); notifications.splice(index,1);this._fireCallback(notification,NOTIFICATION_EVENT_REMOVED);},_dismiss:function PopupNotifications_dismiss(){let browser=this.panel.firstChild&&this.panel.firstChild.notification.browser;this.panel.hidePopup();if(browser)
browser.focus();},_hidePanel:function PopupNotifications_hide(){this._ignoreDismissal=true;this.panel.hidePopup();this._ignoreDismissal=false;},_clearPanel:function(){let popupnotification;while((popupnotification=this.panel.lastChild)){this.panel.removeChild(popupnotification);
let originalParent=gNotificationParents.get(popupnotification);if(originalParent){popupnotification.notification=null;

let contentNode=popupnotification.lastChild;while(contentNode){let previousSibling=contentNode.previousSibling;if(contentNode.nodeName!="popupnotificationcontent")
popupnotification.removeChild(contentNode);contentNode=previousSibling;}

popupnotification.hidden=true;originalParent.appendChild(popupnotification);}}},_refreshPanel:function PopupNotifications_refreshPanel(notificationsToShow){this._clearPanel();const XUL_NS="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";notificationsToShow.forEach(function(n){let doc=this.window.document;
let popupnotificationID=n.id+"-notification";
let popupnotification=doc.getElementById(popupnotificationID);if(popupnotification)
gNotificationParents.set(popupnotification,popupnotification.parentNode);else
popupnotification=doc.createElementNS(XUL_NS,"popupnotification");popupnotification.setAttribute("label",n.message);popupnotification.setAttribute("id",popupnotificationID);popupnotification.setAttribute("popupid",n.id);popupnotification.setAttribute("closebuttoncommand","PopupNotifications._dismiss();");if(n.mainAction){popupnotification.setAttribute("buttonlabel",n.mainAction.label);popupnotification.setAttribute("buttonaccesskey",n.mainAction.accessKey);popupnotification.setAttribute("buttoncommand","PopupNotifications._onButtonCommand(event);");popupnotification.setAttribute("menucommand","PopupNotifications._onMenuCommand(event);");popupnotification.setAttribute("closeitemcommand","PopupNotifications._dismiss();event.stopPropagation();");}else{popupnotification.removeAttribute("buttonlabel");popupnotification.removeAttribute("buttonaccesskey");popupnotification.removeAttribute("buttoncommand");popupnotification.removeAttribute("menucommand");popupnotification.removeAttribute("closeitemcommand");}
if(n.options.popupIconURL)
popupnotification.setAttribute("icon",n.options.popupIconURL);if(n.options.learnMoreURL)
popupnotification.setAttribute("learnmoreurl",n.options.learnMoreURL);else
popupnotification.removeAttribute("learnmoreurl");popupnotification.notification=n;if(n.secondaryActions){n.secondaryActions.forEach(function(a){let item=doc.createElementNS(XUL_NS,"menuitem");item.setAttribute("label",a.label);item.setAttribute("accesskey",a.accessKey);item.notification=n;item.action=a;popupnotification.appendChild(item);},this);if(n.options.hideNotNow){popupnotification.setAttribute("hidenotnow","true");}
else if(n.secondaryActions.length){let closeItemSeparator=doc.createElementNS(XUL_NS,"menuseparator");popupnotification.appendChild(closeItemSeparator);}}
this.panel.appendChild(popupnotification);
popupnotification.hidden=false;},this);},_showPanel:function PopupNotifications_showPanel(notificationsToShow,anchorElement){this.panel.hidden=false;notificationsToShow=notificationsToShow.filter(n=>{let dismiss=this._fireCallback(n,NOTIFICATION_EVENT_SHOWING);if(dismiss)
n.dismissed=true;return!dismiss;});if(!notificationsToShow.length)
return;this._refreshPanel(notificationsToShow);if(this.isPanelOpen&&this._currentAnchorElement==anchorElement)
return;

this._hidePanel();

let selectedTab=this.tabbrowser.selectedTab;if(anchorElement){let bo=anchorElement.boxObject;if(bo.height==0&&bo.width==0)
anchorElement=selectedTab;}else{anchorElement=selectedTab;}
this._currentAnchorElement=anchorElement;
this.panel.setAttribute("popupid",this.panel.firstChild.getAttribute("popupid"));notificationsToShow.forEach(function(n){n.timeShown=this.window.performance.now();},this);this.panel.openPopup(anchorElement,"bottomcenter topleft");notificationsToShow.forEach(function(n){this._fireCallback(n,NOTIFICATION_EVENT_SHOWN);},this);},_update:function PopupNotifications_update(notifications,anchor,dismissShowing=false){let useIconBox=this.iconBox&&(!anchor||anchor.parentNode==this.iconBox);if(useIconBox){this._hideIcons();}
let anchorElement=anchor,notificationsToShow=[];if(!notifications)
notifications=this._currentNotifications;let haveNotifications=notifications.length>0;if(haveNotifications){

anchorElement=anchor||notifications[0].anchorElement;if(useIconBox){this._showIcons(notifications);this.iconBox.hidden=false;}else if(anchorElement){this._updateAnchorIcon(notifications,anchorElement);}
notificationsToShow=notifications.filter(function(n){return!n.dismissed&&n.anchorElement==anchorElement&&!n.options.neverShow;});}
if(notificationsToShow.length>0){this._showPanel(notificationsToShow,anchorElement);}else{this._notify("updateNotShowing");

if(!dismissShowing)
this._dismiss();
if(!haveNotifications){if(useIconBox)
this.iconBox.hidden=true;else if(anchorElement)
anchorElement.removeAttribute(ICON_ATTRIBUTE_SHOWING);}}},_updateAnchorIcon:function PopupNotifications_updateAnchorIcon(notifications,anchorElement){anchorElement.setAttribute(ICON_ATTRIBUTE_SHOWING,"true");


if(anchorElement.classList.contains("notification-anchor-icon")){ let className=anchorElement.className.replace(/([-\w]+-notification-icon\s?)/g,"")
className="default-notification-icon "+className;if(notifications.length==1){className=notifications[0].anchorID+" "+className;}
anchorElement.className=className;}},_showIcons:function PopupNotifications_showIcons(aCurrentNotifications){for(let notification of aCurrentNotifications){let anchorElm=notification.anchorElement;if(anchorElm){anchorElm.setAttribute(ICON_ATTRIBUTE_SHOWING,"true");}}},_hideIcons:function PopupNotifications_hideIcons(){let icons=this.iconBox.querySelectorAll(ICON_SELECTOR);for(let icon of icons){icon.removeAttribute(ICON_ATTRIBUTE_SHOWING);}},_getNotificationsForBrowser:function PopupNotifications_getNotifications(browser){let notifications=popupNotificationsMap.get(browser);if(!notifications){notifications=[];popupNotificationsMap.set(browser,notifications);}
return notifications;},_setNotificationsForBrowser:function PopupNotifications_setNotifications(browser,notifications){popupNotificationsMap.set(browser,notifications);return notifications;},_isActiveBrowser:function(browser){return browser.docShell?browser.docShell.isActive:(this.window.gBrowser.selectedBrowser==browser);},_onIconBoxCommand:function PopupNotifications_onIconBoxCommand(event){ let type=event.type;if(type=="click"&&event.button!=0)
return;if(type=="keypress"&&!(event.charCode==Ci.nsIDOMKeyEvent.DOM_VK_SPACE||event.keyCode==Ci.nsIDOMKeyEvent.DOM_VK_RETURN))
return;if(this._currentNotifications.length==0)
return; let anchor=event.target;while(anchor&&anchor.parentNode!=this.iconBox)
anchor=anchor.parentNode;this._reshowNotifications(anchor);},_reshowNotifications:function PopupNotifications_reshowNotifications(anchor,browser){ let notifications=this._getNotificationsForBrowser(browser||this.tabbrowser.selectedBrowser);notifications.forEach(function(n){if(n.anchorElement==anchor)
n.dismissed=false;});this._update(notifications,anchor);},_swapBrowserNotifications:function PopupNotifications_swapBrowserNoficications(ourBrowser,otherBrowser){
let ourNotifications=this._getNotificationsForBrowser(ourBrowser);let other=otherBrowser.ownerDocument.defaultView.PopupNotifications;if(!other){if(ourNotifications.length>0)
Cu.reportError("unable to swap notifications: otherBrowser doesn't support notifications");return;}
let otherNotifications=other._getNotificationsForBrowser(otherBrowser);if(ourNotifications.length<1&&otherNotifications.length<1){return;}
otherNotifications=otherNotifications.filter(n=>{if(this._fireCallback(n,NOTIFICATION_EVENT_SWAPPING,ourBrowser)){n.browser=ourBrowser;n.owner=this;return true;}
other._fireCallback(n,NOTIFICATION_EVENT_REMOVED);return false;});ourNotifications=ourNotifications.filter(n=>{if(this._fireCallback(n,NOTIFICATION_EVENT_SWAPPING,otherBrowser)){n.browser=otherBrowser;n.owner=other;return true;}
this._fireCallback(n,NOTIFICATION_EVENT_REMOVED);return false;});this._setNotificationsForBrowser(otherBrowser,ourNotifications);other._setNotificationsForBrowser(ourBrowser,otherNotifications);if(otherNotifications.length>0)
this._update(otherNotifications,otherNotifications[0].anchorElement);if(ourNotifications.length>0)
other._update(ourNotifications,ourNotifications[0].anchorElement);},_fireCallback:function PopupNotifications_fireCallback(n,event,...args){try{if(n.options.eventCallback)
return n.options.eventCallback.call(n,event,...args);}catch(error){Cu.reportError(error);}
return undefined;},_onPopupHidden:function PopupNotifications_onPopupHidden(event){if(event.target!=this.panel||this._ignoreDismissal)
return;let browser=this.panel.firstChild&&this.panel.firstChild.notification.browser;if(!browser)
return;let notifications=this._getNotificationsForBrowser(browser); Array.forEach(this.panel.childNodes,function(nEl){let notificationObj=nEl.notification;if(notifications.indexOf(notificationObj)==-1)
return;
if(notificationObj.options.removeOnDismissal)
this._remove(notificationObj);else{notificationObj.dismissed=true;this._fireCallback(notificationObj,NOTIFICATION_EVENT_DISMISSED);}},this);this._clearPanel();this._update();},_onButtonCommand:function PopupNotifications_onButtonCommand(event){


let target=event.originalTarget;let notificationEl;let parent=target;while(parent&&(parent=target.ownerDocument.getBindingParent(parent)))
notificationEl=parent;if(!notificationEl)
throw"PopupNotifications_onButtonCommand: couldn't find notification element";if(!notificationEl.notification)
throw"PopupNotifications_onButtonCommand: couldn't find notification";let notification=notificationEl.notification;let timeSinceShown=this.window.performance.now()-notification.timeShown;if(!notification.timeMainActionFirstTriggered){notification.timeMainActionFirstTriggered=timeSinceShown;Services.telemetry.getHistogramById("POPUP_NOTIFICATION_MAINACTION_TRIGGERED_MS").add(timeSinceShown);}
if(timeSinceShown<this.buttonDelay){Services.console.logStringMessage("PopupNotifications_onButtonCommand: "+"Button click happened before the security delay: "+
timeSinceShown+"ms");return;}
try{notification.mainAction.callback.call();}catch(error){Cu.reportError(error);}
if(notification.mainAction.dismiss){this._dismiss();return;}
this._remove(notification);this._update();},_onMenuCommand:function PopupNotifications_onMenuCommand(event){let target=event.originalTarget;if(!target.action||!target.notification)
throw"menucommand target has no associated action/notification";event.stopPropagation();try{target.action.callback.call();}catch(error){Cu.reportError(error);}
if(target.action.dismiss){this._dismiss();return;}
this._remove(target.notification);this._update();},_notify:function PopupNotifications_notify(topic){Services.obs.notifyObservers(null,"PopupNotifications-"+topic,"");},};