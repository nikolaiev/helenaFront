
var socket;//голбальный сокет
var videosAmount=0;

$(document).ready(function(){
		_protocol=location.protocol=="http:"?"ws":"wss";
		videoRTCPort=location.protocol=="http:"?':9085':':9083';//для установки видеосвязи!
		dateServPort=location.protocol=="http:"?':9005':':9003';//для получения комманд сервера
	
		socket = io.connect(_protocol+'://'+location.hostname+dateServPort,{resource:'socket','force new connection':true});
			
		//===================КОД ОБЩЕНИЯ С СЕРВЕРОМ
		
		connection=new initRTCMultiConnection();
		var params = getSearchParameters();
		
		socket.on('connect',function(){
			socket.emit('id event',{'type':'videoAnonWindow'});  
			if(params.room){
				console.log('connection '+params.room);
				console.log(params.room)
				connection.join(params.room);	
				return;
			}
			
		});	
	});
	
	
	//====FUNCTIONS TO WORK WITH webRTC CONNECTION
	function initRTCMultiConnection(){
		var connection = new RTCMultiConnection();
		
		//connection.socketURL = _protocol+'://'+location.hostname+videoRTCPort;
		connection.socketURL = _protocol+'://'+/*location.hostname*/'helena.hz.softpro.ua'+videoRTCPort;
		connection.socketMessageEvent = 'audio-video-file-chat-demo';
		
		 connection.session = {
				oneway:true,
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
			++videosAmount;
			if(videosAmount==2){
				$('.video-loading-bg').addClass('loaded');
			}
			
			setTimeout(function() {
				//console.log('started playing! '+room);
				mediaElement.media.play();
			}, 0);
			
		};
		
		connection.onstreamended = function(event) {
			var mediaElement = document.getElementById(event.streamid);
			--videosAmount
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

	function getSearchParameters() {
		  var prmstr = window.location.search.substr(1);
		  return prmstr != null && prmstr != "" ? transformToAssocArray(prmstr) : {};
	}

	function transformToAssocArray( prmstr ) {
		var params = {};
		var prmarr = prmstr.split("&");
		for ( var i = 0; i < prmarr.length; i++) {
			var tmparr = prmarr[i].split("=");
			params[tmparr[0]] = tmparr[1];
		}
		return params;
	}