
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const PORT = process.env.PORT || 3000;
const rooms = new Map();
const MAX_PLAYERS = 4;
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function makeCode() {
  let code;
  do {
    code = Array.from({ length: 6 }, () =>
      alphabet[Math.floor(Math.random() * alphabet.length)]
    ).join('');
  } while (rooms.has(code));
  return code;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      ok: true,
      service: 'Duelo 3D',
      rooms: rooms.size
    }));
  }

  if (url.pathname === '/' || url.pathname === '/Duelo3D.html') {
    const file = path.join(__dirname, 'Duelo3D.html');

    return fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404);
        return res.end('Arquivo Duelo3D.html nao encontrado.');
      }

      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8'
      });
      res.end(data);
    });
  }

  res.writeHead(404);
  res.end('Pagina nao encontrada');
});

const wss = new WebSocket.Server({ server });

function send(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcast(room, data, except) {
  for (const player of room.players) {
    if (player !== except) send(player, data);
  }
}

function leave(ws) {
  if (!ws.roomCode) return;

  const room = rooms.get(ws.roomCode);

  if (room) {
    room.players = room.players.filter(p => p !== ws);

    broadcast(room, {
      type: 'player_left',
      playerId: ws.playerId,
      players: room.players.length
    });

    if (room.players.length === 0) {
      rooms.delete(room.code);
    }
  }

  ws.roomCode = null;
}

wss.on('connection', ws => {
  ws.playerId = Math.random().toString(36).slice(2, 10);

  ws.on('message', raw => {
    let msg;

    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return send(ws, {
        type: 'error',
        message: 'Mensagem invalida'
      });
    }

    if (msg.action === 'create_room') {
      leave(ws);

      const mode = ['teams', 'battle', 'headshot'].includes(msg.mode)
        ? msg.mode : 'battle';

      const code = makeCode();
      const room = { code, mode, players: [ws] };

      rooms.set(code, room);
      ws.roomCode = code;

      return send(ws, {
        type: 'room_created',
        roomCode: code,
        playerId: ws.playerId,
        players: 1,
        mode
      });
    }

    if (msg.action === 'join_room') {
      leave(ws);

      const code = String(msg.roomCode || '').toUpperCase().trim();
      const room = rooms.get(code);

      if (!room) {
        return send(ws, {
          type: 'error',
          message: 'Sala nao encontrada'
        });
      }

      if (room.players.length >= MAX_PLAYERS) {
        return send(ws, {
          type: 'error',
          message: 'Sala cheia'
        });
      }

      room.players.push(ws);
      ws.roomCode = code;

      send(ws, {
        type: 'room_joined',
        roomCode: code,
        playerId: ws.playerId,
        players: room.players.length,
        mode: room.mode
      });

      broadcast(room, {
        type: 'player_joined',
        playerId: ws.playerId,
        players: room.players.length
      }, ws);

      return;
    }

    if (msg.action === 'game_event') {
      const room = rooms.get(ws.roomCode);

      if (room) {
        broadcast(room, {
          type: 'game_event',
          playerId: ws.playerId,
          event: msg.event
        }, ws);
      }
      return;
    }

    if (msg.action === 'leave_room') {
      leave(ws);
    }
  });

  ws.on('close', () => leave(ws));
  ws.on('error', () => leave(ws));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('Duelo 3D online na porta ' + PORT);
});
      
const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.PORT || 3000;
const rooms = new Map();
const MAX_PLAYERS = 4;
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function makeCode() {
  let code;
  do {
    code = Array.from({ length: 6 }, () =>
      alphabet[Math.floor(Math.random() * alphabet.length)]
    ).join('');
  } while (rooms.has(code));
  return code;
}

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200);
    return res.end(JSON.stringify({
      ok: true,
      service: 'Duelo 3D',
      rooms: rooms.size
    }));
  }
  res.writeHead(404);
  res.end(JSON.stringify({ ok: false }));
});

const wss = new WebSocket.Server({ server });

function send(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcast(room, data, except) {
  for (const player of room.players) {
    if (player !== except) send(player, data);
  }
}

function leave(ws) {
  if (!ws.roomCode) return;
  const room = rooms.get(ws.roomCode);
  if (room) {
    room.players = room.players.filter(p => p !== ws);
    broadcast(room, {
      type: 'player_left',
      playerId: ws.playerId,
      players: room.players.length
    });
    if (room.players.length === 0) rooms.delete(room.code);
  }
  ws.roomCode = null;
}

wss.on('connection', ws => {
  ws.playerId = Math.random().toString(36).slice(2, 10);

  ws.on('message', raw => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return send(ws, { type: 'error', message: 'Mensagem inválida' });
    }

    if (msg.action === 'create_room') {
      leave(ws);
      const mode = ['teams', 'battle', 'headshot'].includes(msg.mode)
        ? msg.mode : 'battle';
      const code = makeCode();
      const room = { code, mode, players: [ws] };
      rooms.set(code, room);
      ws.roomCode = code;
      return send(ws, {
        type: 'room_created',
        roomCode: code,
        playerId: ws.playerId,
        players: 1,
        mode
      });
    }

    if (msg.action === 'join_room') {
      leave(ws);
      const code = String(msg.roomCode || '').toUpperCase().trim();
      const room = rooms.get(code);
      if (!room) return send(ws, {
        type: 'error',
        message: 'Sala não encontrada'
      });
      if (room.players.length >= MAX_PLAYERS) return send(ws, {
        type: 'error',
        message: 'Sala cheia'
      });

      room.players.push(ws);
      ws.roomCode = code;
      send(ws, {
        type: 'room_joined',
        roomCode: code,
        playerId: ws.playerId,
        players: room.players.length,
        mode: room.mode
      });
      broadcast(room, {
        type: 'player_joined',
        playerId: ws.playerId,
        players: room.players.length
      }, ws);
      return;
    }

    if (msg.action === 'game_event') {
      const room = rooms.get(ws.roomCode);
      if (room) broadcast(room, {
        type: 'game_event',
        playerId: ws.playerId,
        event: msg.event
      }, ws);
      return;
    }

    if (msg.action === 'leave_room') leave(ws);
  });

  ws.on('close', () => leave(ws));
  ws.on('error', () => leave(ws));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Duelo 3D online na porta ${PORT}`);
});
      
