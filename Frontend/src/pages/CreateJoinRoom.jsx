import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

// --- Main Component ---
const CreateJoinRoom = () => {
  const navigate = useNavigate();
  const [room, setRoom] = useState("");
  const [error, setError] = useState("");
  const [transitioning, setTransitioning] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);

  useEffect(() => {
    // Simple fade-in animation on mount
    setTimeout(() => setPageLoaded(true), 100);
  }, []);

  const handleCreateRoom = () => {
    setTransitioning(true);
    setTimeout(() => {
      const newRoom = generateRoomCode();
      navigate(`/editor/${newRoom}`);
    }, 300);
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (!room.trim()) {
      setError("Please provide a valid room code.");
      return;
    }
    setError("");
    setTransitioning(true);
    setTimeout(() => {
      navigate(`/editor/${room.trim().toUpperCase()}`);
    }, 300);
  };

  function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  const pageContainerStyle = {
    minHeight: "100vh",
    width: "100vw",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "Inter, system-ui, Avenir, Helvetica, Arial, sans-serif",
    position: 'relative',
    overflow: 'hidden',
    background: 'linear-gradient(135deg, #1a0b2e 0%, #2b1055 50%, #1a0b2e 100%)',
    opacity: transitioning ? 0 : 1,
    transition: 'opacity 0.3s ease-in-out',
    paddingTop: '70px'
  };

  const cardStyle = {
    background: "rgba(34, 34, 54, 0.8)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    padding: "50px 40px",
    borderRadius: "24px",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
    textAlign: "center",
    width: "100%",
    maxWidth: "450px",
    border: "1px solid rgba(127, 83, 172, 0.3)",
    position: 'relative',
    opacity: pageLoaded ? 1 : 0,
    transform: pageLoaded ? 'translateY(0)' : 'translateY(20px)',
    transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
    color: '#fff'
  };

  const titleStyle = {
    margin: "0 0 12px 0",
    fontSize: "2.2em",
    fontWeight: 700,
    background: 'linear-gradient(90deg, #7f53ac 0%, #56b6c2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  };

  const subtitleStyle = {
    margin: '0 0 40px 0',
    color: "#bbb",
    fontSize: '1.1em'
  };

  const inputStyle = {
    background: "rgba(0, 0, 0, 0.3)",
    color: "#fff",
    border: "2px solid rgba(127, 83, 172, 0.4)",
    borderRadius: "12px",
    padding: "16px 20px",
    fontSize: "1em",
    width: "100%",
    boxSizing: 'border-box',
    outline: "none",
    transition: "all 0.3s ease",
    marginBottom: '20px'
  };

  const primaryButtonStyle = {
    background: "linear-gradient(90deg, #7f53ac, #56b6c2)",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    padding: "16px 24px",
    fontSize: "1.1em",
    width: "100%",
    cursor: "pointer",
    fontWeight: "bold",
    transition: "all 0.3s ease",
    marginBottom: '16px'
  };

  const secondaryButtonStyle = {
    background: "rgba(255, 255, 255, 0.05)",
    color: "#fff",
    border: '2px solid rgba(127, 83, 172, 0.5)',
    borderRadius: "12px",
    padding: "16px 24px",
    fontSize: "1.1em",
    width: "100%",
    cursor: "pointer",
    fontWeight: "bold",
    transition: "all 0.3s ease"
  };

  const dividerStyle = {
    margin: "30px 0",
    color: "#888",
    fontSize: '0.95em',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  };

  return (
    <>
      <Navbar />
      <div style={pageContainerStyle}>
        {/* Animated background particles */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: `
            radial-gradient(circle at 20% 50%, rgba(127, 83, 172, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(86, 182, 194, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 40% 80%, rgba(127, 83, 172, 0.1) 0%, transparent 50%)
          `,
          animation: 'backgroundFloat 15s ease-in-out infinite',
          zIndex: 0
        }}></div>

        <div style={cardStyle}>
          <h1 style={titleStyle}>Join the Workspace</h1>
          <p style={subtitleStyle}>Create a new room or join an existing one</p>

          <button
            onClick={handleCreateRoom}
            style={primaryButtonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(86, 182, 194, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            🚀 Create New Room
          </button>

          <div style={dividerStyle}>
            <hr style={{ flex: 1, border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.15)' }} />
            OR
            <hr style={{ flex: 1, border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.15)' }} />
          </div>

          <form onSubmit={handleJoinRoom}>
            <input
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="Enter room code"
              style={inputStyle}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#56b6c2';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(86, 182, 194, 0.3)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(127, 83, 172, 0.4)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <button
              type="submit"
              style={secondaryButtonStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(127, 83, 172, 0.2)';
                e.currentTarget.style.borderColor = '#7f53ac';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = 'rgba(127, 83, 172, 0.5)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              🔗 Join Room
            </button>
            {error && <div style={{ color: "#ff8c8c", marginTop: "20px", fontWeight: "500", fontSize: '0.95em' }}>{error}</div>}
          </form>
        </div>
      </div>
      <Footer />

      <style>{`
        @keyframes backgroundFloat {
          0%, 100% { 
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          50% { 
            transform: translateY(-20px) scale(1.05);
            opacity: 0.8;
          }
        }
      `}</style>
    </>
  );
};

export default CreateJoinRoom;
