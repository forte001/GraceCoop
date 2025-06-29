import React, { useState } from "react";
import axios from "axios";
import "../../styles/members/LoginPage.css";

const PasswordResetRequest = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");

const handleSubmit = async (e) => {
  e.preventDefault();

  const resetBaseURL =
    process.env.NODE_ENV === "development"
      ? "http://localhost:8000/api/members"
      : process.env.REACT_APP_API_BASE_URL + "members";

  try {
    await axios.post(`${resetBaseURL}/password-reset-request/`, { email });
    setStatus("If an account with that email exists, a reset link has been sent.");
  } catch {
    setStatus("Something went wrong. Please try again.");
  }
};


  return (
    <div className="login-container">
      <h2>Reset Your Password</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit">Send Reset Link</button>
      </form>
      {status && (
  <p
    className={
      status.toLowerCase().includes("wrong") || status.toLowerCase().includes("failed")
        ? "error-message"
        : status.toLowerCase().includes("success")
        ? "success-message"
        : "status-message"
    }
  >
    {status}
  </p>
)}

    </div>
  );
};

export default PasswordResetRequest;
