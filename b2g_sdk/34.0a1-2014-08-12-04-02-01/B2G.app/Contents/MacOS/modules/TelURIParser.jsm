"use strict";this.EXPORTED_SYMBOLS=["TelURIParser"];this.TelURIParser={parseURI:function(scheme,uri){ let subscriber=decodeURIComponent(uri.slice((scheme+':').length));if(!subscriber.length){return null;}
let number='';let pos=0;let len=subscriber.length; let visualSeparator=[' ','-','.','(',')'];let digits=['0','1','2','3','4','5','6','7','8','9'];let dtmfDigits=['*','#','A','B','C','D'];let pauseCharacter=['p','w']; if(subscriber[pos]=='+'){number+='+';for(++pos;pos<len;++pos){if(visualSeparator.indexOf(subscriber[pos])!=-1){number+=subscriber[pos];}else if(digits.indexOf(subscriber[pos])!=-1){number+=subscriber[pos];}else{break;}}} 
else{for(;pos<len;++pos){if(visualSeparator.indexOf(subscriber[pos])!=-1){number+=subscriber[pos];}else if(digits.indexOf(subscriber[pos])!=-1){number+=subscriber[pos];}else if(dtmfDigits.indexOf(subscriber[pos])!=-1){number+=subscriber[pos];}else if(pauseCharacter.indexOf(subscriber[pos])!=-1){number+=subscriber[pos];}else{break;}} 
if(!number.length){return null;} 
if(subscriber.substring(pos,pos+6)==';isub='){let subaddress='';for(pos+=6;pos<len;++pos){if(visualSeparator.indexOf(subscriber[pos])!=-1){subaddress+=subscriber[pos];}else if(digits.indexOf(subscriber[pos])!=-1){subaddress+=subscriber[pos];}else{break;}}
} 
if(subscriber.substring(pos,pos+7)==';postd='){let subaddress='';for(pos+=7;pos<len;++pos){if(visualSeparator.indexOf(subscriber[pos])!=-1){subaddress+=subscriber[pos];}else if(digits.indexOf(subscriber[pos])!=-1){subaddress+=subscriber[pos];}else if(dtmfDigits.indexOf(subscriber[pos])!=-1){subaddress+=subscriber[pos];}else if(pauseCharacter.indexOf(subscriber[pos])!=-1){subaddress+=subscriber[pos];}else{break;}}
} 
if(subscriber.substring(pos,pos+15)==';phone-context='){pos+=15; number=subscriber.substring(pos,subscriber.length)+number;}}
if(number.match(/[#\*]/)&&!number.match(/^[#\*]\d+$/)){return null;}
return number||null;}};