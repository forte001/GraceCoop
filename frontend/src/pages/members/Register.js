import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../../styles/members/Register.css";

const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });

  const [profileData, setProfileData] = useState({
    full_name: "",
    phone_number: "",
    address: "",
  });

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (["full_name", "phone_number", "address"].includes(name)) {
      setProfileData((prev) => ({
        ...prev,
        [name]: value,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess("");

    // remove any blank optional fields
    const cleanedProfileData = Object.fromEntries(
      Object.entries(profileData).filter(([_, v]) => v.trim() !== "")
    );

    const combinedData = { ...formData, ...cleanedProfileData };

    const registerBaseURL =
      process.env.NODE_ENV === "development"
        ? "http://localhost:8000/api/members"
        : process.env.REACT_APP_API_BASE_URL + "members";

    try {
      const response = await axios.post(`${registerBaseURL}/register/`, combinedData);
      setSuccess(response.data.message || "Registration successful! Please check your email.");
      setError(null);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      if (err.response && err.response.data) {
        setError(err.response.data);
      } else {
        setError({ general: "Registration failed. Please try again." });
      }
    }
  };

  return (
    <div className="register-container">
      <h2>Member Registration</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="username"
          placeholder="Username"
          required
          value={formData.username}
          onChange={handleChange}
        />
        <input
          type="email"
          name="email"
          placeholder="Enter a valid Email"
          required
          value={formData.email}
          onChange={handleChange}
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          required
          value={formData.password}
          onChange={handleChange}
        />

        {/* Errors and success */}
        {error &&
          Object.entries(error).map(([field, messages]) => (
            <p key={field} className="error-message">
              {Array.isArray(messages) ? messages[0] : messages}
            </p>
          ))}

        {success && <p className="success-message">{success}</p>}

        <button type="submit">Register</button>

        <div className="centered-text">
          <p>
            Already signed up?{" "}
            <a
              href="/login"
              onClick={(e) => {
                e.preventDefault();
                navigate("/login");
              }}
            >
              Login
            </a>
          </p>
        </div>
      </form>
    </div>
  );
};

export default Register;
