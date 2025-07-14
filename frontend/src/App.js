import React, {useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import LoginPage from './pages/members/LoginPage';
import Register from './pages/members/Register';
import ProfilePage from './pages/members/ProfilePage';
import DashboardPage from './pages/members/DashboardPage';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import PendingMembersList from './pages/admin/PendingMembersList';
import MembersList from './pages/admin/MembersList';
import PrivateRoute from './components/PrivateRoute';
import AdminLayout from './layouts/AdminLayout';
import MemberLayout from './layouts/MemberLayout';
import './App.css';
import ThemeSwitcher from './components/ThemeSwitcher';
import CompleteProfile from './pages/members/CompleteProfile';
import EditProfilePage from "./pages/members/EditProfilePage";
import Permissions from './pages/admin/Permissions';
import TwoFASetup from './components/TwoFASetup';
import TwoFAToggle from './components/TwoFAToggle';
import Verify2FA from './components/Verify2FA';
import LoanCategories from './pages/admin/Loan/LoanCategories'
import LoanManagement from './pages/admin/Loan/LoanManagement/LoanManagement';
import LoanApplicationForm from './pages/members/Loan/LoanApplicationForm';
import LoanApplicationList from './pages/members/Loan/LoanApplicationList';
import LoanRepaymentForm from './pages/members/Loan/LoanRepaymentForm';
import ApprovedLoansList from './pages/members/Loan/ApprovedLoanList';
import AdminLoanRepaymentList from './pages/admin/Loan/AdminLoanRepaymentList';
import MemberLoanRepaymentList from './pages/members/Loan/MemberLoanRepaymentList';
import AdminCooperativeConfig from './pages/admin/AdminCooperativeConfig';
import { MemberProvider } from './components/MemberContext';
import ContributionPayment from './pages/members/OtherPayments/ContributionPayment';
import DevelopmentLevyPayment from './pages/members/OtherPayments/DevelopmentLevyPayment';
import { ensureCsrf } from './utils/ensureCsrf';
import AdminContributionList from './pages/admin/OtherPayments/AdminContributionList';
import MemberContributionList from './pages/members/OtherPayments/MemberContributionList';
import MemberLevyList from './pages/members/OtherPayments/MemberLevyList';
import AdminLevyList from './pages/admin/OtherPayments/AdminLevyList';
import AdminAllPayments from './pages/admin/OtherPayments/AdminAllPayments';
import MemberAllPaymentsList from './pages/members/OtherPayments/MemberAllPaymentsList';
import AdminDisbursementLogs from './pages/admin/Loan/AdminDisbursementsLogs';
import Forbidden from './pages/admin/Forbidden';
import VerifyEmail from './pages/members/VerifyEmail';
import PasswordResetRequest from './pages/members/PasswordResetRequest';
import PasswordResetConfirm from './pages/members/PasswordResetConfirm';
import AdminAnnouncements from './pages/admin/AnnouncementManager';
import MembersBalancesReport from './pages/admin/Reports/MembersBalance';
import MonthlyReceiptsReport from './pages/admin/Reports/AnalysisOfReceipts';
import AdminExpenses from './pages/admin/AdminExpenses';
import LoanApplicationDetails from './pages/members/Loan/LoanApplicationDetails';
import GuarantorRequests from './pages/members/Loan/GuarantorRequests';

const MainPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
  ensureCsrf();
}, []);


  return (
    <div className="landing-container">
    <img src="/logo.png" alt="GraceCoop Logo" className="landing-logo" />
    <h1 className="landing-title animate-fade-in">Welcome to GraceCoop</h1>
    <div className="landing-buttons animate-slide-up">
      <button onClick={() => navigate('/login')}>Member Login</button>
      <button onClick={() => navigate('/register')}>Sign Up</button>
      <button onClick={() => navigate('/admin/login')}>Admin Login</button>
    </div>
  </div>
  
  
  );
};

const App = () => {
  const [isRefreshing, setIsRefreshing] = useState(true);

  useEffect(() => {
    const refreshToken = localStorage.getItem('refreshToken');
  
    if (refreshToken) {
      fetch('http://localhost:8000/api/token/refresh/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.access && data.refresh) {
            // ✅ Save BOTH tokens
            localStorage.setItem('token', data.access);
            localStorage.setItem('refreshToken', data.refresh);
          } else if (data.access) {
            // fallback if only access is returned
            localStorage.setItem('token', data.access);
          } else {
            localStorage.clear();
            window.location.href = '/login';
          }
        })
        .catch(() => {
          localStorage.clear();
          window.location.href = '/login';
        })
        .finally(() => setIsRefreshing(false));
    } else {
      setIsRefreshing(false);
    }
  }, []);
  

  if (isRefreshing) return <div>Loading...</div>;

  return (
<Router>
  <Routes>

    {/* Public Routes */}
    <Route path="/" element={<MainPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<Register />} />
    <Route path="/admin/login" element={<AdminLogin />} />
    <Route path="/admin/2fa/verify" element={<Verify2FA />} />
    <Route path="/member/2fa/verify" element={<Verify2FA />} />
    <Route path="/forbidden" element={<Forbidden />} />
    <Route path="/verify-email" element={<VerifyEmail/>} />
    <Route path="/password-reset" element={<PasswordResetRequest/>} />
    <Route path="/reset-password" element={<PasswordResetConfirm/>} />

    {/* Member Protected Routes */}
    <Route path="/member" element={
      <MemberProvider>
        <MemberLayout />
      </MemberProvider>
    }>
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="profile" element={<ProfilePage />} />
      <Route path="complete-profile" element={<CompleteProfile />} />
      <Route path="loan-application-list" element={<LoanApplicationList />} />
      <Route path="loan-application" element={<LoanApplicationForm />} />
      <Route path="loan-application-form/:id?" element={<LoanApplicationForm />} />
      <Route path="loan-application-details/:id" element={<LoanApplicationDetails />} />
      <Route path="guarantor-requests" element={<GuarantorRequests />} />
      <Route path="loans" element={<ApprovedLoansList />} />
      <Route path="loan-repayment-schedule" element={<LoanRepaymentForm />} />
      <Route path="loan-repayments" element={<MemberLoanRepaymentList />} />
      <Route path="pay/contribution" element={<ContributionPayment />} />
      <Route path="pay/levy" element={<DevelopmentLevyPayment />} />
      <Route path="contribution-list" element={<MemberContributionList />} />
      <Route path="levy-list" element={<MemberLevyList />} />
      <Route path="all-payments" element={<MemberAllPaymentsList/>} />
      <Route path="edit-profile" element={<EditProfilePage />} />
      <Route path="settings/2fa" element={<TwoFAToggle />} />
      <Route path="2fa/setup" element={<TwoFASetup />} />
      
    </Route>

    {/* Admin Protected Routes */}
    <Route element={<PrivateRoute />}>
      <Route path="/admin" element={<AdminLayout />}>
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="members/pending" element={<PendingMembersList />} />
        <Route path="members/approved" element={<MembersList />} />
        <Route path="loan/categories" element={<LoanCategories />} />
        <Route path="loan/management" element={<LoanManagement/>} />
        <Route path="loan/repayment-list" element={<AdminLoanRepaymentList />} />
        <Route path="payments/contributions" element={<AdminContributionList />} />
        <Route path="payments/levies" element={<AdminLevyList />} />
        <Route path="all-payments" element={<AdminAllPayments/>} />
        <Route path="disbursement-logs" element={<AdminDisbursementLogs/>} />
        <Route path="report/members-balances" element={<MembersBalancesReport/>} />
        <Route path="report/analysis-of-receipts" element={<MonthlyReceiptsReport/>} />
        <Route path="expenses" element={<AdminExpenses/>} />
        <Route path="settings/theme" element={<ThemeSwitcher />} />
        <Route path="permissions" element={<Permissions />} />
        <Route path="2fa/setup" element={<TwoFASetup />} />
        <Route path="settings/2fa" element={<TwoFAToggle />} />
        <Route path="coop-config" element={<AdminCooperativeConfig />} />
        <Route path="announcements/" element={<AdminAnnouncements />} />
      </Route>
    </Route>

  </Routes>
  <ToastContainer position="top-right" autoClose={3000} />
</Router>


  );
};

export default App;
