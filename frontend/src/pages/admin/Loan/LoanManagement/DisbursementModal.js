import React, { useState } from 'react';
import axiosAdminInstance from '../../../../utils/axiosAdminInstance';
import { getCSRFToken } from '../../../../utils/csrf';

const DisbursementModal = ({
  showModal,
  selectedLoan,
  closeModal,
  refreshLoans,
  navigate
}) => {
  const [disburseAmount, setDisburseAmount] = useState('');
  const [disbursementType, setDisbursementType] = useState('full');
  const [isFullPayment, setIsFullPayment] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);

  const handleDisburse = async (e) => {
    e.preventDefault();
    try {
      const amount = disbursementType === 'full' || isFullPayment
        ? selectedLoan.disbursements_remaining
        : disburseAmount;

      const formData = new FormData();
      formData.append('amount', amount);
      if (receiptFile) {
        formData.append('receipt', receiptFile);
      }

      await axiosAdminInstance.post(
        `/admin/loan/loans-admin/${selectedLoan.id}/disburse/`,
        formData,
        {
          headers: {
            'X-CSRFToken': getCSRFToken(),
            'Content-Type': 'multipart/form-data',
          }
        }
      );

      alert('Loan disbursed successfully!');
      closeModal();
      refreshLoans();
    } catch (err) {
      if (err.response?.status === 403) {
        navigate('/forbidden');
      } else {
        alert('An error occurred during disbursement.');
      }
    }
  };

  const resetForm = () => {
    setDisburseAmount('');
    setDisbursementType('full');
    setIsFullPayment(false);
    setReceiptFile(null);
  };

  React.useEffect(() => {
    if (showModal) {
      resetForm();
    }
  }, [showModal]);

  if (!showModal || !selectedLoan) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Disburse Loan - {selectedLoan.reference}</h3>
        <form onSubmit={handleDisburse}>
          <div>
            <label>
              <input
                type="radio"
                name="disbursementType"
                value="full"
                checked={disbursementType === 'full'}
                onChange={() => {
                  setDisbursementType('full');
                  setIsFullPayment(true);
                }}
              />
              Full Disbursement
            </label>
            <label>
              <input
                type="radio"
                name="disbursementType"
                value="partial"
                checked={disbursementType === 'partial'}
                onChange={() => {
                  setDisbursementType('partial');
                  setIsFullPayment(false);
                }}
              />
              Partial Disbursement
            </label>
          </div>
          
          {disbursementType === 'partial' && (
            <div>
              <label>Amount to Disburse</label>
              <input
                type="number"
                value={disburseAmount}
                onChange={(e) => setDisburseAmount(e.target.value)}
                min="1"
                max={selectedLoan.disbursements_remaining}
                required
              />
            </div>
          )}

          <div>
            <label>Upload Disbursement Receipt</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setReceiptFile(e.target.files[0])}
              required
            />
          </div>

          <button type="submit">Confirm Disbursement</button>
          <button type="button" onClick={closeModal}>Cancel</button>
        </form>
      </div>
    </div>
  );
};

export default DisbursementModal;