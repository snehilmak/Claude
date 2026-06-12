import { useEffect, useState } from "react";
import {
  databasePath,
  backupDatabase,
  checkForUpdate,
  installUpdate,
} from "../system";

interface Props {
  version: string;
  showToast: (m: string) => void;
}

export default function Settings({ version, showToast }: Props) {
  const [dbPath, setDbPath] = useState("");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    databasePath().then(setDbPath).catch(() => setDbPath("(unavailable in browser)"));
  }, []);

  async function doBackup() {
    try {
      const dest = await backupDatabase();
      if (dest) showToast(`Backup saved to ${dest}`);
    } catch (e) {
      showToast(`Backup failed: ${e}`);
    }
  }

  async function doCheckUpdate() {
    setChecking(true);
    try {
      const info = await checkForUpdate();
      if (!info.available) {
        showToast("You're on the latest version");
        return;
      }
      const ok = window.confirm(
        `Version ${info.version} is available. Install now? The app will restart.`
      );
      if (ok) await installUpdate();
    } catch (e) {
      showToast(`Update check failed: ${e}`);
    } finally {
      setChecking(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>Settings</h1>
      </div>

      <div className="section-title">Backup</div>
      <p className="muted">
        All your data lives in a single local SQLite file. LoanLedger also keeps
        rolling automatic snapshots each time it starts. Use the button below to
        export a copy you can store anywhere (USB drive, cloud folder, etc.).
      </p>
      <div className="kv" style={{ marginBottom: 14 }}>
        <div className="k">Database location</div>
        <div className="v" style={{ wordBreak: "break-all" }}>
          {dbPath || "—"}
        </div>
      </div>
      <button className="btn" onClick={doBackup}>
        Back up now…
      </button>

      <div className="section-title">Updates</div>
      <p className="muted">
        LoanLedger checks GitHub for new releases automatically on launch. You can
        also check manually here.
      </p>
      <button className="btn secondary" onClick={doCheckUpdate} disabled={checking}>
        {checking ? "Checking…" : "Check for updates"}
      </button>

      <div className="section-title">About</div>
      <div className="kv">
        <div className="k">Version</div>
        <div className="v">{version || "—"}</div>
      </div>
    </>
  );
}
