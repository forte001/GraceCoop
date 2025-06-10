// src/components/admin/MembersList.js
import React, { useEffect, useState } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import '../../styles/admin/Members.css';

const MembersList = () => {
  const [members, setMembers] = useState([]);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    phone_number: '',
    address: '',
    membership_status: 'active',
  });

  useEffect(() => {
    const fetchApprovedMembers = async () => {
      try {
        const res = await axiosInstance.get('/admin/members/approved/');
        setMembers(res.data);
      } catch (err) {
        console.error('Failed to fetch approved members:', err);
      }
    };

    fetchApprovedMembers();
  }, []);

  const handleEditClick = (member) => {
    setEditingMemberId(member.id);
    setEditFormData({
      full_name: member.full_name || '',
      phone_number: member.phone_number || '',
      address: member.address || '',
      membership_status: member.membership_status || 'active',
    });
  };

  const handleCancelEdit = () => {
    setEditingMemberId(null);
    setEditFormData({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async (memberId) => {
    try {
      await axiosInstance.put(`/admin/members/${memberId}/update/`, editFormData);

      setMembers(prev =>
        prev.map(m => (m.id === memberId ? { ...m, ...editFormData } : m))
      );
      setEditingMemberId(null);
    } catch (err) {
      console.error('Update failed:', err);
    }
  };

  return (
    <div>
      <h3>Approved Members</h3>
      <table className="members-table approved">
        <thead>
          <tr>
            <th>Full Name</th>
            <th>Member ID</th>
            <th>Email</th>
            <th>Phone Number</th>
            <th>Membership Status</th>
            <th>Date Joined</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {members.map(member => (
            <tr key={member.id}>
              {editingMemberId === member.id ? (
                <>
                  <td><input type="text" name="full_name" value={editFormData.full_name} onChange={handleInputChange} /></td>
                  <td>{member.member_id}</td>
                  <td>{member.email}</td>
                  <td><input type="text" name="phone_number" value={editFormData.phone_number} onChange={handleInputChange} /></td>
                  <td>
                    <select name="membership_status" value={editFormData.membership_status} onChange={handleInputChange}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="archived">Archived</option>
                    </select>
                  </td>
                  <td>{member.joined_on}</td>
                  <td>
                    <button className="save-button" onClick={() => handleSaveEdit(member.id)}>Save</button>
                    <button className="cancel-button" onClick={handleCancelEdit}>Cancel</button>
                  </td>
                </>
              ) : (
                <>
                  <td>{member.full_name}</td>
                  <td>{member.member_id}</td>
                  <td>{member.email}</td>
                  <td>{member.phone_number}</td>
                  <td>
                    <span className={`status-badge ${member.membership_status}`}>
                        {member.membership_status.toUpperCase()}
                    </span>
                </td>
                  <td>{member.joined_on}</td>
                  <td><button className="edit-button" onClick={() => handleEditClick(member)}>Edit</button></td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MembersList;
