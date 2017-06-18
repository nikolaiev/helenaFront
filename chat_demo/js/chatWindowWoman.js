var currPartner;//current chat partner
var userToSet;
var socket;//global socket
var chatMessages = {};//список сообщений 
var videoChatMessages={};
var user_list=[];//список всех юзеров
var videoStatus={};//[uid] true false

var users_online_st={};//[user_id]:true/false

var timersObj={};
var myName="";
var mySex="";
var myLang=0;
var connection
var onMessageCallbacks = {};
var isVideoOn=false
var isCamAlowed=false;//для исправления бага с запросом на доступ к камере!

var isSmileBoxShown=false;
//таймеры
var timers={}//[id].timer

var smiles_conf;

//time for new possible partners
var FADE_POSS_PARTNERS=10000;

//paginators
var userAmount=0;
var userPerPage=6;
var pageNumber=1;
var paginatorsAmount=0;
var webcam=false;//initial flag!
var POSTS_IN_ROW=25;
var messStoryField;//окно сообщений!


var handlebars_extra_helper={
	
	switch: function(value, options) {
		this._switch_value_ = value;
		this._switch_break_ = false;
		var html = options.fn(this);
		delete this._switch_break_;
		delete this._switch_value_;
		return html;
	},
	case: function(value, options) {
		var args = Array.prototype.slice.call(arguments);
		var options    = args.pop();
		var caseValues = args;

		if (this._switch_break_ || caseValues.indexOf(this._switch_value_) === -1) {
			return '';
		} else {
			if (options.hash.break === true) {
				this._switch_break_ = true;
			}
			return options.fn(this);
		}
	},
	default: function(options) {
		if (!this._switch_break_) {
			return options.fn(this);
		}
	}
}

window.onload=function () {
	//добавляем хелперы для локализации
	Handlebars.registerHelper("case",handlebars_extra_helper.case)
	Handlebars.registerHelper("switch",handlebars_extra_helper.switch)
	Handlebars.registerHelper("default",handlebars_extra_helper.default)
	
	messStoryField = $("#content");
	var params = getSearchParameters();
	webcam=params.webcam=='true'||params.webcam===true;
	
	
	var _protocol=location.protocol=="http:"?"ws":"wss";
    var _port=location.protocol=="http:"?':7085':':7083';
	var messInputField = $("#field");

    socket = io.connect(_protocol+'://'+location.hostname+_port);
	console.log(_protocol+'://'+location.hostname+_port)
	connection = new initRTCMultiConnection();
	
	//при закрытии окна чата
	window.onbeforeunload=function(){	
		socket.emit('chat window socket close');  	
	}
	
	messInputField.keypress(function (e) {
		 if (e.which == 13) {
		 	e.preventDefault();
			sendMessage();
		 } 
	 });
	 
	

	/*----------CONTROLS-------*/
	$('#send').click(sendMessage);
	
	socket.on('error',function(err){
		console.log('FRUSTRATING ERRRRRRORORORO '+err)
	})
	//при соединении с сервером
	socket.on("connect", function () {
		socket.emit('id event',{'type':'chat'});  
		//команда по умолчанию!
		socket.emit('get actual partners for chat window');
		
		if(!smiles_conf){
			console.log('request for smiles config');
			socket.emit('get smiles config');
		}
    }) 	
	//=================CONTROLS EVENTS
	
	var is_query_send=false;
	var offset_multyplier=0;
	$('#content').bind('scroll',function(e){	
			if(is_query_send)
				return;
			if(!is_query_send&&($('#content').scrollTop())==0){
				is_query_send=true;
				var data={};
				data.offset=++offset_multyplier*POSTS_IN_ROW;
				data.template='post_template';
				data.whom_id=currPartner;
				data.type=videoStatus[currPartner]?2:1;
				console.log(data)
				$.post('/helena/get_extra_message_story',data,function(data){
					var messages =data.data;					
					if(!messages)
						return;
					console.log(chatMessages)
					chatMessages[data.whom]=chatMessages[data.whom]?chatMessages[data.whom]:[];
					let whom=data.whom;
					for (var i=messages.length-1;i>=0;i--){
						//TODO append messages
						chatMessages[whom].unshift(messages[i]);
					}
					
					if(currPartner==whom)
						fillMessageBox(chatMessages[whom]);
					
					if(data.count>offset_multyplier*POSTS_IN_ROW)						
						is_query_send=false;//can request for more posts!
				})
			}
			
		})
	
	//получаем свой id
	socket.on('your data',function(data){
		console.log('your data event')
		myName=data.name;		
		mySex=data.sex;
		myLang=data.lang;
		
		//TODO handlebars
		/* МОЖНО НАПИСАТЬ СПИСОК ШАБЛОНОВ ДЛЯ КАЖДОГО ТЕКСТА И ВСТАВЛЯТЬ В СООТВЕТСТВИИ С ЯЗЫКОМ*/
		let template ="{{#switch lang}}\
							{{#case 'ru' break=true}}Мужчин онлайн{{/case}}\
							{{#case 'en' break=true}}Online men{{/case}}\
							{{#case 'ua' break=true}}Чоловіків онлайн{{/case}}\
							{{#default}}Соответствий языку не было найдено {{lang}}{{/default}}\
						{{/switch}}";
		let localized_DOM=Handlebars.compile(template)(/*{'lang':'RE'}*/data);
		$('#onl_text').html(localized_DOM);
		
	});
	
	//получили конфиг смайликов
	socket.on('smiles config',function(data){
		console.log('smiles config')
		console.log(data)
		//супер фишка
		console.log(JSON.stringify(data))		
		smiles_conf=JSON.parse(data);	
		//добавляем смайлы в див со смайлами
		for(var i in smiles_conf){
			console.log(i);
			console.log(smiles_conf[i]);
			$('#_smiles').append('<img src="../'+smiles_conf[i]+'" onclick="putSmile(this)">');
			//$('#_smiles').attr('style',"");
		}		
	})
	
	socket.on('actual partners for chat window',function(data){		
		//ТОДО что делать при пустом списке? 
		console.log('actual partners for chat window')
		console.log(data)
		userToSet=data.currentSpeaker;
		var distinct = []//новые пользователи		
		//console.log(data)
		var _user_list=data.user_list;
		user_list=_user_list;

		//===============new 
		try{
			
		console.log(data.user_list);
		console.log('we R here');
		//обновляем переписку
		chatMessages=data.chatMessages;
		videoChatMessages=data.videoChatMessages;
		console.log('_user_list.length')
		console.log(_user_list.length)
		for (var i in _user_list){
			var isThere=false;
			console.log()
			console.log('user_id')
			console.log(_user_list[i].user_id)
			console.log()
			if(user_list.length>0)
				for(var j in user_list)	
					if(_user_list[i].user_id.toString()===user_list[j].user_id.toString()){
						if(_user_list[i].video===videoStatus[_user_list[i].user_id.toString()])
							isThere=true;					
					}
				if(!isThere){
					distinct.push(_user_list[i]);
					videoStatus[_user_list[i].user_id]=_user_list[i].video;
				}
			
		}
				
		user_list=user_list.concat(distinct);
					
		}
		catch(e){
			
		}
		//=========================end new
		var distinct=_user_list;
		var user_list_ul=$('#list-companions-ul');
		var context='';
		
		for(var i in distinct){
			videoStatus[distinct[i].user_id]=distinct[i].video;
			console.log('inside video status check!	')
			console.log(videoStatus)
			console.log('alya array')
			console.log('i')
			console.log(i)
			
			if($('#'+distinct[i].user_id).length>0)
				$('#'+distinct[i].user_id).remove();

			context +="<li class='' id='"+distinct[i].user_id+"' onclick='setSpeaker(this)'>"+distinct[i].firstname+"<span>(id: "+distinct[i].user_id+")</span>";
			
			//при видео чате показываем только иконку чата а при чату - иконку видеочата
			context+='<i class="fa fa-trash remove-item" onclick="removeFromList(this,event)"></i>'+(!distinct[i].video?'<i class="fa fa-list-alt pull-right" onclick="changeTypeOfCommunication(this,event)"></i></li>':'<i class="fa fa-video-camera pull-right" onclick="changeTypeOfCommunication(this,event)"></i></li>');

		}
		$('#list-companions-ul').html(context);
		//$('#list-companions-ul').append(context);
		console.log('we just set up a context ')
		console.log(context);
		
		//устанавливаем пользователя
		getPossiblePartners(webcam);
		setCorrectOnlineStatus(user_list)
		
		if(userToSet&&user_list&&user_list.length>0)
			for(var i in user_list){
				if(user_list[i].user_id==userToSet)
					return setSpeaker(user_list[i]);
			}
		
			
	})
	 
	//сообщение из обычного чата
	socket.on('message from chat', function (data) {
		console.log('message from chat')
		var user_id=data.user_id
		chatMessages[user_id]=chatMessages[user_id]?chatMessages[user_id]:[];
        chatMessages[user_id].push(data);
		
		if(user_id==currPartner)//если приходит от текущего пользователя
		{
			
			//добавляем новое сообщение
			var data={};
			data.isVideoChat=false;
			data.user_id=user_id;
			addNewMessage(data);
		}
		else{
			//ТОДО
			//заставить светится партнера если он не есть текущим пользователем!
			var context=$('#'+user_id).html();
			//если нету такого элемента!
			if(!$("#"+user_id+'_mess').length>0){
				context=context+'&nbsp<i style="color:#EBD70F" class="fa fa-comment" id='+user_id+'_mess></i>';
				$('#'+user_id).html(context);
			}
			//$('#'+user_id).addClass('message'); 
			var timer=setInterval(function(){
				$("#"+user_id+'_mess').fadeIn(500).fadeOut(500)
			},1000);
			timersObj[user_id]=timersObj[user_id]?timersObj[user_id]:{};
			timersObj[user_id].timer=timer;
			//$("#"+user_id).fadeTo('slow', 0.5).fadeTo('slow', 1.0);
		}
    });
	
	//сообщение из видеочата
	socket.on('message from videochat', function (data) {
		console.log('message from videochat')
		var user_id=data.user_id
		videoChatMessages[user_id]=videoChatMessages[user_id]?videoChatMessages[user_id]:[];
        videoChatMessages[user_id].push(data);
		
		if(user_id==currPartner)//если приходит от текущего пользователя
		{
			
			var data={};
			data.isVideoChat=true;
			data.user_id=user_id;
			//добавляем новое сообщение
			addNewMessage(data);
			
		}
		else{
			//ТОДО
			//заставить светится партнера если он не есть текущим пользователем!
			var context=$('#'+user_id).html();
			//если нету такого элемента!
			if(!$("#"+user_id+'_mess').length>0){
				context=context+'&nbsp<i style="color:#EBD70F" class="fa fa-comment" id='+user_id+'_mess></i>';
				$('#'+user_id).html(context);
			}
			//$('#'+user_id).addClass('message'); 
			var timer=setInterval(function(){
				$("#"+user_id+'_mess').fadeIn(500).fadeOut(500)
			},1000);
			timersObj[user_id]=timersObj[user_id]?timersObj[user_id]:{};
			timersObj[user_id].timer=timer;
			//$("#"+user_id).fadeTo('slow', 0.5).fadeTo('slow', 1.0);
		}
    });
	
	//Кто-то больше не в чате
	socket.on('some chat partner finished chat',function(data){
		console.log('some chat partner finished chat')
		var user_id=data.user_id;
		chatMessages[user_id]=chatMessages[user_id]?chatMessages[user_id]:[];
		
		var _data={'firstname':'Server','message':'User finished LiveChat'};
        
		//chatMessages[user_id].push(_data);
		chatMessages[user_id].push(_data);
		
		if(user_id==currPartner)//если приходит от текущего пользователя
		{
			messStoryField = $("#content")
			
			var context=messStoryField.html();
			var i=chatMessages[user_id].length-1;
			
			var _date=formatDate(chatMessages[user_id][i].create_date);
			
			messStoryField.html(context+
				'<b style="color:'+(chatMessages[currPartner][i].firstname!=myName?'#4e598d':'#f24594')+'">' 
				+_date+" "+ (chatMessages[currPartner][i].firstname ? chatMessages[currPartner][i].firstname : 'Server') + ': </b>'+
				chatMessages[currPartner][i].message + '<br />');
				
			scroll_to('content')
		}
		else{
			//ТОДО
			//заставить светится партнера если он не есть текущим пользователем!
			var context=$('#'+user_id).html();
			//если нету такого элемента!
			if(!$("#"+user_id+'_mess').length>0){
				context=context+'&nbsp<i style="color:#EBD70F" class="fa fa-comment" id='+user_id+'_mess></i>';
				$('#'+user_id).html(context);
			}
			//$('#'+user_id).addClass('message'); 
			var timer=setInterval(function(){
				$("#"+user_id+'_mess').fadeIn(500).fadeOut(500)
			},1000);
			timersObj[user_id]=timersObj[user_id]?timersObj[user_id]:{};
			timersObj[user_id].timer=timer;
			//$("#"+user_id).fadeTo('slow', 0.5).fadeTo('slow', 1.0);
		}
		
		
		
	})
	
	
	socket.on('close stream',function(){		
		//обновляем данные коннекшина
		console.log('close STREAM!')
		connection.leave();		
		console.log('room is closed')
		connection = new initRTCMultiConnection();
		connection.getExternalIceServers = false;
		onMessageCallbacks={};
	})
	//Кто-то больше не в видеочате
	socket.on('some video chat partner finished video chat',function(data){
		
		console.log('some video chat partner finished video chat')
		var user_id=data.user_id
		videoChatMessages[user_id]=videoChatMessages[user_id]?videoChatMessages[user_id]:[];
		
		//timers_video_chat[user_id].timer;
		
		var _data={'firstname':'Server','message':'User finished VideoChat'};
		
        videoChatMessages[user_id].push(_data);
		
		if(user_id==currPartner)//если приходит от текущего пользователя
		{
			messStoryField = $("#content")
			
			var context=messStoryField.html();
			var i=videoChatMessages[user_id].length-1;
			
			var _date=formatDate(videoChatMessages[user_id][i].create_date);
			
			messStoryField.html(context+
				'<b style="color:'+(videoChatMessages[currPartner][i].firstname!=myName?'#4e598d':'#f24594')+'">' 
				+ _date+" "+(videoChatMessages[currPartner][i].firstname ? videoChatMessages[currPartner][i].firstname : 'Server') + ': </b>'+
				videoChatMessages[currPartner][i].message + '<br />');
				
			scroll_to('content')
			
		}
		else{
			//ТОДО
			//заставить светится партнера если он не есть текущим пользователем!
			var context=$('#'+user_id).html();
			//если нету такого элемента!
			if(!$("#"+user_id+'_mess').length>0){
				context=context+'&nbsp<i style="color:#EBD70F" class="fa fa-comment" id='+user_id+'_mess></i>';
				$('#'+user_id).html(context);
			}
			//$('#'+user_id).addClass('message'); 
			var timer=setInterval(function(){
				$("#"+user_id+'_mess').fadeIn(500).fadeOut(500)
			},1000);
			timersObj[user_id]=timersObj[user_id]?timersObj[user_id]:{};
			timersObj[user_id].timer=timer;
			//$("#"+user_id).fadeTo('slow', 0.5).fadeTo('slow', 1.0);
		}
		
	})
	
	
	socket.on('webcam is off',function(){
		alert('Your webcam is off!');
	});
	
	socket.on('change type of communication allowed',function(data){
		console.log('change type of communication allowed')
		//сюда мы попадаем тоько если меняем из чата на видео
		console.log(data)
		var id=data.id;
		
		console.log('change type of communication allowed')
		var _parent=$('#'+id);
		//удаляем иконку чата!
		//какокод
		_parent.find('.fa-list-alt').remove();
		var context=$(_parent).html();
		
		videoStatus[id]=!videoStatus[id];
		
		context+=(!videoStatus[id]?'<i class="fa fa-list-alt pull-right" onclick="changeTypeOfCommunication(this,event)"></i></li>':'<i class="fa fa-video-camera pull-right" onclick="changeTypeOfCommunication(this,event)"></i></li>');
		
		$(_parent).html(context);
		var data={'id':id,'video':videoStatus[id]};//передаем айдишник партнера
		
		var user=getUserById(id);
		setSpeaker(user)
		socket.emit('partner type communication changing',data);		
	});
	
	//Кто-то появился в чате
	socket.on('some chat partner already in chat',function(data){
		//data  =  {'uid':uid.toString()}
		var uid=data.uid;
		var content=$('#'+uid).html();//css does not include offline class. but we always can create it
		if(content){
			content=content.replace(" NOT IN CHAT","");
			$('#'+uid).html(content)
		}
	})
	
	socket.on('limit of videocaht partners reached',function(){
		//('Вы достигли максимального предела мужчин в видеочате!');
	})
	
	socket.on('some possible partner is already online',function(data){
		console.log('some possible partner is already online')
		var uid=data.uid;
		$('#'+uid).addClass('online').removeClass('offline');
		users_online_st[uid.toString()]=true;
		
		if(currPartner==uid){
			var user=getUserById(currPartner)
			setSpeaker(user);		
		}
	})
	
	socket.on('some possible partner is already not online',function(data){
		console.log('some possible partner is already not online')
		var uid=data.uid;
		$('#'+uid).addClass('offline').removeClass('online');		
		users_online_st[uid.toString()]=false;
		
		if(currPartner==uid){
			var user=getUserById(currPartner)
			setSpeaker(user);		
		}
	})
	
	//==============ВИДЕОЧАТ 
	//ТОДО сделать массив кон
	
	// using single socket for RTCMultiConnection signaling

	socket.on('message', function(data) {
		if (data.sender == connection.userid) return;
		if (onMessageCallbacks[data.channel]) {
			onMessageCallbacks[data.channel](data.message);
		};
	});

	// this event is emitted when a broadcast is absent.
	socket.on('start-broadcasting', function(data) {
		// host i.e. sender should always use this!
		
		if(!isVideoOn){
			connection.sdpConstraints.mandatory = {
				OfferToReceiveVideo: true,
				OfferToReceiveAudio: true
			};
			
			connection.session = data.typeOfStreams;
			console.log(data)
			console.log(data.room);
			//connection.openOrJoin(data.room);
			connection.open(data.room)
			isVideoOn=true;
		}
		//connection.openOrJoin(data.room)
		

		if (connection.broadcastingConnection) {
			// if new person is given the initiation/host/moderation control
			connection.broadcastingConnection.close();
			connection.broadcastingConnection = null;
		}
		//отправка на сервер данных о том что вебкамера стримит!
		console.log('webcam stream was started')
		
		//ФИКС БАГА С ЗАПРОСОМ ДОСТУПА К КАМЕРЕ! 
		//description: если мы включаем видеочат и у женщины происходит запрос на доступ к камере 
		//М может не получить стрим видео!
		//fix: введена глобальная переменная isCamAlowed
		//когда получаем доступ к камере isCamAlowed  становится true
		
		var _timer=setInterval(function(){
			//++iter;
			if(isCamAlowed){
				clearInterval(_timer);
				socket.emit('webcam stream was started')
				//TODO начало видечата!
			}
		},333);//1000 - очень много :/ долго ждать 
		
	});
	
	function startVideoChat(broadcastid) {
		//var broadcastid = document.getElementById('broadcast-id').value;
		console.log('startVideoChat')
		
		var broadcastid=broadcastid.toString();
		if(connection)
			connection.leave();
		connection= new initRTCMultiConnection();
		connection.session = {
			video: true,
			screen: false,
			audio: false,//true
			oneway: true
		};

		socket.emit('join-broadcast', {
			broadcastid: broadcastid,
			userid: connection.userid,
			typeOfStreams: connection.session
		});	
	};

	//типа выставляем пользователя
	socket.on('set user',function(data){
		if(!data.user_id)
			return;
		console.log('set user')
		userToSet=data.user_id.toString();
		console.log(userToSet)
		if(userToSet&&user_list&&user_list.length>0)
			for(var i in user_list){
				if(user_list[i].user_id==userToSet)
					return setSpeaker(user_list[i]);
			}
	})

	//сообщения для включения камеры!
	socket.on('start webcam streaming',function(data){
		var broadcastid=data.broadcastid;
		//стартуем
		console.log('I RESIVED A MESSAGE THAT I SHOULD START WEBCAMSTREAMING!',broadcastid)
		if(!connection)
			connection = new initRTCMultiConnection();
		startVideoChat(broadcastid)
		//TODO после успешного завершения
	})
	//===============================ВИДЕОПОДГЛЯДЫВАНИЕ======================================
	var v_port=location.protocol=="http:"?':9085':':9083';

}

//adding new message to the message box!
function addNewMessage(data){
	console.log('addNewMessage function')
	
	//TODO smiles!!!!
	var isVideoChat=data.isVideoChat;
	var user_id=data.user_id;
	var goalMessArray=isVideoChat?videoChatMessages:chatMessages;
	console.log(goalMessArray)
	
	var context=messStoryField.html();
	var i=goalMessArray[user_id].length-1;
	var _date=formatDate(goalMessArray[user_id][i].create_date);

	/*messStoryField.html(context+
		'<b style="color:'+(goalMessArray[currPartner][i].firstname===myName?'#4e598d':'#f24594')+'">' 
		+_date+" "+ (goalMessArray[currPartner][i].firstname ? goalMessArray[currPartner][i].firstname : 'Server') + ': </b>'+
		goalMessArray[currPartner][i].message + '<br />');*/
	messStoryField.html(context+
			'<div class="message-item"><div class="message-item-info"><span class="user-name user-'+(goalMessArray[currPartner][i].firstname===myName?'partner':'myself')+'">' 
			+ (goalMessArray[currPartner][i].firstname ? goalMessArray[currPartner][i].firstname : 'Server') + '</span><span class="message-item-time">'+ _date+'</span></div><div class="message-item-body">'+
			goalMessArray[currPartner][i].message + '</div></div>');
			
	scroll_to('content')
		
	/*========*/
}

function setCorrectOnlineStatus(users){
	//setting correct user_online status
	for (let i in users){
		$.post('/user_online_status/',{id:users[i].user_id}).done(function(res){
			$('#'+res.uid).addClass(res.status?'online':'offline');
			users_online_st[res.uid]=res.status;
		});
	}
}

//функциф добавления пользвателя в список собеседников
//используется в шаблоне chat_suggestion
function addToChatChW(user_id)
{
	//event.stopPropagation();
	$('#li_propose_'+user_id).remove();
	//TODO отловить баг при ответе
	socket.emit('add to chat',{'user_id':user_id});	
}

//функциф добавления пользвателя в список собеседников
//используется в шаблоне chat_suggestion
function addToVideoChatChW(user_id)
{
	//event.stopPropagation();
	$('#li_propose_'+user_id).remove();
	//TODO отловить баг при ответе
	socket.emit('add to video chat',{'user_id':user_id});	
}

function getPossiblePartners(webcam){
	//TODO do not resive current users!
	console.log('getPossiblePartners function')
	console.log(webcam);
	
	var user_to_skip=[];
	
	for (var i in user_list){
		if(user_list.hasOwnProperty(i)){
			user_to_skip.push(user_list[i].user_id);
		}
	}
	
	if(webcam){
		$('#com_type').html('Video chat')
	}
	else{
		$('#com_type').html('Live chat')
	}
	
	var data={'limit':userPerPage,
			'template':'chat_suggestion',offset:(userPerPage*(pageNumber-1)),webcam:webcam
			,'skip':JSON.stringify(user_to_skip)
		};
	console.log(data)
	$.ajax({
		'type':'POST',
		//'url':'/users_list_rand/',
		'url':'/users_list_chat/',
		'data':data
	}).done(function(data){
		console.log(data);
		$('#potential-partners-id').html(data.data);
		userAmount=data.count;
		$('#user_count').html('('+userAmount+')');
		showPaginators();
		
	})
}

//функциф добавления пользвателя в список собеседников
//используется в шаблоне chat_suggestion
function addToChatChW(user_id,event)
{
	//event.stopPropagation();
	$('#li_propose_'+user_id).remove();
	//TODO отловить баг при ответе
	socket.emit('add to chat',{'user_id':user_id});	
}


//получить партнера из массива
function getUserById(id){
	for(var i in user_list){
		if(user_list[i].user_id.toString()===id.toString())
			return user_list[i];
	}
}
//отправить сообщение с чат окна

//экранизация спецсимволов
function escapeRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

function showSmiles(){
	console.log('showSmiles function')
	if(isSmileBoxShown=!isSmileBoxShown)
		$('#_smiles').attr("style","");
	else
		$('#_smiles').attr("style","display:none;");
}

function putSmile(obj){	
	console.log('putSmile function')
	$('#_smiles').attr("style","display:none;");
	console.log('here');
	console.log(obj)
	var smile=$(obj);
	
	console.log('<img src="'+smile[0].src+'">')
	
	$('#field').append('<img src="'+smile[0].src+'">');
	
	scroll_to('content')
}
//TODO в зависимости от текущего типа чата отсылаьт разный тип сообщений!ы
function sendMessage() {
	
	var toAllMans=$('#send_all_online_men').prop('checked');
	$('#send_all_online_men').prop('checked',false)
	console.log('toAllMans')
	console.log(toAllMans)
	messInputField=$('#field');
	//онлайн ли? 
	var online_st=users_online_st[currPartner];
	
	var text = messInputField.html();
	console.log(smiles_conf)
	if(smiles_conf)
		for(var index in smiles_conf){
			
			var reg=new RegExp(escapeRegExp(index.toString()),'gi');
			text=text.replace(reg,'<img width="18" height="18" src="..'+smiles_conf[index]+'"></img>');
			console.log(text);			
		}
	console.log(text)
	messInputField.html('');
	console.log('sendMessage')
	console.log(mySex)
	console.log(mySex==='2')
	//проверка на полноту текста		
	if(currPartner)
		var isVideo=videoStatus[currPartner];//видео чат или нет?
	else{
		//without currPartner
		isVideo=webcam;
	}
	
	if(!text.match(new RegExp(/^[\s\t\n]*$/))) {
		
		//смайлы
		if(smiles_conf)		
			for(var index in smiles_conf){
				var reg=new RegExp(escapeRegExp(index.toString()),'gi');
				text=text.replace(reg,'<img width="18" height="18" src="..'+smiles_conf[index]+'"></img>');
				console.log(text);			
			}
			
		var _date=new Date();
		//разделил сигналы во избежания путаницы в коде с кучой *_*
		if(!isVideo)
			if(!toAllMans)
				socket.emit('message from chat', { 'message': text,'id':currPartner.toString(),'create_date':_date});			
			else
				socket.emit('message from chat to all mans', { 'message': text,'create_date':_date});			
				
			
		else
			if(!toAllMans)
				socket.emit('message from video chat', { 'message': text,'id':currPartner.toString(),'create_date':_date});			
			else
				socket.emit('message from video chat to all mans', { 'message': text,'create_date':_date});			
		
		var data={};	
		//ТОДО подумать
		data.firstname=myName;
		data.message=text;
		
		data.create_date=_date;
		var partner= getUserById(currPartner);
		
		if(isVideo){
			console.log('simple video chat message sending')
			videoChatMessages=videoChatMessages?videoChatMessages:{};
			videoChatMessages[currPartner]=videoChatMessages[currPartner]?videoChatMessages[currPartner]:[];
			videoChatMessages[currPartner].push(data);
			
			//messStoryField = $("#content")
			var context=messStoryField.html();
			var i=videoChatMessages[currPartner].length-1;
			var _date=formatDate(videoChatMessages[currPartner][i].create_date);
			
			/*messStoryField.html(context+
				'<b style="color:'+(videoChatMessages[currPartner][i].firstname!=myName?'#4e598d':'#f24594')+'">' 
				+ _date+" "+(videoChatMessages[currPartner][i].firstname ? videoChatMessages[currPartner][i].firstname : 'Server') + ': </b>'+
				videoChatMessages[currPartner][i].message + '<br />');*/
			messStoryField.html(context+
				'<div class="message-item"><div class="message-item-info"><span class="user-name user-'+(videoChatMessages[currPartner][i].firstname===myName?'partner':'myself')+'">' 
				+ (videoChatMessages[currPartner][i].firstname ? videoChatMessages[currPartner][i].firstname : 'Server') + '</span><span class="message-item-time">'+ _date+'</span></div><div class="message-item-body">'+
				videoChatMessages[currPartner][i].message  +
				/*если не онлайн - добавляем дополнительную строчку*/
				
				(!online_st?'<br><span>'+(partner.firstname?partner.firstname:'')+' сейчас не в сети. Попробуйте позже'+'<span>':'')
				+ '</div></div>');
				
			scroll_to('content')
		}
		else{
			console.log('simple chat message sending')
			chatMessages[currPartner]=chatMessages[currPartner]?chatMessages[currPartner]:[];
			chatMessages[currPartner].push(data);
			
			//messStoryField = $("#content")
			var context=messStoryField.html();
			var i=chatMessages[currPartner].length-1;
			var _date=formatDate(chatMessages[currPartner][i].create_date);
			
			messStoryField.html(context+
				'<div class="message-item"><div class="message-item-info"><span class="user-name user-'+(chatMessages[currPartner][i].firstname===myName?'partner':'myself')+'">' 
				+ (chatMessages[currPartner][i].firstname ? chatMessages[currPartner][i].firstname : 'Server') + '</span><span class="message-item-time">'+ _date+'</span></div><div class="message-item-body">'+
				chatMessages[currPartner][i].message  +
				/*если не онлайн - добавляем дополнительную строчку*/
				
				(!online_st?'<br><span>'+(partner.firstname?partner.firstname:'')+' сейчас не в сети. Попробуйте позже'+'<span>':'')
				+ '</div></div>');
				
			scroll_to('content')
		}
	} else {
		////console.log("There is a problem:", data);
	}
	//вырубаем флаг
	if(toAllMans){
		$('#send_all_online_men').prop('ckecked',false);
	}
}

function removeFromList(obj,e){
	e.stopPropagation();
	$('#chat').hide();
	currPartner=false;/*O_o???*/
	var user_id=$(obj).parent().attr('id');
	getPossiblePartners(videoStatus[user_id])
	
	for(var i in user_list){
		if(user_list[i].user_id==user_id)
			delete user_list[i];
	}
	
	console.log('removeFromList function');
	var data={};
	data.partner_id=user_id;
	console.log('remove partner from chat list')
	console.log(data)
	socket.emit('remove partner from chat list',data)
}
	
function setSpeaker(user){//user - персона с базы 
	
	//TODO FIX BAG
	$('#chat').show();
	$("#"+currPartner).removeClass('current');
	
	currPartner=user.user_id?user.user_id:user.id;
	console.log('currPartner')
	console.log(currPartner)

	if(timersObj[currPartner]&&timersObj[currPartner].timer)
			clearInterval(timersObj[currPartner].timer);	
	
	var partner= getUserById(currPartner);
	console.log(partner)
	//var isVideo=partner.video;
	//('open terminal')
	console.log(videoStatus)
	var isVideo=videoStatus[currPartner];
	
	getPossiblePartners(isVideo)
	
	//$("#partner_image").html('<img src="'+location.origin+'/files/user_images/'+currPartner+'/general/original_image_0.jpg">')
	$('#partner_image').html('<img src="'+partner.dir+partner.file_name+'"/>')
	$("#partner_name").html(partner.firstname?partner.firstname:'');
	
	$("#partner_id").html('ID : '+currPartner);
	
	$("#partner_age").html(partner.user_age?partner.user_age:'');
	
	$("#partner_hair").html(partner.user_haircolor_id?partner.user_haircolor_id:'');
	
	$("#partner_eyes").html(partner.user_eyecolor_id?partner.user_eyecolor_id:'');
	
	$("#partner_map_city").html(partner.user_age?partner.user_age:'');
	
	$("#partner_map_country").html(partner.user_age?partner.user_age:'');
	
	
	var online_st=users_online_st[currPartner];
	
	if(!online_st){
		//$('#field').prop('disabled', !online_st);
		$('#field').addClass('disabled');
		$('#offline_message').show().text((partner.firstname?partner.firstname:'')+" сечас не в сети и не сможет вам ответить. Начните с ним чат позже.");	
	}
	else{
		$('#offline_message').hide();
	}
	
	
	if(isVideo){
		$('#com_type').text('Video chat');
	}
	else{
		$('#com_type').text('Live chat');
	}
	
	////console.log($())	
	//имитация прочтения сообщения	
	
	$("#"+currPartner+'_mess').remove();
	$("#"+currPartner).addClass('current');
	
	//обновляем сообщения
	var html = '';	
	videoChatMessages=videoChatMessages?videoChatMessages:{};
	videoChatMessages[currPartner]=videoChatMessages[currPartner]?videoChatMessages[currPartner]:[];
	chatMessages=chatMessages?chatMessages:{}
	chatMessages[currPartner]=chatMessages[currPartner]?chatMessages[currPartner]:[];
	
	//выбираем массив которым будем оперировать дальше
	var goalMessArray=isVideo?videoChatMessages[currPartner]:chatMessages[currPartner];
	
	fillMessageBox(goalMessArray);
	
	var _data={};
	_data.user_id=currPartner;	
	socket.emit('changed user in chat window',_data)
}

//покрутить див вниз
function scroll_to(objName){
	objDiv=document.getElementById(objName.toString());
	objDiv.scrollTop = objDiv.scrollHeight;
}
//TODO дописать функцию изменения типа коммуникации (чат или видеочат)
//при нажатии вызывается функция set speaker

function changeTypeOfCommunication(obj,e){
	console.log('changeTypeOfCommunication');
	console.log(obj);
	e.stopPropagation();
	//TODO включена ли наша камера? ????? ?? ? 	
	var _parent=$(obj).parent();
	var id=$(_parent).attr('id').toString();
	
	if(!videoStatus[id]){
		console.log('EMIT change type of communication')
		socket.emit('change type of communication',{'id':id})
		return;
	}
	
	$(obj).remove();//удаляем иконку
	
	var context=$(_parent).html();
	
	
	videoStatus[id]=!videoStatus[id];
	
	context+=(!videoStatus[id]?'<i class="fa fa-list-alt pull-right" onclick="changeTypeOfCommunication(this,event)"></i></li>':'<i class="fa fa-video-camera pull-right" onclick="changeTypeOfCommunication(this,event)"></i></li>');
	
	$(_parent).html(context);
	var data={'id':id,'video':videoStatus[id]};//передаем айдишник партнера
	
	var user=getUserById(id);
	setSpeaker(user)
	socket.emit('partner type communication changing',data);	
}


function initRTCMultiConnection(userid) {		
	//на всякий случай
	//video_socket = io.connect(_protocol+'://'+location.hostname+v_port,{resource:'socket','force new connection':true});
	var connection = new RTCMultiConnection()
	var _protocol=location.protocol=="http:"?"ws":"wss";
	var v_port=location.protocol=="http:"?':9085':':9083'
	connection.socketURL = _protocol+'://'+location.hostname+v_port;
	connection.socketMessageEvent = 'video-conference-demo';
	
	connection.session = {
		audio: true,
		video: true
	};


	connection.sdpConstraints.mandatory = {
		OfferToReceiveAudio: false,
		OfferToReceiveVideo: false
	};

	var videosContainer = document.getElementById('video-container');
	
	connection.onstream = function(event) {
		console.log('event.mediaElement')
		console.log(event.mediaElement)
		videosContainer.appendChild(event.mediaElement);

		setTimeout(function() {
			isCamAlowed=true;
			event.mediaElement.play();
		}, 500);//5000
	};
	return connection;
}
//formatting function

function checkTime(t){
	t=t<10?'0'+t:t;
	return t;
}

function formatDate(data){	
	if(!data)
		return "";
	//console.log('formatDate function')
	var date=new Date(data);
	
	var day=checkTime(date.getUTCDate());
	var month=checkTime(date.getUTCMonth()+1);
	var year=''+date.getUTCFullYear();
	var hour=checkTime(date.getHours());
	var minute=checkTime(date.getUTCMinutes());
	var second=checkTime(date.getUTCSeconds());
	
	var result = day+'/'+month+'/'+year.substring(2)+' '+hour+':'+minute;
	
	return result;
}


/*----------last function in row------------*/
//showing paginator
function showPaginators(){
	var amount=paginatorsAmount=Math.ceil(userAmount/userPerPage);
	if(amount>1){
		$('#prev_button').show();
		$('#next_button').show();
	}
	
	if(amount<=1){
		$('#_paginator').hide()
	}
	else{
		$('#_paginator').show()
	}
	
	var _pag_id ='#_paginator'
	
	$(_pag_id).empty();
	
	if(pageNumber>3){//prew 1 element + ..+1-st page
	
		$(_pag_id)
		.append(
				$('<li>').append(
						$('<a>')
						.append('1')
				)
				.attr('onclick','goToPage(1)')
			)	
		.append(
				$('<a>')
				.append('..')			
			)
		.append(//prew central
		
			$('<li>').append(
						$('<a>')
						.append((pageNumber-1).toString())
				)
				.attr('onclick','goToPage('+(pageNumber-1)+')')
		)
		.append(//central
			$('<li >').append(
						$('<a class="active">')
						.append(pageNumber.toString())
				)
				.attr('onclick','goToPage('+pageNumber+')')
		)
	}
	else {
		for(var i=0;i<pageNumber-1;i++)
			$(_pag_id).append(
				$('<li>').append(
						$('<a>')
						.append((i+1).toString())
				)
				.attr('onclick','goToPage('+(i+1)+')')
			)	
		$(_pag_id)
		.append(//central
			$('<li> ').append(
						$('<a class="active">')
						.append(pageNumber.toString())
				)
				.attr('onclick','goToPage('+pageNumber+')')
		)
	}
	
	//second part
	
	if(pageNumber+3<amount&&amount>=4){
		//TODO right1 and last
		$(_pag_id)
		.append(
				$('<li>').append(
						$('<a>')
						.append((pageNumber+1).toString())
				)
				.attr('onclick','goToPage('+(pageNumber+1)+')')
			)
		.append(
				$('<li>').append(
						$('<a>')
						.append((pageNumber+2).toString())
				)
				.attr('onclick','goToPage('+(pageNumber+2)+')')
			)
		.append(
				$('<a>')
					.append('...')			
			)				
		.append(
				$('<li>').append(
						$('<a>')
						.append(amount.toString())
				)
				.attr('onclick','goToPage('+amount+')')
			
			)
	}
	else{
		for(var i=pageNumber;i<amount;i++)
			$(_pag_id).append(
				$('<li>').append(
						$('<a>')
						.append((i+1).toString())
				)
				.attr('onclick','goToPage('+(i+1)+')')
			)	
	}
};

function getSearchParameters() {
      var prmstr = window.location.search.substr(1);
      return prmstr != null && prmstr != "" ? transformToAssocArray(prmstr) : {};
}

function fillMessageBox(goalMessArray){//используется для setSpeaker function
	console.log('fillMessageBox function')
	var html='';
	if(!goalMessArray)
		return;
	console.log(goalMessArray.length)
	console.log(goalMessArray)
	for(var i=0; i<goalMessArray.length; i++) {
		var _date=formatDate(goalMessArray[i].create_date);
		html += '<div class="message-item"><div class="message-item-info"><span class="user-name user-'+(goalMessArray[i].firstname===myName?'partner':'myself')+'">' 
				+ (goalMessArray[i].firstname ? goalMessArray[i].firstname : 'Server') + '</span><span class="message-item-time">'+ _date+'</span></div><div class="message-item-body">'+
				goalMessArray[i].message + '</div></div>';			
	}
	messStoryField.html(html);
	//прокрутка вниз
	scroll_to('content');	
}
//покрутить див вниз
function scroll_to(objName){
	
	console.log('scroll_to function')
	objDiv=document.getElementById(objName.toString());
	objDiv.scrollTop = objDiv.scrollHeight+50;
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