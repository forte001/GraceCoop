import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosMemberInstance from "../../utils/axiosMemberInstance";
import "../../styles/members/ProfilePage.css";
import Spinner from "../../components/Spinner";

const ProfilePage = () => {
  const [memberProfile, setMemberProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axiosMemberInstance.get("/members/my-profile/");
        setMemberProfile(response.data);
      } catch (error) {
        console.error("Error fetching member profile:", error);
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  if (loading) {
    return (
      <div className="dashboard-container" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Spinner size={24} />
        <span>Loading...</span>
      </div>
    );
  }


  if (!memberProfile) {
    return (
      <div className="dashboard-container">
        <h2>Unable to load profile.</h2>
      </div>
    );
  }

        const {
        user,
        full_name,
        email,
        membership_status,
        member_id,
        has_paid_shares,
        has_paid_levy,
        title,
        phone_number,
        address,
        next_of_kin,
        next_of_kin_phone,
        next_of_kin_address
      } = memberProfile;

  return (
    <div className="dashboard-container">
    
      <h1>Welcome, {user?.username || "Member"}!</h1>
      <main className="dashboard-main">
        <div className="dashboard-card">
          <div className="profile-header">
          <h2>Your Profile</h2>
              <button className="edit-profile-button" onClick={() => navigate("/member/edit-profile")}>
                ✏️ Edit Profile
              </button>
        </div>
          <p><strong>Title:</strong> {title || "N/A"}</p>
          <p><strong>Full Name:</strong> {full_name}</p>
          <p><strong>Username:</strong> {user?.username}</p>
          <p><strong>Email:</strong> {email}</p>
          <p><strong>Phone Number:</strong> {phone_number || "N/A"}</p>
          <p><strong>Address:</strong> {address || "N/A"}</p>
          <p><strong>Status:</strong> {membership_status.toUpperCase()}</p>
          <p><strong>Member ID:</strong> {member_id || "Pending"}</p>
          <p><strong>Shares Paid:</strong> {has_paid_shares ? "✅ Yes" : "❌ No"}</p>
          <p><strong>Levy Paid:</strong> {has_paid_levy ? "✅ Yes" : "❌ No"}</p>
          <hr />
          <p><strong>Next of Kin:</strong> {next_of_kin || "N/A"}</p>
          <p><strong>Next of Kin Phone:</strong> {next_of_kin_phone || "N/A"}</p>
          <p><strong>Next of Kin Address:</strong> {next_of_kin_address || "N/A"}</p>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
