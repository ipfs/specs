!function()
{
	var pktObj = {ic:1};
	pktObj.l = function()
	{
		var v = '1'; // version for us to change if we need to do something different per embed code version
		
		var d = document;
		var link, label, count, saveurl, src, width, height;
		var pi=0, i=0, linksToReplace = [];
		
		var links = d.getElementsByTagName('a');
		for(i=0; i<links.length; i++)
		{
			var link = links[i];
			if (link.className.indexOf('pocket-btn') > -1)
			{
				linksToReplace.push(link); // we have to delay it because we are going through the childNode structure
			}
		}
		
		for(i=0; i<linksToReplace.length; i++)
		{
			link = linksToReplace[i];
			
			label = link.getAttribute('data-pocket-label') || 'pocket';
			count = link.getAttribute('data-pocket-count') || 'none';
			align = link.getAttribute('data-pocket-align') || false;
			saveurl = link.getAttribute('data-save-url')?decodeURIComponent(link.getAttribute('data-save-url')):document.location.href;
			savetitle = link.getAttribute('data-save-title')?decodeURIComponent(link.getAttribute('data-save-title')):document.title;
			savesrc	= document.location.href;
			
			if (count == 'vertical')
			{
				width = label == 'pocket' ? 60 : 56;
				height = 63;
			}
			else
			{
				width = count == 'horizontal' ? 135 : 66;
				height = 22;
			}
			
			var subd;
			try { subd = _PKTWIDGETSUBD; } catch(e){}
			if (!subd)
				subd = 'widgets';
			
			src = 'https://'+subd+'.getpocket.com/v1/button?label='+label+'&count='+count+(align?'&align='+align:'')+'&v='+v+'&url='+encodeURIComponent(saveurl)+'&title='+encodeURIComponent(savetitle)+'&src='+encodeURIComponent(savesrc)+'&r='+Math.random();
			
			var div = d.createElement('div');
			div.className = 'pocket-btn';
			div.innerHTML = '<iframe width="'+width+'" height="'+height+'" id="pocket-button-'+pi+'" frameBorder="0" allowTransparency="true" scrolling="NO" src="'+src+'"></iframe>';
			link.parentNode.replaceChild(div, link);
			
			pi++;
		}
	}
	
	pktObj.chk = function()
	{
		if (document.readyState === "complete" || document.readyState === "interactive")
		{
			if (pktObj.to)
				clearTimeout(pktObj.to);
			pktObj.l();
		}
	
		else
		{
			var wait = pktObj.ic * 10;
			if (wait > 100) wait = 100;
			pktObj.to = setTimeout(function(){pktObj.chk()},wait);
			pktObj.ic++;
		}
	}
	
	pktObj.chk();
}();