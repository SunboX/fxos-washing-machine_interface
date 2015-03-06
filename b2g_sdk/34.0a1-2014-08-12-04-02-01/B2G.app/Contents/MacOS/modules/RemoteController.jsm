


this.EXPORTED_SYMBOLS=["RemoteController"];const Ci=Components.interfaces;const Cc=Components.classes;const Cu=Components.utils;Cu.import("resource://gre/modules/XPCOMUtils.jsm");function RemoteController(browser)
{this._browser=browser;}
RemoteController.prototype={QueryInterface:XPCOMUtils.generateQI([Ci.nsIController]),isCommandEnabled:function(aCommand){

return true;},supportsCommand:function(aCommand){if(!aCommand.startsWith("cmd_"))
return false;let commands=["cmd_copyLink","cmd_copyImage","cmd_undo","cmd_cut","cmd_copy","cmd_paste","cmd_delete","cmd_selectAll","cmd_switchTextDirection"];return commands.indexOf(aCommand)>=0;},doCommand:function(aCommand){this._browser.messageManager.sendAsyncMessage("ControllerCommands:Do",aCommand);},onEvent:function(){}};