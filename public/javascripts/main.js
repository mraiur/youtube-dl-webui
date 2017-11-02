window.onload = function(){
	timedUpdate();
}

function timedUpdate()
{
	updateListing();
	setTimeout(timedUpdate, 8000)
}

function updateListing()
{
	var frame = document.getElementById('listing');
	frame.src=""
	frame.src="/list"
}
