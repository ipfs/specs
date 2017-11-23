(function(root,ns,factory){"use strict";if(typeof(module)!=='undefined'&&module.exports){module.exports=factory(ns,root);}else if(typeof(define)==='function'&&define.amd){define("factory",function(){return factory(ns,root);});}else{root[ns]=factory(ns,root);}}(window,'detectZoom',function(){var devicePixelRatio=function(){return window.devicePixelRatio||1;};var fallback=function(){return{zoom:1,devicePxPerCssPx:1};};var ie8=function(){var zoom=Math.round((screen.deviceXDPI/screen.logicalXDPI)*100)/100;return{zoom:zoom,devicePxPerCssPx:zoom*devicePixelRatio()};};var ie10=function(){var zoom=Math.round((document.documentElement.offsetHeight/window.innerHeight)*100)/100;return{zoom:zoom,devicePxPerCssPx:zoom*devicePixelRatio()};};var webkitMobile=function(){var deviceWidth=(Math.abs(window.orientation)==90)?screen.height:screen.width;var zoom=deviceWidth/window.innerWidth;return{zoom:zoom,devicePxPerCssPx:zoom*devicePixelRatio()};};var webkit=function(){var important=function(str){return str.replace(/;/g," !important;");};var div=document.createElement('div');div.innerHTML="1<br>2<br>3<br>4<br>5<br>6<br>7<br>8<br>9<br>0";div.setAttribute('style',important('font: 100px/1em sans-serif; -webkit-text-size-adjust: none; text-size-adjust: none; height: auto; width: 1em; padding: 0; overflow: visible;'));var container=document.createElement('div');container.setAttribute('style',important('width:0; height:0; overflow:hidden; visibility:hidden; position: absolute;'));container.appendChild(div);document.body.appendChild(container);var zoom=1000/div.clientHeight;zoom=Math.round(zoom*100)/100;document.body.removeChild(container);return{zoom:zoom,devicePxPerCssPx:zoom*devicePixelRatio()};};var firefox4=function(){var zoom=mediaQueryBinarySearch('min--moz-device-pixel-ratio','',0,10,20,0.0001);zoom=Math.round(zoom*100)/100;return{zoom:zoom,devicePxPerCssPx:zoom};};var firefox18=function(){return{zoom:firefox4().zoom,devicePxPerCssPx:devicePixelRatio()};};var opera11=function(){var zoom=window.top.outerWidth/window.top.innerWidth;zoom=Math.round(zoom*100)/100;return{zoom:zoom,devicePxPerCssPx:zoom*devicePixelRatio()};};var mediaQueryBinarySearch=function(property,unit,a,b,maxIter,epsilon){var matchMedia;var head,style,div;if(window.matchMedia){matchMedia=window.matchMedia;}else{head=document.getElementsByTagName('head')[0];style=document.createElement('style');head.appendChild(style);div=document.createElement('div');div.className='mediaQueryBinarySearch';div.style.display='none';document.body.appendChild(div);matchMedia=function(query){style.sheet.insertRule('@media '+query+'{.mediaQueryBinarySearch '+'{text-decoration: underline} }',0);var matched=getComputedStyle(div,null).textDecoration=='underline';style.sheet.deleteRule(0);return{matches:matched};};}
var ratio=binarySearch(a,b,maxIter);if(div){head.removeChild(style);document.body.removeChild(div);}
return ratio;function binarySearch(a,b,maxIter){var mid=(a+b)/2;if(maxIter<=0||b-a<epsilon){return mid;}
var query="("+property+":"+mid+unit+")";if(matchMedia(query).matches){return binarySearch(mid,b,maxIter-1);}else{return binarySearch(a,mid,maxIter-1);}}};var detectFunction=(function(){var func=fallback;if(!isNaN(screen.logicalXDPI)&&!isNaN(screen.systemXDPI)){func=ie8;}
else if(window.navigator.msMaxTouchPoints){func=ie10;}
else if('orientation'in window&&typeof document.body.style.webkitMarquee==='string'){func=webkitMobile;}
else if(typeof document.body.style.webkitMarquee==='string'){func=webkit;}
else if(navigator.userAgent.indexOf('Opera')>=0){func=opera11;}
else if(window.devicePixelRatio){func=firefox18;}
else if(firefox4().zoom>0.001){func=firefox4;}
return func;}());return({zoom:function(){return detectFunction().zoom;},device:function(){return detectFunction().devicePxPerCssPx;}});}));var wpcom_img_zoomer={zoomed:false,timer:null,interval:1000,imgNeedsSizeAtts:function(img){if(img.getAttribute('width')!==null||img.getAttribute('height')!==null)
return false;if(img.width<img.naturalWidth||img.height<img.naturalHeight)
return false;return true;},updateResizeUrl:function(url,width,height){var url_resize=url.match(/resize=([0-9%2C,]+)/);if(url_resize===null||!url_resize[1]){return url;}
var url_sizes=url_resize[1].split(',');var new_resize=null;if(url_sizes[0]!==width){new_resize=width;}
if(url_sizes[1]!==height){if(new_resize!==null){new_resize+='%2C';}
new_resize+=height;}
if(new_resize!==url_resize[1]){new_resize='resize='+new_resize;url=url.replace(url_resize[0],new_resize);}
return url;},init:function(){var t=this;try{t.zoomImages();t.timer=setInterval(function(){t.zoomImages();},t.interval);}
catch(e){}},stop:function(){if(this.timer)
clearInterval(this.timer);},getScale:function(){var scale=detectZoom.device();if(scale>3){scale=Math.ceil(scale*2)/2;}
return scale;},shouldZoom:function(scale){var t=this;if("innerWidth"in window&&!window.innerWidth)
return false;if(scale==1.0&&t.zoomed==false)
return false;return true;},zoomImages:function(){var t=this;var scale=t.getScale();if(!t.shouldZoom(scale)){return;}
t.zoomed=true;var imgs=document.getElementsByTagName("img");for(var i=0;i<imgs.length;i++){if("complete"in imgs[i]&&!imgs[i].complete)
continue;if(imgs[i].hasAttribute('srcset')&&imgs[i].hasAttribute('sizes')&&('sizes'in imgs[i])){continue;}
var imgScale=imgs[i].getAttribute("scale");if(imgScale==scale||imgScale=="0")
continue;var scaleFail=imgs[i].getAttribute("scale-fail");if(scaleFail&&scaleFail<=scale)
continue;if(!(imgs[i].width&&imgs[i].height))
continue;if(!imgScale&&imgs[i].getAttribute("data-lazy-src")&&(imgs[i].getAttribute("data-lazy-src")!==imgs[i].getAttribute("src")))
continue;if(t.scaleImage(imgs[i],scale)){imgs[i].setAttribute("scale",scale);}
else{imgs[i].setAttribute("scale","0");}}},scaleImage:function(img,scale){var t=this;var newSrc=img.src;if(img.parentNode.className.match(/slideshow-slide/))
return false;if(img.src.match(/^https?:\/\/([^\/]*\.)?gravatar\.com\/.+[?&](s|size)=/)){newSrc=img.src.replace(/([?&](s|size)=)(\d+)/,function($0,$1,$2,$3){var originalAtt="originals",originalSize=img.getAttribute(originalAtt);if(originalSize===null){originalSize=$3;img.setAttribute(originalAtt,originalSize);if(t.imgNeedsSizeAtts(img)){img.width=img.width;img.height=img.height;}}
var size=img.clientWidth;var targetSize=Math.ceil(img.clientWidth*scale);targetSize=Math.max(targetSize,originalSize);targetSize=Math.min(targetSize,512);return $1+targetSize;});}
else if(img.src.match(/^https?:\/\/([^\/]+)\.files\.wordpress\.com\/.+[?&][wh]=/)){if(img.src.match(/[?&]crop/))
return false;var changedAttrs={};var matches=img.src.match(/([?&]([wh])=)(\d+)/g);for(var i=0;i<matches.length;i++){var lr=matches[i].split('=');var thisAttr=lr[0].replace(/[?&]/g,'');var thisVal=lr[1];var originalAtt='original'+thisAttr,originalSize=img.getAttribute(originalAtt);if(originalSize===null){originalSize=thisVal;img.setAttribute(originalAtt,originalSize);if(t.imgNeedsSizeAtts(img)){img.width=img.width;img.height=img.height;}}
var size=thisAttr=='w'?img.clientWidth:img.clientHeight;var naturalSize=(thisAttr=='w'?img.naturalWidth:img.naturalHeight);var targetSize=Math.ceil(size*scale);targetSize=Math.max(targetSize,originalSize);if(scale>img.getAttribute("scale")&&targetSize<=naturalSize)
targetSize=thisVal;if(naturalSize<thisVal)
targetSize=thisVal;if(targetSize!=thisVal)
changedAttrs[thisAttr]=targetSize;}
var w=changedAttrs.w||false;var h=changedAttrs.h||false;if(w){newSrc=img.src.replace(/([?&])w=\d+/g,function($0,$1){return $1+'w='+w;});}
if(h){newSrc=newSrc.replace(/([?&])h=\d+/g,function($0,$1){return $1+'h='+h;});}}
else if(img.src.match(/^https?:\/\/([^\/]+\.)*(wordpress|wp)\.com\/mshots\/.+[?&]w=\d+/)){newSrc=img.src.replace(/([?&]w=)(\d+)/,function($0,$1,$2){var originalAtt='originalw',originalSize=img.getAttribute(originalAtt);if(originalSize===null){originalSize=$2;img.setAttribute(originalAtt,originalSize);if(t.imgNeedsSizeAtts(img)){img.width=img.width;img.height=img.height;}}
var size=img.clientWidth;var targetSize=Math.ceil(size*scale);targetSize=Math.max(targetSize,originalSize);if(scale>img.getAttribute("scale")&&targetSize<=img.naturalWidth)
targetSize=$2;if($2!=targetSize)
return $1+targetSize;return $0;});newSrc=newSrc.replace(/([?&]h=)(\d+)/,function($0,$1,$2){if(newSrc==img.src){return $0;}
var originalAtt='originalh',originalSize=img.getAttribute(originalAtt);if(originalSize===null){originalSize=$2;img.setAttribute(originalAtt,originalSize);}
var size=img.clientHeight;var targetSize=Math.ceil(size*scale);targetSize=Math.max(targetSize,originalSize);if(scale>img.getAttribute("scale")&&targetSize<=img.naturalHeight)
targetSize=$2;if($2!=targetSize)
return $1+targetSize;return $0;});}
else if(img.src.match(/^https?:\/\/([^\/.]+\.)*(wp|wordpress)\.com\/imgpress\?(.+)/)){var imgpressSafeFunctions=["zoom","url","h","w","fit","filter","brightness","contrast","colorize","smooth","unsharpmask"];var qs=RegExp.$3.split('&');for(var q in qs){q=qs[q].split('=')[0];if(imgpressSafeFunctions.indexOf(q)==-1){return false;}}
img.width=img.width;img.height=img.height;if(scale==1)
newSrc=img.src.replace(/\?(zoom=[^&]+&)?/,'?');else
newSrc=img.src.replace(/\?(zoom=[^&]+&)?/,'?zoom='+scale+'&');}
else if(img.src.match(/^https?:\/\/([^\/.]+\.)*(wp|wordpress)\.com\/latex\.php\?(latex|zoom)=(.+)/)||img.src.match(/^https?:\/\/i[\d]{1}\.wp\.com\/(.+)/)){if(navigator.userAgent.indexOf('Firefox')>-1){return;}
img.width=img.width;img.height=img.height;if(scale==1)
newSrc=img.src.replace(/\?(zoom=[^&]+&)?/,'?');else
newSrc=img.src.replace(/\?(zoom=[^&]+&)?/,'?zoom='+scale+'&');if(!img.srcset&&img.src.match(/resize/)){newSrc=t.updateResizeUrl(newSrc,img.width,img.height);img.setAttribute('srcset',newSrc);}}
else if(img.src.match(/^https?:\/\/[^\/]+\/.*[-@]([12])x\.(gif|jpeg|jpg|png)(\?|$)/)){img.width=img.width;img.height=img.height;var currentSize=RegExp.$1,newSize=currentSize;if(scale<=1)
newSize=1;else
newSize=2;if(currentSize!=newSize)
newSrc=img.src.replace(/([-@])[12]x\.(gif|jpeg|jpg|png)(\?|$)/,'$1'+newSize+'x.$2$3');}
else{return false;}
if(newSrc!=img.src){var prevSrc,origSrc=img.getAttribute("src-orig");if(!origSrc){origSrc=img.src;img.setAttribute("src-orig",origSrc);}
prevSrc=img.src;img.onerror=function(){img.src=prevSrc;if(img.getAttribute("scale-fail")<scale)
img.setAttribute("scale-fail",scale);img.onerror=null;};img.src=newSrc;}
return true;}};wpcom_img_zoomer.init();