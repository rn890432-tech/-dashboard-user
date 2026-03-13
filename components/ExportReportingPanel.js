import React from 'react';
import jsPDF from 'jspdf';

function ExportReportingPanel({ alerts }) {
  const handleExportCSV = () => {
    const csv = alerts.map(a => `${a.timestamp},${a.type},${a.severity},${a.target_region}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'alerts.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Alert Report', 14, 18);
    alerts.slice(0, 30).forEach((a, idx) => {
      doc.text(`${a.timestamp} | ${a.type} | ${a.severity} | ${a.target_region}`, 14, 30 + idx * 8);
    });
    doc.save('alerts_report.pdf');
  };

  return (
    <div className="export-reporting-panel" style={{background:'#222',color:'#fff',padding:'16px',borderRadius:'8px',margin:'16px 0'}}>
      <h4>Export & Reporting</h4>
      <button onClick={handleExportCSV} style={{marginRight:'8px',padding:'6px 12px',background:'#2196f3',color:'#fff',border:'none',borderRadius:'6px'}}>Export CSV</button>
      <button onClick={handleExportPDF} style={{padding:'6px 12px',background:'#4caf50',color:'#fff',border:'none',borderRadius:'6px'}}>Export PDF</button>
    </div>
  );
}

export default ExportReportingPanel;
