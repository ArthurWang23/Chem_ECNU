var ws = require("nodejs-websocket");
var io = require("socket.io-client");
var PORT3 = 3004; //需与逆合成中PORT相同才能建立websocket连接
var clientConnected3 = false;

// var input
ws.createServer(function (conn) {
  console.log(
    "New connection with Retrosynthesis Module ws client on Port",
    PORT3
  );
  clientConnected3 = true;
  wsConnection3 = conn;
  conn.on("text", function (str) {
    // str from front: index is open
    var input = JSON.parse(str);
    //ws.send(str);
    messageType = input.serve;
    console.log("fg", input);
    console.log("messageType",messageType)
    switch (messageType) {
      case "single":
        console.log("Received text from single client:", str);
        var socket = io("ws://219.228.149.80:3010/single_retro", {
          transports: ["websocket"],
        });
        // 执行相关的计算操作
        socket.emit("calculate", input);
        so(socket);
        break;
      case "multi":
        console.log("Received text from multi client:", str);
        socket = io("ws://219.228.149.80:3010/multi_retro", {
          transports: ["websocket"],
        });
        socket.emit("calculate", input);
        so(socket);
        break;
      // 添加其他消息类型的处理逻辑
      case "graph":
        console.log("Received text from graph client:", str);
        var socket_graph = io('ws://219.228.149.131:3300',{ transports: ['websocket'] });
        socket_graph.emit("message", str);
        so(socket_graph)
        break;
      case "queue":
        console.log("Received queue from graph client:", str);
        var socket_graph = io('ws://219.228.149.131:3300',{ transports: ['websocket'] });
        socket_graph.emit('queue',str); //发送给调度规划模块
        so(socket_graph)
        break
      default:
        console.log("Received text from condition client:", str);
        socket = io("ws://219.228.149.80:3010/condition_predict", {
          transports: ["websocket"],
        });
        socket.emit("calculate", input);
        so(socket);
        break;
    }
  });

  conn.on("close", function (code, reason) {
    console.log("ai ws client connection closed");
    clientConnected3 = false;
    wsConnection3 = {};
  });
  //xy: 监听websocket异常信息
  conn.on("error", function (err) {
    console.log("ai ws handle err");
    console.log(err);
    clientConnected3 = false;
    wsConnection3 = {};
  });
}).listen(PORT3, () => {
  console.log("ai websocket server listening", PORT3);
});
const fs = require('fs');
function so(socket) {
  socket.on("connect", () => {
    console.log("Connected to server!");
    // socket.emit('calculate', input);
  });
  socket.on("result", (data) => {
    console.log("Received result from server:", data);
    wsConnection3.send(JSON.stringify(data));
  });
  // 监听断开连接事件
  socket.on("disconnect", (reason) => {
    console.log("Disconnected from server", reason);
  });

  socket.on("message", (data) => {
    console.log("Received message from server:", data);
  });

  socket.on("error", (error) => {
    console.error("Socket error:", error);
  });

  socket.on("graph_mapping", (data) => {
    console.log("mapped--------------------", data);
    data['serve'] = "graph"
    // 将数据转换为 JSON 字符串
    const jsonData = JSON.stringify(data, null, 2); // 第三个参数 2 用于美化输出，缩进 2 空格
    wsConnection3.send(jsonData);
  });

  socket.on('queue', (data) => {
    console.log('queue--------------------',data)
    data['serve'] = "queue"
    const jsonData = JSON.stringify(data, null, 2); // 第三个参数 2 用于美化输出，缩进 2 空格
    wsConnection3.send(jsonData);
  })
}
