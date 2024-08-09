/* const messageList = document.querySelector("ul");
const nickForm = document.querySelector("#nick");
const messageForm = document.querySelector("#message");
const socket = new WebSocket(`ws://${window.location.host}`)
// socket = 서버로의 연결

function makeMessage(type, payload) {
    const msg = {type, payload}
    return JSON.stringify(msg);
}

function handleOpen() {
    console.log("Connected to Server ?");
}

socket.addEventListener("open", handleOpen);

socket.addEventListener("message", (message) => {
    // 서버로부터 데이터를 받았을 때
//    console.log("New message: ", message.data);
    const li = document.createElement("li");
    li.innerText = message.data;
    messageList.append(li);
});

socket.addEventListener("close", () => {
    // 서버와 연결이 끊겼을 때
    console.log("Disconnected from Server !");
});

// setTimeout(() => {
//     socket.send("hello from the browser ! ");
// }, 10000);

function handleSubmit(event) {
    event.preventDefault();
    const input = messageForm.querySelector("input");
    socket.send(makeMessage("new_message", input.value));
    const li = document.createElement("li");
    li.innerText = `You: ${input.value}`;
    messageList.append(li);
    input.value = "";
}

function handleNickSubmit(event) {
    event.preventDefault();
    const input = nickForm.querySelector("input");
    socket.send(makeMessage("nickname", input.value)); // string -> object 과정 필요
    input.value = "";
}

messageForm.addEventListener("submit", handleSubmit);
nickForm.addEventListener("submit", handleNickSubmit);

*/ // webSocket 만 사용하여 구현한 frontend

const socket = io();

const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute")
const cameraBtn = document.getElementById("camera")
const camerasSelect = document.getElementById("cameras")
const micSelect = document.getElementById("mics")
const audioSelect = document.getElementById("audios")

let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let myDataChannel;

const call = document.getElementById("call")

call.hidden = true;

async function getCameras() {
    try{
        const devices = await navigator.mediaDevices.enumerateDevices()
        const cameras = devices.filter(device => device.kind === "videoinput");
        const currentCamera = myStream.getVideoTracks()[0];
        cameras.forEach(camera => {
            const option = document.createElement("option")
            option.value = camera.deviceId;
            option.innerText = camera.label;
            if(currentCamera.label === camera.label) {
                option.selected = true;
            }
            camerasSelect.appendChild(option)
        });
        // console.log(cameras) 접속중인 카메라 디바이스 출력
    } catch(e) {
        console.log(e)
    }
}

async function getMic() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const mics = devices.filter(device => device.kind === "audioinput")
        const currentMic = myStream.getAudioTracks()[0];
        mics.forEach(mic => {
            const option = document.createElement("option")
            option.value = mic.deviceId;
            option.innerText = mic.label;
            if(currentMic.label === mic.label) {
                option.selected = true;
            }
            micSelect.appendChild(option)
    })
        // console.log(mics) 접속중인 마이크 디바이스 출력
        // console.log(devices) 접속중인 마이크/카메라/스피커 디바이스 출력
    }catch (e) {
        console.log(e)
    }
}

async function getAudio() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const audios = devices.filter(device => device.kind === "audiooutput")
        // const currentAudio = myStream.get()[0];
        audios.forEach(audio => {
            const option = document.createElement("option")
            option.value = audio.deviceId;
            option.innerText = audio.label;
            // if(currentAudio.label === audio.label) {
            //     option.selected = true;
            // }
            audioSelect.appendChild(option)
        })
        // console.log(audios) 접속중인 스피커 디바이스 출력
    }catch (e) {
        console.log(e)
    }
}

async function getMedia(deviceId){
    const initialConstrains = {
        audio: true,
        video: { facingMode: "user"},
    };
    const cameraConstraints = {
        audio:true,
        video: {deviceId: { exact: deviceId}}, // deviceId 가 존재할 경우 동작
    }
    try {
        myStream = await navigator.mediaDevices.getUserMedia(
                deviceId ? cameraConstraints : initialConstrains
                // video: { facingMode: "user" } -- 핸드폰 셀카 선택 - default
                // video: { facingMode: "environment" } -- 핸드폰 후면카메라 선택
        );
        myFace.srcObject = myStream;
        if(!deviceId) {await getCameras()}
        await getMic()
        await getAudio()
    } catch(e) {
      console.log(e);
    }
}

// getMedia();

function handleMuteClick() {
    myStream
        .getAudioTracks()
        .forEach(track => (track.enabled = !track.enabled));
    if(!muted) {
        muteBtn.innerText = "Unmute"
        muted = true;
    } else {
        muteBtn.innerText = "Mute"
        muted = false;
    }
}

function handleCameraClick() {
    myStream
        .getVideoTracks()
        .forEach(track => (track.enabled = !track.enabled));
    if(cameraOff) {
        cameraBtn.innerText = "Turn Camera Off"
        cameraOff = false;
    } else {
        cameraBtn.innerText = "Turn Camera On"
        cameraOff = true;
    }
}

async function handleCameraChange() {
    await getMedia(camerasSelect.value);
    if (myPeerConnection) {
        const videoTrack = myStream.getVideoTracks()[0]
        const videoSender = myPeerConnection
            .getSenders() // Sender 는 peer 로 보내진 media stream track 을 컨트롤 함
            .find(sender => sender.track.kind === "video");
        // getSenders 를 하면 현재 내가 Sending 하는 장치의 정보를 불러온다.
        // 이때 video 와 audio 가 있는데, 해당 분류는 kind 로 분류되어 있다.
        // 그러므로 위 find 를 사용하여 sender 의 트랙에서의 kind 가 video 인 값을
        // 찾으면 video Connection 을 찾을 수 있다.
        // console.log(videoSender); 로그를 찍어 보면 video track 만 나온다.
        videoSender.replaceTrack(videoTrack)
        // 다른 브라우저로 보내진 비디오와 오디오 데이터를 컨트롤 하는 방법

        // npm i localtunnel 을 하니까 일시적으로 localhost 를 인터넷 서버로
        // 사용 가능하게 한다함.. what?
    }
}

muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
camerasSelect.addEventListener("input", handleCameraChange);


/// Welcome Form (join a room)

const welcome = document.getElementById("welcome")
const welcomeForm = welcome.querySelector("form");

async function initCall() {
    welcome.hidden = true;
    call.hidden = false;
    await getMedia();
    makeConnection();
}

async function handleWelcomeSubmit(event) {
    event.preventDefault()
    const input = welcomeForm.querySelector("input");
    await initCall();
    // 이곳에 있던 initCall 함수를 위로 보냄 -> 먼저 함수를 발생시켜
    // 아래 "offer" 에서 myPeerConnection 이 생성되기 전에
    // offer 를 받는 경우를 방지함
    socket.emit("join_room", input.value);
    roomName = input.value;
    input.value = ""
}

welcomeForm.addEventListener("submit", handleWelcomeSubmit);

// Socket Code

socket.on("welcome", async () => { // 방 생성자에 의해 실행
    // 방 생성자가 DataChannel 을 생성 후 message event 생성
    myDataChannel = myPeerConnection.createDataChannel("chat");
    myDataChannel.addEventListener("message", (event) => console.log(event.data))
    console.log("made date channel");
    const offer = await myPeerConnection.createOffer()
    myPeerConnection.setLocalDescription(offer) // 생성자 client A 에게 Description 제공
    console.log("send the offer");
    socket.emit("offer", offer, roomName);
    // console.log("someone joined"); 방에 누군가 접속했을 경우 출력
})

socket.on("offer", async(offer) => { // 생성된 방 참가자에 의해 실행
    // sdp(Software Defined Perimeter) 가 출력이 된다.
    // sdp 는 신원이 확인된 사용자만 리소스에
    // 접근할 수 있는 인증 절차를 밟는 네트워크 접근 시스템 이다.
    //console.log(offer)
    myPeerConnection.addEventListener("datachannel", (event) => {
        myDataChannel = event.channel;  // 이미 생성된 DataChannel 을 받기
        myDataChannel.addEventListener("message", (event) => console.log(event.data))
    })
    console.log("received the offer");
    myPeerConnection.setRemoteDescription(offer);
    const answer = await myPeerConnection.createAnswer()
    console.log(answer)
    myPeerConnection.setLocalDescription(answer)
    socket.emit("answer", answer, roomName);
    console.log("sent the offer");
})

socket.on("answer", answer => {
    console.log("received the answer");
    myPeerConnection.setRemoteDescription(answer)
})

socket.on("ice", (ice) => {
    console.log("receive candidate")
    myPeerConnection.addIceCandidate(ice)
})

// RTC Code

// DataChannel 이란 기술이 있다.
// 서버를 거치지 않고 파일, 텍스트(채팅) 등의 요소를 보낼 수 있는 기능인데
// 적용을 할지 말지는 잘 모르겠다.

function makeConnection() {
    myPeerConnection = new RTCPeerConnection({
        // stun 서버는 컴퓨터가 공용 IP주소를 찾게 해줌
        // 어떤 것을 request 하면 인터넷에서 서로가 누군지 알려주는 서버
        // 즉, 사용자의 장치에 공용주소를 알려주는 서버
        // 중요 - 비디오를 주고받기 위해서 사용하는 것이 아님!!
        //  공용주소를 알아내기 위해 사용 -> 안하면 다른 wifi 에 접속하면 연결이 안됨
        iceServers: [
            {
                urls: [
                    "stun:stun.l.google.com:19302",
                    "stun:stun1.l.google.com:19302",
                    "stun:stun2.l.google.com:19302",
                    "stun:stun3.l.google.com:19302",
                    "stun:stun4.l.google.com:19302"
                ]
            }
        ]
    });
    myPeerConnection.addEventListener("icecandidate", handleIce);
    myPeerConnection.addEventListener("addstream", handleAddStream);
    myStream
        .getTracks()
        .forEach(track => myPeerConnection.addTrack(track, myStream));
}

function handleIce(data) {
    console.log("sent candidate")
    socket.emit("ice", data.candidate, roomName)
    // console.log("got ice candidate")
    // console.log(data)
}

function handleAddStream(data) {
    // console.log("got a stream from my peer")
    const peerFace = document.getElementById("peerFace")
    console.log("Peer's Stream", data.stream); // 통신하는 상대 장치에 대한 stream
    // console.log("My stream", myStream); // 현재 내 장치에 대한 stream
    peerFace.srcObject = data.stream;
}

// 실시간 텍스트 채팅 구현 코드
// const welcome = document.getElementById("welcome")
// const form = welcome.querySelector("form");
// const room = document.getElementById("room");
//
// room.hidden = true;
//
// let roomName, nickname;
//
// function addMessage(message){
//     const ul = room.querySelector("ul")
//     const li = document.createElement("li")
//     li.innerText = message;
//     ul.appendChild(li);
// }
//
// function handleMessageSubmit(event) {
//     event.preventDefault();
//     const input = room.querySelector("#msg input");
//     const value = input.value;
//     socket.emit("new_message", input.value, roomName, () => {
//         addMessage(`You: ${value}`);
//        input.value="";
//     });
// }
//
// function handleNicknameSubmit(event) {
//     event.preventDefault();
//     const input = room.querySelector("#name input");
//     const value = input.value;
//     socket.emit("nickname", value);
//     // input.value=""; 버튼 누른 후 텍스트 비우기
// }
//
// function showRoom(msg) {
//     welcome.hidden = true;
//     room.hidden = false;
//     const h3 = room.querySelector("h3");
//     h3.innerText = `Room ${roomName}`;
//     const msgForm = room.querySelector("#msg");
//     const nameForm = room.querySelector("#name");
//     msgForm.addEventListener("submit", handleMessageSubmit);
//     nameForm.addEventListener("submit", handleNicknameSubmit);
//
// }
//
// function handleRoomSubmit(event) {
//     event.preventDefault();
//     //const input = form.querySelector("input");
//     const input = form.querySelector("input");
//     // socket.emit(
//     //     // emit param 1 = event 이름 2 = 보내고싶은 payload 3 = 서버에서 호출하는 function
//     //     // 사실 emit 안에서 규명하는 arg 모두를 서버로 보낼 수 있다.
//     //     // function 의 경우 무조건 마지막 arg 에 넣는다.
//     //     "enter_room",
//     //     input.value,
//     //     showRoom
//     //     );
//     socket.emit("enter_room", input.value, showRoom);
//     roomName = input.value;
//     input.value="";
// }
//
// form.addEventListener("submit", handleRoomSubmit);
//
// socket.on("welcome", (user, newCount) => {
//     const h3 = room.querySelector("h3");
//     h3.innerText = `Room ${roomName} (${newCount})`;
//     addMessage(`${user} arrived!`)
// })
//
// socket.on("bye", (left, newCount) => {
//     const h3 = room.querySelector("h3");
//     h3.innerText = `Room ${roomName} (${newCount})`;
//     addMessage(`${left} left ㅠㅠ`)
// })
//
// socket.on("new_message", addMessage);
//
// socket.on("room_change", (rooms) => {
//     const roomList = welcome.querySelector("ul");
//     roomList.innerHTML = "";
//     if(rooms.length === 0) {
//         return;
//     }
//     rooms.forEach(room => {
//         const li = document.createElement("li");
//         li.innerText = room;
//         roomList.append(li);
//     });
// });
// = socket.on("room_change", (msg) => console.log(msg));