// src/pages/members/EditProfilePage.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosMemberInstance from "../../utils/axiosMemberInstance";
import "../../styles/members/EditProfilePage.css";

const EditProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    full_name: "",
    phone_number: "",
    address: "",
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axiosMemberInstance.get("/members/my-profile/");
        setProfile(response.data);
        setFormData({
          full_name: response.data.full_name || "",
          phone_number: response.data.phone_number || "",
          address: response.data.address || "",
        });
      } catch (err) {
        console.error("Failed to fetch profile:", err);
        navigate("/login");
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess("");

    try {
      await axiosMemberInstance.put("/members/update-profile/", formData);
      setSuccess("Profile updated successfully!");
      setTimeout(() => navigate("/member/profile"), 1500);
    } catch (err) {
      console.error("Update failed:", err);
      setError("Failed to update profile. Please try again.");
    }
  };

  if (!profile) return <div className="dashboard-container">Loading profile...</div>;

  return (
    <div className="dashboard-container">
      <h2>Edit Profile</h2>
      <form onSubmit={handleSubmit} className="edit-profile-form">
        <label>Full Name</label>
        <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} required />

        <label>Phone Number</label>
        <input type="text" name="phone_number" value={formData.phone_number} onChange={handleChange} required />

        <label>Address</label>
        <textarea name="address" value={formData.address} onChange={handleChange} required />

        {error && <p className="error-message">{error}</p>}
        {success && <p className="success-message">{success}</p>}

        <button type="submit">Save Changes</button>
      </form>
    </div>
  );
};

export default EditProfilePage;
