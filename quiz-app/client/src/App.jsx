import React, { useState } from 'react';
import Host from './pages/Host.jsx';
import Player from './pages/Player.jsx';
import './styles.css';

export default function App() {
  const [mode, setMode] = useState(null);

  if (!mode) {
    return (
      <div className="app-shell">
        <div className="card">
          <h1 className="h1">Quiz Lobby</h1>
          <p className="subtle">Fast, friendly, Kahoot‑ish quiz rooms on your Wi‑Fi.</p>
          <div className="btn-row" style={{ marginTop: 16 }}>
            <button className="btn btn-primary" onClick={() => setMode('host')}>I'm the Host</button>
            <button className="btn btn-secondary" onClick={() => setMode('player')}>I'm a Player</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="card">
        {mode === 'host' ? <Host /> : <Player />}
      </div>
    </div>
  );
}