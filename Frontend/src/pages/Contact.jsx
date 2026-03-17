import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ContactForm from "../components/ContactForm";

const Contact = () => (
  <div style={{
    minHeight: "100vh",
    background: "linear-gradient(135deg, #2b1055 0%, #7597de 100%)",
    position: "relative",
    overflow: "hidden"
  }}>
    <Navbar />
    {/* Animated background */}
    <div style={{
      position: "absolute",
      top: 0, left: 0, width: "100%", height: "100%",
      zIndex: 0,
      background: "radial-gradient(circle at 20% 40%, #56b6c2 0%, transparent 60%), radial-gradient(circle at 80% 60%, #7f53ac 0%, transparent 60%)"
    }} />
    <div style={{ position: "relative", zIndex: 1, paddingTop: "80px", textAlign: "center" }}>
      <h1 style={{ fontSize: "2.5em", color: "#56b6c2", marginBottom: "0.5em" }}>Contact Us</h1>
      <ContactForm />
      <div style={{ color: "#fff", marginTop: "2em", fontSize: "1.1em" }}>
        Or connect via <a href="mailto:your@email.com" style={{ color: "#56b6c2" }}>Email</a> or <a href="https://twitter.com/" style={{ color: "#56b6c2" }}>Twitter</a>
      </div>
    </div>
    <Footer />
  </div>
);

export default Contact;