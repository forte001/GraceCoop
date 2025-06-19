import React, { useState, useEffect } from 'react';
import axiosAdminInstance from '../../../utils/axiosAdminInstance';
import { getCSRFToken } from '../../../utils/csrf';
import usePaginatedData from '../../../utils/usePaginatedData';
import '../../../styles/admin/loan/LoanCategories.css';

const LoanCategories = () => {
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Form state
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [categoryInterestRate, setCategoryInterestRate] = useState('');
  const [categoryLoanPeriod, setCategoryLoanPeriod] = useState('');
  const [categoryGracePeriod, setCategoryGracePeriod] = useState('');
  const [categoryStatus, setCategoryStatus] = useState('active');
  const [categoryAbbreviation, setCategoryAbbreviation] = useState('');

  const {
    data: categories,
    // count,
    currentPage,
    // pageSize,
    totalPages,
    // loading,
    setCurrentPage,
    // setPageSize
  } = usePaginatedData('/admin/loan/loan-categories/');

  useEffect(() => {
    const fetchCSRFToken = async () => {
      try {
        await axiosAdminInstance.get('/csrf-token/');
      } catch (error) {
        console.error('Error fetching CSRF token:', error);
      }
    };
    fetchCSRFToken();
  }, []);

  useEffect(() => {
    if (!isEditing && categoryName.trim()) {
      const suggestedAbbr = categoryName
        .split(' ')
        .map((word) => word[0])
        .join('')
        .substring(0, 4)
        .toUpperCase();
      setCategoryAbbreviation(suggestedAbbr);
    }
  }, [categoryName, isEditing]);

  const resetForm = () => {
    setCategoryName('');
    setCategoryDescription('');
    setCategoryAbbreviation('');
    setCategoryInterestRate('');
    setCategoryLoanPeriod('');
    setCategoryGracePeriod('');
    setSelectedCategory(null);
    setIsEditing(false);
  };

  const toggleModal = () => {
    resetForm();
    setShowModal(!showModal);
  };

  const openEditModal = (category) => {
    setSelectedCategory(category);
    setCategoryName(category.name);
    setCategoryDescription(category.description);
    setCategoryInterestRate(category.interest_rate);
    setCategoryLoanPeriod(category.loan_period_months);
    setCategoryGracePeriod(category.grace_period_months);
    setCategoryAbbreviation(category.abbreviation || '');
    setIsEditing(true);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      name: categoryName,
      description: categoryDescription,
      abbreviation: categoryAbbreviation.trim().toUpperCase(),
      interest_rate: categoryInterestRate.toString(),
      loan_period_months: categoryLoanPeriod,
      grace_period_months: categoryGracePeriod,
      status: categoryStatus,
    };

    try {
      if (isEditing && selectedCategory) {
        const response = await axiosAdminInstance.put(
          `/admin/loan/loan-categories/${selectedCategory.id}/`,
          payload,
          { headers: { 'X-CSRFToken': getCSRFToken() } }
        );
      } else {
        await axiosAdminInstance.post(
          '/admin/loan/loan-categories/',
          payload,
          { headers: { 'X-CSRFToken': getCSRFToken() } }
        );
      }
      toggleModal();
    } catch (error) {
      console.error('Error saving category:', error.response?.data || error);
      alert('Failed to save category: ' + JSON.stringify(error.response?.data));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await axiosAdminInstance.delete(`/admin/loan/loan-categories/${id}/`, {
        headers: { 'X-CSRFToken': getCSRFToken() },
      });
    } catch (error) {
      console.error('Error deleting category:', error.response?.data || error);
      alert('Failed to delete category.');
    }
  };

  return (
    <div className="loan-categories-container">
      <div className="header">
        <h3>Loan Categories</h3>
        <button className="add-category-btn" onClick={toggleModal}>
          <div className="add-icon">+</div>
          <span>Add Category</span>
        </button>
      </div>

      <table className="loan-categories-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Abbr</th>
            <th>Description</th>
            <th>Interest Rate (%)</th>
            <th>Loan Period (Months)</th>
            <th>Grace Period (Months)</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <tr key={category.id}>
              <td>{category.name}</td>
              <td>{category.abbreviation}</td>
              <td>{category.description}</td>
              <td>{category.interest_rate}</td>
              <td>{category.loan_period_months}</td>
              <td>{category.grace_period_months}</td>
              <td>
                <span className={`status-badge ${category.status}`}>
                  {category.status.toUpperCase()}
                </span>
              </td>
              <td>
                <button className="btn-action btn-edit" onClick={() => openEditModal(category)}>
                  ✏️ Edit
                </button>
                <button
                  className={`btn-action btn-delete ${category.is_used ? 'disabled' : ''}`}
                  onClick={() => !category.is_used && handleDelete(category.id)}
                  disabled={category.is_used}
                  title={category.is_used ? 'Category in use by loan(s) or application(s)' : 'Delete category'}
                >
                  🗑️ Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination-controls">
        <button onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1}>
          Previous
        </button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <button onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
          Next
        </button>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{isEditing ? 'Edit Loan Category' : 'Add New Loan Category'}</h3>
            <form onSubmit={handleSubmit}>
              <label htmlFor="categoryName">Category Name:</label>
              <input
                type="text"
                id="categoryName"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                required
              />
              <label htmlFor="categoryAbbreviation">Abbreviation:</label>
              <input
                type="text"
                id="categoryAbbreviation"
                value={categoryAbbreviation}
                onChange={(e) => setCategoryAbbreviation(e.target.value.toUpperCase())}
                maxLength={10}
                required
              />
              <small className="form-hint">
                Short code for category (e.g., BIZ, EDU, AGR). Must be unique.
              </small>
              <label htmlFor="categoryDescription">Description:</label>
              <textarea
                id="categoryDescription"
                value={categoryDescription}
                onChange={(e) => setCategoryDescription(e.target.value)}
              />
              <label htmlFor="categoryInterestRate">Interest Rate (%):</label>
              <input
                type="number"
                id="categoryInterestRate"
                value={categoryInterestRate}
                onChange={(e) => setCategoryInterestRate(e.target.value)}
                required
              />
              <label htmlFor="categoryLoanPeriod">Loan Period (Months):</label>
              <input
                type="number"
                id="categoryLoanPeriod"
                value={categoryLoanPeriod}
                onChange={(e) => setCategoryLoanPeriod(e.target.value)}
                required
              />
              <label htmlFor="categoryGracePeriod">Grace Period (Months):</label>
              <input
                type="number"
                id="categoryGracePeriod"
                value={categoryGracePeriod}
                onChange={(e) => setCategoryGracePeriod(e.target.value)}
                required
              />
              <label htmlFor="categoryStatus">Status:</label>
              <select
                id="categoryStatus"
                value={categoryStatus}
                onChange={(e) => setCategoryStatus(e.target.value)}
                required
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archive</option>
              </select>
              <button type="submit">{isEditing ? 'Update' : 'Create'} Category</button>
              <button type="button" onClick={() => { toggleModal(); resetForm(); }} className="cancel-btn">
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanCategories;
