import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import API_URL from "../config";

function Signup() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  // Step 1: Send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError(""); setMsg("");
    try {
      await axios.post(`${API_URL}/api/auth/send-otp`, { email: form.email });
      setStep(2);
      setMsg("OTP sent to your email.");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send OTP");
    }
  };

  // Step 2: Verify OTP and create user
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError(""); setMsg("");
    try {
      await axios.post(`${API_URL}/api/auth/verify-otp`, {
        ...form,
        otp
      });
      setMsg("Signup successful! Redirecting to login...");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.response?.data?.error || "OTP verification failed");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #1a0b2e 0%, #2b1055 100%)", paddingTop: "70px", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <div className="auth-glass animate-pop">
        <h2>Create Account</h2>
        {step === 1 && (
          <form onSubmit={handleSendOtp}>
            <div className="auth-field">
              <input
                name="name"
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder=" "
                required
                autoComplete="name"
              />
              <label>Name</label>
            </div>
            <div className="auth-field">
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder=" "
                required
                autoComplete="email"
              />
              <label>Email</label>
            </div>
            <div className="auth-field" style={{ position: "relative" }}>
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder=" "
                required
                autoComplete="new-password"
              />
              <label>Password</label>
              <button
                type="button"
                style={{
                  position: "absolute",
                  right: 6,
                  top: 13,
                  background: "none",
                  border: "none",
                  color: "#56b6c2",
                  cursor: "pointer",
                  fontSize: "1em",
                  padding: 0
                }}
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <button className="auth-btn" type="submit">Send OTP</button>
          </form>
        )}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp}>
            <div className="auth-field">
              <input
                type="text"
                placeholder="Enter OTP"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                required
              />
              <label>OTP</label>
            </div>
            <button className="auth-btn" type="submit">Verify & Sign Up</button>
          </form>
        )}
        {msg && <div className="auth-success">{msg}</div>}
        {error && <div className="auth-error">{error}</div>}
        <div className="auth-row">
          <span>Already have an account?</span>
          <a className="auth-link" href="/login">Login</a>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default Signup;