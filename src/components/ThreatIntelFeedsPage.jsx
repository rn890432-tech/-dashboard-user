import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

// ─── helpers ────────────────────────────────────────────────────────────────
const fmt = (v) =>
  v ? new Date(v).toLocaleString() : '—';

const badge = (score) => {
  const s = Number(score);
  const color =
    s >= 0.85 ? '#ff4444' : s >= 0.65 ? '#ffaa00' : '#00ccff';
  return (
    <span
      style={{
        background: color,
        color: '#000',
        borderRadius: 3,
        padding: '1px 6px',
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {(s * 100).toFixed(0)}%
    </span>
  );
};

// ─── sub-components ──────────────────────────────────────────────────────────
function FeedSourceRow({ feed, onToggle }) {
  return (
    <tr style={{ borderBottom: '1px solid #1a2a1a' }}>
      <td style={{ padding: '6px 8px' }}>{feed.name}</td>
      <td style={{ padding: '6px 8px', color: '#aaa' }}>{feed.indicator_type || '—'}</td>
      <td style={{ padding: '6px 8px' }}>{badge(feed.reliability)}</td>
      <td style={{ padding: '6px 8px' }}>
        <span style={{ color: feed.is_enabled ? '#00ff88' : '#ff4444' }}>
          {feed.is_enabled ? 'Enabled' : 'Disabled'}
        </span>
      </td>
      <td style={{ padding: '6px 8px', color: '#aaa', fontSize: 11 }}>
        {feed.last_status || '—'}
      </td>
      <td style={{ padding: '6px 8px', fontSize: 11, color: '#888' }}>
        {fmt(feed.last_run_at)}
      </td>
      <td style={{ padding: '6px 8px', fontSize: 10, color: '#557755', maxWidth: 220, wordBreak: 'break-all' }}>
        {feed.feed_url
          ? <a href={feed.feed_url} target="_blank" rel="noopener noreferrer" style={{ color: '#00aa55' }}>{feed.feed_url.slice(0, 60)}{feed.feed_url.length > 60 ? '…' : ''}</a>
          : <span style={{ color: '#333' }}>built-in</span>}
      </td>
    </tr>
  );
}

function IndicatorRow({ ind }) {
  const typeColor = {
    ip: '#00cfff',
    domain: '#ffaa00',
    hash: '#cc88ff',
    url: '#00ff88',
  };
  return (
    <tr style={{ borderBottom: '1px solid #0e1e0e' }}>
      <td
        style={{
          padding: '5px 8px',
          color: typeColor[ind.type] || '#eee',
          fontWeight: 700,
          fontSize: 11,
        }}
      >
        {ind.type?.toUpperCase()}
      </td>
      <td
        style={{
          padding: '5px 8px',
          fontFamily: 'monospace',
          fontSize: 12,
          wordBreak: 'break-all',
          maxWidth: 300,
        }}
      >
        {ind.value}
      </td>
      <td style={{ padding: '5px 8px', fontSize: 11, color: '#aaa' }}>
        {ind.source}
      </td>
      <td style={{ padding: '5px 8px' }}>{badge(ind.confidence_score)}</td>
      <td style={{ padding: '5px 8px', fontSize: 11, color: '#888' }}>
        {fmt(ind.last_seen)}
      </td>
    </tr>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function ThreatIntelFeedsPage() {
  const { getHeaders } = useAuth();
  const [feeds, setFeeds] = useState([]);
  const [indicators, setIndicators] = useState([]);
  const [indTotal, setIndTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState('');
  const [indPage, setIndPage] = useState(0);
  const PAGE_SIZE = 50;

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const [importUrl, setImportUrl] = useState('');
  const [importFormat, setImportFormat] = useState('txt');
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── fetch feeds ────────────────────────────────────────────────────────────
  const loadFeeds = useCallback(() => {
    fetch(`${API_BASE}/api/threat-intel/feeds`, { headers: getHeaders() })
      .then((r) => r.json())
      .then(setFeeds)
      .catch(() => {});
  }, [getHeaders]);

  // ── fetch indicators ───────────────────────────────────────────────────────
  const loadIndicators = useCallback(() => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({
      limit: PAGE_SIZE,
      offset: indPage * PAGE_SIZE,
    });
    if (typeFilter) params.set('indicator_type', typeFilter);
    fetch(`${API_BASE}/api/threat-intel/indicators?${params}`, { headers: getHeaders() })
      .then((r) => r.json())
      .then((d) => {
        setIndicators(d.indicators || []);
        setIndTotal(d.total || 0);
      })
      .catch((e) => setError(`Indicator load error: ${e.message}`))
      .finally(() => setLoading(false));
  }, [indPage, typeFilter, getHeaders]);

  useEffect(() => {
    loadFeeds();
  }, [loadFeeds]);

  useEffect(() => {
    loadIndicators();
  }, [loadIndicators]);

  // ── search ─────────────────────────────────────────────────────────────────
  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults(null);
    fetch(
      `${API_BASE}/api/threat-intel/search?indicator=${encodeURIComponent(
        searchQuery.trim()
      )}&limit=100`,
      { headers: getHeaders() }
    )
      .then((r) => r.json())
      .then((d) => setSearchResults(d))
      .catch((err) => setError(`Search error: ${err.message}`))
      .finally(() => setSearching(false));
  };

  // ── import from URL ────────────────────────────────────────────────────────
  const handleImport = (e) => {
    e.preventDefault();
    if (!importUrl.trim()) return;
    setImporting(true);
    setImportMsg('');
    setError('');
    fetch(`${API_BASE}/api/threat-intel/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify({
        feed_url: importUrl.trim(),
        feed_format: importFormat,
        actors: [],
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d?.detail) {
          setError(d.detail);
        } else {
          setImportMsg(
            `Imported: ${d.actors} actors, ${d.indicators} indicators` +
              (d.errors?.length ? ` | Warnings: ${d.errors.join(', ')}` : '')
          );
          setImportUrl('');
          loadIndicators();
          loadFeeds();
        }
      })
      .catch((err) => setError(`Import failed: ${err.message}`))
      .finally(() => setImporting(false));
  };

  // ── pagination ─────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(indTotal / PAGE_SIZE);
  const topCount = useMemo(() => {
    const counts = {};
    indicators.forEach((i) => {
      counts[i.type] = (counts[i.type] || 0) + 1;
    });
    return counts;
  }, [indicators]);

  // ── styles ─────────────────────────────────────────────────────────────────
  const panelStyle = {
    background: '#050e05',
    color: '#c8f5c8',
    minHeight: '100vh',
    fontFamily: 'monospace',
    padding: 24,
  };
  const cardStyle = {
    background: '#071407',
    border: '1px solid #1a3a1a',
    borderRadius: 6,
    padding: 16,
    marginBottom: 20,
  };
  const hStyle = {
    color: '#00ff88',
    marginTop: 0,
    marginBottom: 12,
    fontSize: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
  };
  const inputStyle = {
    background: '#0a1a0a',
    border: '1px solid #1a4a1a',
    color: '#c8f5c8',
    padding: '6px 10px',
    borderRadius: 4,
    fontFamily: 'monospace',
    fontSize: 12,
  };
  const btnStyle = (color = '#00aa55') => ({
    background: color,
    color: '#000',
    border: 'none',
    borderRadius: 4,
    padding: '7px 14px',
    cursor: 'pointer',
    fontWeight: 700,
    fontFamily: 'monospace',
    fontSize: 12,
  });
  const thStyle = {
    padding: '6px 8px',
    textAlign: 'left',
    color: '#00ff88',
    fontSize: 11,
    textTransform: 'uppercase',
    borderBottom: '1px solid #1a4a1a',
  };

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ color: '#00ff88', fontSize: 20, margin: 0 }}>
          ◈ Threat Intelligence Feeds
        </h1>
        <p style={{ color: '#558855', fontSize: 12, margin: '4px 0 0' }}>
          Live indicator database · {indTotal.toLocaleString()} total indicators ·{' '}
          {feeds.length} configured sources
        </p>
      </div>

      {error && (
        <div
          style={{
            background: '#1a0505',
            border: '1px solid #aa2222',
            borderRadius: 4,
            padding: '8px 12px',
            marginBottom: 14,
            color: '#ff8888',
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      {/* Import from URL */}
      <div style={cardStyle}>
        <h3 style={hStyle}>↓ Ingest External Feed</h3>
        <form
          onSubmit={handleImport}
          style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}
        >
          <input
            style={{ ...inputStyle, flex: '1 1 320px' }}
            type="text"
            placeholder="https://feeds.example.com/iocs.txt"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            disabled={importing}
          />
          <select
            style={inputStyle}
            value={importFormat}
            onChange={(e) => setImportFormat(e.target.value)}
            disabled={importing}
          >
            <option value="txt">TXT (one per line)</option>
            <option value="csv">CSV (type,value,confidence)</option>
            <option value="stix">STIX 2.x JSON</option>
          </select>
          <button type="submit" style={btnStyle()} disabled={importing || !importUrl.trim()}>
            {importing ? 'Importing…' : 'Import Feed'}
          </button>
        </form>
        {importMsg && (
          <div style={{ color: '#00ff88', fontSize: 12, marginTop: 8 }}>{importMsg}</div>
        )}
      </div>

      {/* Search */}
      <div style={cardStyle}>
        <h3 style={hStyle}>⌕ Search Indicators &amp; Threat Actors</h3>
        <form
          onSubmit={handleSearch}
          style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}
        >
          <input
            style={{ ...inputStyle, flex: '1 1 260px' }}
            type="text"
            placeholder="IP, domain, hash, URL, actor name…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={searching}
          />
          <button type="submit" style={btnStyle('#0077cc')} disabled={searching || !searchQuery.trim()}>
            {searching ? 'Searching…' : 'Search'}
          </button>
          {searchResults && (
            <button
              type="button"
              style={btnStyle('#444')}
              onClick={() => { setSearchResults(null); setSearchQuery(''); }}
            >
              Clear
            </button>
          )}
        </form>

        {searchResults && (
          <div style={{ marginTop: 14 }}>
            <p style={{ color: '#aaa', fontSize: 12, margin: '0 0 8px' }}>
              {searchResults.total_indicators} indicator(s) · {searchResults.total_actors} actor(s)
            </p>
            {searchResults.indicators.length > 0 && (
              <>
                <p style={{ color: '#00ff88', fontSize: 11, margin: '8px 0 4px' }}>INDICATORS</p>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr>
                        {['Type', 'Value', 'Source', 'Confidence', 'Last Seen'].map((h) => (
                          <th key={h} style={thStyle}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {searchResults.indicators.map((ind, i) => (
                        <IndicatorRow key={i} ind={ind} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {searchResults.threat_actors.length > 0 && (
              <>
                <p style={{ color: '#ffaa00', fontSize: 11, margin: '14px 0 4px' }}>THREAT ACTORS</p>
                {searchResults.threat_actors.map((a) => (
                  <div
                    key={a.actor_id}
                    style={{
                      background: '#0a1a08',
                      border: '1px solid #1a3a0a',
                      borderRadius: 4,
                      padding: '8px 12px',
                      marginBottom: 6,
                      fontSize: 12,
                    }}
                  >
                    <strong style={{ color: '#ffcc44' }}>{a.actor_name}</strong>
                    {a.known_ips?.length > 0 && (
                      <span style={{ color: '#888', marginLeft: 10 }}>
                        IPs: {a.known_ips.slice(0, 5).join(', ')}
                        {a.known_ips.length > 5 ? ` +${a.known_ips.length - 5}` : ''}
                      </span>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Feed sources */}
      <div style={cardStyle}>
        <h3 style={hStyle}>◉ Configured Feed Sources</h3>
        {feeds.length === 0 ? (
          <p style={{ color: '#558855', fontSize: 12 }}>No feed sources configured.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {['Name', 'Type', 'Reliability', 'Status', 'Last Status', 'Last Run'].map(
                    (h) => (
                      <th key={h} style={thStyle}>
                        {h}
                      </th>
                    )
                  )}
                  <th style={thStyle}>Feed URL</th>
                </tr>
              </thead>
              <tbody>
                {feeds.map((f) => (
                  <FeedSourceRow key={f.id} feed={f} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Indicator table */}
      <div style={cardStyle}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
            marginBottom: 10,
          }}
        >
          <h3 style={{ ...hStyle, margin: 0 }}>◈ Indicator Database</h3>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['', 'ip', 'domain', 'hash', 'url'].map((t) => (
              <button
                key={t || 'all'}
                style={{
                  ...btnStyle(typeFilter === t ? '#00ff88' : '#1a3a1a'),
                  color: typeFilter === t ? '#000' : '#00ff88',
                  padding: '4px 10px',
                  fontSize: 11,
                }}
                onClick={() => { setTypeFilter(t); setIndPage(0); }}
              >
                {t ? t.toUpperCase() : 'ALL'}
                {t && topCount[t] !== undefined ? ` (${topCount[t]})` : ''}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p style={{ color: '#558855', fontSize: 12 }}>Loading…</p>
        ) : indicators.length === 0 ? (
          <p style={{ color: '#558855', fontSize: 12 }}>No indicators yet. Import a feed above.</p>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    {['Type', 'Value', 'Source', 'Confidence', 'Last Seen'].map((h) => (
                      <th key={h} style={thStyle}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {indicators.map((ind, i) => (
                    <IndicatorRow key={i} ind={ind} />
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  marginTop: 10,
                  fontSize: 12,
                }}
              >
                <button
                  style={btnStyle('#1a3a1a')}
                  disabled={indPage === 0}
                  onClick={() => setIndPage((p) => p - 1)}
                >
                  ← Prev
                </button>
                <span style={{ color: '#aaa' }}>
                  Page {indPage + 1} / {totalPages} &nbsp;·&nbsp;{' '}
                  {indTotal.toLocaleString()} total
                </span>
                <button
                  style={btnStyle('#1a3a1a')}
                  disabled={indPage >= totalPages - 1}
                  onClick={() => setIndPage((p) => p + 1)}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
