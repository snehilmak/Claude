import { useEffect, useState } from "react";
import { checkForUpdate, installUpdate, type UpdateInfo } from "../system";

const SNOOZE_KEY = "loanledger.update.snoozedVersion";

/**
 * On startup, quietly asks GitHub whether a newer release exists. If so it
 * shows a non-blocking banner letting the user update now or postpone. A
 * postponed version stays snoozed until an even newer one ships.
 */
export function UpdateBanner({ showToast }: { showToast: (m: string) => void }) {
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [installing, setInstalling] = useState(false);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    checkForUpdate()
      .then((res) => {
        if (!res.available || !res.version) return;
        if (localStorage.getItem(SNOOZE_KEY) === res.version) return;
        setInfo(res);
      })
      .catch(() => {
        // Offline or running outside Tauri — nothing to do.
      });
  }, []);

  if (!info?.available) return null;

  async function doInstall() {
    setInstalling(true);
    try {
      await installUpdate((downloaded, total) => {
        if (total) setPct(Math.round((downloaded / total) * 100));
      });
      // On success the app relaunches, so we won't usually reach here.
    } catch (e) {
      setInstalling(false);
      showToast(`Update failed: ${e}`);
    }
  }

  function postpone() {
    if (info?.version) localStorage.setItem(SNOOZE_KEY, info.version);
    setInfo(null);
  }

  return (
    <div className="update-banner">
      <h4>Update available — v{info.version}</h4>
      {info.notes && <div className="notes">{info.notes}</div>}
      {installing ? (
        <>
          <div className="muted">Downloading… {pct}%</div>
          <div className="progress">
            <div style={{ width: `${pct}%` }} />
          </div>
        </>
      ) : (
        <div className="actions">
          <button className="btn small" onClick={doInstall}>
            Update now
          </button>
          <button className="btn small secondary" onClick={postpone}>
            Later
          </button>
        </div>
      )}
    </div>
  );
}
