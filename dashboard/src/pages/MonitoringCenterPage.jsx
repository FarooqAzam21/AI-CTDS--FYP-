import React, { useEffect, useState } from 'react';
import axios from 'axios';

import API_BASE from '../config/api';

const MonitoringCenterPage = () => {
  const [snapshot, setSnapshot] = useState(null);
  const [scanningUrl, setScanningUrl] = useState(null);
  const [scanResults, setScanResults] = useState({});
  const [manualWebsiteUrl, setManualWebsiteUrl] = useState('');
  const [manualUrlError, setManualUrlError] = useState('');
  const [integrationDrafts, setIntegrationDrafts] = useState({});
  const [savingIntegration, setSavingIntegration] = useState(null);

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
      setSnapshot((current) => current ? {
        ...current,
        counts: {
          ...current.counts,
          scans: (current.counts?.scans || 0) + 1,
          manual_scans: (current.counts?.manual_scans || 0) + 1,
        },
      } : current);
    } catch (error) {
      setScanResults((results) => ({ ...results, [websiteUrl]: { label: 'SCAN FAILED' } }));
    } finally {
      setScanningUrl(null);
    }
  };

  const detectedIntegrations = snapshot?.detected_integrations || [];
  const apiClients = snapshot?.api_clients || [];
  const integrationDraft = (client) => integrationDrafts[client.api_key_id] || {
    websiteUrl: client.approved_website_url || '',
    schedule: client.website_monitoring_enabled ? (client.monitoring_interval_hours === 168 ? 'weekly' : 'daily') : 'off',
  };
  const updateIntegrationDraft = (client, field, value) => setIntegrationDrafts((drafts) => ({
    ...drafts,
    [client.api_key_id]: { ...integrationDraft(client), [field]: value },
  }));
  const saveIntegration = async (client) => {
    const draft = integrationDraft(client);
    setSavingIntegration(client.api_key_id);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE}/api-keys/${client.api_key_id}/website-monitoring`, {
        website_url: draft.websiteUrl, schedule: draft.schedule,
      }, { headers: { Authorization: `Bearer ${token}` } });
      window.location.reload();
    } catch (error) {
      setScanResults((results) => ({ ...results, [`integration-${client.api_key_id}`]: { label: 'SAVE FAILED' } }));
    } finally { setSavingIntegration(null); }
  };
  const scanApprovedWebsite = async (client) => {
    setSavingIntegration(client.api_key_id);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE}/api-keys/${client.api_key_id}/website-scan`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setScanResults((results) => ({ ...results, [`integration-${client.api_key_id}`]: response.data.agent_verdict }));
      window.location.reload();
    } catch (error) {
      setScanResults((results) => ({ ...results, [`integration-${client.api_key_id}`]: { label: 'SCAN FAILED' } }));
    } finally { setSavingIntegration(null); }
  };
  const startManualWebsiteScan = async () => {
    let parsedUrl;
    try {
      parsedUrl = new URL(manualWebsiteUrl.trim());
    } catch {
      setManualUrlError('Enter a complete website URL, for example https://example.com.');
      return;
    }
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      setManualUrlError('Only http and https website URLs can be scanned.');
      return;
    }
    setManualUrlError('');
    setManualWebsiteUrl(parsedUrl.href);
    await scanWebsite(parsedUrl.href);
  };
  const scanAllDetectedWebsites = async () => {
    for (const integration of detectedIntegrations) {
      // Scan sequentially to avoid overloading the API and preserve clear
      // per-site results in the Monitoring panel.
      await scanWebsite(integration.website_url);
    }
  };

  return (
    <div style={{ color: '#f8fafc', padding: 24 }}>
      <h2>Monitoring Center</h2>
      <p style={{ color: '#94a3b8' }}>Operational telemetry for the production security platform.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginTop: 16 }}>
        <div className="glass-card" style={{ padding: 20 }}><strong>Alerts</strong><div style={{ fontSize: 28 }}>{snapshot?.counts?.alerts ?? 0}</div></div>
        <div className="glass-card" style={{ padding: 20 }}><strong>Scans</strong><div style={{ fontSize: 28 }}>{snapshot?.counts?.scans ?? 0}</div><div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>{snapshot?.counts?.api_scans ?? 0} API scans · {snapshot?.counts?.manual_scans ?? 0} dashboard scans</div></div>
        <div className="glass-card" style={{ padding: 20 }}><strong>Users</strong><div style={{ fontSize: 28 }}>{snapshot?.counts?.users ?? 0}</div></div>
      </div>
      <div className="glass-card" style={{ padding: 20, marginTop: 16 }}>
        <h3>Connected API Clients</h3>
        <p style={{ color: '#94a3b8', fontSize: 13 }}>
          A recent successful request proves that the client is connected to CyberGuard. This works for Orvion server-to-server calls.
        </p>
        {apiClients.length === 0 ? (
          <p style={{ color: '#94a3b8' }}>No API credentials have been used yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {apiClients.map((client) => (
              <div key={client.api_key_id} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', padding: 12, border: '1px solid rgba(255,255,255,.08)', borderRadius: 10 }}>
                <div>
                  <strong>{client.label}</strong>
                  <div style={{ color: '#94a3b8', fontSize: 12 }}>Last request: {client.last_used ? new Date(client.last_used).toLocaleString() : 'Never'} · IP: {client.last_used_ip || '—'} · API scans: {client.successful_requests}</div>
                </div>
                <span style={{ color: client.successful_requests > 0 ? '#34d399' : '#94a3b8', fontSize: 13, fontWeight: 700 }}>
                  {client.successful_requests > 0 ? `Connected · ${client.successful_requests} successful request${client.successful_requests === 1 ? '' : 's'}` : 'Not connected yet'}
                </span>
                <div style={{ flexBasis: '100%', display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) 130px auto auto', gap: 8, alignItems: 'center' }}>
                  <input value={integrationDraft(client).websiteUrl} onChange={(event) => updateIntegrationDraft(client, 'websiteUrl', event.target.value)} placeholder="Approved website URL" aria-label={`Approved website URL for ${client.label}`} style={{ minWidth: 0, borderRadius: 7, border: '1px solid rgba(255,255,255,.15)', padding: '8px 10px', background: '#111827', color: '#f8fafc' }} />
                  <select value={integrationDraft(client).schedule} onChange={(event) => updateIntegrationDraft(client, 'schedule', event.target.value)} style={{ borderRadius: 7, padding: '8px', background: '#111827', color: '#f8fafc' }}>
                    <option value="off">Manual only</option><option value="daily">Daily</option><option value="weekly">Weekly</option>
                  </select>
                  <button className="btn btn-primary btn-sm" onClick={() => saveIntegration(client)} disabled={savingIntegration === client.api_key_id || !integrationDraft(client).websiteUrl.trim()}>{savingIntegration === client.api_key_id ? 'Saving…' : 'Approve'}</button>
                  <button className="btn btn-primary btn-sm" onClick={() => scanApprovedWebsite(client)} disabled={savingIntegration === client.api_key_id || !client.approved_website_url}>{savingIntegration === client.api_key_id ? 'Scanning…' : 'Scan now'}</button>
                </div>
                <div style={{ flexBasis: '100%', color: '#94a3b8', fontSize: 12 }}>
                  Last website scan: {client.last_website_scan_at ? new Date(client.last_website_scan_at).toLocaleString() : 'Never'}{client.last_website_scan_verdict ? ` · ${client.last_website_scan_verdict} (${client.last_website_scan_score}/100)` : ''} · Next scan: {client.next_website_scan_at ? new Date(client.next_website_scan_at).toLocaleString() : 'Not scheduled'}
                  {scanResults[`integration-${client.api_key_id}`] && <span style={{ color: scanResults[`integration-${client.api_key_id}`].label === 'SCAN FAILED' ? '#fb7185' : '#34d399' }}> · {scanResults[`integration-${client.api_key_id}`].label}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="glass-card" style={{ padding: 20, marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Manual Website Scan</h3>
        <p style={{ color: '#94a3b8', fontSize: 13 }}>Enter a website you own or are authorized to assess. This button is always available and creates a dashboard scan.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <input
            value={manualWebsiteUrl}
            onChange={(event) => { setManualWebsiteUrl(event.target.value); setManualUrlError(''); }}
            placeholder="https://your-website.example"
            aria-label="Website URL to scan"
            style={{ flex: '1 1 320px', minWidth: 0, borderRadius: 8, border: '1px solid rgba(255,255,255,.15)', padding: '10px 12px', background: '#111827', color: '#f8fafc' }}
          />
          <button className="btn btn-primary btn-sm" onClick={startManualWebsiteScan} disabled={scanningUrl !== null || !manualWebsiteUrl.trim()}>
            {scanningUrl ? 'Scanning…' : 'Scan website'}
          </button>
        </div>
        {manualUrlError && <p style={{ color: '#fb7185', fontSize: 12, marginBottom: 0 }}>{manualUrlError}</p>}
        {scanResults[manualWebsiteUrl] && <p style={{ color: scanResults[manualWebsiteUrl].label === 'SCAN FAILED' ? '#fb7185' : '#34d399', fontSize: 12, marginBottom: 0 }}>Scan: {scanResults[manualWebsiteUrl].label}{scanResults[manualWebsiteUrl].score !== undefined ? ` (${scanResults[manualWebsiteUrl].score}/100)` : ''}</p>}
      </div>
      <div className="glass-card" style={{ padding: 20, marginTop: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h3 style={{ margin: 0 }}>Detected API Integrations</h3>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 0 }}>
              Websites are discovered automatically from browser Origin or Referer headers when they call the API.
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={scanAllDetectedWebsites} disabled={detectedIntegrations.length === 0 || scanningUrl !== null}>
            {scanningUrl ? 'Scanning…' : `Scan detected sites (${detectedIntegrations.length})`}
          </button>
        </div>
        {detectedIntegrations.length === 0 ? (
          <p style={{ color: '#94a3b8' }}>No browser website has called an API key yet. The scanner enables automatically after the first detected integration.</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {detectedIntegrations.map((integration) => {
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
