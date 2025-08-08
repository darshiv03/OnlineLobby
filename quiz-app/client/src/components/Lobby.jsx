import React from 'react';

export default function Lobby({ code, players }) {
  return (
    <div style={{border: '1px solid #ddd', padding: 16, borderRadius: 8}}>
      <h3>Room Code: {code}</h3>
      <p>Tell players to select "Player" and enter this code.</p>
      <ul>
        {players.map((p, i) => (
          <li key={i}>{p.name} — {p.score}</li>
        ))}
      </ul>
    </div>
  );
}