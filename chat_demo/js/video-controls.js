$(window).load(function() {

  // Video
  var video = $(".remoteVideo");

  // Buttons
  var muteButton = $("#mute");
  var fullScreenButton = $("#full-screen");

  // Sliders
  var volumeBar = $("#volume-bar");
  
  fullScreenButton.bind("click", function() {
	  if (video.requestFullscreen) {
		video.requestFullscreen();
	  } else if (video.mozRequestFullScreen) {
		video.mozRequestFullScreen(); // Firefox
	  } else if (video.webkitRequestFullscreen) {
		video.webkitRequestFullscreen(); // Chrome and Safari
	  }
	});

});
  
  /*if( video.prop('muted', true) ) {
	muteButton.attr('class','icon-volume-off');  
  }
  
  muteButton.bind("click", function() {	
	if( video.prop('muted', true) )
    {
		// Mute the video
        video.prop('muted', false);
		muteButton.attr('class','icon-volume-up');
    }
    else {
		// Unmute the video
		video.prop('muted', true);
		muteButton.attr('class','icon-volume-off');
    }
  });
});*/