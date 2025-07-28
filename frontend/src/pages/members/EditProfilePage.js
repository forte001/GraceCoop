// src/pages/members/EditProfilePage.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosMemberInstance from "../../utils/axiosMemberInstance";
import "../../styles/members/EditProfilePage.css";
import Spinner from "../../components/Spinner";
import MemberDocuments from "./MemberDocuments";

const EditProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    full_name: "",
    phone_number: "",
    address: "",
    title: "",
    next_of_kin: "",
    next_of_kin_relationship: "",
    next_of_kin_phone: "",
    next_of_kin_address: ""
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
          title: response.data.title || "",
          next_of_kin: response.data.next_of_kin || "",
          next_of_kin_relationship: response.data.next_of_kin_relationship || "",
          next_of_kin_phone: response.data.next_of_kin_phone || "",
          next_of_kin_address: response.data.next_of_kin_address || ""
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

  if (!profile) {
    return (
      <div className="dashboard-container" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Spinner size={24} />
        <span>Loading Profile...</span>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <h2>Edit Profile</h2>
      <form onSubmit={handleSubmit} className="edit-profile-form">
        <label>Title</label>
        <select name="title" value={formData.title} onChange={handleChange} required>
          <option value="">Select Title</option>
          <option value="Mr.">Mr.</option>
          <option value="Mrs.">Mrs.</option>
          <option value="Miss.">Miss.</option>
          <option value="Pst.">Pst.</option>
          <option value="Rev.">Rev.</option>
          <option value="Dr.">Dr.</option>
          <option value="Prof.">Prof.</option>
          <option value="Alh.">Alh.</option>
        </select>

        <label>Full Name</label>
        <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} required />

        <label>Phone Number</label>
        <input type="text" name="phone_number" value={formData.phone_number} onChange={handleChange} required />

        <label>Address</label>
        <textarea name="address" value={formData.address} onChange={handleChange} required />

        <label>Next of Kin</label>
        <input type="text" name="next_of_kin" value={formData.next_of_kin} onChange={handleChange} />

        <label>Next of Kin Relationship</label>
        <input type="text" name="next_of_kin_relationship" value={formData.next_of_kin_relationship} onChange={handleChange} />

        <label>Next of Kin Phone</label>
        <input type="text" name="next_of_kin_phone" value={formData.next_of_kin_phone} onChange={handleChange} />

        <label>Next of Kin Address</label>
        <textarea name="next_of_kin_address" value={formData.next_of_kin_address} onChange={handleChange} />

        {error && <p className="error-message">{error}</p>}
        {success && <p className="success-message">{success}</p>}

        <button type="submit">Save Changes</button>
      </form>

      {/* ✅ Member Document Upload Section */}
      <div className="member-documents-section" style={{ marginTop: "2rem" }}>
        <MemberDocuments />
      </div>
    </div>
  );
};

export default EditProfilePage;
