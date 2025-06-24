import React, { useState } from "react";
import axiosMemberInstance from "../../utils/axiosMemberInstance";
import { useNavigate } from "react-router-dom";
import "../../styles/members/Register.css";

const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });

  // Local state to temporarily hold profile info (not submitted yet)
  const [profileData, setProfileData] = useState({
    full_name: "",
    phone_number: "",
    address: ""
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

  try {
    const response = await axiosMemberInstance.post("/members/register/", formData); // baseURL is already set
    setSuccess(response.data.message || "Registration successful!");

    setTimeout(() => navigate("/login"), 1500); // redirect after success
  } catch (err) {
    if (err.response && err.response.data) {
      const serverErrors = err.response.data;
      const firstKey = Object.keys(serverErrors)[0];
      setError(serverErrors[firstKey][0]);
    } else {
      setError("Registration failed. Please try again.");
    }
  }
};

  return (
    <div className="register-container">
      <h2>Member Registration</h2>
      <form onSubmit={handleSubmit}>
        {/* Required registration fields */}
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
          placeholder="Email"
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

        {/* Profile fields (optional for now) */}
        <input
          type="text"
          name="full_name"
          placeholder="Full Name (optional)"
          value={profileData.full_name}
          onChange={handleChange}
        />
        <input
          type="text"
          name="phone_number"
          placeholder="Phone Number (optional)"
          value={profileData.phone_number}
          onChange={handleChange}
        />
        <textarea
          name="address"
          placeholder="Address (optional)"
          value={profileData.address}
          onChange={handleChange}
        />

        {error && <p className="error-message">{error}</p>}
        {success && <p className="success-message">{success}</p>}

        <button type="submit">Register</button>

        <div className="centered-text">
          <p>Already signed up?</p>
          <button type="button" onClick={() => navigate('/login')}>Login</button>
        </div>
      </form>
    </div>
  );
};

export default Register;
