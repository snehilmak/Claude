use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

const DB_FILE: &str = "loanledger.db";
const MAX_AUTO_BACKUPS: usize = 10;

/// Absolute path to the live SQLite database, shown in Settings.
#[tauri::command]
fn db_path(app: tauri::AppHandle) -> Result<String, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    Ok(dir.join(DB_FILE).to_string_lossy().to_string())
}

/// Copy the database to a user-chosen destination.
#[tauri::command]
fn backup_db(app: tauri::AppHandle, dest: String) -> Result<(), String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    let src = dir.join(DB_FILE);
    std::fs::copy(&src, &dest).map_err(|e| e.to_string())?;
    Ok(())
}

/// Take a timestamped snapshot into <appconfig>/backups, keeping only the most
/// recent MAX_AUTO_BACKUPS. Returns the snapshot path (empty if no DB yet).
#[tauri::command]
fn auto_backup(app: tauri::AppHandle) -> Result<String, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    let src = dir.join(DB_FILE);
    if !src.exists() {
        return Ok(String::new());
    }
    let backups = dir.join("backups");
    std::fs::create_dir_all(&backups).map_err(|e| e.to_string())?;

    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let dest = backups.join(format!("loanledger-{stamp}.db"));
    std::fs::copy(&src, &dest).map_err(|e| e.to_string())?;

    prune_backups(&backups);
    Ok(dest.to_string_lossy().to_string())
}

/// Keep only the newest MAX_AUTO_BACKUPS snapshots; delete the rest.
fn prune_backups(dir: &std::path::Path) {
    let Ok(entries) = std::fs::read_dir(dir) else {
        return;
    };
    let mut files: Vec<_> = entries
        .flatten()
        .filter(|e| {
            e.file_name()
                .to_string_lossy()
                .starts_with("loanledger-")
        })
        .collect();
    if files.len() <= MAX_AUTO_BACKUPS {
        return;
    }
    // Sort newest first by modified time, then remove the overflow.
    files.sort_by_key(|e| {
        std::cmp::Reverse(
            e.metadata()
                .and_then(|m| m.modified())
                .unwrap_or(UNIX_EPOCH),
        )
    });
    for entry in files.into_iter().skip(MAX_AUTO_BACKUPS) {
        let _ = std::fs::remove_file(entry.path());
    }
}

/// Read a user-selected import file. Kept in Rust so the webview needs no
/// blanket filesystem permission — only this one command.
#[tauri::command]
fn read_import_file(path: String) -> Result<String, String> {
    const MAX_IMPORT_BYTES: u64 = 20 * 1024 * 1024;
    let meta = std::fs::metadata(&path).map_err(|e| e.to_string())?;
    if meta.len() > MAX_IMPORT_BYTES {
        return Err("Import file is too large (max 20 MB).".into());
    }
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create loans and payments tables",
            sql: r#"
            CREATE TABLE IF NOT EXISTS loans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                principal_original REAL NOT NULL,
                interest_rate REAL NOT NULL,
                interest_period TEXT NOT NULL DEFAULT 'weekly',
                start_date TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active',
                notes TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                loan_id INTEGER NOT NULL,
                date TEXT NOT NULL,
                interest_amount REAL NOT NULL DEFAULT 0,
                principal_amount REAL NOT NULL DEFAULT 0,
                note TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_payments_loan ON payments(loan_id);
        "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create ledger_entries table for the cash in/out ledger",
            sql: r#"
            CREATE TABLE IF NOT EXISTS ledger_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                name TEXT NOT NULL,
                direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
                amount REAL NOT NULL DEFAULT 0,
                note TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_ledger_name ON ledger_entries(name);
            CREATE INDEX IF NOT EXISTS idx_ledger_date ON ledger_entries(date);
        "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "add contact fields (phone, email) to loans",
            sql: r#"
            ALTER TABLE loans ADD COLUMN phone TEXT NOT NULL DEFAULT '';
            ALTER TABLE loans ADD COLUMN email TEXT NOT NULL DEFAULT '';
        "#,
            kind: MigrationKind::Up,
        },
    ]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(&format!("sqlite:{DB_FILE}"), migrations())
                .build(),
        )
        .plugin(tauri_plugin_dialog::init());

    #[cfg(desktop)]
    let builder = builder
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build());

    builder
        .invoke_handler(tauri::generate_handler![
            db_path,
            backup_db,
            auto_backup,
            read_import_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running LoanLedger");
}
