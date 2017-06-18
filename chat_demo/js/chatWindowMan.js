var currPartner;//current chat partner
var userToSet;
var socket;//global socket
var chatMessages = {};//список сообщений 
var videoChatMessages={};
var user_list=[];//список всех юзеров
var videoStatus={};//[uid] true false
var users_online_st={};//[user_id]:true/false
//var inVideoChatFlag=false;
var timersObj={}
var myName="";
var mySex="";
var myLang=0;
//var connection ;
var connections={}; //[woman_id] = connection
var onMessageCallbacks = {};
var userOnlineStatus={};

var isSocketAllowed=true;
var isSmileBoxShown=false;

var smiles_conf;
//страница редиректа
var BALANCE_PAGE='https://helena.softpro.ua/balance'

//таймеры!
var timers={}//[id].timer
var messStoryField;//окно сообщений!
//time for new possible partners
var FADE_POSS_PARTNERS=10000;

//paginators
var userAmount=0;
var userPerPage=3;//6;
var pageNumber=1;
var paginatorsAmount=0;
var POSTS_IN_ROW=25;

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
	
	var params = getSearchParameters();
	var _protocol=location.protocol=="http:"?"ws":"wss";
    var _port=location.protocol=="http:"?':7085':':7083';
	var messInputField = $("#field");
	messStoryField = $("#content");

    socket = io.connect(_protocol+'://'+location.hostname+_port);
	
	window.onbeforeunload=function(){	
		socket.emit('chat window socket close');  	
	}
	
	messInputField.keypress(function (e) {

		 if (e.which == 13) {
			e.preventDefault();
			sendMessage();
		 } 
	 });
	
	// $('#prev_button').hide();
	// $('#next_button').hide();
	
	//===========CONTROLS
	$('#prev_button').click(function(){
		if(pageNumber-1>=1){
			console.log('change pag prev')
			--pageNumber;
			getPossiblePartners();
		}
	})
	
	$('#next_button').click(function(){
		if(paginatorsAmount>=pageNumber+1){
			console.log('change pag next')
			++pageNumber;
			getPossiblePartners();
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
	 
	
	setInterval(function(){
		//TODO AJAX 
		$.post('/helena/get_tokens_status')
			.done(function(data){
				$('#tokens').html(data.balance);
			})
	},1500);
	//получаем свой id
	socket.on('your data',function(data){
		console.log('your data event')
		myName=data.name;		
		mySex=data.sex;
		myLang=data.lang;
		
		//TODO handlebars
		let template ="{{#switch lang}}\
							{{#case 'ru' break=true}}Девушек онлайн{{/case}}\
							{{#case 'en' break=true}}Online ladies{{/case}}\
							{{#case 'ua' break=true}}Жінок онлайн{{/case}}\
							{{#default}}Соответствий языку не было найдено {{lang}}{{/default}}\
						{{/switch}}";
		let localized_DOM=Handlebars.compile(template)(data);
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

	socket.on('recharge your account',function(){		
		/*
			Правка логики при открытии окна по инвайту и отстутствии денег!			
		*/	
		$('#chat-window').addClass('blocked');
		$('#field').attr('contenteditable','false');
	})
	
	socket.on('error',function(err){
		//console.log('FRUSTRATING ERRRRRRORORORO '+err)
	})
	//при соединении с сервером
	socket.on("connect", function () {
		console.log('connected!!')
		socket.emit('id event',{'type':'chat'});  
		socket.emit('get actual partners for chat window');
		
		if(!smiles_conf){
			console.log('request for smiles config');
			socket.emit('get smiles config');
		}
    })

	socket.on('access is allowed',function(){
		isSocketAllowed=true;
	})
	
	socket.on('actual partners for chat window',function(data){	
		//ТОДО что делать при пустом списке? 
		console.log('actual partners for chat window')
		console.log(data)
		var distinct = []//новые пользователи		
		//user to set is global variable!
		userToSet=data.currentSpeaker;
		//console.log(data)
		var _user_list=data.user_list;
		user_list=_user_list;

		for(var i in user_list){
			if(user_list.hasOwnProperty(i)){
				var uid=user_list[i].user_id;
				videoStatus[uid]=user_list[i].video;
			}
		}		
		console.log(data.user_list);
		try{
			
			//обновляем переписку
			//===========================new
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
		//================================end new			
		}
		catch(e){
			
		}
		var distinct=_user_list;
		var user_list_ul=$('#list-companions-ul');
		var context='';
		for(var i in distinct){
			console.log('alya array')
			console.log('i')
			console.log(i)
			
			/*var online_status=distinct[i].online?'online':'offline';	
			
			users_online_st[distinct[i].user_id]=distinct[i].online;//забиваем онлайн статусы для пользователей
			*/
			if($('#'+distinct[i].user_id).length>0)
				$('#'+distinct[i].user_id).remove();

			//context +="<li class='"+online_status+"' id='"+distinct[i].user_id+"' onclick='setSpeaker(this)'><!--i class='fa fa-commenting-o new-item'></i--><span>"+distinct[i].firstname+"</span><span>(id: "+distinct[i].user_id+")</span>";
			context +="<li class='' id='"+distinct[i].user_id+"' onclick='setSpeaker(this)'><!--i class='fa fa-commenting-o new-item'></i--><span>"+distinct[i].firstname+"</span><span>(id: "+distinct[i].user_id+")</span>";
			
			//при видео чате показываем только иконку чата а при чату - иконку видеочата
			//</li > -закрытие элемента партнера в списке партнеров!

			context+='<i class="fa fa-trash remove-item" onclick="removeFromList(this,event)"></i>'+(!distinct[i].video?'<i class="fa fa-list-alt pull-right" onclick="changeTypeOfCommunication(this,event)"></i></li>':'<i class="fa fa-video-camera pull-right" onclick="changeTypeOfCommunication(this,event)"></i></li>');
		}
		
		$('#list-companions-ul').html(context);
		//$('#list-companions-ul').append(context);
		console.log('we just set up a context ')
		console.log(context);
		
		//устанавливаем пользователя
		console.log(userToSet)
		
		/*if(typeof userToSet=='undefined'&&user_list)
			userToSet=user_list[user_list.length-1].user_id;
		console.log(userToSet)*/
		
		setCorrectOnlineStatus(user_list)
		getPossiblePartners(params.webcam);

		if(userToSet&&user_list&&user_list.length>0)
			for(var i in user_list){
				if(user_list[i].user_id==userToSet)
				return setSpeaker(user_list[i]);
			}
	});
    
	socket.on('close socket because of tokens absence',function(){
		
		console.log('socket was succesfully disconnected!')
		socket.emit('chat window socket close',{'force_closing':true});  //force_closing - закрыть в любом случаее
		socket.close();
		
		try{
			var win = window.open('/balance');
			win.focus();
		}
		catch(e){
			console.log(e);
		}
		finally{
			window.close();			
		}
		
	})
	
	socket.on('set user',function(data){
		if(!data.user_id)
			return;
		console.log('set user')
		userToSet=data.user_id.toString();
		console.log('set user event')
		console.log(userToSet)
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
		
		console.log(timers)
		console.log(user_id)
		console.log(user_id)
		console.log(timers[user_id])
		if(!timers[user_id]||!timers[user_id].actual)//если первое сообщение!
			startTimer(user_id);
		
		if(user_id==currPartner)//если приходит от текущего пользователя
		{
			//messStoryField = $("#content")
			
			var data={};
			data.isVideoChat=false;
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
				context='&nbsp<i class="fa fa-commenting-o new-item" id='+user_id+'_mess></i>&nbsp'+context;
				$('#'+user_id).html(context);
			}
			//$('#'+user_id).addClass('message'); 
			var timer=setInterval(function(){
				$("#"+user_id+'_mess').fadeIn(500).fadeOut(500)
			},0);
			timersObj[user_id]=timersObj[user_id]?timersObj[user_id]:{};
			timersObj[user_id].timer=timer;
			//$("#"+user_id).fadeTo('slow', 0.5).fadeTo('slow', 1.0);	
		}
    });
	
	//отказ от чата
	socket.on('some partner refused chat invitation',function(data){
		
		console.log('some partner refused chat invitation')
		var user_id=data.user_id
		chatMessages[user_id]=chatMessages[user_id]?chatMessages[user_id]:[];
        chatMessages[user_id].push(data);
		
		if(user_id==currPartner)//если приходит от текущего пользователя
		{
			//messStoryField = $("#content")
			
			var data={};
			data.isVideoChat=false;
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
				context='&nbsp<i class="fa fa-commenting-o new-item" id='+user_id+'_mess></i>&nbsp'+context;
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
		
		if(!timers[user_id]||!timers[user_id].actual)//если первое сообщение!
			startTimer(user_id);
			
		if(user_id==currPartner)//если приходит от текущего пользователя
		{
			//messStoryField = $("#content")
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
				context='&nbsp<i class="fa fa-commenting-o new-item" id='+user_id+'_mess></i>&nbsp'+context;
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
	
	//отказ от видеочата
	socket.on('some partner refused videochat invitation',function(data){
		
		console.log('some partner refused videochat invitation')
		var user_id=data.user_id
		videoChatMessages[user_id]=videoChatMessages[user_id]?videoChatMessages[user_id]:[];
        videoChatMessages[user_id].push(data);
		
		if(user_id==currPartner)//если приходит от текущего пользователя
		{
			//messStoryField = $("#content")
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
				context='&nbsp<i class="fa fa-commenting-o new-item" id='+user_id+'_mess></i>&nbsp'+context;
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
		//тушим таймер!
		endTimer(user_id)
		
		if(user_id==currPartner)//если приходит от текущего пользователя
		{
			//messStoryField = $("#content")
			
			var data={};
			data.isVideoChat=false;
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
				context='&nbsp<i class="fa fa-commenting-o new-item" id='+user_id+'_mess></i>&nbsp'+context;
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
	
	//Кто-то больше не в видеочате
	socket.on('some video chat partner finished video chat',function(data){
		
		console.log('some video chat partner finished video chat')
		var user_id=data.user_id
		videoChatMessages[user_id]=videoChatMessages[user_id]?videoChatMessages[user_id]:[];
		
		//timers_video_chat[user_id].timer;
		
		var _data={'firstname':'Server','message':'User finished VideoChat'};
		
        videoChatMessages[user_id].push(_data);
		//тушим таймер!
		endTimer(user_id)
		
		
		
		if(user_id==currPartner)//если приходит от текущего пользователя
		{
			//messStoryField = $("#content")
			
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
				context='&nbsp<i class="fa fa-commenting-o new-item" id='+user_id+'_mess></i>&nbsp'+context;
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
		
	
		if(connections[user_id.toString()]){
			connections[user_id].leave();
			connections[user_id].getExternalIceServers = false;
			//onMessageCallbacks={};
		}
	})
	
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
	
	socket.on('some possible partner is already online',function(data){
		console.log('some possible partner is already online')
		var uid=data.uid;
		$('#'+uid).addClass('online').removeClass('offline');
		users_online_st[uid.toString()]=true;
		
		if(currPartner==uid){
			var user=getUserById(currPartner)
			setSpeaker(user);		
		}
		//ТОДО поменять КНОПКУ!!!!
	})
	
	socket.on('some possible partner is already not online',function(data){
		console.log('some possible partner is already not online')
		var uid=data.uid;
		$('#'+uid).addClass('offline').removeClass('online');
		endTimer(uid);
		users_online_st[uid.toString()]=false;
		
		if(currPartner==uid){
			var user=getUserById(currPartner)
			setSpeaker(user);		
		}
		//ТОДО поменять КНОПКУ!!!!
	})
	
	//==============ВИДЕОЧАТ 	
	// using single socket for RTCMultiConnection signaling
	socket.on('message', function(data) {
		console.log('data')
		console.log(data)
		
		if (data.sender == connection.userid) return;
		if (onMessageCallbacks[data.channel]) {
			onMessageCallbacks[data.channel](data.message);
		};
	});
	// this event is emitted when a broadcast is already created.
	socket.on('join-broadcaster', function(broadcaster, typeOfStreams,room) {
		console.log('join-broadcaster')
		//connection
		connections[room].session = typeOfStreams;
		//connections[room].channel = connections[room].sessionid = broadcaster.userid;

		connections[room].sdpConstraints.mandatory = {
			OfferToReceiveVideo: true,
			OfferToReceiveAudio: false
		};
		
		connections[room].join({
			sessionid: room,
			userid: broadcaster.userid,
			extra: {},
			session: connections[room].session
		});
		//connections[room].session= {'oneway':true,'video':true,'audio':false};

		//connections[room].session = typeOfStreams;
	    //connections[room].channel = connections[room].sessionid = broadcaster.userid;
		/*connections[room].sdpConstraints.mandatory = {
	        OfferToReceiveVideo: true,
	        OfferToReceiveAudio: false
	    };	*/

		//connections[room].join(room);

	    /*connections[room].sdpConstraints.mandatory = {
	        OfferToReceiveVideo: !!connections[room].session.video,
	        OfferToReceiveAudio: !!connections[room].session.audio
	    };*/
	    /*console.log(broadcaster)
	    connections[room].join({
	        sessionid: room,
	        userid: broadcaster.userid,
	        extra: {},
	        session: connections[room].session
	    });*/
	
	});
	
	//TODO отключение партнера
	function stopChattingWithPartner(partner_id){
		socket.emit('stop chatting',{'user_id':partner_id});
	}

	function startVideoChat(broadcastid) {
		
		//var broadcastid = document.getElementById('broadcast-id').value;
		console.log('function startVideoChat')
		console.log('broadcastid type ',broadcastid);
		
		connections[broadcastid]=new initRTCMultiConnection(broadcastid);
		
		connections[broadcastid].session= {
			video: true,
			audio: false,//true
			oneway: true
		};
	
		socket.emit('join-broadcast', {
			broadcastid: broadcastid,
			userid: connections[broadcastid].userid,
			typeOfStreams: connections[broadcastid].session
		});
	
	};

	socket.on('girl limit of videocaht partners reached',function(){
		alert('Girls\' limit reached!');
	})
	
	socket.on('girl webcam is off',function(){
		alert('girl webcam is off');
	})
	
	socket.on('change girl type of communication allowed',function(data){
		//alert('change girl type of communication allowed')
		console.log(data.id)
		var id=data.id;
		var _parent=$('#'+id);
		if(videoStatus[id]){
		//closing video
			if(connections[id.toString()]){
				connections[id].leave();
				connections[id].getExternalIceServers = false;
				//onMessageCallbacks={};
			}
		}
		
		
		//какокод
		//_parent.remove('.fa-video-camera');//удаляем иконку
		if(videoStatus[id]){
			_parent.children('.fa-video-camera').remove()
		}
		else{
			_parent.children('.fa-list-alt').remove()
		}
		videoStatus[id]=!videoStatus[id];
		//обновляем список пользователей
		getPossiblePartners(videoStatus[id])
		
		var context=$(_parent).html();
		//меняем тип коммуникации
		
		context+=/*'<i class="fa fa-close pull-right" onclick="removeFromList(this,event)"></i>'+*/(!videoStatus[id]?'<i class="fa fa-list-alt pull-right" onclick="changeTypeOfCommunication(this,event)"></i></li>':'<i class="fa fa-video-camera pull-right" onclick="changeTypeOfCommunication(this,event)"></i></li>');
		
		$(_parent).html(context);
		//ТОДО вырубить видео
		console.log('changeTypeOfCommunication')
		
		var data={'id':id,'video':videoStatus[id]};//передаем айдишник партнера
		//сново палим setSpeaker
		//console.log(data)
		
		var user=getUserById(id);
		setSpeaker(user)
		socket.emit('partner type communication changing',data);
		console.log('user_id ',id)
		endTimer(id);
		
	})
	//сообщения для включения камеры!
	
	socket.on('join webcam stream',function(data){
		//фича
		//inVideoChatFlag=true;
		
		var broadcastid=data.broadcastid;
		
		console.log(broadcastid);
		console.log(typeof broadcastid);
		
		if(connections[broadcastid.toString()])
			connections[broadcastid.toString()].leave()//broadcastid == woman_id is true!
		
		//console.log('I RESIVED A MESSAGE THAT I CONNECT WEBCAMSTREAMING! ',broadcastid)
		startVideoChat(broadcastid);	
		//отправка сообщения на сервер что подключился к стриму!
		socket.emit('has joined webcam stream',data);	
		console.log('has joined webcam stream')
		startTimer(broadcastid);//по сути id партнера
		//TODO старт таймера!
		
	})
	//===============================ВИДЕОПОДГЛЯДЫВАНИЕ======================================
	var v_port=location.protocol=="http:"?':9085':':9083';	
	
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
	
	if(webcam=='true'){
		$('#com_type').html('Video chat')
	}
	else{
		$('#com_type').html('Live chat')
	}
	
	var data={'limit':userPerPage,
			'template':'chat_suggestion',offset:(userPerPage*(pageNumber-1)),webcam:webcam=='true'
			,'skip':JSON.stringify(user_to_skip)
		};
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

function removeFromList(obj,e){
	//TODO check on empty list
	e.stopPropagation();
	var user_id=$(obj).parent().attr('id');
	$('#chat').hide();
	
	getPossiblePartners(videoStatus[user_id])
	currPartner=false;/*O_o???*/
	
	console.log('removeFromList function');
	var data={};
	data.partner_id=user_id;

	if(videoStatus[user_id]){
		//closing video
		if(connections[user_id.toString()]){
			connections[user_id].leave();
			connections[user_id].getExternalIceServers = false;
			//onMessageCallbacks={};
		}
	}
	for(var i in user_list){
		if(user_list[i].user_id==user_id)
			delete user_list[i];
		}
		
	console.log('endTimer fucntion is called')
	endTimer(user_id)

	console.log('remove partner from chat list')
	console.log(data)
	socket.emit('remove partner from chat list',data)
	
}
//экранизация спецсимволов
function escapeRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
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
			'<div class="message-item"><div class="message-item-info"><span class="user-name user-'+(goalMessArray[currPartner][i].firstname===myName?'myself':'partner')+'">' 
			+ (goalMessArray[currPartner][i].firstname ? goalMessArray[currPartner][i].firstname : 'Server') + '</span><span class="message-item-time">'+ _date+'</span></div><div class="message-item-body">'+
			goalMessArray[currPartner][i].message + '</div></div>');
			
		scroll_to('content')
		
	scroll_to('content')
	/*========*/
	
}

//получить партнера из массива
function getUserById(id){	
	console.log('getUserById function')
	for(var i in user_list){
		if(user_list[i].user_id==id)
			return user_list[i];
	}
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
//отправить сообщение с чат окна

//TODO заменять символы смайлов на теги картинок!
function sendMessage() {
	
	
	if(!currPartner)
		return;
	
	console.log('sendMessage function')
	//онлайн ли? 
	var online_st=users_online_st[currPartner];
	
	if(!isSocketAllowed)
		return;
	
	messInputField=$('#field');
	
	var text = messInputField.html();
	
	messInputField.html('');
	
	//проверка на полноту текста	
	var isVideo=videoStatus[currPartner];//видео чат или нет?
	
	if(!text.match(new RegExp(/^[\s\t\n\r]*$/gi))) {
	
	if(smiles_conf)		
		for(var index in smiles_conf){
			
			var reg=new RegExp(escapeRegExp(index.toString()),'gi');
			text=text.replace(reg,'<img width="18" height="18" src="..'+smiles_conf[index]+'"></img>');
		}
		
		//разделил сигналы во избежания путаницы в коде с кучой *_*
		var _date=new Date();
		console.log('currPartner as number');
		console.log(currPartner)
		if(!isVideo)
			socket.emit('message from chat', { message: text,'id':currPartner.toString(),'create_date':_date});			
		else
			socket.emit('message from video chat', { message: text,'id':currPartner.toString(),'create_date':_date});			
		
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
			
			messStoryField.html(context+
				'<div class="message-item"><div class="message-item-info"><span class="user-name user-'+(videoChatMessages[currPartner][i].firstname==myName?'myself':'partner')+'">' 
				+ (videoChatMessages[currPartner][i].firstname ? videoChatMessages[currPartner][i].firstname : 'Server') + '</span><span class="message-item-time">'+ _date+'</span></div><div class="message-item-body">'+
				videoChatMessages[currPartner][i].message +
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
				'<div class="message-item"><div class="message-item-info"><span class="user-name user-'+(chatMessages[currPartner][i].firstname===myName?'myself':'partner')+'">' 
				+ (chatMessages[currPartner][i].firstname ? chatMessages[currPartner][i].firstname : 'Server') + '</span><span class="message-item-time">'+ _date+'</span></div><div class="message-item-body">'+
				chatMessages[currPartner][i].message +
				
				/*если не онлайн - добавляем дополнительную строчку*/
				(!online_st?'<br><span>'+(partner.firstname?partner.firstname:'')+' сейчас не в сети. Попробуйте позже'+'<span>':'')
				
				+ '</div></div>');
				
			scroll_to('content');
			console.log(chatMessages[currPartner][i]);
		}
		scroll_to('content')
	} else {
		console.log("There is a problem:", data);
	}	
	scroll_to('content')

}
	

function setSpeaker(user){//user - персона с базы 

	console.log('setSpeaker function')

	if(!isSocketAllowed)
			return;

	$('#chat').show();

	$('#timer').html('00:00');
	
	$("#"+currPartner).removeClass('current');
	
	currPartner=user.user_id?user.user_id:user.id;	
	
	//непонятная строчка
	if(timersObj[currPartner]&&timersObj[currPartner].timer)
		clearInterval(timersObj[currPartner].timer);
	
	var partner= getUserById(currPartner);
	//var isVideo=partner.video;
	var isVideo=videoStatus[currPartner];
	//список актульных юзеров
	getPossiblePartners(isVideo)
	
	//console.log(partner)
	
	//$("#partner_image").html('<img src="'+location.origin+'/files/user_images/'+currPartner+'/general/original_image_0.jpg">')
	$('#partner_image').html('<img src="'+partner.dir+partner.file_name+'"/>')
	
	$("#partner_name").html(partner.firstname?partner.firstname:'');
	
	$("#partner_id").html('ID : '+currPartner);
	
	$("#partner_age").html(partner.user_age?partner.user_age:'');
	
	$("#partner_hair").html(partner.user_haircolor_id?partner.user_haircolor_id:'');
	
	$("#partner_eyes").html(partner.user_eyecolor_id?partner.user_eyecolor_id:'');
	
	$("#partner_map_city").html(partner.user_age?partner.user_age:'');
	
	$("#partner_map_country").html(partner.user_age?partner.user_age:'');
	////console.log($())	
	
	var online_st=users_online_st[currPartner];
	
	/*TODO добавить логику третьего пункта ТЗ*/
	if(!online_st){
		$('#field').addClass('disabled');
		$('#offline_message').show().text((partner.firstname?partner.firstname:'')+" сечас не в сети и не сможет вам ответить. Начните с ней чат позже.");	
	}
	else{
		$('#offline_message').hide();
	}	
	/*КОНЕЦ*/
	
	if(isVideo){
		$('#com_type').text('Video chat');
	}
	else{
		$('#com_type').text('Live chat');
	}
	//имитация прочтения сообщения	
	$("#"+currPartner+'_mess').remove();
	$("#"+currPartner).addClass('current');
	
	//обновляем сообщения
	var html = '';	
	//TODO нужна ли проверка? 
	//console.log(currPartner)
	//console.log(videoChatMessages[currPartner])
	//console.log(chatMessages[currPartner])
	videoChatMessages=videoChatMessages?videoChatMessages:{};
	videoChatMessages[currPartner]=videoChatMessages[currPartner]?videoChatMessages[currPartner]:[];
	chatMessages=chatMessages?chatMessages:{};
	chatMessages[currPartner]=chatMessages[currPartner]?chatMessages[currPartner]:[];
	
	//выбираем массив которым будем оперировать дальше
	var goalMessArray=isVideo?videoChatMessages[currPartner]:chatMessages[currPartner];
	
	
	//заполняем окно сообщений
	fillMessageBox(goalMessArray);
	
	var _data={};
	_data.user_id=currPartner;
	
	//setting partner id
	socket.emit('changed user in chat window',_data);
		
	$('#video-container').children().each(function(){
		$(this).attr('style','display:none;');
	});
	
	$('#video-blob-'+currPartner).attr('style','display:inline;');
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
		html += '<div class="message-item"><div class="message-item-info"><span class="user-name user-'+(goalMessArray[i].firstname===myName?'myself':'partner')+'">' 
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
//TODO дописать функцию изменения типа коммуникации (чат или видеочат)
//при нажатии вызывается функция set speaker


//TODO add new functionality
function changeTypeOfCommunication(obj,e){
	console.log('changeTypeOfCommunication function');
	e.stopPropagation();
	
	//если изменяем на видео - проверять включенную камеру
	var _parent=$(obj).parent();
	var id=$(_parent).attr('id').toString();
	console.log(id);
	console.log(videoStatus[id]);
	
	if(!videoStatus[id])
	{
		socket.emit('change type of communication',{'id':id})
		return;
	}
	
	
	if(videoStatus[id]){
		//closing video
		if(connections[id.toString()]){
			connections[id].leave();
			connections[id].getExternalIceServers = false;
			//onMessageCallbacks={};
		}
	}
	
	var _parent=$(obj).parent();
	$(obj).remove();//удаляем иконку
	//console.log(user_list)
	var id=$(_parent).attr('id').toString();
	var context=$(_parent).html();
	//меняем тип коммуникации
	videoStatus[id]=!videoStatus[id];
	
	context+=/*'<i class="fa fa-close pull-right" onclick="removeFromList(this,event)"></i>'+*/(!videoStatus[id]?'<i class="fa fa-list-alt pull-right" onclick="changeTypeOfCommunication(this,event)"></i></li>':'<i class="fa fa-video-camera pull-right" onclick="changeTypeOfCommunication(this,event)"></i></li>');
	
	$(_parent).html(context);
	//ТОДО вырубить видео
	console.log('changeTypeOfCommunication')
	
	var data={'id':id,'video':videoStatus[id]};//передаем айдишник партнера
	//сново палим setSpeaker
	//console.log(data)
	
	var user=getUserById(id);
	setSpeaker(user)
	socket.emit('partner type communication changing',data);
	console.log('user_id ',id)
	endTimer(id);	

}

function initRTCMultiConnection(userid) {
		var connection = new RTCMultiConnection();
		
		var _protocol=location.protocol=="http:"?"ws":"wss";
		var v_port=location.protocol=="http:"?':9085':':9083'
		connection.socketURL = _protocol+'://'+location.hostname+v_port;
		connection.socketMessageEvent = 'video-conference-demo';
		
		connection.session = {
			audio: false,
			video: false,
			oneway:true
		};


		connection.sdpConstraints.mandatory = {
			OfferToReceiveAudio: true,
			OfferToReceiveVideo: true
		};
	
		//var videosContainer = document.getElementById('video-container');
		
		if(currPartner==userid)
			$("#video-container").append('<div id="video-blob-'+userid+'">');
		else
			$("#video-container").append('<div id="video-blob-'+userid+'" style="display:none;">');
			
		var videosContainer =$("#video-blob-"+userid);

		
		connection.onstream = function(event) {
			console.log('event.mediaElement')
			console.log(event.mediaElement)
			
			videosContainer.append(event.mediaElement);

			setTimeout(function() {
				event.mediaElement.play();
			}, 5000);
		};
		return connection;
		
	}
	
//таймер

function startTimer(partner_id){
	$('#extra_info').show();
	console.log('start timer function ',partner_id)
	console.log(partner_id)
	startTime = new Date();	
	timers[partner_id]={}
	timers[partner_id].actual=true;//при первой реализации!
	
	timers[partner_id].timer = setInterval(function(){
		var now = new Date()-startTime;//milisec
		var h = Math.floor(now/(1000*60*60));
		var m = Math.floor(now/(1000*60))-h*24;
		var s = Math.floor(now/(1000))-m*60;
		// add a zero in front of numbers<10
		//h = checkTime(h);
		m = checkTime(m);
		s = checkTime(s);
		timers[partner_id].value=/*h + ":" + */m + ":" + s;
		console.log('im alive!!!! ',partner_id)
		if(partner_id==currPartner&&timers[partner_id].actual)
			$('#timer').html(timers[partner_id].value);
		

	},1000)	
}

//formatting function

function checkTime(t){
	t=t<10?'0'+t:t;
	return t;
}

function formatDate(data){
	
	console.log('formatDate function')
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


function endTimer(user_id){
	console.log();
	console.log('endTimer function ',user_id);
	console.log();
	
	if(timers&&timers[user_id]){
		timers[user_id].actual=false;
		clearInterval(timers[user_id].timer)		
	}
	
	if(user_id==currPartner&&timers[user_id]&&!timers[user_id].actual)
		{
			var last=$('#timer').html();	
			$('#timer').html('<span style="color:red;">'+last+'</span>')
		}
	
}

//change page with paginator
function goToPage(_page){
	if(_page==pageNumber)
		return;
	console.log('goToPage function');
	pageNumber=_page;
	getPossiblePartners();	
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
		$('#prev_button').hide();
		$('#next_button').hide();
	}
	else{
		$('#_paginator').show()
		$('#prev_button').show();
		$('#next_button').show();
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

function transformToAssocArray( prmstr ) {
    var params = {};
    var prmarr = prmstr.split("&");
    for ( var i = 0; i < prmarr.length; i++) {
        var tmparr = prmarr[i].split("=");
        params[tmparr[0]] = tmparr[1];
    }
    return params;
}


	