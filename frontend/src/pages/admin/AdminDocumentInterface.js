import React, { useState, useEffect } from 'react';
import { 
  FaEye, FaCheck, FaTimes, FaDownload, FaPlus, 
  FaClock, FaExclamationTriangle, FaSearch, FaFilter,
  FaUser, FaFileAlt, FaPaperPlane
} from 'react-icons/fa';
import axiosAdminInstance from '../../utils/axiosAdminInstance';
import DocumentPreviewModal from './DocumentPreviewModal';
import '../../styles/admin/AdminDocumentInterface.css'
import Spinner from '../../components/Spinner';

const AdminDocumentInterface = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [documents, setDocuments] = useState([]);
  const [documentRequests, setDocumentRequests] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [reviewModal, setReviewModal] = useState(false);
  const [requestModal, setRequestModal] = useState(false);
  const [previewModal, setPreviewModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [reviewForm, setReviewForm] = useState({
    action: 'approve',
    reason: '',
    notes: ''
  });

  const [requestForm, setRequestForm] = useState({
    member: '',
    document_type: '',
    message: '',
    deadline: ''
  });

  const documentTypes = [
    { value: 'national_id', label: 'National ID Card' },
    { value: 'drivers_license', label: "Driver's License" },
    { value: 'passport', label: 'International Passport' },
    { value: 'utility_bill', label: 'Utility Bill' },
    { value: 'bank_statement', label: 'Bank Statement' },
    { value: 'employment_letter', label: 'Employment Letter' },
    { value: 'salary_slip', label: 'Salary Slip' },
    { value: 'other', label: 'Other' }
  ];

  const fetchDocuments = async (status = null) => {
    setLoading(true);
    setError(null);
    try {
      let endpoint = 'admin/admin-documents/';
      if (status === 'pending') endpoint = 'admin/admin-documents/pending/';
      const response = await axiosAdminInstance.get(endpoint);
      setDocuments(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setError('Failed to fetch documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocumentRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosAdminInstance.get('admin/admin-document-requests/'); 
      setDocumentRequests(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching requests:', error);
      setError('Failed to fetch document requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await axiosAdminInstance.get('admin/members/approved/');
      setMembers(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const handleDocumentDownload = async (document) => {
    try {
      try {
        const response = await axiosAdminInstance.get(`admin/admin-documents/${document.id}/signed-url/`);
        if (response.data.signed_url) {
          window.open(response.data.signed_url, '_blank');
          return;
        }
      } catch (signedUrlError) {
        console.error('Signed URL error:', signedUrlError);
      }

      const downloadResponse = await axiosAdminInstance.get(`admin/admin-documents/${document.id}/download/`, {
        responseType: 'blob'
      });

      const blob = new Blob([downloadResponse.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = document.original_filename || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      setError('Failed to download document');
    }
  };

  const submitReview = async () => {
    if (!selectedDocument) return;
    try {
      setLoading(true);
      await axiosAdminInstance.post(`admin/admin-documents/${selectedDocument.id}/review/`, reviewForm);
      setReviewModal(false);
      setSelectedDocument(null);
      setReviewForm({ action: 'approve', reason: '', notes: '' });
      if (activeTab === 'pending') {
        await fetchDocuments('pending');
      } else {
        await fetchDocuments();
      }
      setError(null);
    } catch (error) {
      console.error('Error submitting review:', error);
      const errorMessage = error.response?.data?.message || 
                            error.response?.data?.error || 
                            'Failed to submit review. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const submitRequest = async () => {
    try {
      setLoading(true);
      await axiosAdminInstance.post('admin/admin-document-requests/', requestForm);
      setRequestModal(false);
      setRequestForm({ member: '', document_type: '', message: '', deadline: '' });
      await fetchDocumentRequests();
      setError(null);
    } catch (error) {
      console.error('Error submitting request:', error);
      const errorMessage = error.response?.data?.message || 
                            error.response?.data?.error || 
                            'Failed to submit request. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const cancelRequest = async (requestId) => {
    try {
      setLoading(true);
      await axiosAdminInstance.post(`admin/admin-document-requests/${requestId}/cancel/`);
      await fetchDocumentRequests();
      setError(null);
    } catch (error) {
      console.error('Error canceling request:', error);
      const errorMessage = error.response?.data?.message || 
                            error.response?.data?.error || 
                            'Failed to cancel request. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (activeTab === 'pending') {
        await fetchDocuments('pending');
      } else if (activeTab === 'all') {
        await fetchDocuments();
      } else if (activeTab === 'requests') {
        await fetchDocumentRequests();
      }
    };
    loadData();
    fetchMembers();
    setFilterType('all');
    setFilterStatus('all');
  }, [activeTab]);

  const filteredData = (activeTab === 'requests' ? documentRequests : documents).filter(item => {
    const matchesSearch = searchTerm === '' || 
      (item.document_owner?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       item.document_type_display?.toLowerCase().includes(searchTerm.toLowerCase()));
    if (activeTab === 'requests') {
      const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
      return matchesSearch && matchesStatus;
    } else {
      const matchesType = filterType === 'all' || item.document_type === filterType;
      return matchesSearch && matchesType;
    }
  });

  const formatDate = (dateString) => new Date(dateString).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'status-pending',
      approved: 'status-approved',
      rejected: 'status-rejected',
      fulfilled: 'status-approved',
      cancelled: 'status-rejected'
    };
    return badges[status] || 'status-pending';
  };

  const handlePreviewReview = (document, action) => {
    setSelectedDocument(document);
    setReviewForm({ action, reason: '', notes: '' });
    setPreviewModal(false);
    setReviewModal(true);
  };

  const openPreview = (document) => {
    setSelectedDocument(document);
    setPreviewModal(true);
  };

  return (
    <div className="admin-document-interface">
      {/* Header */}
      <div className="interface-header">
        <h1>Document Management</h1>
        <button className="btn-primary" onClick={() => setRequestModal(true)} disabled={loading}>
          <FaPlus /> Request Document
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <FaExclamationTriangle />
          <span>{error}</span>
          <button onClick={() => setError(null)}><FaTimes /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="tab-navigation">
        <button className={`tab ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>
          <FaClock /> Pending Review
        </button>
        <button className={`tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
          <FaFileAlt /> All Documents
        </button>
        <button className={`tab ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>
          <FaPaperPlane /> Document Requests
        </button>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <FaSearch />
          <input
            type="text"
            placeholder="Search by member name or document type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filter-dropdown">
          <FaFilter />
          {activeTab === 'requests' ? (
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="fulfilled">Fulfilled</option>
              <option value="cancelled">Cancelled</option>
            </select>
          ) : (
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="all">All Types</option>
              {documentTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="content-area">
        {loading && <Spinner />}
      
        <div className="data-table">
          {activeTab === 'requests' ? (
            // Document Requests Table
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Document Type</th>
                  <th>Status</th>
                  <th>Requested</th>
                  <th>Deadline</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length > 0 ? (
                  filteredData.map(request => (
                    <tr key={request.id}>
                      <td>
                        <div className="member-info">
                          <FaUser />
                          <span>{request.document_owner}</span>
                        </div>
                      </td>
                      <td>{request.document_type_display}</td>
                      <td>
                        <span className={`status-badge ${getStatusBadge(request.status)}`}>
                          {request.status_display}
                          {request.is_overdue && <FaExclamationTriangle className="overdue-icon" />}
                        </span>
                      </td>
                      <td>{formatDate(request.requested_at)}</td>
                      <td>{request.deadline ? formatDate(request.deadline) : 'No deadline'}</td>
                      <td>
                        <div className="action-buttons">
                          {request.status === 'pending' && (
                            <button 
                              className="btn-danger btn-sm"
                              onClick={() => cancelRequest(request.id)}
                            >
                              <FaTimes /> Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
                      No document requests found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            // Documents Table
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Document Type</th>
                  <th>Status</th>
                  <th>Uploaded</th>
                  <th>File Size</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length > 0 ? (
                  filteredData.map(document => (
                    <tr key={document.id}>
                      <td>
                        <div className="member-info">
                          <FaUser />
                          <span>{document.document_owner}</span>
                        </div>
                      </td>
                      <td>{document.document_type_display}</td>
                      <td>
                        <span className={`status-badge ${getStatusBadge(document.status)}`}>
                          {document.status_display}
                        </span>
                      </td>
                      <td>{formatDate(document.uploaded_at)}</td>
                      <td>{document.file_size_mb} MB</td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="btn-secondary btn-sm"
                            onClick={() => openPreview(document)}
                          >
                            <FaEye /> Preview
                          </button>
                          {document.status === 'pending' && (
                            <button 
                              className="btn-secondary btn-sm"
                              onClick={() => {
                                setSelectedDocument(document);
                                setReviewModal(true);
                              }}
                            >
                              <FaCheck /> Review
                            </button>
                          )}
                          <button 
                            className="btn-secondary btn-sm"
                            onClick={() => handleDocumentDownload(document)}
                          >
                            <FaDownload /> Download
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
                      No documents found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {reviewModal && selectedDocument && (
        <div className="modal-overlay" onClick={() => setReviewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Review Document</h3>
              <button onClick={() => setReviewModal(false)}>
                <FaTimes />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="document-details">
                <p><strong>Member:</strong> {selectedDocument.document_owner}</p>
                <p><strong>Document Type:</strong> {selectedDocument.document_type_display}</p>
                <p><strong>Uploaded:</strong> {formatDate(selectedDocument.uploaded_at)}</p>
                <p><strong>File Size:</strong> {selectedDocument.file_size_mb} MB</p>
                {selectedDocument.original_filename && (
                  <p><strong>Original Filename:</strong> {selectedDocument.original_filename}</p>
                )}
                {selectedDocument.notes && (
                  <p><strong>Member Notes:</strong> {selectedDocument.notes}</p>
                )}
              </div>

              <div className="review-form">
                <div className="form-group">
                  <label>Action</label>
                  <select 
                    value={reviewForm.action}
                    onChange={(e) => setReviewForm({...reviewForm, action: e.target.value})}
                  >
                    <option value="approve">Approve</option>
                    <option value="reject">Reject</option>
                  </select>
                </div>

                {reviewForm.action === 'reject' && (
                  <div className="form-group">
                    <label>Rejection Reason *</label>
                    <textarea
                      value={reviewForm.reason}
                      onChange={(e) => setReviewForm({...reviewForm, reason: e.target.value})}
                      placeholder="Please provide a reason for rejection..."
                      required
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Notes (Optional)</label>
                  <textarea
                    value={reviewForm.notes}
                    onChange={(e) => setReviewForm({...reviewForm, notes: e.target.value})}
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn-secondary"
                onClick={() => setReviewModal(false)}
              >
                Cancel
              </button>
              <button 
                className={`btn-${reviewForm.action === 'approve' ? 'success' : 'danger'}`}
                onClick={submitReview}
                disabled={loading || (reviewForm.action === 'reject' && !reviewForm.reason.trim())}
              >
                {loading ? 'Processing...' : (
                  <>
                    {reviewForm.action === 'approve' ? <FaCheck /> : <FaTimes />}
                    {reviewForm.action === 'approve' ? 'Approve' : 'Reject'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Modal */}
      {requestModal && (
        <div className="modal-overlay" onClick={() => setRequestModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Request Document</h3>
              <button onClick={() => setRequestModal(false)}>
                <FaTimes />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="request-form">
                <div className="form-group">
                  <label>Member *</label>
                  <select 
                    value={requestForm.member}
                    onChange={(e) => setRequestForm({...requestForm, member: e.target.value})}
                    required
                  >
                    <option value="">Select Member</option>
                    {members.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.full_name} - {member.member_id || 'Pending'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Document Type *</label>
                  <select 
                    value={requestForm.document_type}
                    onChange={(e) => setRequestForm({...requestForm, document_type: e.target.value})}
                    required
                  >
                    <option value="">Select Document Type</option>
                    {documentTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Message *</label>
                  <textarea
                    value={requestForm.message}
                    onChange={(e) => setRequestForm({...requestForm, message: e.target.value})}
                    placeholder="Explain why this document is needed..."
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Deadline (Optional)</label>
                  <input
                    type="datetime-local"
                    value={requestForm.deadline}
                    onChange={(e) => setRequestForm({...requestForm, deadline: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn-secondary"
                onClick={() => setRequestModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={submitRequest}
                disabled={loading || !requestForm.member || !requestForm.document_type || !requestForm.message.trim()}
              >
                {loading ? 'Sending...' : (
                  <>
                    <FaPaperPlane /> Send Request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        document={selectedDocument}
        isOpen={previewModal}
        onClose={() => {
          setPreviewModal(false);
          setSelectedDocument(null);
        }}
        onReview={handlePreviewReview}
        onDownload={handleDocumentDownload}
      />
    </div>
  );
};

export default AdminDocumentInterface;