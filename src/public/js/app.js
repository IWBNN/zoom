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

const welcome = document.getElementById("welcome")
const form = welcome.querySelector("form");
const room = document.getElementById("room");

room.hidden = true;

let roomName, nickname;

function addMessage(message){
    const ul = room.querySelector("ul")
    const li = document.createElement("li")
    li.innerText = message;
    ul.appendChild(li);
}

function handleMessageSubmit(event) {
    event.preventDefault();
    const input = room.querySelector("#msg input");
    const value = input.value;
    socket.emit("new_message", input.value, roomName, () => {
        addMessage(`You: ${value}`);
       input.value="";
    });
}

function handleNicknameSubmit(event) {
    event.preventDefault();
    const input = room.querySelector("#name input");
    const value = input.value;
    socket.emit("nickname", value);
    // input.value=""; 버튼 누른 후 텍스트 비우기
}

function showRoom(msg) {
    welcome.hidden = true;
    room.hidden = false;
    const h3 = room.querySelector("h3");
    h3.innerText = `Room ${roomName}`;
    const msgForm = room.querySelector("#msg");
    const nameForm = room.querySelector("#name");
    msgForm.addEventListener("submit", handleMessageSubmit);
    nameForm.addEventListener("submit", handleNicknameSubmit);

}

function handleRoomSubmit(event) {
    event.preventDefault();
    //const input = form.querySelector("input");
    const input = form.querySelector("input");
    // socket.emit(
    //     // emit param 1 = event 이름 2 = 보내고싶은 payload 3 = 서버에서 호출하는 function
    //     // 사실 emit 안에서 규명하는 arg 모두를 서버로 보낼 수 있다.
    //     // function 의 경우 무조건 마지막 arg 에 넣는다.
    //     "enter_room",
    //     input.value,
    //     showRoom
    //     );
    socket.emit("enter_room", input.value, showRoom);
    roomName = input.value;
    input.value="";
}

form.addEventListener("submit", handleRoomSubmit);

socket.on("welcome", (user, newCount) => {
    const h3 = room.querySelector("h3");
    h3.innerText = `Room ${roomName} (${newCount})`;
    addMessage(`${user} arrived!`)
})

socket.on("bye", (left, newCount) => {
    const h3 = room.querySelector("h3");
    h3.innerText = `Room ${roomName} (${newCount})`;
    addMessage(`${left} left ㅠㅠ`)
})

socket.on("new_message", addMessage);

socket.on("room_change", (rooms) => {
    const roomList = welcome.querySelector("ul");
    roomList.innerHTML = "";
    if(rooms.length === 0) {
        return;
    }
    rooms.forEach(room => {
        const li = document.createElement("li");
        li.innerText = room;
        roomList.append(li);
    });
});
// = socket.on("room_change", (msg) => console.log(msg));