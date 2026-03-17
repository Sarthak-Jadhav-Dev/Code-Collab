import React, { useState, useEffect } from "react";

const features = [
  {
    title: "Real-time Collaboration",
    desc: "Edit files together with instant sync across all users.",
    icon: "💻",
    color: "#56b6c2"
  },
  {
    title: "AI Teammate Assistance",
    desc: "Get debugging, suggestions, and explanations from your AI teammate.",
    icon: "🤖",
    color: "#7f53ac"
  },
  {
    title: "Smart Summaries & Reports",
    desc: "Automatic summaries and progress reports for your project.",
    icon: "📊",
    color: "#7597de"
  },
  {
    title: "Multi-format Support",
    desc: "Work with code, text, notes, and more in one place.",
    icon: "📝",
    color: "#2b1055"
  },
  {
    title: "Audio + Video Collaboration",
    desc: "Talk and share screens while you code together.",
    icon: "🎤",
    color: "#56b6c2"
  }
];

const slideStyle = {
  minHeight: "350px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(34,34,54,0.7)",
  borderRadius: "24px",
  boxShadow: "0 8px 32px #2b105588",
  margin: "32px auto",
  maxWidth: "500px",
  color: "#fff",
  transition: "box-shadow 0.3s",
};

const FeaturesSlideshow = () => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrent((current + 1) % features.length);
    }, 3500);
    return () => clearTimeout(timer);
  }, [current]);

  return (
    <div style={{ textAlign: "center" }}>
      <div style={slideStyle}>
        <div style={{ fontSize: "4em", marginBottom: "0.2em", color: features[current].color }}>
          {features[current].icon}
        </div>
        <h2 style={{ fontSize: "1.7em", marginBottom: "0.3em" }}>{features[current].title}</h2>
        <p style={{ fontSize: "1.2em", opacity: 0.85 }}>{features[current].desc}</p>
      </div>
      <div style={{ marginTop: "18px" }}>
        {features.map((_, idx) => (
          <span
            key={idx}
            onClick={() => setCurrent(idx)}
            style={{
              display: "inline-block",
              width: current === idx ? "18px" : "12px",
              height: current === idx ? "18px" : "12px",
              borderRadius: "50%",
              background: current === idx ? "#56b6c2" : "#fff",
              margin: "0 6px",
              boxShadow: current === idx ? "0 0 8px #56b6c2" : "none",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default FeaturesSlideshow;