import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/admin/ErrorPages.css';

const Forbidden = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    // Go back to previous page
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/admin/dashboard');
    }
  };

  return (
    <div className="error-page">
      <h1>403 - Forbidden</h1>
      <p>You do not have permission to access this page.</p>
      <button className="back-button" onClick={handleBack}>
        Go Back
      </button>
    </div>
  );
};

export default Forbidden;
