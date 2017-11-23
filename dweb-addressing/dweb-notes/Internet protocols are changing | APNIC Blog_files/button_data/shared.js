function ajaxImage(url, data, callback)
{
	this.url = url;
	this.data = data;
	this.callback = callback;
}
ajaxImage.prototype = {

	send : function()
	{	
		var self = this;
		
		this.img = new Image();
		this.img.className = 'ajximg';
		this.img.onload = function(){ self.onLoad(); };
		this.img.onerror = function(){ self.onError(); };
		this.img.src = this.url + this.paramStr();
		
		document.body.appendChild(this.img);
	},
	
	paramStr : function()
	{
		return paramStr(this.data, true);
	},
	
	onLoad : function()
	{
		if (this.callback)
			this.callback(self, this.img.width);
	},
	
	onError : function()
	{
		if (this.callback)
			this.callback(self, 0);
	}
}

function paramStr(data, breakCache)
{
	if (breakCache)
	{
		if (!data)
			data = {};
		data['r'] = Math.random();
	}

	var params = '';
	for(var k in data)
	{
		params += '&'+encodeURIComponent(k)+'='+encodeURIComponent(data[k]);
	}
	
	if (params.length)
		params = '?' + params;
	
	return params;
}

function readCookie(name) 
{
	var nameEQ = name + "=";
	var ca = document.cookie.split(';');
	for(var i=0;i < ca.length;i++) {
		var c = ca[i];
		while (c.charAt(0)==' ') c = c.substring(1,c.length);
		if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
	}
	return null;
}