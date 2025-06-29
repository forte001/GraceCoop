import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "../../styles/members/LoginPage.css";

const PasswordResetConfirm = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState("");

  const token = searchParams.get("token");

const handleSubmit = async (e) => {
  e.preventDefault();

  const confirmBaseURL =
    process.env.NODE_ENV === "development"
      ? "http://localhost:8000/api/members"
      : process.env.REACT_APP_API_BASE_URL + "members";

  try {
    await axios.post(`${confirmBaseURL}/password-reset-confirm/`, {
      token,
      new_password: newPassword,
    });
    setStatus("Password reset successfully. Redirecting to login...");
    setTimeout(() => navigate("/login"), 2000);
  } catch {
    setStatus("Failed to reset password. The token may be invalid or expired.");
  }
};


  return (
    <div className="login-container">
      <h2>Set a New Password</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <button type="submit">Reset Password</button>
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

export default PasswordResetConfirm;
