window.onload = function(){
	
}

function updateListing()
{
	var frame = document.getElementById('listing');
	frame.src="";
	frame.src="/list";
}

function clearDownloads()
{
	var ajax = new XMLHttpRequest();
	ajax.onreadystatechange = function(){
		console.log("===>", arguments);
		updateListing();
	};
	ajax.open("POST", "/clearDownloads", true);
	ajax.send();
}