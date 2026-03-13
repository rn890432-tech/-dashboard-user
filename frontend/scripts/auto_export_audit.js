// Script to auto-export audit log as CSV

import axios from 'axios';
import { writeFileSync } from 'fs';

const API_BASE = 'http://localhost:8000/redteam';

async function exportAuditLogCSV() {
  const resp = await axios.get(`${API_BASE}/audit`);
  const logs = resp.data;
  const csv = [
    'timestamp,action,user,details',
    ...logs.map(log => `${log.timestamp},${log.action},${log.user},${JSON.stringify(log.details)}`)
  ].join('\n');
  writeFileSync('audit_log_export.csv', csv);
  console.log(`Exported ${logs.length} audit log entries to audit_log_export.csv.`);
}

exportAuditLogCSV();
