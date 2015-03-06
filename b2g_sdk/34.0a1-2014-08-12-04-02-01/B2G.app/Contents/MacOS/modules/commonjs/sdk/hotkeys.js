"use strict";module.metadata={"stability":"stable"};const INVALID_HOTKEY="Hotkey must have at least one modifier.";const{toJSON:jsonify,toString:stringify,isFunctionKey}=require("./keyboard/utils");const{register,unregister}=require("./keyboard/hotkeys");const Hotkey=exports.Hotkey=function Hotkey(options){if(!(this instanceof Hotkey))
return new Hotkey(options);let hotkey=jsonify(options.combo);if(!isFunctionKey(hotkey.key)&&!hotkey.modifiers.length){throw new TypeError(INVALID_HOTKEY);}
this.onPress=options.onPress&&options.onPress.bind(this);this.toString=stringify.bind(null,hotkey);

register(this.toString(),this.onPress);
return Object.freeze(this);};Hotkey.prototype.destroy=function destroy(){unregister(this.toString(),this.onPress);};