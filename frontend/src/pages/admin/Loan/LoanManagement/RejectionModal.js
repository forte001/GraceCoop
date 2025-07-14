import React from 'react';

const RejectionModal = ({
  showRejectionModal,
  rejectionReason,
  setRejectionReason,
  handleRejectApplication,
  closeRejectionModal
}) => {
  if (!showRejectionModal) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Reject Loan Application</h3>
        <textarea
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          placeholder="Enter reason for rejection..."
          rows={4}
        />
        <div className="modal-buttons">
          <button onClick={handleRejectApplication} className="reject-btn">Submit</button>
          <button onClick={closeRejectionModal} className="cancel-btn">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default RejectionModal;