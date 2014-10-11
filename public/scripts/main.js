$(function (){
	var socket = io();

	setTimeout(function () {
		window.scrollTo(0,0);
	}, 0);

	console.log('start!');

	var obj = $('.js-canvas')[0];
	obj.addEventListener('touchstart', function(event) {
	  // If there's exactly one finger inside this element
	  for (var i = 0; i < event.targetTouches.length; i++) {
	  	var touch = event.targetTouches[i];
	  	socket.emit('touch', {x: touch.pageX, y: touch.pageY});
	  }
	  event.preventDefault();
	}, false);

});