import React, { useState, useEffect } from "react";
import axiosMemberInstance from "../../utils/axiosMemberInstance";
import usePaginatedData from "../../utils/usePaginatedData";
import { FaUpload, FaRedo, FaClock, FaExclamationTriangle, FaCheckCircle, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import Spinner from "../../components/Spinner";
import { toast } from "react-toastify";

const MemberDocuments = () => {
  const [selectedType, setSelectedType] = useState("");
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("upload"); // "upload" or "requests"

  // Paginated data for documents (3 per page)
  const {
    data: docs,
    loading: docsLoading,
    currentPage: docsCurrentPage,
    setCurrentPage: setDocsCurrentPage,
    totalPages: docsTotalPages,
    pageSize: docsPageSize,
    setPageSize: setDocsPageSize,
    fullData: docsFullData,
    refresh: refreshDocs
  } = usePaginatedData("members/documents/", {}, 1);

  // Paginated data for requests (3 per page)
  const {
    data: requests,
    loading: requestsLoading,
    currentPage: requestsCurrentPage,
    setCurrentPage: setRequestsCurrentPage,
    totalPages: requestsTotalPages,
    pageSize: requestsPageSize,
    setPageSize: setRequestsPageSize,
    fullData: requestsFullData,
    refresh: refreshRequests
  } = usePaginatedData("admin/requests/", {}, 1);

  // Set page sizes on component mount
  useEffect(() => {
    setDocsPageSize(3); // 3 documents per page
    setRequestsPageSize(3); // 3 request per page
  }, [setDocsPageSize, setRequestsPageSize]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedType || !file) return toast.warn("Select type & file");
    setSubmitting(true);
    const fd = new FormData();
    fd.append("document_type", selectedType);
    fd.append("document_file", file);
    fd.append("notes", notes);
    try {
      await axiosMemberInstance.post("members/documents/", fd);
      toast.success("Uploaded!");
      setSelectedType("");
      setFile(null);
      setNotes("");
      refreshDocs(); // Refresh documents
      refreshRequests(); // Refresh requests in case this fulfills one
    } catch (err) {
      console.error(err);
      toast.error("Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  const getRequestStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <FaClock className="status-icon pending" />;
      case 'fulfilled':
        return <FaCheckCircle className="status-icon fulfilled" />;
      case 'cancelled':
        return <FaExclamationTriangle className="status-icon cancelled" />;
      default:
        return null;
    }
  };

  const getRequestStatusClass = (request) => {
    if (request.is_overdue) return 'overdue';
    return request.status;
  };

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

  // Calculate stats from full data (not just current page)
  const allRequests = requestsFullData.results || [];
  const pendingRequests = allRequests.filter(req => req.status === 'pending');
  const overdueRequests = allRequests.filter(req => req.is_overdue && req.status === 'pending');

  const PaginationControls = ({ currentPage, setCurrentPage, totalPages, itemName }) => {
    if (totalPages <= 1) return null;

    return (
      <div className="pagination-controls">
        <button 
          onClick={() => setCurrentPage(currentPage - 1)} 
          disabled={currentPage <= 1}
          className="pagination-btn"
        >
          <FaChevronLeft /> Previous
        </button>
        
        <span className="pagination-info">
          Page {currentPage} of {totalPages}
        </span>
        
        <button 
          onClick={() => setCurrentPage(currentPage + 1)} 
          disabled={currentPage >= totalPages}
          className="pagination-btn"
        >
          Next <FaChevronRight />
        </button>
      </div>
    );
  };

  if (docsLoading && docsCurrentPage === 1) return <Spinner />;

  return (
    <div className="member-documents-container">
      {/* Tab Navigation */}
      <div className="document-tabs">
        <button 
          className={activeTab === "upload" ? "tab-active" : "tab-inactive"}
          onClick={() => setActiveTab("upload")}
        >
          Upload Documents
        </button>
        <button 
          className={activeTab === "requests" ? "tab-active" : "tab-inactive"}
          onClick={() => setActiveTab("requests")}
        >
          Document Requests {pendingRequests.length > 0 && <span className="request-count">({pendingRequests.length})</span>}
        </button>
      </div>

      {activeTab === "upload" && (
        <>
          <h2>Upload Document</h2>
          <form className="edit-profile-form" onSubmit={handleSubmit}>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              required
            >
              <option value="">Select Document Type</option>
              <option value="national_id">National ID</option>
              <option value="drivers_license">Driver's License</option>
              <option value="passport">International Passport</option>
              <option value="utility_bill">Utility Bill</option>
              <option value="bank_statement">Bank Statement</option>
              <option value="employment_letter">Employment Letter</option>
              <option value="salary_slip">Salary Slip</option>
              <option value="other">Other</option>
            </select>
            <input 
              type="file" 
              accept=".pdf,.jpg,.jpeg,.png" 
              onChange={e => setFile(e.target.files[0])} 
              required 
            />
            <textarea
              placeholder="Notes (optional)"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
            <button 
            type="submit" 
            disabled={submitting}
            style={{
              backgroundColor: '#4caf50',
              borderColor: '#4caf50'
            }}
          >
            {submitting ? "Uploading…" : <><FaUpload /> Upload</>}
          </button>
          </form>

          <div className="document-list">
            <div className="list-header">
              <h3>Your Documents</h3>
              <span className="total-count">
                {docsFullData.count} total document{docsFullData.count !== 1 ? 's' : ''}
              </span>
            </div>
            
            {docsLoading && docsCurrentPage > 1 && (
              <div className="loading-overlay">
                <Spinner size={24} />
              </div>
            )}
            
            {Array.isArray(docs) && docs.length > 0 ? (
              <>
                {docs.map(doc => (
                  <div key={doc.id} className={`document-item ${doc.status}`}>
                    <div>
                      <strong>{doc.document_type_display}</strong> –{" "}
                      <span className={`status-badge ${getStatusBadge(doc.status)}`}>
                        {doc.status_display}
                      </span>
                    </div>
                    {doc.rejection_reason && <p>Reason: {doc.rejection_reason}</p>}
                    {doc.notes && <p>Notes: {doc.notes}</p>}
                    <p>Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}</p>
                    <a class="btn" href={doc.file_url} target="_blank" rel="noreferrer">View</a>
                    {doc.status === "rejected" && (
                      <div className="document-actions">
                        <button onClick={() => {
                          setSelectedType(doc.document_type);
                          // Can't reupload same file object, user chooses new
                        }}>
                          <FaRedo /> Re-upload
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                
                <PaginationControls 
                  currentPage={docsCurrentPage}
                  setCurrentPage={setDocsCurrentPage}
                  totalPages={docsTotalPages}
                  itemName="documents"
                />
              </>
            ) : (
              <p>No documents uploaded yet.</p>
            )}
          </div>
        </>
      )}

      {activeTab === "requests" && (
        <div className="document-requests">
          <div className="list-header">
            <h2>Document Requests</h2>
            <span className="total-count">
              {requestsFullData.count} total request{requestsFullData.count !== 1 ? 's' : ''}
            </span>
          </div>
          
          {overdueRequests.length > 0 && (
            <div className="overdue-alert">
              <FaExclamationTriangle />
              <span>You have {overdueRequests.length} overdue document request(s)!</span>
            </div>
          )}

          {requestsLoading && requestsCurrentPage > 1 && (
            <div className="loading-overlay">
              <Spinner size={24} />
            </div>
          )}

          {Array.isArray(requests) && requests.length > 0 ? (
            <div className="request-list">
              {requests.map(request => (
                <div key={request.id} className={`request-item ${getRequestStatusClass(request)}`}>
                  <div className="request-header">
                    <div className="request-title">
                      {getRequestStatusIcon(request.status)}
                      <strong>{request.document_type_display}</strong>
                      <span className={`request-status ${request.status}`}>
                        {request.status_display}
                      </span>
                    </div>
                    {request.is_overdue && request.status === 'pending' && (
                      <span className="overdue-badge">OVERDUE</span>
                    )}
                  </div>
                  
                  <div className="request-details">
                    <p><strong>Message:</strong> {request.message}</p>
                    <p><strong>Requested:</strong> {new Date(request.requested_at).toLocaleDateString()}</p>
                    {request.deadline && (
                      <p><strong>Deadline:</strong> {new Date(request.deadline).toLocaleDateString()}</p>
                    )}
                    {request.fulfilled_at && (
                      <p><strong>Fulfilled:</strong> {new Date(request.fulfilled_at).toLocaleDateString()}</p>
                    )}
                    <p><strong>Requested by:</strong> {request.requester_name}</p>
                  </div>

                  {request.status === 'pending' && (
                    <div className="request-actions">
                      <button 
                        className="upload-for-request-btn"
                        onClick={() => {
                          setActiveTab("upload");
                          setSelectedType(request.document_type);
                          toast.info("Please upload the requested document");
                        }}
                      >
                        <FaUpload /> Upload Document
                      </button>
                    </div>
                  )}
                </div>
              ))}
              
              <PaginationControls 
                currentPage={requestsCurrentPage}
                setCurrentPage={setRequestsCurrentPage}
                totalPages={requestsTotalPages}
                itemName="requests"
              />
            </div>
          ) : (
            <p>No document requests found.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default MemberDocuments;