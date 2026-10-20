import React, { useMemo, useState } from 'react';
import streamData from '../../data/streamReplay.json';

interface Rec {
  id: string | number;
  region: string;
  label: number;
  score: number;
}

const raw: any = streamData;
const RECORDS: Rec[] = (Array.isArray(raw)
  ? raw
  : raw.records ?? raw.samples ?? raw.stream ?? raw.data ?? []) as Rec[];

const wrap = 'h-full overflow-y-auto p-8 text-slate-100';
const card = 'rounded-xl border border-slate-700/60 bg-[#0B1220] p-5';
const mono = 'font-mono';

const Header: React.FC<{ title: string; sub: string }> = ({ title, sub }) => (
  <div className="mb-6">
    <h1 className="text-3xl font-bold">{title}</h1>
    <p className="text-slate-400 mt-1">{sub}</p>
    <div className="mt-3 inline-block rounded border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs text-amber-300">
      Simulated data. An anomaly score is a signal for investigation, not proof of theft.
    </div>
  </div>
);

/* ---------------- Investigations ---------------- */
const STATUSES = ['Open', 'Under review', 'Escalated', 'Closed - false alarm'];

export const InvestigationsPage: React.FC = () => {
  const cases = useMemo(
    () => [...RECORDS].sort((a, b) => b.score - a.score).slice(0, 25),
    []
  );
  const [status, setStatus] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const report = () =>
    cases.map((c) => ({
      case_id: `CASE-${c.id}`,
      region: c.region,
      model_score: Number(c.score.toFixed(4)),
      ground_truth_label: c.label,
      status: status[String(c.id)] ?? 'Open',
      notes: notes[String(c.id)] ?? '',
    }));

  const exportJson = () => {
    const blob = new Blob(
      [JSON.stringify({ generated: new Date().toISOString(), note: 'Simulated data', cases: report() }, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'urjasetu_investigations.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={wrap}>
      <Header
        title="Investigations & Reports"
        sub="Top 25 highest-scoring meters from the held-out stream. Set a status, add notes, export a report."
      />
      <div className="mb-4 flex gap-3">
        <button onClick={exportJson} className="rounded-lg bg-[#38BDF8] px-4 py-2 font-semibold text-black">
          Export JSON
        </button>
        <button onClick={() => window.print()} className="rounded-lg border border-slate-600 px-4 py-2">
          Print summary
        </button>
      </div>
      <div className={card}>
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-400">
            <tr>
              <th className="p-2">Case</th>
              <th className="p-2">Region</th>
              <th className="p-2">Score</th>
              <th className="p-2">Status</th>
              <th className="p-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => {
              const k = String(c.id);
              return (
                <tr key={k} className="border-t border-slate-800">
                  <td className={`p-2 ${mono}`}>CASE-{k}</td>
                  <td className="p-2">{c.region}</td>
                  <td className={`p-2 ${mono} text-[#B8FF65]`}>{(c.score * 100).toFixed(1)}%</td>
                  <td className="p-2">
                    <select
                      value={status[k] ?? 'Open'}
                      onChange={(e) => setStatus({ ...status, [k]: e.target.value })}
                      className="rounded border border-slate-600 bg-[#050B14] px-2 py-1"
                    >
                      {STATUSES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <input
                      value={notes[k] ?? ''}
                      onChange={(e) => setNotes({ ...notes, [k]: e.target.value })}
                      placeholder="Add note..."
                      className="w-full rounded border border-slate-600 bg-[#050B14] px-2 py-1"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ---------------- Data Sources ---------------- */
const PROFILES: Record<string, string> = {
  NR: 'Residential-heavy, evening peaks',
  WR: 'Industrial-heavy, steady high baseload',
  SR: 'Agricultural and tech hybrid, pump and solar pattern',
  ER: 'Commercial and mining mix, higher losses',
  NER: 'Rural and mountainous, seasonal profile',
};

export const DataSourcesPage: React.FC = () => {
  const rows = useMemo(() => {
    const m: Record<string, { n: number; a: number }> = {};
    RECORDS.forEach((r) => {
      m[r.region] = m[r.region] ?? { n: 0, a: 0 };
      m[r.region].n += 1;
      m[r.region].a += r.label === 1 ? 1 : 0;
    });
    return Object.entries(m);
  }, []);

  return (
    <div className={wrap}>
      <Header
        title="Data Sources"
        sub="Synthetic regional smart-meter data generated by our Python pipeline (src/fl_pipeline/dataset.py)."
      />
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          ['Type', 'Synthetic / simulated'],
          ['Test samples', String(RECORDS.length)],
          ['Non-IID split', 'Dirichlet α = 0.5'],
          ['Seed', '42'],
        ].map(([k, v]) => (
          <div key={k} className={card}>
            <div className="text-xs uppercase text-slate-400">{k}</div>
            <div className={`mt-1 text-xl ${mono}`}>{v}</div>
          </div>
        ))}
      </div>
      <div className={card}>
        <h2 className="mb-3 text-lg font-semibold">Regional clients (held-out test stream)</h2>
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-400">
            <tr>
              <th className="p-2">Region</th>
              <th className="p-2">Profile</th>
              <th className="p-2">Test samples</th>
              <th className="p-2">Anomalies</th>
              <th className="p-2">Rate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([region, v]) => (
              <tr key={region} className="border-t border-slate-800">
                <td className="p-2 font-semibold">{region}</td>
                <td className="p-2 text-slate-300">{PROFILES[region] ?? 'Regional profile'}</td>
                <td className={`p-2 ${mono}`}>{v.n}</td>
                <td className={`p-2 ${mono}`}>{v.a}</td>
                <td className={`p-2 ${mono} text-[#B8FF65]`}>{((v.a / v.n) * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={`${card} mt-6 text-sm text-slate-300`}>
        <h2 className="mb-2 text-lg font-semibold text-slate-100">Features per sample</h2>
        24 hourly load values plus daily mean, daily variance, peak-to-average ratio and night/day ratio.
        Label: 0 = normal, 1 = anomaly. The global test set is created before partitioning across clients, so there is no test leakage.
        Real DISCOM data is private, which is why the data is simulated.
      </div>
    </div>
  );
};

/* ---------------- Settings ---------------- */
const HYPERPARAMS: [string, string][] = [
  ['Aggregation', 'DP-FedAvg (sample-weighted) with FedProx variant'],
  ['Rounds', '20'],
  ['Local epochs per round', '3'],
  ['Clip norm C', '1.0'],
  ['Noise multiplier σ', '0.5'],
  ['FedProx μ', '0.01'],
  ['Dirichlet α', '0.5'],
  ['Seed', '42'],
];

export const SettingsPage: React.FC = () => {
  const [badges, setBadges] = useState(true);
  const [compact, setCompact] = useState(false);
  const [region, setRegion] = useState('ALL');

  return (
    <div className={wrap}>
      <Header title="Settings" sub="Display preferences and read-only training configuration." />
      <div className={`${card} mb-6 space-y-4`}>
        <label className="flex items-center justify-between">
          <span>Show simulated-data badges</span>
          <input type="checkbox" checked={badges} onChange={(e) => setBadges(e.target.checked)} />
        </label>
        <label className="flex items-center justify-between">
          <span>Compact density</span>
          <input type="checkbox" checked={compact} onChange={(e) => setCompact(e.target.checked)} />
        </label>
        <label className="flex items-center justify-between">
          <span>Default region filter</span>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="rounded border border-slate-600 bg-[#050B14] px-2 py-1"
          >
            {['ALL', 'NR', 'WR', 'SR', 'ER', 'NER'].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <p className="text-xs text-slate-500">
          Preferences apply to this session only. Badges: {badges ? 'on' : 'off'}, density: {compact ? 'compact' : 'comfortable'}.
        </p>
      </div>
      <div className={card}>
        <h2 className="mb-3 text-lg font-semibold">Federated learning configuration (read-only)</h2>
        <table className="w-full text-sm">
          <tbody>
            {HYPERPARAMS.map(([k, v]) => (
              <tr key={k} className="border-t border-slate-800">
                <td className="p-2 text-slate-400">{k}</td>
                <td className={`p-2 text-right ${mono}`}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};