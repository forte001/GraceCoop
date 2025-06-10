import React, { useEffect, useState } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import '../../styles/admin/CooperativeConfig.css'; 

const AdminCooperativeConfig = () => {
  const [configs, setConfigs] = useState([]);
  const [newConfig, setNewConfig] = useState({
    entry_shares_amount: '',
    development_levy_amount: '',
    min_contribution_amount: '',
    max_contribution_amount: '',
    min_monthly_levy: '',
    max_monthly_levy: '',
    enforce_monthly_levy: false,
    status: 'active',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/admin/cooperative-config/');
      setConfigs(res.data);
    } catch (error) {
      console.error('Error fetching configs', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewConfig((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

const handleCreateConfig = async (e) => {
  e.preventDefault();
  setMessage('');

  // Frontend check: Prevent duplicate active configs
  const activeExists = configs.some(cfg => cfg.status === 'active');
  if (newConfig.status === 'active' && activeExists) {
    setMessage('❌ There is already an active configuration. Please archive or deactivate it first.');
    return;
  }

  try {
    await axiosInstance.post('/admin/cooperative-config/', newConfig);
    setMessage('✅ Config created successfully!');
    setNewConfig({
      entry_shares_amount: '',
      development_levy_amount: '',
      min_contribution_amount: '',
      max_contribution_amount: '',
      min_monthly_levy: '',
      max_monthly_levy: '',
      enforce_monthly_levy: false,
      status: 'active',
      description: '',
    });
    setShowModal(false);
    fetchConfigs();
  } catch (error) {
    console.error('Error creating config', error);
    setMessage('❌ Error creating config.');
  }
};


  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await axiosInstance.patch(`/admin/cooperative-config/${id}/`, { status: newStatus });
      fetchConfigs();
    } catch (error) {
      console.error('Error updating status', error);
    }
  };

  return (
    <div className="admin-config-page">
      <div className="header-row">
        <h2>Cooperative Configurations</h2>
        <button className="create-button" onClick={() => setShowModal(true)}>
          + Create Config
        </button>
      </div>

      {loading ? (
        <p>Loading configs...</p>
      ) : (
        <table className="config-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Entry Shares</th>
              <th>Dev Levy</th>
              <th>Min/Max Contribution</th>
              <th>Min/Max Levy</th>
              <th>Monthly Levy Enforced</th>
              <th>Status</th>
              <th>Effective Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {configs.map((config) => (
              <tr key={config.id}>
                <td>{config.id}</td>
                <td>{config.entry_shares_amount}</td>
                <td>{config.development_levy_amount}</td>
                <td>
                  {config.min_contribution_amount} / {config.max_contribution_amount}
                </td>
                <td>
                  {config.min_monthly_levy} / {config.max_monthly_levy}
                </td>
                <td>{config.enforce_monthly_levy ? 'Yes' : 'No'}</td>
                <td>{config.status}</td>
                <td>{config.effective_date}</td>
                <td>
                  {config.status !== 'archived' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(config.id, 'inactive')}
                        disabled={config.status === 'inactive'}
                      >
                        Set Inactive
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(config.id, 'active')}
                        disabled={config.status === 'active' || configs.some(cfg => cfg.status === 'active' && cfg.id !== config.id)}
                      >
                        Set Active
                      </button>

                      <button
                        onClick={() => handleUpdateStatus(config.id, 'archived')}
                      >
                        Archive
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Create New Config</h3>
            <form onSubmit={handleCreateConfig}>
              <input
                type="number"
                name="entry_shares_amount"
                placeholder="Entry Shares Amount"
                value={newConfig.entry_shares_amount}
                onChange={handleInputChange}
                required
              />
              <input
                type="number"
                name="development_levy_amount"
                placeholder="Development Levy Amount"
                value={newConfig.development_levy_amount}
                onChange={handleInputChange}
                required
              />
              <input
                type="number"
                name="min_contribution_amount"
                placeholder="Min Contribution"
                value={newConfig.min_contribution_amount}
                onChange={handleInputChange}
              />
              <input
                type="number"
                name="max_contribution_amount"
                placeholder="Max Contribution"
                value={newConfig.max_contribution_amount}
                onChange={handleInputChange}
              />
              <input
                type="number"
                name="min_monthly_levy"
                placeholder="Min Monthly Levy"
                value={newConfig.min_monthly_levy}
                onChange={handleInputChange}
              />
              <input
                type="number"
                name="max_monthly_levy"
                placeholder="Max Monthly Levy"
                value={newConfig.max_monthly_levy}
                onChange={handleInputChange}
              />
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="enforce_monthly_levy"
                  checked={newConfig.enforce_monthly_levy}
                  onChange={handleInputChange}
                />
                Enforce Monthly Levy Limit
              </label>
              <select
                name="status"
                value={newConfig.status}
                onChange={handleInputChange}
                required
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>
              <textarea
                name="description"
                placeholder="Description"
                value={newConfig.description}
                onChange={handleInputChange}
              />
              <div className="modal-buttons">
                <button type="submit">Save</button>
                <button type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCooperativeConfig;
