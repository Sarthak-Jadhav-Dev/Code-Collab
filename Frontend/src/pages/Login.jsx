import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import API_URL from "../config";

function Login() {
  const [mode, setMode] = useState("password"); // "password" or "otp"
  const [form, setForm] = useState({ email: "", password: "" });
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  // Password login
  const handlePasswordLogin = async e => {
    e.preventDefault();
    setError(""); setMsg("");
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, form);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("name", res.data.name || "User"); // Store username
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    }
  };

  // Send OTP
  const handleSendOtp = async e => {
    e.preventDefault();
    setError(""); setMsg("");
    try {
      await axios.post(`${API_URL}/api/auth/login-send-otp`, { email: form.email });
      setOtpSent(true);
      setMsg("OTP sent to your email.");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send OTP");
    }
  };

  // OTP login
  const handleOtpLogin = async e => {
    e.preventDefault();
    setError(""); setMsg("");
    try {
      const res = await axios.post(`${API_URL}/api/auth/login-otp`, { email: form.email, otp });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("name", res.data.name || "User"); // Store username
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "OTP login failed");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #1a0b2e 0%, #2b1055 100%)", paddingTop: "70px", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <div className="auth-glass animate-pop">
        <h2>Sign In</h2>
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <button
            type="button"
            className={mode === "password" ? "auth-btn" : ""}
            style={{ padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer" }}
            onClick={() => { setMode("password"); setError(""); setMsg(""); setOtpSent(false); }}
          >
            Password
          </button>
          <button
            type="button"
            className={mode === "otp" ? "auth-btn" : ""}
            style={{ padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer" }}
            onClick={() => { setMode("otp"); setError(""); setMsg(""); setOtpSent(false); }}
          >
            OTP
          </button>
        </div>
        {mode === "password" && (
          <form onSubmit={handlePasswordLogin}>
            <div className="auth-field">
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
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
                onChange={handleChange}
                placeholder=" "
                required
                autoComplete="current-password"
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
            <button className="auth-btn" type="submit">Login</button>
          </form>
        )}
        {mode === "otp" && (
          <form onSubmit={otpSent ? handleOtpLogin : handleSendOtp}>
            <div className="auth-field">
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder=" "
                required
                autoComplete="email"
                disabled={otpSent}
              />
              <label>Email</label>
            </div>
            {otpSent && (
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
            )}
            <button className="auth-btn" type="submit">
              {otpSent ? "Login with OTP" : "Send OTP"}
            </button>
          </form>
        )}
        {msg && <div className="auth-success">{msg}</div>}
        {error && <div className="auth-error">{error}</div>}
        <div className="auth-row">
          <span>Don't have an account?</span>
          <a className="auth-link" href="/signup">Sign Up</a>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default Login;