import React, { useState } from "react";

const ContactForm = () => {
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: "rgba(34,34,54,0.7)",
        borderRadius: "24px",
        boxShadow: "0 8px 32px #2b105588",
        maxWidth: "400px",
        margin: "32px auto",
        padding: "32px 24px",
        display: "flex",
        flexDirection: "column",
        gap: "18px",
        color: "#fff",
        animation: "fadeIn 1s"
      }}
    >
      <input
        type="text"
        placeholder="Your Name"
        required
        style={{
          padding: "12px",
          borderRadius: "8px",
          border: "none",
          fontSize: "1em",
          background: "#252526",
          color: "#fff"
        }}
      />
      <input
        type="email"
        placeholder="Your Email"
        required
        style={{
          padding: "12px",
          borderRadius: "8px",
          border: "none",
          fontSize: "1em",
          background: "#252526",
          color: "#fff"
        }}
      />
      <textarea
        placeholder="Your Message"
        required
        rows={4}
        style={{
          padding: "12px",
          borderRadius: "8px",
          border: "none",
          fontSize: "1em",
          background: "#252526",
          color: "#fff"
        }}
      />
      <button
        type="submit"
        style={{
          background: "linear-gradient(90deg, #7f53ac 0%, #56b6c2 100%)",
          color: "#fff",
          border: "none",
          borderRadius: "16px",
          padding: "12px 32px",
          fontWeight: "bold",
          fontSize: "1.1em",
          boxShadow: "0 0 12px #56b6c2",
          cursor: "pointer",
          transition: "box-shadow 0.2s"
        }}
      >
        Send Message
      </button>
      {sent && <div style={{ color: "#56b6c2", fontWeight: "bold", marginTop: "8px" }}>Message Sent!</div>}
      <style>
        {`@keyframes fadeIn { from { opacity: 0; transform: translateY(20px);} to { opacity: 1; transform: translateY(0);} }`}
      </style>
    </form>
  );
};

export default ContactForm;