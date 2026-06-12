// Helpers that bridge to native capabilities: update checks and local backups.

import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";

export interface UpdateInfo {
  available: boolean;
  version?: string;
  notes?: string;
  date?: string;
}

/**
 * Ask GitHub (via the configured updater endpoint) whether a newer release
 * exists. Does not install anything — that's a separate, user-confirmed step.
 */
export async function checkForUpdate(): Promise<UpdateInfo> {
  const update = await check();
  if (!update) return { available: false };
  return {
    available: true,
    version: update.version,
    notes: update.body ?? undefined,
    date: update.date ?? undefined,
  };
}

/**
 * Download and install the pending update, reporting progress, then relaunch
 * into the new version. Throws if no update is available.
 */
export async function installUpdate(
  onProgress?: (downloaded: number, total: number | null) => void
): Promise<void> {
  const update = await check();
  if (!update) throw new Error("No update available");

  let downloaded = 0;
  let total: number | null = null;
  await update.downloadAndInstall((event) => {
    switch (event.event) {
      case "Started":
        total = event.data.contentLength ?? null;
        break;
      case "Progress":
        downloaded += event.data.chunkLength;
        onProgress?.(downloaded, total);
        break;
      case "Finished":
        onProgress?.(total ?? downloaded, total);
        break;
    }
  });
  await relaunch();
}

export function appVersion(): Promise<string> {
  return getVersion();
}

/** Absolute path of the live SQLite database, shown in Settings. */
export function databasePath(): Promise<string> {
  return invoke<string>("db_path");
}

/**
 * Let the user pick a destination and copy the database there. Returns the
 * chosen path, or null if they cancelled the save dialog.
 */
export async function backupDatabase(): Promise<string | null> {
  const stamp = new Date().toISOString().slice(0, 10);
  const dest = await save({
    title: "Save LoanLedger backup",
    defaultPath: `loanledger-backup-${stamp}.db`,
    filters: [{ name: "SQLite database", extensions: ["db"] }],
  });
  if (!dest) return null;
  await invoke("backup_db", { dest });
  return dest;
}

/**
 * Keep a rolling local snapshot in the app's backups folder. Called on
 * startup; the Rust side prunes to the most recent few.
 */
export function autoBackup(): Promise<string> {
  return invoke<string>("auto_backup");
}
