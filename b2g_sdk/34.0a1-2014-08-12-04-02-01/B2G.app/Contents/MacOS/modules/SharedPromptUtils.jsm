this.EXPORTED_SYMBOLS=["PromptUtils"];const Cc=Components.classes;const Ci=Components.interfaces;const Cr=Components.results;const Cu=Components.utils;this.PromptUtils={


fireDialogEvent:function(domWin,eventName,maybeTarget){let target=maybeTarget||domWin;let event=domWin.document.createEvent("Events");event.initEvent(eventName,true,true);let winUtils=domWin.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);winUtils.dispatchEventToChromeOnly(target,event);},objectToPropBag:function(obj){let bag=Cc["@mozilla.org/hash-property-bag;1"].createInstance(Ci.nsIWritablePropertyBag2);bag.QueryInterface(Ci.nsIWritablePropertyBag);for(let propName in obj)
bag.setProperty(propName,obj[propName]);return bag;},propBagToObject:function(propBag,obj){


for(let propName in obj)
obj[propName]=propBag.getProperty(propName);},};