import React, { useState, useEffect } from 'react';
import axiosAdminInstance from '../../utils/axiosAdminInstance';
import '../../styles/admin/Permissions.css';

const Permissions = () => {
  const [users, setUsers] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userPermissions, setUserPermissions] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch all users (with pagination)
  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        let allUsers = [];
        let nextUrl = '/admin/users/';

        while (nextUrl) {
          const res = await axiosAdminInstance.get(nextUrl);
          allUsers = [...allUsers, ...res.data.results];
          nextUrl = res.data.next;
        }

        setUsers(allUsers);
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };

    fetchAllUsers();
  }, []);

  // Fetch permissions and groups
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [permsRes, groupsRes] = await Promise.all([
          axiosAdminInstance.get('/admin/permissions/'),
          axiosAdminInstance.get('/admin/groups/')
        ]);
        setPermissions(permsRes.data || []);
        setGroups(groupsRes.data || []);
      } catch (err) {
        console.error('Error fetching metadata:', err);
      }
    };

    fetchMeta();
  }, []);

  // Fetch selected user’s permissions and groups
  useEffect(() => {
    if (!selectedUserId) return;

    const fetchUserDetails = async () => {
      try {
        const [permRes, groupRes] = await Promise.all([
          axiosAdminInstance.get(`/admin/users/${selectedUserId}/permissions/`),
          axiosAdminInstance.get(`/admin/users/${selectedUserId}/groups/`)
        ]);
        setUserPermissions(permRes.data.user_permissions || []);
        setUserGroups(groupRes.data.groups.map((g) => g.id));
      } catch (err) {
        console.error('Failed to fetch user details:', err);
      }
    };

    fetchUserDetails();
  }, [selectedUserId]);

  const handleUserChange = (e) => setSelectedUserId(e.target.value);

  const handlePermissionToggle = (permId) => {
    setUserPermissions((prev) =>
      prev.includes(permId)
        ? prev.filter((id) => id !== permId)
        : [...prev, permId]
    );
  };

  const handleGroupToggle = (groupId) => {
    setUserGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleSave = async () => {
    try {
      await axiosAdminInstance.patch(`/admin/users/${selectedUserId}/permissions/`, {
        permissions: userPermissions,
      });

      await axiosAdminInstance.patch(`/admin/users/${selectedUserId}/groups/`, {
        group_ids: userGroups,
      });

      alert('Permissions and groups updated successfully');
    } catch (err) {
      console.error('Failed to update:', err);
      alert('Update failed');
    }
  };

  const filteredUsers = users.filter((user) => {
    const profile = user.memberprofile || {};
    return (
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (profile.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (profile.member_id || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="permissions-container">
      <h3>Assign User Permissions & Groups</h3>

      <div className="permissions-select-user">
        <input
          type="text"
          placeholder="Search by username, full name, or member ID"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />

        <label>Select User:</label>
        <select value={selectedUserId} onChange={handleUserChange}>
          <option value="">-- Choose a User --</option>
          {filteredUsers.map((user) => {
            const profile = user.memberprofile || {};
            return (
              <option key={user.id} value={user.id}>
                {profile.full_name || user.username} ({profile.member_id || 'No ID'})
              </option>
            );
          })}
        </select>
      </div>

      {selectedUserId && (
        <>
          <div className="permissions-banner-section">
            <h4>Selected Permissions</h4>
            <div className="permissions-banners">
              {permissions.filter(p => userPermissions.includes(p.id)).map(p => (
                <span
                  key={p.id}
                  className="permission-banner selected"
                  onClick={() => handlePermissionToggle(p.id)}
                >
                  {p.name}
                </span>
              ))}
            </div>

            <h4>Available Permissions</h4>
            <div className="permissions-banners">
              {permissions.filter(p => !userPermissions.includes(p.id)).map(p => (
                <span
                  key={p.id}
                  className="permission-banner"
                  onClick={() => handlePermissionToggle(p.id)}
                >
                  {p.name}
                </span>
              ))}
            </div>
          </div>

          <div className="permissions-banner-section">
            <h4>Selected Groups</h4>
            <div className="permissions-banners">
              {groups.filter(g => userGroups.includes(g.id)).map(g => (
                <span
                  key={g.id}
                  className="permission-banner selected"
                  onClick={() => handleGroupToggle(g.id)}
                >
                  {g.name}
                </span>
              ))}
            </div>

            <h4>Available Groups</h4>
            <div className="permissions-banners">
              {groups.filter(g => !userGroups.includes(g.id)).map(g => (
                <span
                  key={g.id}
                  className="permission-banner"
                  onClick={() => handleGroupToggle(g.id)}
                >
                  {g.name}
                </span>
              ))}
            </div>
          </div>

          <button className="save-button" onClick={handleSave}>
            Save Changes
          </button>
        </>
      )}
    </div>
  );
};

export default Permissions;
