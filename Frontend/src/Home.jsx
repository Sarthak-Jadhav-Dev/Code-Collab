import React, { useState } from "react";

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const Home = ({ onJoin }) => {
  const [room, setRoom] = useState("");
  const [error, setError] = useState("");
  const [transitioning, setTransitioning] = useState(false);

  const handleCreateRoom = () => {  ``
    setTransitioning(true);
    setTimeout(() => {
      const newRoom = generateRoomCode();
      onJoin(newRoom);
    }, 600); // transition duration
  };

  const handleJoinRoom = () => {
    if (!room.trim()) {
      setError("Please enter a room code.");
      return;
    }
    setError("");
    setTransitioning(true);
    setTimeout(() => {
      onJoin(room.trim().toUpperCase());
    }, 600); // transition duration
  };

  return (
    <div
      style={{
        background: "#1e1e1e",
        color: "#d4d4d4",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Fira Mono', 'Segoe UI', monospace",
        transition: "opacity 0.6s",
        opacity: transitioning ? 0 : 1
      }}
    >
      <div style={{
        background: "#252526",
        padding: "40px 56px",
        borderRadius: "16px",
        boxShadow: "0 4px 24px #0006",
        textAlign: "center",
        minWidth: "340px",
        transition: "box-shadow 0.3s"
      }}>
        <img src="https://code.visualstudio.com/assets/favicon.ico" alt="VS Code" style={{ width: 56, marginBottom: 18 }} />
        <h1 style={{
          margin: "0 0 18px 0",
          color: "#d4d4d4",
          fontWeight: "bold",
          fontSize: "2em",
          letterSpacing: "1px"
        }}>
          Coding with Friends
        </h1>
        <h2 style={{
          margin: "0 0 32px 0",
          color: "#007acc",
          fontWeight: "bold",
          fontSize: "1.3em",
          letterSpacing: "2px"
        }}>
          INSPECTRA
        </h2>
        <button
          onClick={handleCreateRoom}
          style={{
            background: "linear-gradient(90deg, #007acc 60%, #005fa3 100%)",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "16px 36px",
            fontSize: "1.1em",
            cursor: "pointer",
            marginBottom: "28px",
            fontWeight: "bold",
            boxShadow: "0 2px 8px #0003",
            transition: "background 0.2s"
          }}
        >
          Create New Roomdasdsdasdasdsd
        </button>
        <div style={{ marginBottom: "16px", color: "#d4d4d4", fontWeight: "bold" }}>— OR —</div>
        <input
          value={room}
          onChange={e => setRoom(e.target.value)}
          placeholder="Enter Room Code"
          style={{
            background: "#1e1e1e",
            color: "#d4d4d4",
            border: "1px solid #333",
            borderRadius: "8px",
            padding: "14px",
            fontSize: "1.1em",
            marginRight: "10px",
            width: "190px",
            outline: "none",
            transition: "border 0.2s"
          }}
        />
        <button
          onClick={handleJoinRoom}
          style={{
            background: "linear-gradient(90deg, #007acc 60%, #005fa3 100%)",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "14px 28px",
            fontSize: "1.1em",
            cursor: "pointer",
            fontWeight: "bold",
            boxShadow: "0 2px 8px #0003",
            transition: "background 0.2s"
          }}
        >
          Join Room
        </button>
        {error && <div style={{ color: "#e06c75", marginTop: "16px", fontWeight: "bold" }}>{error}</div>}
      </div>
      <div style={{
        width: "100%",
        background: "#222",
        padding: "12px 0",
        textAlign: "center",
        borderTop: "1px solid #333",
        color: "#888",
        position: "fixed",
        bottom: 0,
        left: 0,
        fontSize: "1em"
      }}>
        Made with ❤️ for INSPECTRA
      </div>
    </div>
  );
};

export default Home;