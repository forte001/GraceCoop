import React, { useState } from "react";
import usePaginatedData from "../../utils/usePaginatedData";
import axiosAdminInstance from "../../utils/axiosAdminInstance";
import Spinner from "../../components/Spinner";
import { toast } from "react-toastify";

const AdminAnnouncements = () => {
  const {
    data: announcements,
    currentPage,
    totalPages,
    pageSize,
    loading,
    setCurrentPage,
    setPageSize,
    filters,
    setFilters,
    
  } = usePaginatedData("/admin/notice/announcements/", { is_active: "" });

  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    message: "",
    is_active: true,
  });
  

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewAnnouncement((prev) => ({
      ...prev,
      [name]: name === "is_active" ? value === "true" : value,
    }));
  };

  const resetForm = () => {
    setNewAnnouncement({ title: "", message: "", is_active: true });
    setEditMode(false);
    setEditId(null);
  };

  const toggleModal = () => {
    resetForm();
    setShowModal((prev) => !prev);
  };

  const handleSaveAnnouncement = async (e) => {
    e.preventDefault();
    try {
      if (editMode && editId) {
        await axiosAdminInstance.patch(`/admin/notice/announcements/${editId}/`, newAnnouncement);
        toast.success("Announcement updated successfully!");
      } else {
        await axiosAdminInstance.post("/admin/notice/announcements/", newAnnouncement);
        toast.success("Announcement created successfully!");
      }
      toggleModal();
    setTimeout(() => {
    window.location.reload();
  }, 3000);
    } catch (error) {
      console.error("Error saving announcement", error);
      toast.error("Error saving announcement.");
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm("Are you sure you want to delete this announcement?")) return;
    try {
      await axiosAdminInstance.delete(`/admin/notice/announcements/${id}/`);
      toast.success("Announcement deleted successfully!");
     setTimeout(() => {
    window.location.reload();
  }, 3000);
    } catch (error) {
      console.error("Error deleting announcement", error);
      toast.error("Error deleting announcement.");
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await axiosAdminInstance.patch(`/admin/notice/announcements/${id}/`, {
        is_active: !currentStatus,
      });
      toast.success(`Announcement ${!currentStatus ? "activated" : "deactivated"} successfully!`);
     setTimeout(() => {
    window.location.reload();
  }, 3000);
    } catch (error) {
      console.error("Error toggling status", error);
      toast.error("Error changing status.");
    }
  };

  const handleEditAnnouncement = (announcement) => {
    setNewAnnouncement({
      title: announcement.title,
      message: announcement.message,
      is_active: announcement.is_active,
    });
    setEditMode(true);
    setEditId(announcement.id);
    setShowModal(true);
  };

  return (
    <div className="admin-config-page">
      <div className="header-row">
        <h2>Announcements</h2>
        <button
          className="create-button"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          + Create Announcement
        </button>
      </div>

      <div className="filter-section">
        <select
          className="filter-select"
          value={filters.is_active || ""}
          onChange={(e) => setFilters((f) => ({ ...f, is_active: e.target.value }))}
        >
          <option value="">All</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <table className="config-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Message</th>
              <th>Active</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {announcements.map((ann) => (
              <tr key={ann.id}>
                <td>{ann.title}</td>
                <td>{ann.message}</td>
                <td>{ann.is_active ? "Yes" : "No"}</td>
                <td>{new Date(ann.created_at).toLocaleDateString()}</td>
                <td>
                  <button onClick={() => handleToggleStatus(ann.id, ann.is_active)}>
                    {ann.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button className="danger-button" onClick={() => handleDeleteAnnouncement(ann.id)}>
                    Delete
                  </button>
                  <button onClick={() => handleEditAnnouncement(ann)}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="pagination-controls">
        <button
          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          disabled={currentPage === 1}
        >
          Prev
        </button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
        <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
          {[5, 10, 20].map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </select>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{editMode ? "Edit Announcement" : "Create New Announcement"}</h3>
            <form onSubmit={handleSaveAnnouncement}>
              <input
                type="text"
                name="title"
                placeholder="Title"
                value={newAnnouncement.title}
                onChange={handleInputChange}
                required
              />
              <textarea
                name="message"
                placeholder="Message"
                value={newAnnouncement.message}
                onChange={handleInputChange}
                required
              />
              <label>
                Status:
                <select
                  name="is_active"
                  value={(newAnnouncement.is_active ?? true).toString()}
                  onChange={handleInputChange}
                  required
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </label>
              <div className="modal-buttons">
                <button type="submit">{editMode ? "Update" : "Save"}</button>
                <button
                  type="button"
                  onClick={toggleModal}
                  className="cancel-btn"
                >
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

export default AdminAnnouncements;
