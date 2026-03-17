import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const RISK_COLOR = { low: '#44cc88', moderate: '#ffcc00', high: '#ff8800', critical: '#ff4444' };

function RiskGauge({ score, level }) {
  const color = RISK_COLOR[level] || '#888';
  const pct = Math.min(100, Math.max(0, score));
  return (
    <div style={{ textAlign: 'center', padding: '24px 0' }}>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <svg width={180} height={100} viewBox="0 0 180 100">
          <path d="M 10 90 A 80 80 0 0 1 170 90" fill="none" stroke="#1e3a5a" strokeWidth={16} strokeLinecap="round" />
          <path
            d="M 10 90 A 80 80 0 0 1 170 90"
            fill="none" stroke={color} strokeWidth={16} strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * 251} 251`}
          />
        </svg>
        <div style={{ position: 'absolute', bottom: 4, left: 0, right: 0, textAlign: 'center' }}>
          <div style={{ fontSize: 36, fontWeight: 900, color, fontFamily: 'monospace' }}>{score}</div>
          <div style={{ fontSize: 12, color: color + 'cc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2 }}>{level}</div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, color }) {
  return (
    <div style={{ background: '#0a1526', border: `1px solid ${color || '#1e3a5a'}33`, borderRadius: 8, padding: '16px 20px', flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 11, color: '#6699aa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: color || '#7ec8e3', fontFamily: 'monospace' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#4a6a7a', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function TrendBar({ items, maxVal, color }) {
  const max = maxVal || Math.max(1, ...items.map(i => i.risk_score || 0));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 60 }}>
      {items.map((item, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            style={{
              width: '100%', borderRadius: '2px 2px 0 0',
              height: `${Math.round(((item.risk_score || 0) / max) * 100)}%`,
              background: color || '#4488ff', minHeight: 2,
              transition: 'height 0.3s',
            }}
          />
        </div>
      ))}
    </div>
  );
}

export default function ExecutiveRiskDashboardPage() {
  const { user, getHeaders } = useAuth();
  const orgId = user?.orgId || 'org_default';

  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchSnapshot = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/risk/${encodeURIComponent(orgId)}/snapshot`, { headers: getHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSnapshot(data);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch { /* silent */ } finally { setLoading(false); }
  }, [orgId, getHeaders]);

  useEffect(() => { fetchSnapshot(); }, [fetchSnapshot]);

  useEffect(() => {
    const id = setInterval(fetchSnapshot, 60_000);
    return () => clearInterval(id);
  }, [fetchSnapshot]);

  if (loading && !snapshot) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0e1a', color: '#7ec8e3', fontFamily: 'monospace' }}>
        Loading risk snapshot...
      </div>
    );
  }

  if (!snapshot) return null;

  const { overall_risk_score, risk_level, summary, business_impact, incident_status, threat_landscape, alert_metrics, risk_trend } = snapshot;
  const riskColor = RISK_COLOR[risk_level] || '#888';

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e1a', color: '#c8d8e8', fontFamily: 'monospace', padding: 28 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#7ec8e3', letterSpacing: 1 }}>
            EXECUTIVE CYBER RISK DASHBOARD
          </h1>
          <div style={{ fontSize: 12, color: '#4a6a7a', marginTop: 4 }}>
            Organization: <span style={{ color: '#7ec8e3' }}>{orgId}</span>
            {lastRefresh && <span style={{ marginLeft: 16 }}>Last updated: {lastRefresh}</span>}
          </div>
        </div>
        <button
          onClick={fetchSnapshot}
          disabled={loading}
          style={{ padding: '6px 16px', background: '#0d1e36', border: '1px solid #1e3a5a', borderRadius: 6, color: '#7ec8e3', cursor: 'pointer', fontSize: 12 }}
        >{loading ? 'Refreshing...' : '↻ Refresh'}</button>
      </div>

      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Gauge */}
        <div style={{ background: '#0a1526', border: `1px solid ${riskColor}44`, borderRadius: 10, padding: 24, minWidth: 220 }}>
          <div style={{ fontSize: 12, color: '#6699aa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Overall Risk Score</div>
          <RiskGauge score={overall_risk_score} level={risk_level} />
          <div style={{ fontSize: 12, color: '#8aaabb', lineHeight: 1.6, marginTop: 8 }}>{summary}</div>
        </div>

        {/* KPIs */}
        <div style={{ flex: 1, minWidth: 340 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            <KpiCard label="Open Incidents" value={incident_status?.open_incidents ?? 0} sub="Active investigation load" color="#ff8800" />
            <KpiCard label="Resolved Incidents" value={incident_status?.resolved_incidents ?? 0} sub="This period" color="#44cc88" />
            <KpiCard label="MTTR (hrs)" value={incident_status?.average_response_time_hours ?? 'N/A'} sub="Mean time to respond" color="#4488ff" />
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <KpiCard label="Critical Threats" value={threat_landscape?.critical_threats ?? 0} color="#ff4444" />
            <KpiCard label="High Threats" value={threat_landscape?.high_threats ?? 0} color="#ff8800" />
            <KpiCard label="Unresolved Alerts" value={alert_metrics?.unresolved_alerts ?? 0} color="#ffcc00" />
          </div>
        </div>
      </div>

      {/* Business Impact */}
      {business_impact && (
        <div style={{ marginTop: 28, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ background: '#0a1526', border: '1px solid #1e3a5a', borderRadius: 10, padding: 20, flex: 1, minWidth: 240 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#7ec8e3', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Business Impact</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: '#8aaabb' }}>Breach Probability</span>
                <span style={{ color: '#ff8800', fontWeight: 700 }}>{((business_impact.data_breach_probability || 0) * 100).toFixed(1)}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: '#8aaabb' }}>Financial Risk Estimate</span>
                <span style={{ color: '#ff4444', fontWeight: 700 }}>${(business_impact.financial_risk_estimate || 0).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: '#8aaabb' }}>Critical Asset Exposure</span>
                <span style={{ color: '#ffcc00', fontWeight: 700 }}>{business_impact.critical_asset_exposure ?? 0} assets</span>
              </div>
            </div>
          </div>

          {business_impact.most_targeted_departments && (
            <div style={{ background: '#0a1526', border: '1px solid #1e3a5a', borderRadius: 10, padding: 20, flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#7ec8e3', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Most Targeted Departments</div>
              {business_impact.most_targeted_departments.map((d, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: '#8aaabb' }}>{d.name}</span>
                  <span style={{ color: '#ff8800', fontWeight: 700 }}>{d.count} events</span>
                </div>
              ))}
            </div>
          )}

          {alert_metrics?.severity_distribution && (
            <div style={{ background: '#0a1526', border: '1px solid #1e3a5a', borderRadius: 10, padding: 20, flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#7ec8e3', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Alert Severity Distribution</div>
              {Object.entries(alert_metrics.severity_distribution).map(([sev, count]) => {
                const sevColors = { CRITICAL: '#ff4444', HIGH: '#ff8800', MEDIUM: '#ffcc00', LOW: '#44cc88' };
                const total = Object.values(alert_metrics.severity_distribution).reduce((a, b) => a + b, 0);
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={sev} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                      <span style={{ color: sevColors[sev] || '#888' }}>{sev}</span>
                      <span style={{ color: '#888' }}>{count} ({pct}%)</span>
                    </div>
                    <div style={{ height: 4, background: '#1e3a5a', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: sevColors[sev] || '#888', borderRadius: 2, transition: 'width 0.4s' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Risk Trend */}
      {risk_trend && risk_trend.length > 0 && (
        <div style={{ marginTop: 28, background: '#0a1526', border: '1px solid #1e3a5a', borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#7ec8e3', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Risk Score Trend (Last 10 Periods)</div>
          <TrendBar items={risk_trend} color={riskColor} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#4a6a7a', marginTop: 4 }}>
            <span>Oldest</span><span>Most Recent</span>
          </div>
        </div>
      )}
    </div>
  );
}
