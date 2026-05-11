import { useEffect, useState } from "react";
import { AppShell } from "./components/AppShell";
import { Dashboard } from "./components/Dashboard";
import { LandingPage } from "./components/LandingPage";

type Page = "home" | "dashboard";

const getPageFromPath = (): Page => (window.location.pathname === "/dashboard" ? "dashboard" : "home");

export function App() {
  const [page, setPage] = useState<Page>(getPageFromPath);

  useEffect(() => {
    const handlePopState = () => setPage(getPageFromPath());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (nextPage: Page) => {
    const nextPath = nextPage === "dashboard" ? "/dashboard" : "/";
    window.history.pushState({}, "", nextPath);
    setPage(nextPage);
  };

  if (page === "home") {
    return <LandingPage onOpenDashboard={() => navigate("dashboard")} />;
  }

  return (
    <AppShell onNavigateHome={() => navigate("home")} onNavigateDashboard={() => navigate("dashboard")}>
      <Dashboard />
    </AppShell>
  );
}
