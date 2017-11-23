var hasSaved = false;

function btnClicked()
{	
	if (hasSaved)
	{
		window.open('https://'+POCKET_DOMAIN+'/a/', 'pktbtn_queue');
	}
	else if (iLi)
	{
		var img = new ajaxImage('https://'+POCKET_DOMAIN+'/widgets/v1/button_save.gif', btnData, btnCallback);
		img.send();
		
		saved();
	}
	else
		openLogin();
}

function btnCallback(img, width)
{
	if (width == 1)
	{
		// already visually showed the save, nothing new to do
	}
	else if (width == 2)
	{
		// They are no longer authorized. However, we cannot immediately open a new window here
		// or we'll get blocked by pop-up blockers (since it isn't directly on a click event anymore)
		// By setting iLi to false, then the next time they click they'll be prompted with the login window.
		iLi = false;
		alert('Could not save to Pocket. Please make sure you are logged in and try again.');
	}
	else // width = 0 or 3
	{
		// TODO : What is the best behavior here? Maybe open a window to /edit?
		alert('There was a problem when trying to save to Pocket. Please try again.');
	}
}

function saved()
{
	var cnt = document.getElementById('cnt');
	if (cnt)
	{
		// fade the number out, change it, and then fade it back in
		cnt.className = 'fadeOut';
		setTimeout(function(){ 
			cnt.innerHTML = addComma(cnt.innerHTML.replace(',','')*1 + 1);
			cnt.className = '';
		}, 333);
	}
	
	var btn = document.getElementById('btn');
	if (btn)
		btn.className = 'saved';
	
	hasSaved = true;
}

function openLogin()
{
	var w = 768;
	var h = 700;
	var sh=screen.height;
	var sw=screen.width;
	var x=Math.round((sw/2)-(w/2));
	var y=Math.round((sh/2)-(h/2));
	var newWindow = window.open('https://getpocket.com/signup'+paramStr(btnData),"pkt_button_"+(iLi?'1':'0'),"left="+x+",top="+y+",width="+w+",height="+h+",personalbar=no,toolbar=no,scrollbars=yes,location=yes,resizable=yes");
	
	watchForClose(newWindow);
	
	return false;
}

var watchTO;
function watchForClose(window)
{
	var w = window;
	var func = function(){ 
		//try{ 
			if (w.closed)
			{
				document.location.reload();
				clearInterval(watchTO);
			}
		//} catch(e) {console.log(e);}
	};
	watchTO = setInterval(func, 1000);
}

function addComma(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}


// Add btn click event
var btn = document.getElementById('btn');
btn.onclick = btnClicked;