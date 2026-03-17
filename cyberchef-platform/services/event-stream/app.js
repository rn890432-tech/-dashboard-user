const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });

app.get('/', (req, res) => res.send('Event Stream Service'));

// Example event emitter
function emitEvent(type, data) {
  io.emit('event', { type, data });
}

// Simulate events for demo
setInterval(() => emitEvent('USER_REGISTERED', 'User123'), 5000);
setInterval(() => emitEvent('RECIPE_CREATED', 'Recipe456'), 7000);
setInterval(() => emitEvent('RECIPE_LIKED', 'Recipe456'), 9000);
setInterval(() => emitEvent('COMMENT_POSTED', 'Comment789'), 11000);
setInterval(() => emitEvent('AI_RECIPE_GENERATED', 'Recipe456'), 13000);

const PORT = process.env.PORT || 5010;
server.listen(PORT, () => {
  console.log(`Event Stream Service running on port ${PORT}`);
});
