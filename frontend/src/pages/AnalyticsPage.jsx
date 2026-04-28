import { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
} from 'recharts';
import { reportsApi } from '../services/api';
import { Spinner, PageHeader, ErrorBanner, StatCard } from '../components/UI';
import { useLang } from '../components/LanguageContext';
import { RefreshCw, BarChart3, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

const CATEGORY_COLORS = {
  water: '#3b82f6', electricity: '#f59e0b', roads: '#6b7280',
  sanitation: '#84cc16', health: '#ef4444', food: '#f97316',
  shelter: '#8b5cf6', infrastructure: '#06b6d4', air: '#14b8a6',
};
const SLA_COLORS = { on_time: '#22c55e', at_risk: '#f59e0b', breached: '#ef4444', resolved: '#06b6d4' };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2 text-xs shadow-xl">
      <p className="text-pulse-muted mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color || p.fill }} className="font-medium">
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </p>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const { t } = useLang();
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try { const res = await reportsApi.analytics(); setData(res); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex items-center justify-center h-full p-6"><Spinner size={32} /></div>;

  const catBarData = (data?.byCategory || []).map((c) => ({
    name: c._id, count: c.count, avgScore: Math.round(c.avgScore || 0),
    fill: CATEGORY_COLORS[c._id] || '#8a8878',
  }));
  const statusTotal = (data?.byStatus || []).reduce((sum, s) => sum + s.count, 0);
  const statusPieData = (data?.byStatus || []).map((s) => ({
    name: s._id, value: s.count, pct: statusTotal > 0 ? ((s.count / statusTotal) * 100).toFixed(1) : 0,
  }));
  const slaPieData = (data?.bySla || []).map((s) => ({
    name: s._id, value: s.count, fill: SLA_COLORS[s._id] || '#8a8878',
  }));
  const resolutionData = (data?.resolutionData || []).map((r) => ({
    name: r._id, hours: Math.round(r.avgHours || 0), fill: CATEGORY_COLORS[r._id] || '#8a8878',
  }));
  const totalReports = statusTotal;
  const completedCount = (data?.byStatus || []).find((s) => s._id === 'completed')?.count || 0;
  const resolutionRate = totalReports > 0 ? ((completedCount / totalReports) * 100).toFixed(1) : 0;
  const avgResHours = resolutionData.length > 0
    ? (resolutionData.reduce((s, r) => s + r.hours, 0) / resolutionData.length).toFixed(1) : 0;
  const breachedCount = (data?.bySla || []).find((s) => s._id === 'breached')?.count || 0;
  const slaBreachRate = totalReports > 0 ? ((breachedCount / totalReports) * 100).toFixed(1) : 0;

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      <PageHeader
        title={t('analytics.title')}
        action={
          <button onClick={() => load(true)} disabled={refreshing} className="btn-ghost text-sm flex items-center gap-2">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />{t('analytics.refresh')}
          </button>
        }
      />

      {error && <ErrorBanner message={error} onRetry={() => load()} />}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard label={t('analytics.totalReports')}       value={totalReports}          icon={BarChart3}    />
        <StatCard label={t('analytics.resolutionRate')}     value={`${resolutionRate}%`}  icon={CheckCircle2} iconColor="text-green-400" />
        <StatCard label={t('analytics.avgResolutionTime')}  value={`${avgResHours} ${t('analytics.hours')}`} icon={Clock} iconColor="text-blue-400" />
        <StatCard label={t('analytics.slaBreachRate')}      value={`${slaBreachRate}%`}   icon={AlertTriangle} iconColor="text-red-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Reports by category */}
        <div className="card p-4">
          <p className="text-sm font-semibold text-pulse-text mb-4">{t('analytics.reportsByCategory')}</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={catBarData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: '#8a8878', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8a8878', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="count" name="Count" radius={[4,4,0,0]}>
                {catBarData.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status distribution */}
        <div className="card p-4">
          <p className="text-sm font-semibold text-pulse-text mb-4">{t('analytics.statusDistribution')}</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" nameKey="name" label={({ name, pct }) => `${name}: ${pct}%`} labelLine={false}>
                {statusPieData.map((_, i) => <Cell key={i} fill={Object.values(SLA_COLORS)[i % 4]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* SLA compliance */}
        <div className="card p-4">
          <p className="text-sm font-semibold text-pulse-text mb-4">{t('analytics.slaCompliance')}</p>
          <div className="space-y-3">
            {slaPieData.map((s) => (
              <div key={s.name} className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full" style={{ background: s.fill }} />
                <span className="text-xs text-pulse-muted capitalize flex-1">{s.name}</span>
                <span className="text-xs font-bold text-pulse-text">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Resolution time */}
        <div className="card p-4">
          <p className="text-sm font-semibold text-pulse-text mb-4">{t('analytics.resolutionByCategory')}</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={resolutionData} layout="vertical" margin={{ top: 0, right: 10, left: 40, bottom: 0 }}>
              <XAxis type="number" tick={{ fill: '#8a8878', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#8a8878', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="hours" name={t('analytics.hours')} radius={[0,4,4,0]}>
                {resolutionData.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
