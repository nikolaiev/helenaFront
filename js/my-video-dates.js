let _socket;//global videodate _socket in current window

$(document).ready(function(){

	let chatWindow;

	window.onbeforeunload=function(){//çàêðûòèå ìàëåíüêîãî îêíà
			chatWindow.close();
			_socket.emit('browser window close');

		};

	const _protocol=location.protocol==="http:"?"ws":"wss";
    const _portVideoDate=location.protocol==="http:"?':9005':':9003';

	_socket=io.connect(_protocol+'://'+location.hostname+_portVideoDate,{resource:'_socket/socket.io','force new connection':true})


	
	_socket.on('connect',function(){
		_socket.emit('id event',{'type':'browser'});
	});
	
	_socket.on('video date acceptance',function(data){
		alertify.set('notifier','position', 'bottom-left');
		alertify.success("Someone accepted videodate appointment!");
		console.log('video date acceptance event ',data)
		//TODO ñäåëàòü íîòèôèêàöèþ î ïðèíÿòèè ïðèãëàøåíèÿ!
		//èëè ÷òî-òî ïîõîæîå
	});
		
	_socket.on('videodate reminder' , function(time){
		alertify.success('You have some videodate in '+time+' minutes!'); 
	});
	
	
	_socket.on('video date refusement',function(data){
		console.log('video date refusement ',data)
		//TODO ñäåëàòü íîòèôèêàöèþ î ïðèíÿòèè ïðèãëàøåíèÿ!
		//èëè ÷òî-òî ïîõîæîå
	});
	
	_socket.on('video date changed',function(data){
		console.log('video date changed ',data)
		//TODO ñäåëàòü íîòèôèêàöèþ î ïðèíÿòèè ïðèãëàøåíèÿ!
		//èëè ÷òî-òî ïîõîæîå
	});
	
	_socket.on('actual data for user',function(data){
		console.log('actual data for user');
		console.log(data);
		setButtons(data);
	});
	
	_socket.on('open videodate window',function(data){
		let sex=data.sex.toString();
		openDateWindow(sex);
	});
	_socket.on('user is waiting for you in videodate',function(data){
		console.log('user is waiting for me in videodate')
		showVideoDateInvitationNotification(data);
	})

});

//==============================================
function openDateWindow(sex){
	console.log('openDateWindow function')
	console.log('adding ro video chat;');
	
	const params = 'width=1000,height=800'//,menubar=no,toolbar=no,location=no,resizable=no,scrolbars=no';

	if(sex.toString()==='1'){//åñëè äåâóøêà
		chatWindow=window.open("/chat_demo/videodate.html", "Video Date", params);
	}
	else{//åñëè ìóæ÷èíà
		chatWindow=window.open("/chat_demo/videodate.html", "Video Date", params);
	}
}

function startVideoDate(date_id){
	console.log('startVideoDate fucntion');	

	const data={};
	data.date_id=date_id;
	_socket.emit('request for date beginning',data);

	/*Focus on chatWindow if it's not opened*/
	if(chatWindow){
		chatWindow.blur();
		chatWindow.focus();
	}	
}

//можно доделать alertify

function acceptDate(who_accepted,whom,invitation_id,stat,sex){
	console.log('acceptDate function');
	$.ajax({
		type: "POST",
		url: '/helena/change_state/',
		data:{
		  'id':invitation_id,
		  'stat':stat
		},
		success: function (){							
			alertify.set('notifier','position', 'bottom-left');
			alertify.success("Changed");
			if(stat=='3'&&sex=='2'||stat=='2'&&sex=='1'){
				console.log('inside my vid dates')
				var data={'who':who_accepted,'from':whom,'inv_id':invitation_id}
				_socket.emit('someone accepted video date',data);					
			}

		},
		error:function (){					
			alertify.set('notifier','position', 'bottom-left');
			alertify.success("Error");
		}
	})
	  
}

function refuseDate(who_accepted,whom,invitation_id){	
	 console.log('refuseDate function');
	 var data={'who':who_accepted,'from':whom,'inv_id':invitation_id}
	 _socket.emit('someone refused video date',data);	 
}

function offerAnotherTime(who_accepted,whom,invitation_id){
	 console.log('offerAnotherTime function');
	 var data={'who':who_accepted,'from':whom,'inv_id':invitation_id}
	 _socket.emit('someone changed video date time',data);	 
}


function setButtons(data){
	console.log('setButtons Function')

	for(let i=0;i<data.length;i++){
		//TODO ðàçîáðàòüñß ñ ïîßñàìè!!!!
		if(data[i].time_period){

			let id=data[i].id||data[i].service_order_id;

			var now=new Date();		
			
			var datingDate=new Date(data[i].date_destination);//äåíü

			var now_time_zone=now.getTimezoneOffset();
			
			var time_zone_orderer=-60*parseInt(data[i].time_zone)//parseFoleat??;//+120/-120			
			var _start=data[i].time_period;
			
			var _start_hours=_start.split(':')[0];
			var _start_minutes=_start.split(':')[1];

			var nowNativeZone=now.getTime();//не нужно менять! 
			//ТУТ ВСЕ РАБОТАЕТ! ничего менять нельзя!
			var ordDateNativeZone=datingDate.getTime()+(2*now_time_zone-time_zone_orderer)*60*1000+_start_hours*60*60*1000+_start_minutes*60*1000;//надо отнять наше время и добавить его время

			var _10MinutesInMilisec=5*60*1000//10*60*1000;
			
			if(
				(
					(ordDateNativeZone+_10MinutesInMilisec)
					>=
					(nowNativeZone)
				)
				&&
				(
					(ordDateNativeZone -_10MinutesInMilisec)
					<=
					(nowNativeZone)
				)				
			)
			{
				console.log('ALLOWING!')
				console.log(id)
				$('#'+id).removeClass('disabled');
			}
			else{
				console.log('not allowed')
				console.log((ordDateNativeZone+_10MinutesInMilisec)
					>=
					(nowNativeZone))
				console.log((ordDateNativeZone -_10MinutesInMilisec)
					<=
					(nowNativeZone))
			}
		}
	}
}

function closeVideoDateInvitation(obj,user_id,level){
	var _data={};
	_data.id=user_id;
	
	socket.emit('refuse chat invitation',_data);
	
	if(level)
		closeLiElem(obj,level)
	else
		closeLiElem(obj,4)
}

function showVideoDateInvitationNotification(data) {	

	var _data={}
	_data.not_id=new Date().getTime()
	
	console.log(data)
	var user_id=data.partner.id;
	
	var sex=data.partner.sex?data.partner.sex.toString():'';
	var mess=data.partner.message;
	
	setTimeout(function(){
		$('#'+_data.not_id).fadeOut(5000);
	},5000)
	
	//uncomment if neccesary
	
	setTimeout(function(){
		console.log('removing')
		$('#'+_data.not_id).hide(1000)
		setTimeout(function(){
			$('#'+_data.not_id).remove()
			if($("#notification li").length==0
			&&
			!$("notification").hasClass("hidden"))
			$("ul").addClass("hidden");
		},1000)		
	},10000)
	
	if($("#notifications").hasClass("hidden"))
	$("#notifications").removeClass("hidden");

	console.log('hehehehe')
	$('#notifications')
	.prepend(
		$('<li id="'+_data.not_id+'">')
		.append(
			$('<span>')
			.append('Welome')
			.append(
				$('<i>')
				.attr('class','icon-remove')
				.attr('onclick','closeVideoDateInvitation(this,"'+user_id+'",2)')
			)
		)
		.append(
			$('<div>')
			.attr('class','notification-body')
			.append(
				$('<div>')
				.attr('class','left-side pull-left')
				.append(
					$('<p>')
					.attr('class','name')
					.append('girl name')
				)
				.append(
					$('<p>')
					.attr('class','label label-primary')
					.append('ID: '+user_id)
				)
				.append(
					$('<p>')
					.append(data.age?('Age: '+data.age):'')
				)
				.append(
					$('<p>')
					.append('From: '+data.country_city+', '+data.country)
				)				
				.append(
					$('<p>')
					.append(data.haircolor+', green eyes')
				)
			)
			.append(
				$('<div>')
				.attr('class','right-side pull-right')
				.append(
					$('<img>')
					//.attr('src','../files/user_images/'+user_id+'/general/original_image_0.jpg')
				)
				.append(
					$('<span>')
					.attr('class','on')
					//.append('‚ ñåòè')
				)
			)
			.append(
				$('<div>')
				.attr('class','gift-msg')
				.append(
					$('<p>')
					.append(mess)
				)
			)
			.append(
				$('<div>')
				.attr('class','links')
				.append(
					$('<a>')
					.attr('class','btn btn-success')
					//ôóíêöèß ïðèíßòèß ïðåäëîæåíèß
					//.attr('onclick','acceptChatInvitation(this,"'+user_id+'","'+sex+'")')
					.attr('onclick','startVideoDate("'+data.room+'");closeVideoDateInvitation(this,"'+user_id+'",3);')
					.append(
						$('<i>')
						.attr('class','icon-notificationbottom')
					)
					.append(
						$('<span>')
						.append('START VIDEODATE NOW')
					)
				)
				.append(
					$('<div>')
					.attr('class','links-group')
					.append(
						$('<a>')
						//ôóíêöèß îòêàçà îò ïðåäëîæåíèß
						.attr('onclick','closeVideoDateInvitation(this,"'+user_id+'",3);')
						.append('No, Thanks')
					)
					.append('<br>')
					.append(
						$('<a>')
						//ôóíêöèß áàíà 
						.attr('onclick','closeVideoDateInvitation(this,"'+user_id+'",3);')
						.append('Add to ignore')
					)
				)
			)
		)
	)//append
	$('#'+_data.not_id).mouseover(
		function () {
		  if($(this).is(':animated')) {
			 $(this).stop().animate({opacity:'100'});
		  }
    })
}
