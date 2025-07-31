import React, { useState, useEffect } from 'react';
import axiosMemberInstance from '../../utils/axiosMemberInstance';
import { FaExclamationTriangle, FaClock, FaFileAlt, FaTimes } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const DocumentRequestBanner = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(new Set());

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await axiosMemberInstance.get('members/member-document-requests/notifications/');
      if (response.data && response.data.results) {
        setNotifications(response.data.results);
      }
    } catch (error) {
      console.error('Error fetching document request notifications:', error);
      if (error.response) {
        console.error('Response error:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  // const dismissNotification = (notificationId) => {
  //   setDismissed(prev => new Set([...prev, notificationId]));
  // };

  const dismissAllNotifications = () => {
    const allIds = notifications.map(n => n.id);
    setDismissed(new Set(allIds));
  };

  const visibleNotifications = notifications.filter(n => !dismissed.has(n.id));

  const overdueRequests = visibleNotifications.filter(n => n.is_overdue);
  const pendingRequests = visibleNotifications;

  if (loading || visibleNotifications.length === 0) return null;

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
      {visibleNotifications.length > 0 && (
          <button 
            className="dismiss-all-btn"
            onClick={dismissAllNotifications}
            title="Dismiss all notifications"
          >
            <FaTimes />
          </button>
        )}
      <div className="banner-actions">
        <Link to="/member/edit-profile" className="view-requests-btn">
          <FaFileAlt /> View & Upload
        </Link>
        
      </div>
    </div>
  );
};

export default DocumentRequestBanner;
