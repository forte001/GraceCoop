import React, { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import '../../styles/admin/Permissions.css';
import usePaginatedData from '../../utils/usePaginatedData';

const Permissions = () => {
  // const [users, setUsers] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userPermissions, setUserPermissions] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const {
  data: users,
  count,
  currentPage,
  pageSize,
  totalPages,
  loading,
  setCurrentPage,
  setPageSize,
} = usePaginatedData('/admin/users/');

  // Fetch users, all permissions, and all groups
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, permsRes, groupsRes] = await Promise.all([
          axiosInstance.get('/admin/users/'),
          axiosInstance.get('/admin/permissions/'),
          axiosInstance.get('/admin/groups/')
        ]);
        // setUsers(usersRes.data);
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
        {totalPages > 1 && (
        <div className="pagination-controls">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}
      

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
