import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosMemberInstance from "../../utils/axiosMemberInstance";
import "../../styles/members/ProfilePage.css";

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

  if (loading) return <div className="dashboard-container">Loading...</div>;

  if (!memberProfile) {
    return (
      <div className="dashboard-container">
        <h2>Unable to load profile.</h2>
      </div>
    );
  }

  const { user, full_name, email, membership_status, member_id, has_paid_shares, has_paid_levy } = memberProfile;

  return (
    <div className="dashboard-container">
    
      <h1>Welcome, {user?.username || "Member"}!</h1>
      <main className="dashboard-main">
        <div className="dashboard-card">
          {/* <h2>My Profile</h2> */}
          <div className="profile-header">
          <h2>My Profile</h2>
              <button className="edit-profile-button" onClick={() => navigate("/member/edit-profile")}>
                ✏️ Edit Profile
              </button>
        </div>
          <p><strong>Full Name:</strong> {full_name}</p>
          <p><strong>Username:</strong> {user?.username}</p>
          <p><strong>Email:</strong> {email}</p>
          <p><strong>Status:</strong> {membership_status}</p>
          <p><strong>Member ID:</strong> {member_id || "Pending"}</p>
          <p><strong>Shares Paid:</strong> {has_paid_shares ? "✅ Yes" : "❌ No"}</p>
          <p><strong>Levy Paid:</strong> {has_paid_levy ? "✅ Yes" : "❌ No"}</p>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
