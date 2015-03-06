"use strict";this.EXPORTED_SYMBOLS=["BinarySearch",];this.BinarySearch=Object.freeze({indexOf:function(array,target,comparator){let[found,idx]=this.search(array,target,comparator);return found?idx:-1;},insertionIndexOf:function(array,target,comparator){return this.search(array,target,comparator)[1];},search:function(array,target,comparator){let low=0;let high=array.length-1;while(low<=high){let mid=Math.floor((low+high)/2);let cmp=comparator(target,array[mid]);if(cmp==0)
return[true,mid];if(cmp<0)
high=mid-1;else
low=mid+1;}
return[false,low];},});