

function WorkerPort(portid){AbstractPort.call(this,portid);}
WorkerPort.prototype={__proto__:AbstractPort.prototype,_portType:"worker",_dopost:function fw_WorkerPort_dopost(data){_postMessage(data,"*");},_onerror:function fw_WorkerPort_onerror(err){
throw{message:"Port "+this+" handler failed: "+err.message,__proto__:err};}}
function importScripts(){for(var i=0;i<arguments.length;i++){var scriptURL=arguments[i];var xhr=new XMLHttpRequest();xhr.open('GET',scriptURL,false);xhr.onreadystatechange=function(aEvt){if(xhr.readyState==4){if(xhr.status==200||xhr.status==0){_evalInSandbox(xhr.responseText,scriptURL);}
else{throw new Error("Unable to importScripts ["+scriptURL+"], status "+xhr.status)}}};xhr.send(null);}}
function __initWorkerMessageHandler(){let ports={};function messageHandler(event){let data=event.data;let portid=data.portId;let port;if(!data.portFromType||data.portFromType==="worker"){return;}
switch(data.portTopic){case"port-create":
 port=new WorkerPort(portid);ports[portid]=port;try{onconnect({ports:[port]});}catch(e){
 port._postControlMessage("port-connection-error",JSON.stringify(e.toString()));throw e;}
break;case"port-close":port=ports[portid];if(!port){

return;}
delete ports[portid];port.close();break;case"port-message":port=ports[portid];if(!port){return;}
port._onmessage(data.data);break;default:break;}}
_addEventListener('message',messageHandler);}
__initWorkerMessageHandler();