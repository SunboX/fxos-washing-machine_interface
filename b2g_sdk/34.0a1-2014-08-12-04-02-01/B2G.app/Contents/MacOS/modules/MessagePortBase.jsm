this.EXPORTED_SYMBOLS=["AbstractPort"];this.AbstractPort=function AbstractPort(portid){this._portid=portid;this._handler=undefined;this._closed=false;this._pendingMessagesIncoming=[];};AbstractPort.prototype={_portType:null,_dopost:function fw_AbstractPort_dopost(data){throw new Error("not implemented");},_onerror:function fw_AbstractPort_onerror(err){throw new Error("not implemented");},toString:function fw_AbstractPort_toString(){return"MessagePort(portType='"+this._portType+"', portId="
+this._portid+(this._closed?", closed=true":"")+")";},_JSONParse:function fw_AbstractPort_JSONParse(data)JSON.parse(data),_postControlMessage:function fw_AbstractPort_postControlMessage(topic,data){let postData={portTopic:topic,portId:this._portid,portFromType:this._portType,data:data};this._dopost(postData);},_onmessage:function fw_AbstractPort_onmessage(data){


if(!this._handler){this._pendingMessagesIncoming.push(data);}else{data=this._JSONParse(data);try{this._handler({data:data,__exposedProps__:{data:'r'}});}catch(ex){this._onerror(ex);}}},set onmessage(handler){ this._handler=handler;while(this._pendingMessagesIncoming.length){this._onmessage(this._pendingMessagesIncoming.shift());}},get onmessage(){return this._handler;},postMessage:function fw_AbstractPort_postMessage(data){if(this._closed){throw new Error("port is closed");}



this._postControlMessage("port-message",JSON.stringify(data));},close:function fw_AbstractPort_close(){if(this._closed){return;}
this._postControlMessage("port-close");this._handler=null;this._pendingMessagesIncoming=[];this._closed=true;}};