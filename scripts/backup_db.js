const fs = require("fs");
const path = require("path");

function runBackup() {
  const dbPath = path.join(__dirname, "../data/lotto.db");
  const backupsDir = path.join(__dirname, "../data/backups");

  console.log(`[Backup] Starting database backup utility...`);

  // Check if source DB exists
  if (!fs.existsSync(dbPath)) {
    console.error(`[Error] Source database file not found at: ${dbPath}`);
    process.exit(1);
  }

  // Ensure backups directory exists
  if (!fs.existsSync(backupsDir)) {
    console.log(`[Backup] Creating backups directory at: ${backupsDir}`);
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  // Generate timestamp
  const date = new Date();
  const timestamp = date.toISOString()
    .replace(/T/, "_")
    .replace(/:/g, "-")
    .split(".")[0]; // YYYY-MM-DD_HH-MM-SS

  const backupFileName = `lotto_backup_${timestamp}.db`;
  const backupPath = path.join(backupsDir, backupFileName);

  try {
    // Copy the database file
    fs.copyFileSync(dbPath, backupPath);
    
    // Get file size
    const stats = fs.statSync(backupPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`[Success] Database backup completed!`);
    console.log(`[File]: ${backupPath}`);
    console.log(`[Size]: ${sizeMB} MB`);
  } catch (err) {
    console.error(`[Error] Failed to copy database file:`, err);
    process.exit(1);
  }
}

runBackup();
