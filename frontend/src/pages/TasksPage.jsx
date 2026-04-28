import { useState, useEffect, useCallback } from 'react';
import { ClipboardList } from 'lucide-react';
import { tasksApi } from '../services/api';
import { useLang } from '../components/LanguageContext';
import { Spinner, PageHeader, EmptyState, ErrorBanner } from '../components/UI';
import TaskCard from '../components/TaskCard';

export default function TasksPage() {
  const { t } = useLang();

  const COLUMNS = [
    { key: 'open',        label: t('tasks.open'),       color: 'border-t-blue-500' },
    { key: 'in-progress', label: t('tasks.inProgress'), color: 'border-t-amber-500' },
    { key: 'completed',   label: t('tasks.completed'),  color: 'border-t-green-500' },
  ];

  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [catFilter, setCatFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await tasksApi.list({ limit: 100 });
      setAllTasks(res.data || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = catFilter ? allTasks.filter((tk) => tk.category === catFilter) : allTasks;
  const byStatus = (status) => filtered.filter((tk) => tk.status === status);
  const CATS = [...new Set(allTasks.map((tk) => tk.category))];

  if (loading) return <div className="flex justify-center items-center h-full"><Spinner size={28} /></div>;

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      <PageHeader
        title={t('tasks.title')}
        subtitle={t('tasks.subtitle', { count: allTasks.length })}
        action={
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
            className="bg-pulse-surface border border-pulse-border rounded-lg px-3 py-1.5 text-xs text-pulse-text outline-none focus:border-pulse-teal">
            <option value="">{t('tasks.allCategories')}</option>
            {CATS.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
          </select>
        }
      />
      {error && <ErrorBanner message={error} onRetry={load} />}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {COLUMNS.map(({ key, label, color }) => {
          const tasks = byStatus(key);
          return (
            <div key={key} className={`card border-t-2 ${color} p-4`}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-pulse-text">{label}</p>
                <span className="badge border border-pulse-border text-pulse-muted text-xs">{tasks.length}</span>
              </div>
              {tasks.length === 0 ? (
                <EmptyState icon={ClipboardList} title={t('tasks.noTasks', { status: label.toLowerCase() })} message="" />
              ) : (
                <div className="space-y-3">
                  {tasks.map((tk) => <TaskCard key={tk.id} task={tk} onUpdate={load} />)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
