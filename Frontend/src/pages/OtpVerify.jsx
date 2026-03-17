import React, { useState } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import API_URL from "../config";

function OtpVerify() {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();
  const params = new URLSearchParams(useLocation().search);
  const email = params.get("email");

  const handleSubmit = async e => {
    e.preventDefault();
    setError(""); setMsg("");
    try {
      await axios.post(`${API_URL}/api/auth/verify-otp`, { email, otp });
      setMsg("Verification successful! You can now login.");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(err.response?.data?.error || "Verification failed");
    }
  };

  return (
    <div className="auth-glass animate-pop">
      <h2>Verify OTP</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Enter OTP"
          value={otp}
          onChange={e => setOtp(e.target.value)}
          required
        />
        <button className="auth-btn" type="submit">Verify</button>
      </form>
      {msg && <div className="auth-success">{msg}</div>}
      {error && <div className="auth-error">{error}</div>}
    </div>
  );
}

export default OtpVerify;
