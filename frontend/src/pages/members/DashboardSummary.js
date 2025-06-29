import React, { useEffect, useState } from "react";
import axiosMemberInstance from "../../utils/axiosMemberInstance";
import "../../styles/members/DashboardPage.css";
import Spinner from "../../components/Spinner";

const DashboardSummary = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await axiosMemberInstance.get("/members/dashboard/summary/");
        setSummary(response.data);
      } catch (err) {
        console.error("Error fetching dashboard summary:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-summary">
        <Spinner />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="dashboard-summary">
        <p>Could not load summary data.</p>
      </div>
    );
  }

  return (
    <div className="dashboard-summary">
      <h2 className="summary-heading">Recent Payments</h2>
      {summary.recent_payments.length === 0 ? (
        <p>No recent payments found.</p>
      ) : (
            <div className="summary-table-wrapper">
            <table className="summary-table">
                <thead>
                <tr>
                    <th>Amount</th>
                    <th>Type</th>
                    <th>Paid Date</th>
                    <th>Status</th>
                </tr>
                </thead>
                <tbody>
                {summary.recent_payments.map((item, index) => (
                    <tr key={index}>
                    <td className="amount-cell">₦{parseFloat(item.amount).toFixed(2)}</td>
                    <td>{item.payment_type.toUpperCase()}</td>
                    <td>{item.paid_date ? new Date(item.paid_date).toLocaleDateString() : "N/A"}</td>
                    <td className={item.status === "complete" ? "status-complete" : "status-pending"}>
                        {item.status.toUpperCase()}
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
      )}

      <h2 className="summary-heading">Upcoming Loan Payment</h2>
      {summary.upcoming_loan_payment ? (
        <div className="upcoming-payment">
          <strong>Amount Due:</strong> ₦{parseFloat(summary.upcoming_loan_payment.amount_due).toFixed(2)}
          <br />
          <strong>Due Date:</strong>{" "}
          {new Date(summary.upcoming_loan_payment.due_date).toLocaleDateString()}
          <br />
          <span className="status-pending">Status: {summary.upcoming_loan_payment.status}</span>
          
        </div>
        
      ) : (
        <p>No upcoming loan payment.</p>
      )}
      <hr/>
          <div className="flashing-reminder">
                🚨 Don't forget: Regular <strong>Contributions</strong> and <strong>Development Levy</strong> payments
                are essential for your cooperative benefits!
          </div>
    </div>
    
  );
};

export default DashboardSummary;
