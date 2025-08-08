import React from 'react';

export default function Leaderboard({ items }) {
  return (
    <div>
      <h3 style={{marginBottom:8}}>Leaderboard</h3>
      <ol className="leaderboard">
        {items.map((p, i) => (
          <li key={i}>{i+1}. {p.name} — {p.score}</li>
        ))}
      </ol>
    </div>
  );
}