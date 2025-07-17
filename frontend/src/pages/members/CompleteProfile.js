import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosMemberInstance from "../../utils/axiosMemberInstance";
import "../../styles/members/CompleteProfile.css";
import Spinner from "../../components/Spinner";

const CompleteProfile = () => {
  const navigate = useNavigate();
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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    // Fetch existing profile data
    const fetchProfile = async () => {
      try {
        const response = await axiosMemberInstance.get("/members/my-profile/");
        const { full_name, phone_number, address, title, next_of_kin, next_of_kin_relationship,
          next_of_kin_phone, next_of_kin_address } = response.data;
        setFormData({ full_name, phone_number, address, title,
          title: title || "",
        next_of_kin: next_of_kin || "",
        next_of_kin: next_of_kin_relationship || "",
        next_of_kin_phone: next_of_kin_phone || "",
        next_of_kin_address: next_of_kin_address || "" });
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await axiosMemberInstance.patch("/members/my-profile/", formData);
      setSuccess("Profile updated successfully!");
      setTimeout(() => navigate("/member/dashboard"), 1000);
    } catch (err) {
      console.error("Error updating profile:", err);
      setError("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Spinner size={20} />
            <span>Loading profile...</span>
          </div>
        );
      }


  return (
    <div className="complete-profile-container">
      <h2>Complete Your Profile</h2>
      <form onSubmit={handleSubmit} className="complete-profile-form">
        <select
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
        >
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
        <input
          type="text"
          name="full_name"
          placeholder="Full Name"
          value={formData.full_name}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="phone_number"
          placeholder="Phone Number"
          value={formData.phone_number}
          onChange={handleChange}
          required
        />
        <textarea
          name="address"
          placeholder="Address"
          value={formData.address}
          onChange={handleChange}
          required
        ></textarea>
        <input
          type="text"
          name="next_of_kin"
          placeholder="Next of Kin Name"
          value={formData.next_of_kin}
          onChange={handleChange}
        />
        <input
          type="text"
          name="next_of_kin_relationship"
          placeholder="Next of Kin Relationship"
          value={formData.next_of_kin_relationship}
          onChange={handleChange}
        />
        <input
          type="text"
          name="next_of_kin_phone"
          placeholder="Next of Kin Phone Number"
          value={formData.next_of_kin_phone}
          onChange={handleChange}
        />
        <textarea
          name="next_of_kin_address"
          placeholder="Next of Kin Address"
          value={formData.next_of_kin_address}
          onChange={handleChange}
        />


        {error && <p className="error-message">{error}</p>}
        {success && <p className="success-message">{success}</p>}

        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Update Profile"}
        </button>
      </form>
    </div>
  );
};

export default CompleteProfile;
