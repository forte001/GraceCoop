// src/components/admin/PendingMemberList.js
import React, { useEffect, useState } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import '../../styles/admin/Members.css';

const PendingMemberList = () => {
  const [members, setMembers] = useState([]);

  useEffect(() => {
    const fetchPendingMembers = async () => {
      try {
        const res = await axiosInstance.get('/admin/members/pending/');
        setMembers(res.data);
      } catch (err) {
        console.error('Error fetching pending members:', err);
      }
    };

    fetchPendingMembers();
  }, []);

  const handleApprove = async (id) => {
    try {
      await axiosInstance.patch(`/admin/members/${id}/approve/`, {
        status: 'approved',
        membership_status: 'active',
      });

      setMembers(prev => prev.filter(m => m.id !== id));
    } catch (error) {
      alert(error.response?.data?.detail || 'Approval failed');
    }
  };

  return (
    <div>
      <h3>Pending Member Applications</h3>
      <table className="members-table pending">
        <thead>
          <tr>
            <th>Full Name</th>
            <th>Paid Shares</th>
            <th>Paid Levy</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {members.map(member => {
            const canApprove = member.has_paid_shares && member.has_paid_levy;
            return (
              <tr key={member.id} style={{ opacity: canApprove ? 1 : 0.5 }}>
                <td>{member.user?.username || 'Unnamed'}</td>
                <td>{member.has_paid_shares ? '✅' : '❌'}</td>
                <td>{member.has_paid_levy ? '✅' : '❌'}</td>
                <td>
                  <button
                    className="approve-button"
                    disabled={!canApprove}
                    onClick={() => handleApprove(member.id)}
                  >
                    Approve
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default PendingMemberList;
