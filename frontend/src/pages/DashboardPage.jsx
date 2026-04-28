import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, Users, ClipboardList, TrendingUp,
  RefreshCw, ChevronRight, Zap, BarChart3, MapPin,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, Cell,
} from 'recharts';
import { dashboardApi, tasksApi } from '../services/api';
import { Spinner, PageHeader, StatCard, ErrorBanner } from '../components/UI';
import UrgencyBadge from '../components/UrgencyBadge';
import { CategoryBadge } from '../components/Badges';
import { useLang } from '../components/LanguageContext';

const CATEGORY_COLORS = {
  food: '#f59e0b', water: '#3b82f6', health: '#ef4444', shelter: '#8b5cf6',
  infrastructure: '#6b7280', air: '#14b8a6', electricity: '#fbbf24',
  roads: '#78716c', sanitation: '#84cc16',
};

function urgencyLevel(score) {
  if (score >= 90) return 'critical';
  if (score >= 75) return 'high';
  if (score >= 55) return 'medium';
  return 'low';
}

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

export default function DashboardPage() {
  const { t } = useLang();
  const [stats, setStats]         = useState(null);
  const [tasks, setTasks]         = useState([]);
  const [forecast, setForecast]   = useState(null);
  const [needGraph, setNeedGraph] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const [s, tk, f, ng] = await Promise.all([
        dashboardApi.stats(),
        tasksApi.list({ status: 'open', limit: 5 }),
        dashboardApi.forecast(),
        dashboardApi.needGraph(),
      ]);
      setStats(s); setTasks(tk.data || []);
      setForecast(f); setNeedGraph(ng);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex items-center justify-center h-full p-6"><Spinner size={32} /></div>;
  if (error)   return <div className="p-4 sm:p-6"><ErrorBanner message={error} onRetry={() => load()} /></div>;

  const { summary, categoryBreakdown, recentActivity } = stats || {};

  const catData = Object.entries(categoryBreakdown || {}).map(([cat, count]) => ({
    name: cat.charAt(0).toUpperCase() + cat.slice(1), count,
    fill: CATEGORY_COLORS[cat] || '#6b7280',
  }));

  const forecastCategories = Object.keys(forecast?.forecasts || {}).slice(0, 3);
  const forecastDays = forecast?.forecasts?.[forecastCategories[0]]?.days || [];
  const forecastLineData = forecastDays.map((d, i) => {
    const row = { day: d.day.split(',')[0] };
    forecastCategories.forEach((cat) => { row[cat] = forecast.forecasts[cat].days[i]?.predicted ?? 0; });
    return row;
  });

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      <PageHeader
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle', { time: new Date().toLocaleTimeString('en-IN') })}
        action={
          <button onClick={() => load(true)} disabled={refreshing} className="btn-ghost text-xs sm:text-sm flex items-center gap-1.5">
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{t('dashboard.refresh')}</span>
          </button>
        }
      />

      {/* Stat cards — 2 col on mobile, 4 on lg */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard label={t('dashboard.openReports')}       value={summary?.openReports ?? '—'}    icon={AlertTriangle} iconColor="text-pulse-orange" />
        <StatCard label={t('dashboard.criticalReports')}   value={summary?.criticalReports ?? '—'} icon={Zap} highlight={summary?.criticalReports > 0} />
        <StatCard label={t('dashboard.availableVolunteers')} value={summary?.availableVolunteers ?? '—'} icon={Users} iconColor="text-pulse-teal"
          sub={t('dashboard.ofTotal', { total: summary?.totalVolunteers ?? 0 })} />
        <StatCard label={t('dashboard.openTasks')}
          value={(summary?.openTasks ?? 0) + (summary?.inProgressTasks ?? 0)}
          icon={ClipboardList} iconColor="text-pulse-blue"
          sub={t('dashboard.completed', { count: summary?.completedTasks ?? 0 })} />
      </div>

      {/* Risk row — stack on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <div className="card p-4 flex flex-col justify-between">
          <p className="text-[10px] sm:text-xs text-pulse-muted uppercase tracking-wider mb-1">{t('dashboard.peopleAtRisk')}</p>
          <p className="text-3xl sm:text-4xl font-bold text-pulse-orange">{(summary?.totalAffectedPeople ?? 0).toLocaleString()}</p>
          <p className="text-[10px] sm:text-xs text-pulse-muted mt-2">{t('dashboard.acrossAllReports')}</p>
        </div>
        <div className="card p-4 flex flex-col justify-between">
          <p className="text-[10px] sm:text-xs text-pulse-muted uppercase tracking-wider mb-1">{t('dashboard.systemRiskLevel')}</p>
          <p className={`text-xl sm:text-2xl font-bold capitalize mt-1 ${
            forecast?.systemRisk === 'high' ? 'text-pulse-critical' :
            forecast?.systemRisk === 'medium' ? 'text-pulse-medium' : 'text-pulse-low'
          }`}>{forecast?.systemRisk ?? '—'}</p>
          <p className="text-[10px] sm:text-xs text-pulse-muted mt-2">
            {t('dashboard.highRiskCategories', { cats: forecast?.highRiskCategories?.join(', ') || t('dashboard.highRiskNone') })}
          </p>
        </div>
        <div className="card p-4 flex flex-col justify-between">
          <p className="text-[10px] sm:text-xs text-pulse-muted uppercase tracking-wider mb-1">{t('dashboard.forecastConfidence')}</p>
          <p className="text-xl sm:text-2xl font-bold text-pulse-teal mt-1">{forecast?.avgConfidence ?? '—'}%</p>
          <p className="text-[10px] sm:text-xs text-pulse-muted mt-2">{t('dashboard.forecastModel')}</p>
        </div>
      </div>

      {/* Quick actions — wrap on mobile */}
      <div className="flex flex-wrap gap-2 sm:gap-3 mb-6">
        <Link to="/analytics" className="btn-ghost flex items-center gap-1.5 text-xs sm:text-sm">
          <BarChart3 size={13} /><span className="hidden sm:inline">{t('dashboard.fullAnalytics')}</span><span className="sm:hidden">Analytics</span>
        </Link>
        <Link to="/map" className="btn-ghost flex items-center gap-1.5 text-xs sm:text-sm">
          <MapPin size={13} /><span className="hidden sm:inline">{t('dashboard.liveMap')}</span><span className="sm:hidden">Map</span>
        </Link>
        <Link to="/reports/new" className="btn-primary flex items-center gap-1.5 text-xs sm:text-sm ml-auto">
          {t('dashboard.submitReport')}
        </Link>
      </div>

      {/* Charts — stack on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-xs sm:text-sm font-semibold text-pulse-text mb-4 flex items-center gap-2">
            <TrendingUp size={14} className="text-pulse-teal" />{t('dashboard.activeReportsByCategory')}
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={catData} margin={{ top: 0, right: 4, left: -22, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: '#8a8878', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8a8878', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {catData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-4">
          <p className="text-xs sm:text-sm font-semibold text-pulse-text mb-4 flex items-center gap-2">
            <TrendingUp size={14} className="text-purple-400" />{t('dashboard.sevenDayForecast')}
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={forecastLineData} margin={{ top: 0, right: 4, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#232b3e" />
              <XAxis dataKey="day" tick={{ fill: '#8a8878', fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8a8878', fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10, color: '#8a8878' }} />
              {forecastCategories.map((cat) => (
                <Line key={cat} type="monotone" dataKey={cat}
                  name={cat.charAt(0).toUpperCase() + cat.slice(1)}
                  stroke={CATEGORY_COLORS[cat] || '#8a8878'} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row — stack on mobile, 3-col on lg */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Need clusters */}
        <div className="card p-4">
          <p className="text-xs sm:text-sm font-semibold text-pulse-text mb-3">{t('dashboard.needClusters')}</p>
          <div className="space-y-2">
            {needGraph?.clusters?.slice(0, 5).map((cluster) => (
              <div key={cluster.id} className="bg-white/5 rounded-lg px-3 py-2">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-xs font-medium text-pulse-text truncate pr-2">{cluster.label}</p>
                  <UrgencyBadge level={urgencyLevel(cluster.maxUrgency)} score={cluster.maxUrgency} showScore={false} />
                </div>
                <p className="text-[10px] text-pulse-muted">
                  {cluster.reportCount} · {cluster.totalAffected?.toLocaleString()} affected
                </p>
                {cluster.isCompound && <p className="text-[10px] text-pulse-orange mt-0.5">{t('dashboard.compoundCrisis')}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Urgent tasks */}
        <div className="card p-4">
          <div className="flex justify-between items-center mb-3">
            <p className="text-xs sm:text-sm font-semibold text-pulse-text">{t('dashboard.urgentOpenTasks')}</p>
            <Link to="/tasks" className="text-xs text-pulse-teal flex items-center gap-1 hover:underline">
              {t('dashboard.viewAll')} <ChevronRight size={11} />
            </Link>
          </div>
          <div className="space-y-2">
            {tasks.length === 0 && (
              <p className="text-xs text-pulse-muted py-4 text-center">{t('dashboard.noOpenTasks')}</p>
            )}
            {tasks.map((tk) => (
              <div key={tk.id} className="bg-white/5 rounded-lg px-3 py-2">
                <p className="text-xs font-medium text-pulse-text line-clamp-1 mb-1">{tk.title}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <CategoryBadge category={tk.category} />
                  <UrgencyBadge level={urgencyLevel(tk.urgencyScore)} score={tk.urgencyScore} showScore={false} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="card p-4">
          <p className="text-xs sm:text-sm font-semibold text-pulse-text mb-3">{t('dashboard.recentActivity')}</p>
          <div className="space-y-3">
            {recentActivity?.map((a) => (
              <div key={a.taskId} className="flex items-start gap-2">
                <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${
                  a.status === 'completed' ? 'bg-pulse-low' :
                  a.status === 'in-progress' ? 'bg-pulse-medium' : 'bg-pulse-blue'
                }`} />
                <div className="min-w-0">
                  <p className="text-xs text-pulse-text line-clamp-1">{a.title}</p>
                  <p className="text-[10px] text-pulse-muted capitalize">{a.status} · {a.category}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
