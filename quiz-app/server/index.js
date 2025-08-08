import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import { customAlphabet } from 'nanoid';
import Room from './models/Room.js';
import { QUIZ } from './quiz.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.get('/health', (req, res) => res.json({ ok: true }));

await mongoose.connect(process.env.MONGO_URI);
console.log('MongoDB connected');

const nanoid = customAlphabet('1234567890', 4);

// Active per-room reveal timers
const questionTimers = new Map(); // code -> timeoutId

io.on('connection', (socket) => {
  // HOST: create room
  socket.on('host:createRoom', async (cb) => {
    let code;
    while (true) {
      code = nanoid();
      const exists = await Room.exists({ code });
      if (!exists) break;
    }
    const room = await Room.create({
      code,
      hostId: socket.id,
      status: 'lobby',
      questionIndex: -1,
      acceptingAnswers: false,
      players: [],
    });
    socket.join(code);
    cb?.({ code });
    io.to(code).emit('room:update', sanitizeRoom(room));
  });

  // PLAYER: join room
  socket.on('player:join', async ({ code, name }, cb) => {
    const room = await Room.findOne({ code });
    if (!room) return cb?.({ error: 'Room not found' });
    if (room.status === 'over') return cb?.({ error: 'Game already finished' });

    // prevent duplicate join by same socket
    if (!room.players.some((p) => p.socketId === socket.id)) {
      room.players.push({ socketId: socket.id, name, score: 0, answered: false });
      room.markModified('players');
      await room.save();
    }

    socket.join(code);
    io.to(code).emit('room:update', sanitizeRoom(room));
    cb?.({ ok: true });
  });

  // HOST: start game (only host may start)
  socket.on('host:start', async ({ code }) => {
    const room = await Room.findOne({ code });
    if (!room || room.hostId !== socket.id) return;
    if (room.status !== 'lobby') return; // don’t double-start
    room.questionIndex = -1;
    await room.save();
    await nextQuestion(code);
  });

  // PLAYER: submit answer
  socket.on('player:answer', async ({ code, choiceIdx }, cb) => {
    const room = await Room.findOne({ code });
    if (!room) return cb?.({ error: 'Room missing' });
    if (!room.acceptingAnswers || room.status !== 'question') {
      return cb?.({ error: 'No active question' });
    }

    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player) return cb?.({ error: 'Player missing' });
    if (player.answered) return cb?.({ ok: true });

    // Ensure numeric compare
    const idx = Number(choiceIdx);
    const q = QUIZ[room.questionIndex];
    player.answered = true;
    if (idx === q.answer) player.score += 1;

    room.markModified('players');
    await room.save();

    // If all players answered, reveal early
    const allAnswered =
      room.players.length > 0 && room.players.every((p) => p.answered);
    if (allAnswered) {
      await revealAndQueueNext(code);
    }

    cb?.({ ok: true });
  });

  // DISCONNECT handling
  socket.on('disconnect', async () => {
    // If a host disconnects, end room
    const hostRoom = await Room.findOne({ hostId: socket.id });
    if (hostRoom) {
      // clear any timer
      clearTimer(hostRoom.code);
      io.to(hostRoom.code).emit('room:ended');
      await Room.deleteOne({ _id: hostRoom._id });
      return;
    }

    // Remove player from any room
    const room = await Room.findOne({ 'players.socketId': socket.id });
    if (room) {
      room.players = room.players.filter((p) => p.socketId !== socket.id);
      room.markModified('players');
      await room.save();
      io.to(room.code).emit('room:update', sanitizeRoom(room));
    }
  });
});

/* ---------------- helpers ---------------- */

async function nextQuestion(code) {
  const room = await Room.findOne({ code });
  if (!room) return;

  // Only proceed from lobby (first question) or after reveal
  if (room.status !== 'lobby' && room.status !== 'reveal') {
    return;
  }

  room.questionIndex += 1;

  // Out of questions -> Game over
  if (room.questionIndex >= QUIZ.length) {
    room.status = 'over';
    room.acceptingAnswers = false;
    await room.save();
    io.to(code).emit('game:over', leaderboard(room));
    clearTimer(code);
    return;
  }

  // Set up question state
  room.status = 'question';
  room.acceptingAnswers = true;
  room.players.forEach((p) => (p.answered = false));
  room.markModified('players');
  await room.save();

  const q = QUIZ[room.questionIndex];

  io.to(code).emit('game:question', {
    index: room.questionIndex + 1,
    total: QUIZ.length,
    q: q.q,
    choices: q.choices,
    timeLimit: 10, // seconds
  });
  io.to(code).emit('room:update', sanitizeRoom(room));

  // Reset timer
  clearTimer(code);
  questionTimers.set(
    code,
    setTimeout(async () => {
      await revealAndQueueNext(code); // time’s up
    }, 10000)
  );
}

async function revealAndQueueNext(code) {
  const room = await Room.findOne({ code });
  if (!room) return;

  // Reveal only if we were actually in a question
  if (room.status !== 'question') return;

  room.acceptingAnswers = false;
  room.status = 'reveal';
  await room.save();

  const q = QUIZ[room.questionIndex];
  io.to(code).emit('game:reveal', {
    correct: q.answer,
    leaderboard: leaderboard(room),
  });

  clearTimer(code);

  // Queue next question after short reveal pause
  setTimeout(() => {
    nextQuestion(code);
  }, 3000);
}

function clearTimer(code) {
  const t = questionTimers.get(code);
  if (t) {
    clearTimeout(t);
    questionTimers.delete(code);
  }
}

function leaderboard(room) {
  return room.players
    .map((p) => ({ name: p.name, score: p.score }))
    .sort((a, b) => b.score - a.score);
}

function sanitizeRoom(room) {
  return {
    code: room.code,
    status: room.status,
    questionIndex: room.questionIndex,
    players: room.players.map((p) => ({ name: p.name, score: p.score })),
    updatedAt: room.updatedAt,
  };
}

const PORT = process.env.PORT || 4000;
server.listen(PORT, () =>
  console.log(`Server listening on http://localhost:${PORT}`)
);
