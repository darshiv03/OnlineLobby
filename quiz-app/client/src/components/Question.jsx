import React from 'react';

export default function Question({ index, total, q, choices, onAnswer, disabled }) {
  return (
    <div>
      <h2 style={{marginTop:0}}>Question {index}/{total}</h2>
      <p style={{fontSize:18, fontWeight:600}}>{q}</p>
      <div className="choices">
        {choices.map((c, i) => (
          <button
            key={i}
            className={`choice ${disabled ? 'disabled' : ''}`}
            onClick={() => onAnswer(i)}
            disabled={disabled}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}