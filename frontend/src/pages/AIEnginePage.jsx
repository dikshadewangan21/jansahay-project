/**
 * AI Engine Page — Fixed & Enhanced
 *
 * Bug fixes:
 *  1. Backend returns `recommendedActions`, NOT `actions` → fixed field mapping
 *  2. Backend has no `rationale` field → built from urgencyTier + category + affectedCount
 *  3. `autoDispatch` returns `assignedVolunteers[].name` but we also render `matchScore`
 *     which comes from `_matchScore` on the backend → mapped correctly now
 *  4. Added proper empty-state, error state, and loading skeleton
 */

import { useState, useEffect } from 'react';
import {
  Brain, Zap, CheckCircle2, Clock, Users, Target,
  AlertTriangle, Loader2, RefreshCw, TrendingUp,
  Shield, MapPin, Activity, ChevronRight, Info,
} from 'lucide-react';
import { reportsApi, aiApi, tasksApi } from '../services/api';
import { useToast } from '../components/ToastContext';
import { useLang  } from '../components/LanguageContext';
import { Spinner, PageHeader } from '../components/UI';

// ── Colour maps ───────────────────────────────────────────────────────────────
const URGENCY_STYLE = {
  critical: { badge: 'text-red-400 bg-red-500/10 border border-red-500/40',   bar: 'bg-red-500',    label: '🔴 Critical' },
  high:     { badge: 'text-orange-400 bg-orange-500/10 border border-orange-500/40', bar: 'bg-orange-500', label: '🟠 High' },
  medium:   { badge: 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/40', bar: 'bg-yellow-500', label: '🟡 Medium' },
  low:      { badge: 'text-green-400 bg-green-500/10 border border-green-500/40',    bar: 'bg-green-500',  label: '🟢 Low' },
};

const POPULATION_RISK_COLOR = {
  'Very High': 'text-red-400',
  'High':      'text-orange-400',
  'Medium':    'text-yellow-400',
  'Low':       'text-green-400',
};

// ── Build a human-readable rationale from the recommendation object ───────────
function buildRationale(rec) {
  const { reportCategory, urgencyTier, affectedCount, location, estimatedResolution, confidence } = rec;
  const pop = affectedCount > 0 ? ` affecting ~${affectedCount.toLocaleString()} people` : '';
  const loc = location && location !== 'Unknown area' ? ` in ${location}` : '';
  return (
    `${urgencyTier.charAt(0).toUpperCase() + urgencyTier.slice(1)}-urgency ${reportCategory} issue${loc}${pop}. ` +
    `Estimated resolution: ${estimatedResolution}. AI confidence: ${confidence}%.`
  );
}

// ── Confidence meter ──────────────────────────────────────────────────────────
function ConfidenceMeter({ value }) {
  const color = value >= 80 ? '#5dcaa5' : value >= 60 ? '#facc15' : '#fb923c';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-pulse-border rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-xs font-mono text-pulse-muted w-8 text-right">{value}%</span>
    </div>
  );
}

// ── Single action row ─────────────────────────────────────────────────────────
function ActionRow({ action, index, urgencyTier }) {
  const tierColor = URGENCY_STYLE[urgencyTier]?.bar || 'bg-pulse-teal';
  const timeLabel = action.timeHours
    ? action.timeHours >= 24
      ? `${Math.round(action.timeHours / 24)}d`
      : `${action.timeHours}h`
    : action.estimatedTime || null;

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-pulse-border hover:border-pulse-teal/30 transition-colors group">
      {/* Priority number */}
      <div className={`w-6 h-6 rounded-full ${tierColor} flex items-center justify-center shrink-0 text-[10px] font-bold text-white mt-0.5`}>
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-pulse-text leading-snug">{action.action}</p>
        {/* Skills tags if present */}
        {action.skills?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {action.skills.map((s) => (
              <span key={s} className="text-[10px] px-1.5 py-0.5 bg-pulse-teal/10 text-pulse-teal rounded-full border border-pulse-teal/20">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
      {/* Time estimate */}
      {timeLabel && (
        <span className="flex items-center gap-1 text-[10px] text-pulse-muted shrink-0 mt-0.5">
          <Clock size={9} />{timeLabel}
        </span>
      )}
    </div>
  );
}

// ── Report selector card ──────────────────────────────────────────────────────
function ReportItem({ report, isSelected, onClick }) {
  const style = URGENCY_STYLE[report.urgencyLevel] || URGENCY_STYLE.low;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border transition-all duration-150 ${
        isSelected
          ? 'border-pulse-teal bg-pulse-teal/10 shadow-sm shadow-pulse-teal/10'
          : 'border-pulse-border hover:border-pulse-teal/50 hover:bg-white/5'
      }`}
    >
      <p className="text-xs font-semibold text-pulse-text line-clamp-2 mb-1.5 leading-snug">
        {report.title}
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${style.badge}`}>
          {style.label}
        </span>
        <span className="text-[10px] text-pulse-muted capitalize">{report.category}</span>
        {report.location?.area && (
          <span className="text-[10px] text-pulse-muted flex items-center gap-0.5 ml-auto">
            <MapPin size={9} />{report.location.area}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[10px] text-pulse-muted">Urgency score</span>
        <span className="text-[10px] font-mono font-bold text-pulse-teal">{report.urgencyScore}/100</span>
      </div>
    </button>
  );
}

// ── Skeleton loader ────────────────────────────────────────────────────────────
function RecommendationSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-20 rounded-xl bg-pulse-border/40" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-14 rounded-xl bg-pulse-border/30" style={{ opacity: 1 - i * 0.2 }} />
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function AIEnginePage() {
  const { addToast } = useToast();
  const { t } = useLang();

  const [reports, setReports]               = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [dispatchResult, setDispatchResult] = useState(null);
  const [loading, setLoading]               = useState(false);
  const [loadingReports, setLoadingReports] = useState(true);
  const [dispatching, setDispatching]       = useState(false);
  const [recError, setRecError]             = useState(null);

  // Load open reports on mount
  useEffect(() => {
    reportsApi
      .list({ sortBy: 'urgency', limit: 30 })
      .then((res) => setReports(res.data || []))
      .catch(() => {})
      .finally(() => setLoadingReports(false));
  }, []);

  // Select a report and fetch recommendation
  async function handleSelectReport(report) {
    setSelectedReport(report);
    setRecommendation(null);
    setDispatchResult(null);
    setRecError(null);
    setLoading(true);
    try {
      const rec = await aiApi.recommend(report.id);
      setRecommendation(rec);
    } catch (e) {
      setRecError(e.message);
      addToast(`AI error: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }

  // Auto-dispatch volunteers
  async function handleAutoDispatch() {
    if (!selectedReport || !recommendation) return;
    setDispatching(true);
    setDispatchResult(null);
    try {
      const task = await tasksApi.create({
        title:          selectedReport.title,
        description:    selectedReport.description,
        category:       selectedReport.category,
        location:       selectedReport.location,
        reportId:       selectedReport.id,
        estimatedHours: recommendation.urgencyTier === 'critical' ? 4 : 8,
      });
      const dispatch = await aiApi.dispatch(task.id);
      setDispatchResult(dispatch);
      addToast(
        dispatch.success
          ? `✅ ${dispatch.assignedVolunteers?.length || 0} volunteer(s) dispatched!`
          : dispatch.message || 'Dispatch complete.',
        dispatch.success ? 'success' : 'warning',
      );
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setDispatching(false);
    }
  }

  const urgStyle = URGENCY_STYLE[recommendation?.urgencyTier] || URGENCY_STYLE.low;

  // The KEY fix: backend returns `recommendedActions`, not `actions`
  const actions = recommendation?.recommendedActions || recommendation?.actions || [];

  return (
    <div className="p-4 md:p-6 max-w-screen-xl mx-auto">
      <PageHeader
        title={t('ai.title')}
        subtitle={t('ai.subtitle')}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Left panel: Report list ─────────────────────────────────────── */}
        <div className="lg:col-span-1">
          <div className="card p-4 h-full">
            <p className="text-xs font-bold text-pulse-muted uppercase tracking-widest mb-3 flex items-center gap-2">
              <AlertTriangle size={12} className="text-pulse-orange" />
              Open Reports
            </p>

            {loadingReports ? (
              <div className="flex justify-center py-10"><Spinner size={24} /></div>
            ) : reports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Brain size={28} className="text-pulse-muted opacity-30 mb-2" />
                <p className="text-xs text-pulse-muted">{t('ai.noReports')}</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1 scrollbar-thin">
                {reports.map((r) => (
                  <ReportItem
                    key={r.id}
                    report={r}
                    isSelected={selectedReport?.id === r.id}
                    onClick={() => handleSelectReport(r)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right panel: Recommendation ────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Empty state */}
          {!selectedReport && (
            <div className="card p-12 flex flex-col items-center justify-center text-center min-h-[300px]">
              <div className="w-16 h-16 rounded-2xl bg-pulse-teal/10 flex items-center justify-center mb-4">
                <Brain size={32} className="text-pulse-teal opacity-60" />
              </div>
              <p className="text-sm font-semibold text-pulse-text mb-1">{t('ai.selectReport')}</p>
              <p className="text-xs text-pulse-muted max-w-xs">
                Select any report from the list to get AI-powered action recommendations and volunteer dispatch.
              </p>
              <div className="flex items-center gap-4 mt-6 text-xs text-pulse-muted">
                <span className="flex items-center gap-1"><Zap size={11} className="text-pulse-teal" /> Smart Recommendations</span>
                <span className="flex items-center gap-1"><Users size={11} className="text-pulse-teal" /> Auto Dispatch</span>
                <span className="flex items-center gap-1"><Shield size={11} className="text-pulse-teal" /> Priority Scoring</span>
              </div>
            </div>
          )}

          {/* Loading skeleton */}
          {selectedReport && loading && (
            <div className="card p-5">
              <div className="flex items-center gap-3 mb-5 text-pulse-teal">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm font-medium">Generating AI recommendations…</span>
              </div>
              <RecommendationSkeleton />
            </div>
          )}

          {/* Error state */}
          {selectedReport && recError && !loading && (
            <div className="card p-5 border-red-500/30 bg-red-500/5">
              <p className="text-sm text-red-400 mb-3">{recError}</p>
              <button onClick={() => handleSelectReport(selectedReport)} className="btn-ghost text-xs flex items-center gap-1.5">
                <RefreshCw size={12} /> Retry
              </button>
            </div>
          )}

          {/* ── Recommendation panel ────────────────────────────────────── */}
          {selectedReport && recommendation && !loading && (
            <>
              {/* Header summary card */}
              <div className="card p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${urgStyle.badge}`}>
                      {urgStyle.label} Priority
                    </div>
                    <span className="text-xs text-pulse-muted capitalize">{recommendation.reportCategory}</span>
                  </div>
                  <button
                    onClick={handleAutoDispatch}
                    disabled={dispatching}
                    className="btn-primary text-xs flex items-center gap-1.5 px-4 py-2 self-start sm:self-auto"
                  >
                    {dispatching
                      ? <><Loader2 size={12} className="animate-spin" /> {t('ai.dispatching')}</>
                      : <><Users size={12} /> {t('ai.autoDispatch')}</>
                    }
                  </button>
                </div>

                {/* Rationale — built from real data */}
                <p className="text-xs text-pulse-muted leading-relaxed mb-4 p-3 bg-white/[0.03] rounded-lg border border-pulse-border">
                  <Info size={11} className="inline mr-1.5 text-pulse-teal" />
                  {buildRationale(recommendation)}
                </p>

                {/* Key metrics row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Resolution',      value: recommendation.estimatedResolution,  icon: Clock },
                    { label: 'Volunteers needed',value: `${recommendation.volunteerRequirement?.min}–${recommendation.volunteerRequirement?.max}`, icon: Users },
                    { label: 'People at risk',  value: recommendation.affectedCount > 0 ? recommendation.affectedCount.toLocaleString() : '—', icon: Activity },
                    { label: 'Population risk', value: recommendation.populationRisk, icon: TrendingUp },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="bg-white/[0.03] rounded-lg p-2.5 border border-pulse-border">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon size={11} className="text-pulse-teal" />
                        <span className="text-[10px] text-pulse-muted uppercase tracking-wider">{label}</span>
                      </div>
                      <p className={`text-xs font-bold ${POPULATION_RISK_COLOR[value] || 'text-pulse-text'}`}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Confidence meter */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-pulse-muted uppercase tracking-wider">AI Confidence</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      recommendation.volunteerRequirement?.priority === 'IMMEDIATE' ? 'bg-red-500/20 text-red-400' :
                      recommendation.volunteerRequirement?.priority === 'URGENT'    ? 'bg-orange-500/20 text-orange-400' :
                                                                                      'bg-pulse-teal/20 text-pulse-teal'
                    }`}>
                      {recommendation.volunteerRequirement?.priority}
                    </span>
                  </div>
                  <ConfidenceMeter value={recommendation.confidence} />
                </div>
              </div>

              {/* Actions list */}
              <div className="card p-5">
                <p className="text-xs font-bold text-pulse-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Zap size={12} className="text-pulse-teal" />
                  Recommended Actions ({actions.length})
                </p>

                {actions.length === 0 ? (
                  <p className="text-xs text-pulse-muted text-center py-6">No actions available for this report.</p>
                ) : (
                  <div className="space-y-2">
                    {actions.map((action, i) => (
                      <ActionRow
                        key={i}
                        action={action}
                        index={i}
                        urgencyTier={recommendation.urgencyTier}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Dispatch result ─────────────────────────────────────────── */}
          {dispatchResult && (
            <div className="card p-5">
              <p className="text-xs font-bold text-pulse-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                <Target size={12} className="text-pulse-teal" />
                {t('ai.dispatchResult')}
              </p>

              {!dispatchResult.success ? (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <p className="text-xs text-amber-400">{dispatchResult.message}</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-pulse-muted mb-3">
                    {dispatchResult.assignedVolunteers?.length} volunteer(s) matched and notified.
                  </p>
                  <div className="space-y-2">
                    {(dispatchResult.assignedVolunteers || []).map((v, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-pulse-border">
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pulse-teal/40 to-pulse-teal/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-pulse-teal">
                            {v.name?.charAt(0)?.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-pulse-text">{v.name}</p>
                          <p className="text-[10px] text-pulse-muted line-clamp-1">
                            {(v.skills || v._skillMatch || []).slice(0, 3).join(' · ')}
                          </p>
                        </div>
                        {/* Match score */}
                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-pulse-muted">Match</p>
                          <p className="text-xs font-bold text-pulse-teal">
                            {v.matchScore ?? v._matchScore ?? '—'}
                          </p>
                        </div>
                        {/* Distance */}
                        {(v.distanceKm ?? v._distanceKm) != null && (
                          <div className="text-right shrink-0">
                            <p className="text-[10px] text-pulse-muted">Distance</p>
                            <p className="text-xs font-bold text-pulse-text">
                              {v.distanceKm ?? v._distanceKm} km
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
