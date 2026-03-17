// WebSocket server for real-time map events (Node.js + socket.io)
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());

io.on('connection', socket => {
  console.log('User connected');
  socket.on('map-event', data => {
    io.emit('map-event', data);
  });
});

app.post('/analytics/map-event', (req, res) => {
  const event = req.body;
  io.emit('map-event', event);
  res.json({ success: true });
});

server.listen(3000, () => console.log('WebSocket server running on port 3000'));
