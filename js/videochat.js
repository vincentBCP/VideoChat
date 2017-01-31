var g_socket = null;
var g_localVideo = null;
var g_remoteVideo = null;
var g_localStream = null;
var g_socketId = null;
var g_remotePcs = [];
var g_room = 'VBCP';

$(document).ready(function() {
	$('.remote-video').css('height', $('.remote-video').width());

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
	g_room = $('input[name="room-name"]').val();
	connectToRoom(g_room);
}

function connectToNodeServer() {
	g_socket = io.connect('https://pacific-forest-63486.herokuapp.com/');

	g_socket.on('joined', function(socketId) {
		g_socketId = socketId;
		$('#local-video-div').show();
		$('#remote-videos-div').show();
		$('#get-room-div').hide();

		for(var i = 0 ; i<g_room.length ; i++) {
			$('#room-div').append("<span>" + g_room[i] + "</span>");
		}

		startLocal();

		g_socket.emit('I joined', g_socketId);
	});

	g_socket.on('user joined', function(socketId) {
		createRemoteVideo(socketId);
		createRemotePeerConnection(socketId, 'offer', null);
	});

	g_socket.on('user disconnected', function(socketId) {
		$('#remote-videos-div video[data-video-id="' + socketId + '"]').parent().remove();
		$('#remote-video').prop('src', null);
	});

	g_socket.on('videocall offer/answer', function(data) {
		if (data.to == g_socketId) {
			if (data.type == "offer") {
				createRemoteVideo(data.sender);
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
}

function connectToRoom(room) {
	g_socket.emit('create/join room', room);
}

function startLocal() {
	g_localVideo = document.querySelector('#local-video');
	g_remoteVideo = document.querySelector('#remote-video');

	navigator.mediaDevices.getUserMedia({
		audio: true,
		video: true
	})
    .then(function(stream) {
    	window.window.g_localStream = stream;
    	g_localVideo.src = window.URL.createObjectURL(stream);
    })
    .catch(function(e) {
    	console.log(e);
        alert('getUserMedia() error: ' + e.name);
    });
}

function createRemoteVideo(socketId) {
	var remoteVideo = $($('#templates #remote-video-div').clone().html());
	$(remoteVideo).find('video').attr('data-video-id', socketId);
	$(remoteVideo).find('video').prop('data-video-id', socketId);
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

function setLocalAndSendMessage(pc, sessionDescription, type/*offer or answer*/, sender, to) {
    pc.setLocalDescription(sessionDescription);
    g_socket.emit('videocall offer/answer', {sd : sessionDescription, type: type, sender: sender, to: to});
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
        }

        if (action == "offer") {
        	remotePc.pc.createOffer(function(sessionDescription) {
	            setLocalAndSendMessage(remotePc.pc, sessionDescription, 'offer', g_socketId, socketId);
	        }, function(e) {
	        	console.log("Failed to create offer.");
	        });
        } else if (action == "answer") {
        	remotePc.pc.setRemoteDescription(new RTCSessionDescription(sd));
        	remotePc.pc.createAnswer(function(sessionDescription) {
	            setLocalAndSendMessage(remotePc.pc, sessionDescription, 'answer', g_socketId, socketId);
	        }, function(e) {
	        	console.log("Failed to create answer.");
	        });
        }
    }
}

function updateVideoDivs() {
	$('.remote-video').css('height', $('.remote-video').width());
}
