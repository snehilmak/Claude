import { useCallback, useEffect, useState } from "react";
import Dashboard from "./pages/Dashboard";
import Loans from "./pages/Loans";
import Settings from "./pages/Settings";
import { UpdateBanner } from "./components/UpdateBanner";
import { appVersion, autoBackup } from "./system";

type Tab = "dashboard" | "loans" | "settings";

export default function App() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [version, setVersion] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  // Bumping this tells the data pages to reload.
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => {
    appVersion().then(setVersion).catch(() => {});
    // Take a rolling local snapshot at startup; failures are non-fatal
    // (e.g. when running the web dev server outside Tauri).
    autoBackup().catch(() => {});
  }, []);

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="brand">
          Loan<span>Ledger</span>
        </div>
        <button
          className={`nav-item ${tab === "dashboard" ? "active" : ""}`}
          onClick={() => setTab("dashboard")}
        >
          Dashboard
        </button>
        <button
          className={`nav-item ${tab === "loans" ? "active" : ""}`}
          onClick={() => setTab("loans")}
        >
          Loans
        </button>
        <button
          className={`nav-item ${tab === "settings" ? "active" : ""}`}
          onClick={() => setTab("settings")}
        >
          Settings
        </button>
        <div className="sidebar-footer">v{version || "—"}</div>
      </nav>

      <main className="content">
        {tab === "dashboard" && (
          <Dashboard refreshKey={refreshKey} onOpenLoans={() => setTab("loans")} />
        )}
        {tab === "loans" && (
          <Loans refreshKey={refreshKey} onChange={refresh} showToast={showToast} />
        )}
        {tab === "settings" && <Settings version={version} showToast={showToast} />}
      </main>

      <UpdateBanner showToast={showToast} />
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
