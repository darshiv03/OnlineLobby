import React, { useEffect, useState, useRef } from 'react';
import { socket } from '../socket';
import Question from '../components/Question';
import Leaderboard from '../components/Leaderboard';

export default function Player() {
  const [mode, setMode] = useState('join'); // join | waiting | question | reveal | over
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [question, setQuestion] = useState(null);
  const [reveal, setReveal] = useState(null);
  const [finalLB, setFinalLB] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    socket.on('game:question', (q) => {
      setQuestion(q);
      setReveal(null);
      setMode('question');
      setTimeLeft(q.timeLimit || 10);

      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    });

    socket.on('game:reveal', (data) => {
      setReveal(data);
      setMode('reveal');
    });

    socket.on('game:over', (lb) => {
      setFinalLB(lb);
      setMode('over');
    });

    socket.on('room:ended', () => window.location.reload());

    return () => {
      socket.off('game:question');
      socket.off('game:reveal');
      socket.off('game:over');
      socket.off('room:ended');
      clearInterval(timerRef.current);
    };
  }, []);

  const join = (e) => {
    e.preventDefault();
    socket.emit(
      'player:join',
      { code: code.trim(), name: name.trim() },
      (res) => {
        if (res?.error) return alert(res.error);
        setMode('waiting');
      }
    );
  };

  const answer = (choiceIdx) => {
    if (mode !== 'question' || timeLeft <= 0) return;
    socket.emit('player:answer', { code, choiceIdx: Number(choiceIdx) });
    setMode('waiting');
  };

  if (mode === 'join') {
    return (
      <div>
        <h2>Join a Room</h2>
        <form onSubmit={join}>
          <input
            placeholder="Room code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <input
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit">Join</button>
        </form>
      </div>
    );
  }

  if (mode === 'waiting') return <p>Waiting for the next question…</p>;

  if (mode === 'question' && question) {
    return (
      <div>
        <p>Time left: {timeLeft}s</p>
        <Question {...question} onAnswer={answer} disabled={timeLeft <= 0} />
      </div>
    );
  }

  if (mode === 'reveal' && reveal) {
    return (
      <div>
        <p>
          Correct answer index: <b>{reveal.correct}</b>
        </p>
        <Leaderboard items={reveal.leaderboard} />
        <p>Waiting for next question…</p>
      </div>
    );
  }

  if (mode === 'over') {
    return (
      <div>
        <h3>Game Over</h3>
        <Leaderboard items={finalLB || []} />
      </div>
    );
  }

  return null;
}
