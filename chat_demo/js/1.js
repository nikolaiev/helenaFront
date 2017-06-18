
var socket;//голбальный сокет
var room;
var isFirstVideoFlag=true;//first is always local!
var isAllowed=true;
var date_timer_obj;
var date_timer;
var isWarned=false;
var sex;

$(document).ready(function(){
	
	
	var _protocol=location.protocol=="http:"?"ws":"wss";
	var videoRTCPort=location.protocol=="http:"?':9085':':9083';//для установки видеосвязи!
	var dateServPort=location.protocol=="http:"?':9005':':9003';//для получения комманд сервера
	
	socket = io.connect(_protocol+'://'+location.hostname+dateServPort,{resource:'socket','force new connection':true});
		
	var connection = new initRTCMultiConnection()
	
	//====FUNCTIONS TO WORK WITH SOCKETS
	socket.on('connect',function(){
		socket.emit('id event',{'type':'videoAnonWindow'});  		
	});	
	
	socket.on('close this connection',function(data){
		if(data.force||room==data.room)
		{	
			//тройная защита 
			connection.leave()
			alertify.set('notifier','position', 'top-right');
			alertify.warning('Videodate is over!');
			setTimeout(function(){
				window.close();				
			},5000);
		}
	});
	
	socket.on('connect to the room',function(room_id){	
		console.log('connect to the room');
		console.log(room_id);
		
		room=room_id;		
		console.log('!connect to the room '+room)
		if(sex==1)
			connection.join(room);//Ж - присоединяется!
		else
			connection.open(room);//М - открывает!
	});
	

	
	//если 10 мин прошло, то сообщение о дополнительных взъемах денег
	socket.on('videodate for additional money',function(data){
		if(room==data.room)
		{
			$('#credits_amount').attr('style','color:red;');
			date_timer_obj.attr('style','color:red;');			
			if(!isWarned){
				isWarned=true;
				alertify.set('notifier','position', 'top-right');
				alertify.warning('Videodate for extra tokens!'); 			
			}			
		}else{
			console.log('cp5');
			console.log(room);
			console.log(data);
		}
	});
	
	socket.on('partner actual data',function(data){
		console.log('partner actual data')
		console.log(data)
		sex=data.sex
		var user_id=data.user_id;
		var firstname=data.firstname;
		$('#firstname').text(firstname);
		$('#partner_id').text(user_id);		
	})
	
	//старт времени
	socket.on('start timer',function(){
		date_timer_obj=$('#date_timer');
		startTimer();
	});
	
	//получаем сообщение о состоянии токенов!
	socket.on('credits left',function(data){		
		$('#tokens').fadeTo(0,100);
		$('#credits_amount').text(data.tokens);
	});
	
	//====FUNCTIONS TO WORK WITH webRTC CONNECTION
	function initRTCMultiConnection(){
		var connection = new RTCMultiConnection();
		
		connection.socketURL = _protocol+'://'+location.hostname+videoRTCPort;
		connection.socketMessageEvent = 'audio-video-file-chat-demo';
		
		 connection.session = {
                audio: true,
                video: true
            };

		connection.sdpConstraints.mandatory = {
			OfferToReceiveAudio: true,
			OfferToReceiveVideo: true
		};
		
		var videosContainer = document.getElementById('videos-container');
		connection.videosContainer=videosContainer;
		//var videosContainer = document.getElementById('videodate-window');
		
		connection.onstream = function(event) {
			console.log(' connection on stream event!');

			
			var mediaElement = getMediaElement(event.mediaElement, {
				title: event.userid,
				//buttons: ['full-screen'],
				showOnMouseEnter: false
			});
			//var mediaElement=event.mediaElement;

			connection.videosContainer.appendChild(event.mediaElement);
			mediaElement.id = event.streamid;

			setTimeout(function() {
				console.log('started playing! '+room);
				socket.emit('video started',room);
				mediaElement.media.play();
			}, 0);

			//с расчетом на то что видосиков только 2 
			if(isFirstVideoFlag){
				$($('#videos-container').children()[0]).addClass('localVideo');
				isFirstVideoFlag=false;
			}
			//скрываем нерабочие окна КОСТЫЛЬ!
			else if($('#videos-container').children().length>1){
				$($('#videos-container').children()[$('#videos-container').children().length-1]).addClass('remoteVideo');
				var _length=$('#videos-container').children().length;
				if(_length>2)
					for(var i=1;i<_length-1;i++){
						//sdelati .remove()
						$($('#videos-container').children()[i]).remove();
						
					}
			}
			
		};
		
		connection.onstreamended = function(event) {
			var mediaElement = document.getElementById(event.streamid);
			if(mediaElement) {
				mediaElement.parentNode.removeChild(mediaElement);
			}
		};
		
		connection.onEntireSessionClosed = function(event) {
                connection.attachStreams.forEach(function(stream) {
                    stream.stop();
                });

                // don't display alert for moderator
                /*
				if(connection.userid === event.userid) return;
                document.querySelector('h1').innerHTML = 'Entire session has been closed by the moderator: ' + event.userid;
				*/
            };
		
		return connection;		
	}
	
	
	function startTimer(){
		console.log('start timer function ')
		startTime = new Date();	
		
		timer = setInterval(function(){
			var now = new Date()-startTime;//milisec
			var h = Math.floor(now/(1000*60*60));
			var m = Math.floor(now/(1000*60))-h*24;
			var s = Math.floor(now/(1000))-m*60;
			// add a zero in front of numbers<10
			h = checkTime(h);
			m = checkTime(m);
			s = checkTime(s);
			date_timer=h + ":" + m + ":" + s;
			date_timer_obj.html(date_timer);
		},1000)	
	}
	function checkTime(t){
		t=t<10?'0'+t:t;
		return t;
	}
});
