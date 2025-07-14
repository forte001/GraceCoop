import React from 'react';
import { formatNaira } from '../../../../utils/formatCurrency';
import { formatDateTime } from '../../../../utils/formatDate';
import { getStatusBadge } from '../../../../utils/statusBadge';

const LoanSummary = ({ loan, loanSummary }) => {
  return (
    <tr className="summary-row">
      <td colSpan="9">
        <div className="loan-summary-container">
          <div className="summary-column loan-details">
            <h4>Loan Summary</h4>
            <p><strong>Reference:</strong> {loanSummary.reference}</p>
            <p><strong>Member:</strong> {loanSummary.member_name}</p>
            <p><strong>Total Disbursed:</strong> {formatNaira(loanSummary.total_disbursed || 0)}</p>
            <p><strong>Outstanding Disbursement Balance:</strong> {formatNaira(loanSummary.remaining_balance || 0)}</p>
            <p><strong>Total Repaid:</strong> {formatNaira(loanSummary.total_paid || 0)}</p>
            <p><strong>Interest Rate:</strong> {loanSummary.interest_rate}%</p>
            <p><strong>Status:</strong> {getStatusBadge(loanSummary.status)}</p>
          </div>
          
          <div className="summary-column disbursement-receipts">
            <h4>Disbursement Receipts</h4>
            {loan.disbursements && loan.disbursements.length > 0 ? (
              loan.disbursements.map((d) => (
                <div key={d.id} className="receipt-entry">
                  <p>{formatNaira(d.amount)} on {formatDateTime(d.disbursed_at)}</p>
                  {d.receipt_url ? (
                    <a
                      href={d.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="receipt-button"
                    >
                      View / Download Receipt
                    </a>
                  ) : (
                    <span className="no-receipt">No receipt</span>
                  )}
                </div>
              ))
            ) : (
              <p>No disbursement records</p>
            )}
          </div>
          
          <div className="summary-column reserved">
            <h4>Guarantors</h4>
            {loan.guarantors?.length ? (
              loan.guarantors.map((g) => (
                <p key={g.id}>{g.guarantor_name} ({g.guarantor_id})</p>
              ))
            ) : (
              <p>No guarantors found</p>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
};

export default LoanSummary;