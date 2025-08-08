import React, { useEffect, useState } from 'react';
import { socket } from '../socket';
import Leaderboard from '../components/Leaderboard';

export default function Host() {
  const [room, setRoom] = useState(null);
  const [reveal, setReveal] = useState(null);
  const [over, setOver] = useState(null);

  useEffect(() => {
    socket.emit('host:createRoom', (res) => setRoom({ code: res.code }));

    socket.on('room:update', (data) => setRoom(data));
    socket.on('game:question', () => setReveal(null));
    socket.on('game:reveal', (data) => setReveal(data));
    socket.on('game:over', (lb) => setOver(lb));
    socket.on('room:ended', () => window.location.reload());

    return () => {
      socket.off('room:update');
      socket.off('game:question');
      socket.off('game:reveal');
      socket.off('game:over');
      socket.off('room:ended');
    };
  }, []);

  if (!room) return <div>Creating a cozy room…</div>;

  const start = () => socket.emit('host:start', { code: room.code });
  const next = () => socket.emit('host:next', { code: room.code });

  return (
    <div>
      <h2 style={{marginTop:0}}>Host Dashboard</h2>

      {room.status === 'lobby' && (
        <>
          <div className="room-code">Room Code: {room.code}</div>
          <p className="subtle" style={{marginTop:8}}>Ask players to join from the Player screen and enter this code.</p>
          <ul className="leaderboard">
            {(room.players || []).map((p, i) => (
              <li key={i}>{p.name} — {p.score}</li>
            ))}
          </ul>
          <div className="btn-row" style={{marginTop:16}}>
            <button className="btn btn-primary" onClick={start}>Start Game</button>
          </div>
        </>
      )}

      {room.status === 'question' && (
        <div style={{marginTop:8}}>
          <p className="subtle">Question in progress… waiting for players.</p>
          <div className="btn-row" style={{marginTop:12}}>
            <button className="btn btn-secondary" onClick={next}>Skip to Reveal</button>
          </div>
        </div>
      )}

      {reveal && (
        <div style={{marginTop:12}}>
          <p className="subtle">Correct answer: <b>{reveal.correct}</b></p>
          <Leaderboard items={reveal.leaderboard} />
          <div className="btn-row" style={{marginTop:12}}>
            <button className="btn btn-primary" onClick={next}>Next Question</button>
          </div>
        </div>
      )}

      {room.status === 'over' && (
        <div style={{marginTop:12}}>
          <h3>Game Over</h3>
          <Leaderboard items={over || []} />
        </div>
      )}
    </div>
  );
}