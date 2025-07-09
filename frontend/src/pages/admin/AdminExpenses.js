import React, { useState } from 'react';
import usePaginatedData from '../../utils/usePaginatedData';
import axiosAdminInstance from '../../utils/axiosAdminInstance';
import Spinner from '../../components/Spinner';
import exportHelper from '../../utils/exportHelper';
import ExportPrintGroup from '../../utils/ExportPrintGroup';
import '../../styles/admin/CooperativeConfig.css';

const AdminExpenses = () => {
  const {
    data: expenses,
    currentPage,
    totalPages,
    pageSize,
    loading,
    setCurrentPage,
    setPageSize,
    filters,
    setFilters,
  } = usePaginatedData('/admin/expenses/', {
    vendor_name: '',
    category: '',
    title: '',
    date_incurred_after: '',
    date_incurred_before: '',
  });

  const [newExpense, setNewExpense] = useState({
    title: '',
    vendor_name: '',
    amount: '',
    date_incurred: '',
    category: 'GENERAL',
    narration: '',
    receipt: null,
  });

  const [message, setMessage] = useState('');
  const [showModal, setShowModal] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, files } = e.target;
    setNewExpense((prev) => ({
      ...prev,
      [name]: type === 'file' ? files[0] : value,
    }));
  };

// Fixed handleCreateExpense function
const handleCreateExpense = async (e) => {
  e.preventDefault();
  setMessage('');

  // Validate required fields
  const requiredFields = ['title', 'vendor_name', 'amount', 'date_incurred', 'category'];
  const missingFields = requiredFields.filter(field => !newExpense[field]);
  
  if (missingFields.length > 0) {
    setMessage(`❌ Missing required fields: ${missingFields.join(', ')}`);
    return;
  }

  // Check if receipt file is selected
  if (!newExpense.receipt) {
    setMessage('❌ Please select a receipt file');
    return;
  }

  const formData = new FormData();
  
  // Add all fields to FormData
  Object.entries(newExpense).forEach(([key, value]) => {
    if (key === 'receipt' && value instanceof File) {
      formData.append('receipt', value);
    } else if (value !== null && value !== '' && key !== 'receipt') {
      formData.append(key, String(value));
    }
  });

  // Debug: Log FormData contents
  console.log('FormData contents:');
  for (let [key, value] of formData.entries()) {
    console.log(`${key}:`, value);
  }

  try {
    const response = await axiosAdminInstance.post('/admin/expenses/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    console.log('Success response:', response.data);
    setMessage('✅ Expense recorded successfully!');
    setNewExpense({
      title: '',
      vendor_name: '',
      amount: '',
      date_incurred: '',
      category: 'GENERAL',
      narration: '',
      receipt: null,
    });
    
    // Reset file input
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) fileInput.value = '';
    
    setShowModal(false);
    setCurrentPage(1); // refresh data
  } catch (error) {
    console.error('Error creating expense:', error);
    
    if (error.response?.data) {
      console.log('Backend error details:', error.response.data);
      if (error.response.data.error) {
        setMessage(`❌ ${error.response.data.error}`);
      } else {
        setMessage(`❌ Server error: ${JSON.stringify(error.response.data)}`);
      }
    } else {
      setMessage('❌ Network error. Please check your connection.');
    }
  }
};

  const transformExportData = (item) => ({
    Title: item.title,
    Vendor: item.vendor_name,
    Category: item.category,
    Amount: `NGN ${Number(item.amount).toLocaleString()}`,
    'Date Incurred': item.date_incurred,
    Narration: item.narration || 'N/A',
    'Recorded By': item.recorded_by_name || 'N/A',
  });

  const { exportToExcel, exportToCSV, exportToPDF } = exportHelper({
    url: '/admin/expenses/',
    filters,
    transformFn: transformExportData,
    columns: ['Title', 'Vendor', 'Category', 'Amount', 'Date Incurred', 'Narration', 'Recorded By'],
    fileName: 'expenses',
    reportTitle: 'Expense Records',
  });

  return (
    <div className="admin-config-page">
      <div className="header-row">
        <h2>Expense Records</h2>
        <button className="create-button" onClick={() => setShowModal(true)}>+ Add Expense</button>
      </div>

      <div className="filter-section">
        <input
          className="filter-input"
          placeholder="Title"
          value={filters.title || ''}
          onChange={(e) => setFilters((f) => ({ ...f, title: e.target.value }))}
        />
        <input
          className="filter-input"
          placeholder="Vendor name"
          value={filters.vendor_name || ''}
          onChange={(e) => setFilters((f) => ({ ...f, vendor_name: e.target.value }))}
        />
        <select
          className="filter-select"
          value={filters.category || ''}
          onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
        >
          <option value="">All Categories</option>
          <option value="GENERAL">General</option>
          <option value="UTILITY">Utility</option>
          <option value="PURCHASES">Purchases</option>
        </select>
        <input
          type="date"
          className="filter-input"
          placeholder="From Date"
          value={filters.date_incurred_after || ''}
          onChange={(e) => setFilters((f) => ({ ...f, date_incurred_after: e.target.value }))}
        />
        <input
          type="date"
          className="filter-input"
          placeholder="To Date"
          value={filters.date_incurred_before || ''}
          onChange={(e) => setFilters((f) => ({ ...f, date_incurred_before: e.target.value }))}
        />

        <ExportPrintGroup
          data={(expenses || []).map(transformExportData)}
          exportToExcel={exportToExcel}
          exportToCSV={exportToCSV}
          exportToPDF={exportToPDF}
        />
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <table className="config-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Vendor</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Date Incurred</th>
              <th>Narration</th>
              <th>Receipt</th>
              <th>Recorded By</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((exp) => (
              <tr key={exp.id}>
                <td>{exp.title}</td>
                <td>{exp.vendor_name}</td>
                <td>{exp.category}</td>
                <td>{Number(exp.amount).toLocaleString()}</td>
                <td>{exp.date_incurred}</td>
                <td>{exp.narration || 'N/A'}</td>
                <td>
                  {exp.receipt_url ? (
                    <a href={exp.receipt_url} target="_blank" rel="noopener noreferrer"  className="receipt-button">View Receipt</a>
                  ) : (
                    '—'
                  )}
                </td>
                <td>{exp.recorded_by_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="pagination-controls">
        <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>
          Prev
        </button>
        <span>Page {currentPage} of {totalPages}</span>
        <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>
          Next
        </button>
        <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
          {[5, 10, 20].map((size) => (
            <option key={size} value={size}>{size} / page</option>
          ))}
        </select>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Record New Expense</h3>
            <form onSubmit={handleCreateExpense} encType="multipart/form-data">

              <input
                type="text"
                name="title"
                placeholder="Expense Title"
                value={newExpense.title}
                onChange={handleInputChange}
                required
              />
              <input
                type="text"
                name="vendor_name"
                placeholder="Vendor Name"
                value={newExpense.vendor_name}
                onChange={handleInputChange}
                required
              />
              <input
                type="number"
                name="amount"
                placeholder="Amount"
                value={newExpense.amount}
                onChange={handleInputChange}
                required
              />
              <input
                type="date"
                name="date_incurred"
                value={newExpense.date_incurred}
                onChange={handleInputChange}
                required
              />
              <select
                name="category"
                value={newExpense.category}
                onChange={handleInputChange}
                required
              >
                <option value="GENERAL">General</option>
                <option value="UTILITY">Utility</option>
                <option value="PURCHASES">Purchases</option>
              </select>
              <textarea
                name="narration"
                placeholder="Narration (optional)"
                value={newExpense.narration}
                onChange={handleInputChange}
              />
              <input
                type="file"
                name="receipt"
                accept="application/pdf,image/*"
                onChange={handleInputChange}
                required
              />
              <div className="modal-buttons">
                <button type="submit">Save</button>
                <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
              {message && <p className="form-message">{message}</p>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminExpenses;
