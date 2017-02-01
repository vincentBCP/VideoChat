<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="_token" content="{{csrf_token()}}" />

        <title>Video Chat</title>

        <!--jQuery-->
        <script src="js/jquery-3.1.1.min.js"></script>
        <!--bootstrap-->
        <link href="css/bootstrap-3.3.7/dist/css/bootstrap.min.css" rel="stylesheet" type="text/css"/>
        <!--bootstrap javascipt-->
        <script src="css/bootstrap-3.3.7/dist/js/bootstrap.min.js"></script>

        <link href='css/video_chat.css' rel='stylesheet'/>

        <script src='js/socket.io/socket.io.js'></script>

        <script src="js/lib/adapter.js"></script>

        <script type="text/javascript" src='js/videochat.js'></script>
    </head>
    
    <body onresize='updateVideoDivs()'>
        <div id='templates' style='display: none;'>
            <div id='remote-video-div'>
                <div class='remote-video'>
                    <video autoplay></video>
                    <span></span>
                </div>
            </div>
        </div>

        <div id='local-video-div' style='display: none;'>
            <div id='room-div'>
                <span style='font-size: 1em;'>ROOM</span>
            </div>

            <div class='video-div'>
                <video id='local-video' autoplay></video>
            </div>
            <br/>
            <div class='video-div'>
                <video id='remote-video' autoplay></video>
            </div>
        </div>

        <div id='messages-div' style='display: none;'>
            <div id='users-div'>
                <!--select>
                    <option>All</option>
                </select-->
            </div>
            <div id='messages'>
            </div>
            <div id='text-div'>
                <textarea placeholder="Enter message and press <Enter> to send."></textarea>
            </div>
        </div>

        <div id='remote-videos-div' style='display: none;'>
        </div>

        <div id='get-room-div'>
            <span>VBCP Video Chat Service</span>
            <input name='user-name' placeholder="Your name" /><br/>
            <input name='room-name' placeholder="Create or join room" /><br/>
            <button onclick='setRoom()'>Set</button>
        </div>
    </body>
</html>
