import { Routes, Route } from "react-router";

// Layouts
import AppLayout from "../layouts/AppLayout";
import AuthLayout from "../layouts/AuthLayout";

// Authentication
import SignIn from "../pages/AuthPages/SignIn";
import SignUp from "../pages/AuthPages/SignUp";

// Dashboard
import Home from "../pages/Dashboard/Home";

// Other
import NotFound from "../pages/OtherPage/NotFound";
import UserProfile from "../pages/UserProfile";
import ForgotPassword from "../pages/AuthPages/ForgotPassword";
import ResetPassword from "../pages/AuthPages/ResetPassword";
import VerifyEmail from "../pages/AuthPages/VerifyEmail";
import Websites from "../pages/Websites/Websites";
import AddWebsite from "../pages/Websites/AddWebsite";
import WebsiteDetails from "../pages/Websites/WebsiteDetails";
import SecurityScan from "../pages/Scans/SecurityScan";
import ScanResults from "../pages/Scans/ScanResults";
import VulnerabilityDetails from "../pages/Scans/VulnerabilityDetails";
import ScanHistory from "../pages/Scans/ScanHistory";
import Vulnerabilities from "../pages/Vulnerabilities/Vulnerabilities";
import OWASP from "../pages/OWASP/OWASP";
import Reports from "../pages/Reports/Reports";
import Settings from "../pages/Settings/Settings";
import SecurityAnalytics from "../pages/Analytics/SecurityAnalytics";
import Notifications from "../pages/Notifications/Notifications";
import Subscription from "../pages/Subscription/Subscription";
import Scans from "../pages/Scans/Scans";
import SecurityRoadmap from "../pages/Roadmap/SecurityRoadmap";
import AISecurityAssistant from "../pages/AISecurityAssistant/AISecurityAssistant";
import LandingPage from "../pages/Landing/Home"

import TermsConditions from '../pages/Legal/TermsConditions'
import PrivacyPolicy from '../pages/Legal/PrivacyPolicy'

const AppRoutes = () => {
  return (
    <Routes>
      {/* =====================================================
          PUBLIC WEBSITE
      ===================================================== */}

      <Route path="/" element={<LandingPage />} />
      <Route path="/terms" element={<TermsConditions />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />

      {/* ==================== AUTHENTICATION ==================== */}
      <Route element={<AuthLayout />}>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
      </Route>

      {/* ==================== DASHBOARD ==================== */}
      <Route element={<AppLayout />}>
        <Route index path="/dashboard" element={<Home />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="/websites" element={<Websites />} />
        <Route path="/websites/add" element={<AddWebsite />} />
        <Route path="/websites/:id" element={<WebsiteDetails />} />
        <Route path="/websites/:id/scan" element={<SecurityScan />} />
        <Route path="/websites/:id/scan/results" element={<ScanResults />} />
        <Route
          path="/scans/:id/vulnerabilities/:vulnerabilityId"
          element={<VulnerabilityDetails />}
        />
        <Route path="/scan-history" element={<ScanHistory />} />
        <Route path="/vulnerabilities" element={<Vulnerabilities />} />
        <Route path="/owasp" element={<OWASP />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/analytics" element={<SecurityAnalytics />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/subscription" element={<Subscription />} />
        <Route path="/scans" element={<Scans />} />
        <Route path="/roadmap" element={<SecurityRoadmap />} />
        <Route path="/ai-assistant" element={<AISecurityAssistant />} />
      </Route>

      {/* ==================== 404 ==================== */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
