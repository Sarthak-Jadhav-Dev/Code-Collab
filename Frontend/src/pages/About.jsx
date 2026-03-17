import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import TeamTimeline from "../components/TeamTimeline";

const team = [
  { name: "Aryan Jadhav", role: "", img: "https://randomuser.me/api/portraits/lego/5.jpg" },
  { name: "Darshan Jadhav", role: "", img: "https://randomuser.me/api/portraits/lego/5.jpg" },
  { name: "Sanskar Jadhav", role: "", img: "https://randomuser.me/api/portraits/lego/5.jpg" },
  { name: "Sarthak Jadhav", role: "", img: "https://randomuser.me/api/portraits/lego/5.jpg" }
];

const About = () => (
  <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #2b1055 0%, #7597de 100%)" }}>
    <Navbar />
    <div style={{ paddingTop: "80px", textAlign: "center" }}>
      <h1 style={{ fontSize: "2.5em", color: "#56b6c2", marginBottom: "0.5em" }}>About Us</h1>
      <h2 style={{ fontSize: "1.3em", color: "#fff", marginBottom: "1.5em" }}>
        Why we built this? <br />
        <span style={{ color: "#7f53ac" }}>To make teamwork faster, smarter, and AI-powered.</span>
      </h2>
      <TeamTimeline />
      <h2 style={{ fontSize: "1.5em", color: "#56b6c2", marginBottom: "1em" }}>Our Team</h2>
      <div style={{ display: "flex", justifyContent: "center", gap: "32px", flexWrap: "wrap" }}>
        {team.map((member, idx) => (
          <div key={idx} style={{
            background: "rgba(34,34,54,0.7)",
            borderRadius: "18px",
            boxShadow: "0 0 16px #7f53ac88",
            padding: "24px",
            textAlign: "center",
            width: "180px",
            transition: "transform 0.2s",
            cursor: "pointer"
          }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.07)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          >
            <img src={member.img} alt={member.name} style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              marginBottom: "12px",
              boxShadow: "0 0 8px #56b6c2"
            }} />
            <div style={{ fontWeight: "bold", color: "#56b6c2", fontSize: "1.1em" }}>{member.name}</div>
            <div style={{ color: "#fff", fontSize: "1em", opacity: 0.85 }}>{member.role}</div>
          </div>
        ))}
      </div>
    </div>
    <Footer />
  </div>
);

export default About;