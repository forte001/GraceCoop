import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Spinner from "../../components/Spinner";
import "../../styles/members/Register.css";
import axios from "axios";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("verifying"); // verifying | success | failed
  const didRequest = useRef(false); // persist across renders

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("failed");
      return;
    }

    const verifyBaseURL =
      process.env.NODE_ENV === "development"
        ? "http://localhost:8000/api/members"
        : process.env.REACT_APP_API_BASE_URL + "members";

    if (didRequest.current) return;  // check persisted ref
    didRequest.current = true;       // persist the flag

    axios
      .get(`${verifyBaseURL}/verify-email/?token=${token}`)
      .then(() => {
        setStatus("success");
        setTimeout(() => navigate("/login"), 2000);
      })
      .catch(() => setStatus("failed"));
  }, [searchParams, navigate]);

  return (
    <div className="verify-email-container">
      {status === "verifying" && <Spinner />}
      {status === "success" && (
        <p className="verify-success">
          Email verified successfully! Redirecting to login...
        </p>
      )}
      {status === "failed" && (
        <p className="verify-failed">
          Verification failed. Please check the link or register again.
        </p>
      )}
    </div>
  );
};

export default VerifyEmail;
