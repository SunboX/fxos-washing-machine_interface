'use strict';function History(){

this._buffer=[''];
this._current=0;}
History.prototype.destroy=function(){this._buffer=undefined;};History.prototype.add=function(command){this._buffer.splice(1,0,command);this._current=0;};History.prototype.forward=function(){if(this._current>0){this._current--;}
return this._buffer[this._current];};History.prototype.backward=function(){if(this._current<this._buffer.length-1){this._current++;}
return this._buffer[this._current];};exports.History=History;