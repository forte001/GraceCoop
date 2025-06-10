import React, { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import '../../styles/admin/Permissions.css';

const Permissions = () => {
  const [users, setUsers] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userPermissions, setUserPermissions] = useState([]);
  const [userGroups, setUserGroups] = useState([]);

  // Fetch users, all permissions, and all groups
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, permsRes, groupsRes] = await Promise.all([
          axiosInstance.get('/admin/users/'),
          axiosInstance.get('/admin/permissions/'),
          axiosInstance.get('/admin/groups/')
        ]);
        setUsers(usersRes.data);
        setPermissions(permsRes.data || []);
        setGroups(groupsRes.data || []);
      } catch (err) {
        console.error('Error fetching initial data:', err);
      }
    };

    fetchData();
  }, []);

  // Fetch selected user’s permissions and groups
  useEffect(() => {
    if (!selectedUserId) return;

    const fetchUserDetails = async () => {
      try {
        const [permRes, groupRes] = await Promise.all([
          axiosInstance.get(`/admin/users/${selectedUserId}/permissions/`),
          axiosInstance.get(`/admin/users/${selectedUserId}/groups/`)
        ]);
        setUserPermissions(permRes.data.user_permissions || []);
        setUserGroups(groupRes.data.groups.map((g) => g.id));
      } catch (err) {
        console.error('Failed to fetch user details:', err);
      }
    };

    fetchUserDetails();
  }, [selectedUserId]);

  const handleUserChange = (e) => {
    setSelectedUserId(e.target.value);
  };

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
      await axiosInstance.patch(`/admin/users/${selectedUserId}/permissions/`, {
        permissions: userPermissions,
      });

      await axiosInstance.patch(`/admin/users/${selectedUserId}/groups/`, {
        group_ids: userGroups,
      });

      alert('Permissions and groups updated successfully');
    } catch (err) {
      console.error('Failed to update:', err);
      alert('Update failed');
    }
  };

  return (
    <div className="permissions-container">
      <h3>Assign User Permissions & Groups</h3>

      <div className="permissions-select-user">
        <label>Select User:</label>
        <select value={selectedUserId} onChange={handleUserChange}>
          <option value="">-- Choose a User --</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.username}
            </option>
          ))}
        </select>
      </div>

      {selectedUserId && (
        <>
          <div className="permissions-checkboxes">
            <h4>Permissions</h4>
            {permissions.length > 0 ? (
              permissions.map((perm) => (
                <label key={perm.id} className="permission-item">
                  <input
                    type="checkbox"
                    value={perm.id}
                    checked={userPermissions.includes(perm.id)}
                    onChange={() => handlePermissionToggle(perm.id)}
                  />
                  {perm.name}
                </label>
              ))
            ) : (
              <p>No permissions available</p>
            )}
          </div>

          <div className="permissions-checkboxes">
            <h4>Groups</h4>
            {groups.length > 0 ? (
              groups.map((group) => (
                <label key={group.id} className="permission-item">
                  <input
                    type="checkbox"
                    value={group.id}
                    checked={userGroups.includes(group.id)}
                    onChange={() => handleGroupToggle(group.id)}
                  />
                  {group.name}
                </label>
              ))
            ) : (
              <p>No groups available</p>
            )}
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
