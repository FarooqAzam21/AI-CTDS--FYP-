import React, { useEffect, useState } from 'react';
import axios from 'axios';

import API_BASE from '../config/api';

const MonitoringCenterPage = () => {
  const [snapshot, setSnapshot] = useState(null);
  const [scanningUrl, setScanningUrl] = useState(null);
  const [scanResults, setScanResults] = useState({});

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get(`${API_BASE}/monitoring`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setSnapshot(res.data))
      .catch(() => setSnapshot({ counts: { alerts: 0, scans: 0, users: 0 }, metrics: { counters: {} }, detected_integrations: [] }));
  }, []);

  const scanWebsite = async (websiteUrl) => {
    setScanningUrl(websiteUrl);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE}/agent/analyze`,
        { type: 'url', data: websiteUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setScanResults((results) => ({ ...results, [websiteUrl]: response.data.agent_verdict }));
    } catch (error) {
      setScanResults((results) => ({ ...results, [websiteUrl]: { label: 'SCAN FAILED' } }));
    } finally {
      setScanningUrl(null);
    }
  };

  return (
    <div style={{ color: '#f8fafc', padding: 24 }}>
      <h2>Monitoring Center</h2>
      <p style={{ color: '#94a3b8' }}>Operational telemetry for the production security platform.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginTop: 16 }}>
        <div className="glass-card" style={{ padding: 20 }}><strong>Alerts</strong><div style={{ fontSize: 28 }}>{snapshot?.counts?.alerts ?? 0}</div></div>
        <div className="glass-card" style={{ padding: 20 }}><strong>Scans</strong><div style={{ fontSize: 28 }}>{snapshot?.counts?.scans ?? 0}</div></div>
        <div className="glass-card" style={{ padding: 20 }}><strong>Users</strong><div style={{ fontSize: 28 }}>{snapshot?.counts?.users ?? 0}</div></div>
      </div>
      <div className="glass-card" style={{ padding: 20, marginTop: 16 }}>
        <h3>Detected API Integrations</h3>
        <p style={{ color: '#94a3b8', fontSize: 13 }}>
          Websites are discovered automatically from browser Origin or Referer headers when they call the API.
        </p>
        {(snapshot?.detected_integrations || []).length === 0 ? (
          <p style={{ color: '#94a3b8' }}>No browser website has called an API key yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {snapshot.detected_integrations.map((integration) => {
              const result = scanResults[integration.website_url];
              return (
                <div key={integration.api_key_id} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', padding: 12, border: '1px solid rgba(255,255,255,.08)', borderRadius: 10 }}>
                  <div>
                    <strong>{integration.website_url}</strong>
                    <div style={{ color: '#94a3b8', fontSize: 12 }}>Credential: {integration.api_key_label} · Last detected: {integration.last_detected_at ? new Date(integration.last_detected_at).toLocaleString() : '—'}</div>
                    {result && <div style={{ color: result.label === 'SCAN FAILED' ? '#fb7185' : '#34d399', fontSize: 12, marginTop: 4 }}>Scan: {result.label}{result.score !== undefined ? ` (${result.score}/100)` : ''}</div>}
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => scanWebsite(integration.website_url)} disabled={scanningUrl === integration.website_url}>
                    {scanningUrl === integration.website_url ? 'Scanning…' : 'Scan website'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="glass-card" style={{ padding: 20, marginTop: 16 }}>
        <h3>Live Metrics</h3>
        <pre style={{ whiteSpace: 'pre-wrap', color: '#cbd5e1' }}>{JSON.stringify(snapshot?.metrics ?? {}, null, 2)}</pre>
      </div>
    </div>
  );
};

export default MonitoringCenterPage;
