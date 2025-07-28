import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaFileAlt, FaExclamationTriangle, FaClock } from 'react-icons/fa';
import axiosMemberInstance from '../../utils/axiosMemberInstance';

const DocumentRequestsBanner = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await axiosMemberInstance.get("admin/requests/");
        const requestsData = res.data.results || res.data;
        setRequests(requestsData);
      } catch (err) {
        console.error("Failed to load document requests:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  if (loading || requests.length === 0) return null;

  const pendingRequests = requests.filter(req => req.status === 'pending');
  const overdueRequests = requests.filter(req => req.is_overdue && req.status === 'pending');

  if (pendingRequests.length === 0) return null;

  return (
    <div className={`document-requests-banner ${overdueRequests.length > 0 ? 'overdue' : 'pending'}`}>
      <div className="banner-icon">
        {overdueRequests.length > 0 ? <FaExclamationTriangle /> : <FaClock />}
      </div>
      <div className="banner-content">
        <h4>
          {overdueRequests.length > 0 
            ? `⚠️ ${overdueRequests.length} Overdue Document Request${overdueRequests.length > 1 ? 's' : ''}!`
            : `📄 ${pendingRequests.length} Pending Document Request${pendingRequests.length > 1 ? 's' : ''}`
          }
        </h4>
        <p>
          {overdueRequests.length > 0 
            ? 'You have overdue document requests that need immediate attention.'
            : 'You have pending document requests from admin.'
          }
        </p>
        <div className="request-summary">
          {pendingRequests.slice(0, 3).map(request => (
            <span key={request.id} className="request-tag">
              {request.document_type_display}
              {request.is_overdue && <span className="overdue-indicator">!</span>}
            </span>
          ))}
          {pendingRequests.length > 3 && (
            <span className="more-requests">+{pendingRequests.length - 3} more</span>
          )}
        </div>
      </div>
      <div className="banner-actions">
        <Link to="/member/edit-profile" className="view-requests-btn">
          <FaFileAlt /> View & Upload
        </Link>
      </div>
    </div>
  );
};

export default DocumentRequestsBanner;