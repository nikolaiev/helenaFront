<!DOCTYPE html>
<html lang="ua">
	<head>	
		<title>Chat</title>	
		<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />		
		<link rel='stylesheet' type='text/css' media='all' href='style.css' />
		<link rel='stylesheet' type='text/css' media='all' href='chat.css' />
		<!--script src='/protected/js_lib/jquery.js' type='text/javascript'></script>
		<script src='/protected/js_lib/sockjs-0.3.4.min.js' type='text/javascript'></script>
		<script src='/protected/js_lib/socket-init.js' type='text/javascript'></script>
		<script src='/protected/view/js/chat.js' type='text/javascript'></script-->		
	</head>
	<body class="female" style="background:#fff;">		
				
		<div id="top-line">
			<div class="container">
			</div>
		</div>
		<div id="sub-top-line" class="w">
			<div class="container">
				<a class="small-logo" href="/profile"><img src="/protected/view/images/s-logo.png"/></a>
				<ul class="sub-menu">
					<li><a href="/search"><i class="icon-search"></i>Search</a></li>
					<li class="wide">
						<a href="/newmessages"><i class="icon-emailalt"></i>
							<span class="counter">20</span>
						</a>
						<a href="/favorites"><i class="icon-user"></i></a>
					</li>
				</ul>
			</div>
		</div>
		<div id="chat-window" class="">
			<h2>Live chat</h2>
			<div class="block-left pull-left" id="chat">
				<div class="content">
					<div class='companion-info'>
						<div class='companion-avatar pull-left'>
							<img src=''>
						</div>
						<p class='companion-id'>
							<span class='name'>$firstname$</span>
							<span class='label label-primary'>id: 999</span>
						</p>
						<div class='short-info'>
							<p>Age: 22</p>
							<p>$user_haircolor, $user_eyecolor eyes</p>
							<p style='text-transform: capitalize;'>$map_city, $map_country</p>
						</div>
						<ul class="col-md-7">
							<li class="favorite delete" id="999"><a><!--i class=\"icon-star\" title=\"Add to favorites\"></i--><i class="icon-star" title="Delete from favorites"></i></a></li>
							<li><a href="" title="Date me"><i class="icon-heart"></i></a></li> <!-- if($viewUser->get('sex')==2) -->
							<li><a class="vc" href="" title="Video date"><i class="icon-facetime-video"></i></a></li> <!--$viewUser->is_offline()? offline-->
							<li><a href="" title="Call me"><i class="icon-phoneold"></i></a></li>
							<li><a href="" title="Presents & flowers"><i class="icon-flower"></i></a></li><!-- if($viewUser->get('sex')==2) -->
							<li><a href="" title="Virtual gift"><i class="icon-gift"></i></a></li>
							<li><a href="/messages/send/999" title="Email me"><i class="icon-emailalt"></i></a></li>							
						</ul>
					</div>
					<div class="message-text"></div>			
				</div>				
				<style>
					.information-panel{
						position: relative;
						bottom: 100px;
						margin: -50px 20px;
						padding: 10px;
						background-color: #fbfba8;
						font-size: 14px;
						color: #000;
						font-weight: normal;
						text-align: center;
						display: 'block';
					}
				</style>					
				<div class="information-panel">
					<p>You're just a click away from chatting with $firstname.</p>
					<p>Don't miss your chance - get in touchright now!</p>
					<a class="btn btn-danger" href="/balance">Purchase Credits</a>
				</div>				
				<div class="container_status">
					<div class="input-message-form">
						<!--if(!empty($video_flag))
							<div class="time-price">
								<span class="timer"></span>
								<span class="price"></span>
							</div>
						endif-->
						<div class="textarea" contenteditable="true"></div>
						<div class="smiles-wrap">
							<i class='icon-smile smiles'></i>
							<div class='smiles-list' style="display:none;">
								<!--$icons-->
							</div>
						</div>
						<div class="links pull-left">
							<input  type="submit" class="btn btn-danger btn-xs" value="Reply" name="send_message">
							<label><input type="checkbox" name="send_all_online_men" class="send_all_online_men">для всех мужчин онлайн</label> <!--if($this->viewUser->get('sex')==1)-->
						</div>			
					</div>
					<div class="join-interlocutor">
						<span>join-interlocutor</span>
					</div>
					<div class="no-connect">
						Нет соединения
					</div>
					<div class="connect">
						Соединения..
					</div>
					<div class="authorization">
						Авторизация..
					</div>
					<div class="authorization-error">
						Не удалось авторизоваться.<br>Возможно, технические проблемы.
					</div>
					<div class="balance-error">
						Please purchase some credits before countinuing
					</div>					
				</div>
			</div>
			<div class='block-rigth pull-right'>
				<!--if(!empty($video_flag)):
				<div class="pure-u-2-3" id="video-container">					
					//videochat **** start added code  ****** 
					<video id="remoteVideo" autoplay style="width:auto; height:189px"></video>	
					<video id="localVideo" autoplay style="width:auto; height:189px"></video>					
					 //videochat **** end added code  ****** 
				</div>				
				endif-->
				<div class='list-companions'>					
					<ul>
						<li class="current">$firstname current<span>(id: 999)</span></li>
						<li class="online"><a >$firstname<span>(id: 222)</span></a></li>
						<li>$firstname<span>(id: 999)</span></li>
					</ul>
				</div>
			</div>
		</div>
	</body>
</html>
