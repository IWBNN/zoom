import http from "http";
// import WebSocket from "ws";
import {Server} from "socket.io";
import {instrument} from "@socket.io/admin-ui";
import express from "express";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (req, res) => res.render("home"));
app.get("/*", (req ,res) => res.redirect("/"));
const handleListen = () => console.log("Listening on http://localhost:3000");

const httpServer = http.createServer(app);
// const wss = new WebSocket.Server({ server });
const wsServer = new Server(httpServer, {
    cors: {
        origin: ["https://admin.socket.io"],
        credentials: true
    }
});

instrument(wsServer, {
    auth: false,
    mode: "development",
});

function publicRooms() {
    const {sockets:
        {adapter:
            {sids, rooms}
        }
    } = wsServer;
    const publicRooms = [];
    rooms.forEach((_, key) => {
        if (sids.get(key) === undefined) {
            publicRooms.push(key);
        }
    });
    return publicRooms;
}

function countRoom(roomName) {
    return wsServer.sockets.adapter.rooms.get(roomName)?.size;
}

wsServer.on("connection", socket => {
    socket["nickname"] = "Anon"
    // on 과 emit 의 이벤트 이름은 동일해야 함
    socket.onAny((event) => {
        console.log(wsServer.sockets.adapter);
        console.log(`Socket Event: ${event}`);
    });
    socket.on("enter_room", (roomName, done) => {
        // listener 부분에서의 arg 개수만큼
        // app.js 에서의 emit 의 arg 가 선언된다. (emit 에서 선언한 만큼 on 으로 받아야 함)
        // console.log(socket.id);
        // console.log(socket.rooms);
        socket.join(roomName);
        done();
        socket.to(roomName).emit("welcome", socket.nickname, countRoom(roomName));
        // console.log(socket.rooms);
        wsServer.sockets.emit("room_change", publicRooms());
    });
    socket.on("disconnecting", () => {
        socket.rooms.forEach(room =>
            socket.to(room).emit("bye", socket.nickname, countRoom(room) - 1)
        );
    });
    socket.on("disconnect", () => {
        wsServer.sockets.emit("room_change", publicRooms());
    })
    socket.on("new_message", (msg, room, done) => {
        socket.to(room).emit("new_message", `${socket.nickname}: ${msg}`);
        done();
    })
    socket.on("nickname", (nickname) => (socket["nickname"] = nickname));
});

function handleConnection(socket) {  // socket = 연결된 브라우저
    console.log(socket)
}

function onSocketClose() {
    console.log("Disconnected from the Browser ! ");
}

function onSocketMessage(message){
    console.log(message.toString());
}

/* const sockets = [];
// wss 로 back 에서 front 로 메세지 보내기 -> addEventListener 로 받음
wss.on("connection", (socket) => {
    sockets.push(socket); // sockets 배열에 접속자 추가
    socket["nickname"] = "anon"
    console.log("Connected to Browser ?");
    // browser 가 닫힐 경우 close 가 되면서 log 찍음 (back 서버에서)
    socket.on("close", onSocketClose)
    socket.on("message", (msg) => {
        const message = JSON.parse(msg.toString());
        // console.log(parsed, message.toString())
        switch(message.type){
            case "new_message":
                sockets.forEach((aSocket) => aSocket.send(`${socket.nickname}: ${message.payload}`));
            case "nickname":
                socket["nickname"] = message.payload;
                // console.log(message.payload);
        }
        // if(parsed.type === "new_message") {
        //     sockets.forEach((aSocket) => aSocket.send(parsed.payload.toString()));
        // } else if (parsed.type === "nickname") {
        //     console.log(parsed.payload);
        // }
    }); // object -> string 과정 필요
    // socket.send("hello!!!"); // socket 에 있는 메서드 사용 not wss
}); */

httpServer.listen(3000, handleListen);


