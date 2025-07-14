import React from 'react';
import { formatNaira } from '../../../../utils/formatCurrency';
import { getStatusBadge } from '../../../../utils/statusBadge';

const RepaymentSchedule = ({ loan, repaymentSchedule }) => {
  return (
    <tr className="schedule-row">
      <td colSpan="9">
        <div className="repayment-schedule">
          <table className="loan-table">
            <thead>
              <tr>
                <th>Installment</th>
                <th>Due Date</th>
                <th>Principal</th>
                <th>Interest</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {repaymentSchedule.map((item, idx) => {
                const effectiveStatus = loan.status === 'paid' ? 'paid' : (item.is_paid ? 'paid' : 'unpaid');

                return (
                  <tr key={idx}>
                    <td>{item.installment}</td>
                    <td>{new Date(item.due_date).toLocaleDateString()}</td>
                    <td>{formatNaira(item.principal)}</td>
                    <td>{formatNaira(item.interest)}</td>
                    <td>
                      {isNaN(Number(item.principal)) || isNaN(Number(item.interest))
                        ? 'N/A'
                        : formatNaira(Number(item.principal) + Number(item.interest))}
                    </td>
                    <td>{getStatusBadge(effectiveStatus)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </td>
    </tr>
  );
};

export default RepaymentSchedule;