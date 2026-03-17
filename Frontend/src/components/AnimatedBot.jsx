import React from "react";

const AnimatedBot = () => (
  <div style={{ marginTop: "2em", animation: "bounce 2s infinite" }}>
    <svg width="120" height="120" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r="50" fill="#56b6c2" opacity="0.2" />
      <ellipse cx="60" cy="80" rx="30" ry="18" fill="#fff" opacity="0.1" />
      <circle cx="60" cy="60" r="32" fill="#252526" stroke="#56b6c2" strokeWidth="4" />
      <circle cx="48" cy="56" r="6" fill="#56b6c2" />
      <circle cx="72" cy="56" r="6" fill="#56b6c2" />
      <rect x="52" y="72" width="16" height="6" rx="3" fill="#56b6c2" />
      <text x="60" y="110" textAnchor="middle" fill="#fff" fontSize="1.1em">Hello World!</text>
    </svg>
    <style>
      {`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }`}
    </style>
  </div>
);

export default AnimatedBot;