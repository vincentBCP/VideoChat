var g_socket = null;
var g_localVideo = null;
var g_remoteVideo = null;
var g_localStream = null;
var g_socketId = null;
var g_remotePcs = [];
var g_room = 'VBCP';
var g_username = '';
var hasCamera = false;

$(document).ready(function() {
	//check if user has videoinput device (camera/webcam)
    navigator.mediaDevices.enumerateDevices().then(function(deviceInfos) {
        for (var i = 0; i !== deviceInfos.length; ++i) {
            var deviceInfo = deviceInfos[i];

            if (deviceInfo.kind === 'videoinput') {
                hasCamera = true;
                break;
            }
        }
    }).catch(function(error) {});

    connectToNodeServer();
});

$(document).on('click', '.remote-video video', function() {
    $('#remote-video').prop('src', $(this).prop('src'));
});

$(document).on('keypress', 'input[name="room-name"]', function(event) {
    var keycode = (event.keyCode ? event.keyCode : event.which);

    if(keycode == '13') {//Enter key is pressed.
        setRoom();
    }
});

function setRoom() {
	if (!hasCamera) {
		alert("Failed to detect camera input.");
		return;
	}

	g_room = $.trim($('input[name="room-name"]').val());
	g_username = $.trim($('input[name="user-name"]').val());

	if (g_username == '') {
		alert("Provide valid username.");
		$('input[name="user-name"]').val('');
		return;
	}

	if (g_room == '') {
		alert("Provide valid room name.");
		$('input[name="room-name"]').val('');
		return;
	}

	connectToRoom(g_username, g_room);
}

function setSizes() {
	$('#remote-videos-div').css('width', $('body').width() - $('#local-video-div').width());
	$('#messages-div').css('width', $('body').width() - $('#local-video-div').width());
	$('.remote-video').css('height', ($('#remote-videos-div').width()/12) * 2);
	$('#messages-div #messages').css('height', 
		$('#messages-div').height() - $('#messages-div #users-div').height() - $('#messages-div #text-div').height());
}

function connectToNodeServer() {
	g_socket = io.connect('https://pacific-forest-63486.herokuapp.com/');

	g_socket.on('joined', function(socketId) {
		g_socketId = socketId;
		$('#local-video-div').show();
		$('#remote-videos-div').show();
		$('#messages-div').show();
		$('#get-room-div').hide();

		for(var i = 0 ; i<g_room.length ; i++) {
			$('#room-div').append("<span>" + g_room[i] + "</span>");
		}

		setSizes();
		startLocal();
	});

	g_socket.on('user joined', function(data) {
		createRemoteVideo(data.username, data.socketId);
		createRemotePeerConnection(data.socketId, 'offer', null);
	});

	g_socket.on('user disconnected', function(socketId) {
		$('#remote-videos-div video[data-video-id="' + socketId + '"]').parent().remove();
		$('#remote-video').prop('src', null);
	});

	g_socket.on('videocall offer/answer', function(data) {
		if (data.to == g_socketId) {
			if (data.type == "offer") {
				createRemoteVideo(data.senderUsername, data.sender);
				createRemotePeerConnection(data.sender, 'answer', data.sd);
				//console.log('received offer..');
			} else if (data.type == "answer") {
				g_remotePcs.forEach(function(val, key) {
					if (val.id == data.sender) {
						val.pc.setRemoteDescription(new RTCSessionDescription(data.sd));
						//console.log('received answer..');
					}
				});
			}
		} else {
			//console.log('not for you');
		}
	});

	g_socket.on('icecandidate', function(data) {
		//console.log("for : " + data.to);

		var candidate = new RTCIceCandidate({
            sdpMLineIndex: data.label,
            candidate: data.candidate
        });

		for(var i = 0 ; i<g_remotePcs.length ; i++) {
			if (g_remotePcs[i].id == data.to) {
				//console.log('icecandidate received.');

				g_remotePcs[i].pc.addIceCandidate(candidate);
				break;
			} else {
				//console.log('id : ' + g_remotePcs[i].id + " ::: " + data.to);
			}
		}
 	});

 	g_socket.on('new message', function(data) {
 		addMessage(data.senderUsername, data.message, 'left', 'rgb(255, 255, 204)');
 	});
}

function connectToRoom(username, room) {
	g_socket.emit('create/join room', {
		username: username,
		room: room
	});
}

function startLocal() {
	g_localVideo = document.querySelector('#local-video');
	g_remoteVideo = document.querySelector('#remote-video');

	navigator.mediaDevices.getUserMedia({
		audio: true,
		video: true
	})
    .then(function(stream) {
    	g_localStream = stream;
    	g_localVideo.src = window.URL.createObjectURL(stream);

    	g_socket.emit('I joined', {
			username: g_username, 
			socketId: g_socketId
		});
    })
    .catch(function(e) {
    	console.log(e);
        alert('getUserMedia() error: ' + e.name);
    });
}

function createRemoteVideo(username, socketId) {
	var remoteVideo = $($('#templates #remote-video-div').clone().html());
	$(remoteVideo).find('video').attr('data-video-id', socketId);
	$(remoteVideo).find('video').prop('data-video-id', socketId);
	$(remoteVideo).find('span').text(username);
	$('#remote-videos-div').append($(remoteVideo));
	$(remoteVideo).css('height', $(remoteVideo).width());
}

function createPeerConnection() {
    try {
        var pc = new RTCPeerConnection(null);
        return pc;
    } catch (e) {
        console.log('Failed to create PeerConnection, exception: ' + e.message);
        alert('Cannot create RTCPeerConnection object.');
        return null;
    }
}

function setLocalAndSendMessage(pc, sessionDescription, type/*offer or answer*/, username, sender, to) {
    pc.setLocalDescription(sessionDescription);
    g_socket.emit('videocall offer/answer', {sd : sessionDescription, type: type, senderUsername: username,
    	sender: sender, to: to});
}

function createRemotePeerConnection(socketId, action, sd) {
	var pc = createPeerConnection();
    
    if(pc != null) {
    	var remotePc = {id:socketId, pc: pc, localStream: window.g_localStream, remoteStream: null};
    	g_remotePcs.push( remotePc );

    	remotePc.pc.onicecandidate = function(event) {
            if (event.candidate) {
            	//console.log('sending icecandidate...');

                g_socket.emit('icecandidate', {
                    label: event.candidate.sdpMLineIndex,
                    id: event.candidate.sdpMid,
                    candidate: event.candidate.candidate,
                    to: g_socketId
                });
            }
        };
        remotePc.pc.onaddstream = function(event) {
        	remotePc.remoteStream = event.stream;

            $('#remote-videos-div video[data-video-id="' + 
            	socketId + '"]').prop('src', window.URL.createObjectURL(remotePc.remoteStream));
        };
        remotePc.pc.onremovestream = null;

        if (window.g_localStream != null) {
        	remotePc.pc.addStream(window.g_localStream);
        } else {
        	console.log('g_localStream is null?');
        }

        if (action == "offer") {
        	remotePc.pc.createOffer(function(sessionDescription) {
	            setLocalAndSendMessage(remotePc.pc, sessionDescription, 'offer', g_username, g_socketId, socketId);
	        }, function(e) {
	        	console.log("Failed to create offer.");
	        });
        } else if (action == "answer") {
        	remotePc.pc.setRemoteDescription(new RTCSessionDescription(sd));
        	remotePc.pc.createAnswer(function(sessionDescription) {
	            setLocalAndSendMessage(remotePc.pc, sessionDescription, 'answer', g_username, g_socketId, socketId);
	        }, function(e) {
	        	console.log("Failed to create answer.");
	        });
        }
    }
}

function updateVideoDivs() {
	setSizes();
}

$(document).on('keypress', '#messages-div #text-div textarea', function(event){
    var keycode = (event.keyCode ? event.keyCode : event.which);

    if(keycode == '13'){//Enter key is pressed.
    	var m = $.trim($(this).val());
        $(this).val('');
        $(this).val( $(this).val().replace(/\n/g, "") );

        if (m != '') {
        	sendMessage(m);
        }

        return false;
    }
});

function sendMessage(message) {
	g_socket.emit('send message', {
		sender: g_socketId,
		senderUsername: g_username,
		to: 'all',
		message: message
	});
	addMessage('you', message, "right", 'rgb(204, 255, 229)');
}

function addMessage(sender, message, align, color) {
	var s = $('<span>' + sender + ": " + message + '</span>');
	s.css('float', align);
	s.css('background-color', color);
    var m = $('<div class="message"></div>');
	m.css('text-align', align);
	m.append(s);

	$('#messages-div #messages').append(m);

	$("#messages-div #messages").animate({ scrollTop: 
        $("#messages-div #messages").prop("scrollHeight")}, 0);
}
