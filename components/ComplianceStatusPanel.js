import React from 'react';

function ComplianceStatusPanel({ sbom }) {
  const compliant = sbom && sbom.every(dep => dep.vulnScore < 0.5);
  return (
    <div className="compliance-status-panel" style={{background:'#181f2a',color:'#fff',padding:'16px',borderRadius:'8px',margin:'16px 0'}}>
      <h4>Compliance Status</h4>
      <div>Status: <span style={{fontWeight:'bold',color:compliant?'#4caf50':'#ff0033'}}>{compliant?'COMPLIANT':'REVIEW REQUIRED'}</span></div>
      <div>Dependencies: {sbom ? sbom.length : 0}</div>
    </div>
  );
}

export default ComplianceStatusPanel;
