this.EXPORTED_SYMBOLS=["Queue"];this.Queue=function Queue(){this._queue=[];this._index=0;}
Queue.prototype={getLength:function(){return(this._queue.length-this._index);},isEmpty:function(){return(this._queue.length==0);},enqueue:function(item){this._queue.push(item);},dequeue:function(){if(this.isEmpty())
return undefined;var item=this._queue[this._index];if(++this._index*2>=this._queue.length){this._queue=this._queue.slice(this._index);this._index=0;}
return item;}}