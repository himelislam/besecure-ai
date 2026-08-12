import { useEffect } from "react";
import { BrowserRouter } from "react-router";
import { ScrollToTop } from "./components/common/ScrollToTop";
import AppRoutes from "./routes/AppRoutes";
import { useAuth, initializeAuth } from "./hooks/useAuth";

function App() {
  const { isBootstrapping } = useAuth();

  // Access tokens live in memory only, so a hard reload loses them —
  // silently retry via the httpOnly refresh cookie before rendering routes,
  // so a still-valid session doesn't briefly flash as "signed out".
  useEffect(() => {
    initializeAuth();
  }, []);

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-900">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-500" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <ScrollToTop />
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
