"use strict";module.metadata={"stability":"unstable"};const{observer:keyboardObserver}=require("./observer");const{getKeyForCode,normalize,isFunctionKey,MODIFIERS}=require("./utils");exports.register=function register(hotkey,listener){hotkey=normalize(hotkey);hotkeys[hotkey]=listener;};exports.unregister=function unregister(hotkey,listener){hotkey=normalize(hotkey);if(hotkeys[hotkey]===listener)
delete hotkeys[hotkey];};const hotkeys=exports.hotkeys={};keyboardObserver.on("keydown",function onKeypress(event,window){let key,modifiers=[];let isChar="isChar"in event&&event.isChar;let which="which"in event?event.which:null;let keyCode="keyCode"in event?event.keyCode:null;if("shiftKey"in event&&event.shiftKey)
modifiers.push("shift");if("altKey"in event&&event.altKey)
modifiers.push("alt");if("ctrlKey"in event&&event.ctrlKey)
modifiers.push("control");if("metaKey"in event&&event.metaKey)
modifiers.push("meta");
 key=getKeyForCode(keyCode);


if(!key||(!isFunctionKey(key)&&!modifiers.length)||key in MODIFIERS)
return;let combination=normalize({key:key,modifiers:modifiers});let hotkey=hotkeys[combination];if(hotkey){try{hotkey();}catch(exception){console.exception(exception);}finally{event.preventDefault();}}});