import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Globe } from 'lucide-react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, Cell } from 'recharts';
import { sdgApi } from '../services/api';
import { Spinner, PageHeader, ErrorBanner } from '../components/UI';
import { useLang } from '../components/LanguageContext';

const SDG_COLORS = {
  1: '#e5243b', 2: '#dda63a', 3: '#4c9f38', 6: '#26bde2',
  9: '#fd6925', 10: '#dd1367', 11: '#fd9d24', 13: '#3f7e44', 17: '#19486a',
};

function ScoreBar({ value }) {
  const color = value >= 70 ? '#5dcaa5' : value >= 50 ? '#facc15' : '#fb923c';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-pulse-border rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-xs font-mono text-pulse-muted w-8 text-right">{value}</span>
    </div>
  );
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2 text-xs shadow-xl">
      <p className="text-pulse-muted">{payload[0]?.payload?.label}</p>
      <p className="text-pulse-teal font-bold">Score: {payload[0]?.value}</p>
    </div>
  );
};

export default function SDGPage() {
  const { t } = useLang();
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try { const res = await sdgApi.scores(); setData(res); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex items-center justify-center h-full p-6"><Spinner size={32} /></div>;

  const goals = data?.goals || [];
  const radarData = goals.map((g) => ({ subject: `SDG ${g.number ?? g.goal}`, score: g.score, fullMark: 100 }));
  const overallScore = goals.length > 0 ? Math.round(goals.reduce((s, g) => s + g.score, 0) / goals.length) : 0;

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      <PageHeader
        title={t('sdg.title')}
        subtitle={t('sdg.subtitle')}
        action={
          <button onClick={() => load(true)} disabled={refreshing} className="btn-ghost text-sm flex items-center gap-2">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />{t('sdg.refresh')}
          </button>
        }
      />
      {error && <ErrorBanner message={error} onRetry={() => load()} />}

      {/* Overall score */}
      <div className="card p-6 mb-6 flex items-center gap-6">
        <div className="w-16 h-16 rounded-full bg-pulse-teal/20 flex items-center justify-center shrink-0">
          <Globe size={28} className="text-pulse-teal" />
        </div>
        <div>
          <p className="text-xs text-pulse-muted uppercase tracking-wider">{t('sdg.overallScore')}</p>
          <p className="text-4xl font-bold text-pulse-teal">{overallScore}</p>
          <p className="text-xs text-pulse-muted mt-1">{goals.length} SDG goals tracked</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Radar chart */}
        <div className="card p-4">
          <p className="text-sm font-semibold text-pulse-text mb-4">{t('sdg.radarChart')}</p>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#232b3e" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#8a8878', fontSize: 10 }} />
              <Radar name="Score" dataKey="score" stroke="#00b4d8" fill="#00b4d8" fillOpacity={0.2} />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Goal breakdown */}
        <div className="card p-4">
          <p className="text-sm font-semibold text-pulse-text mb-4">{t('sdg.breakdown')}</p>
          <div className="space-y-3">
            {goals.map((g) => {
              const goalNum = g.number ?? g.goal;
              return (
                <div key={goalNum}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center text-white"
                        style={{ background: SDG_COLORS[goalNum] || '#888' }}>
                        {goalNum}
                      </span>
                      <p className="text-xs text-pulse-text truncate max-w-[180px]">{g.label}</p>
                    </div>
                    <span className="text-[10px] text-pulse-muted">
                      {g.tasksLinked || 0} tasks · {(g.peopleReached || 0).toLocaleString()} reached
                    </span>
                  </div>
                  <ScoreBar value={g.score} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
