import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import API_URL from "../config";

function ForgotPassword() {
  const [input, setInput] = useState({ email: "", phone: "" });
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSendOtp = async e => {
    e.preventDefault();
    setError(""); setMsg("");
    try {
      await axios.post(`${API_URL}/api/auth/forgot-password`, input);
      setStep(2);
      setMsg("OTP sent to your email/phone.");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send OTP");
    }
  };

  const handleReset = async e => {
    e.preventDefault();
    setError(""); setMsg("");
    try {
      await axios.post(`${API_URL}/api/auth/reset-password`, {
        ...input, otp, newPassword
      });
      setMsg("Password reset successful! Redirecting to login...");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reset password");
    }
  };

  return (
    <div className="auth-glass animate-pop">
      <h2>Forgot Password</h2>
      {step === 1 && (
        <form onSubmit={handleSendOtp}>
          <input
            type="email"
            placeholder="Email (or leave blank for phone)"
            value={input.email}
            onChange={e => setInput({ ...input, email: e.target.value, phone: "" })}
          />
          <div style={{ textAlign: "center", margin: "10px 0" }}>OR</div>
          <input
            type="tel"
            placeholder="Phone (with country code)"
            value={input.phone}
            onChange={e => setInput({ ...input, phone: e.target.value, email: "" })}
          />
          <button className="auth-btn" type="submit">Send OTP</button>
        </form>
      )}
      {step === 2 && (
        <form onSubmit={handleReset}>
          <input
            type="text"
            placeholder="Enter OTP"
            value={otp}
            onChange={e => setOtp(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            required
          />
          <button className="auth-btn" type="submit">Reset Password</button>
        </form>
      )}
      {msg && <div className="auth-success">{msg}</div>}
      {error && <div className="auth-error">{error}</div>}
    </div>
  );
}
export default ForgotPassword;
