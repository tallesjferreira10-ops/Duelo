const http = require("http");
const WebSocket = require("ws");

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Duelo 3D online está funcionando!");
});

const wss = new WebSocket.Server({ server });

wss.on("connection", ws => {
  ws.send("Conectado ao Duelo 3D!");
});

server.listen(process.env.PORT || 3000);
