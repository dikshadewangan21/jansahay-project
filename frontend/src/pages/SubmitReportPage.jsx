import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, AlertCircle, Loader2, Sparkles, Upload, X, Image, Mic } from 'lucide-react';
import { reportsApi } from '../services/api';
import { useToast } from '../components/ToastContext';
import { useAuth  } from '../components/AuthContext';
import { useLang  } from '../components/LanguageContext';
import { PageHeader } from '../components/UI';
import VoiceInput from '../components/VoiceInput';

const WARD_PRESETS = [
  { label: 'Shankar Nagar',   lat: 21.2514, lng: 81.6296, ward: 'Ward 7',  area: 'Shankar Nagar' },
  { label: 'Kurud Road',      lat: 21.2550, lng: 81.6350, ward: 'Ward 9',  area: 'Kurud Road' },
  { label: 'Tatiband',        lat: 21.2389, lng: 81.6500, ward: 'Ward 12', area: 'Tatiband' },
  { label: 'Raipur Colony',   lat: 21.2450, lng: 81.6400, ward: 'Ward 15', area: 'Raipur Colony' },
  { label: 'Pandri',          lat: 21.2460, lng: 81.6500, ward: 'Ward 18', area: 'Pandri' },
  { label: 'Telibandha',      lat: 21.2520, lng: 81.6580, ward: 'Ward 19', area: 'Telibandha' },
  { label: 'Kota',            lat: 21.2300, lng: 81.6700, ward: 'Ward 22', area: 'Kota' },
  { label: 'Urla Industrial', lat: 21.2600, lng: 81.6150, ward: 'Ward 3',  area: 'Urla Industrial Area' },
];

const CLASSIFY_HINTS = {
  water:       ['water','pipe','tap','leakage','flood','contaminated','shortage','drainage','पानी','पाइप','बाढ़'],
  electricity: ['electricity','power','light','outage','transformer','wire','बिजली','बत्ती'],
  roads:       ['road','pothole','bridge','footpath','traffic','सड़क','गड्ढा','पुल'],
  sanitation:  ['garbage','waste','drain','smell','mosquito','कचरा','नाली','बदबू'],
  health:      ['hospital','dengue','fever','disease','medicine','अस्पताल','बुखार','बीमारी'],
};

function liveClassify(text) {
  const lower = text.toLowerCase();
  for (const [cat, keywords] of Object.entries(CLASSIFY_HINTS)) {
    if (keywords.some((kw) => lower.includes(kw))) return cat;
  }
  return null;
}

const INIT = {
  source: 'web', category: '', title: '', description: '',
  reportedBy: '', affectedCount: '', submitterEmail: '', tags: [],
  location: { lat: '', lng: '', ward: '', area: '' },
};

const VOICE_FIELDS = { TITLE: 'title', DESCRIPTION: 'description' };

export default function SubmitReportPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();
  const { t } = useLang();

  const [form, setForm]       = useState({ ...INIT, reportedBy: user?.name || '', submitterEmail: user?.email || '' });
  const [submitting, setSub]  = useState(false);
  const [errors, setErrors]   = useState({});
  const [submitted, setSubmitted] = useState(null);
  const [aiSuggested, setAiSuggested] = useState(null);
  const [imageFiles, setImageFiles]   = useState([]);
  const [uploading, setUploading]     = useState(false);
  const [voiceTarget, setVoiceTarget] = useState(null);
  const fileInputRef = useRef(null);

  const SOURCES = [
    { value: 'web',          label: t('submit.sources.web') },
    { value: 'mobile',       label: t('submit.sources.mobile') },
    { value: 'whatsapp',     label: t('submit.sources.whatsapp') },
    { value: 'paper_survey', label: t('submit.sources.paper_survey') },
    { value: 'ngo_upload',   label: t('submit.sources.ngo_upload') },
    { value: 'iot',          label: t('submit.sources.iot') },
  ];

  const CATEGORIES = [
    { value: 'water',          label: t('submit.categories.water') },
    { value: 'electricity',    label: t('submit.categories.electricity') },
    { value: 'roads',          label: t('submit.categories.roads') },
    { value: 'sanitation',     label: t('submit.categories.sanitation') },
    { value: 'health',         label: t('submit.categories.health') },
    { value: 'food',           label: t('submit.categories.food') },
    { value: 'shelter',        label: t('submit.categories.shelter') },
    { value: 'infrastructure', label: t('submit.categories.infrastructure') },
    { value: 'air',            label: t('submit.categories.air') },
  ];

  useEffect(() => {
    const guess = liveClassify(`${form.title} ${form.description}`);
    setAiSuggested(guess);
  }, [form.title, form.description]);

  function setField(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
    if (errors[key]) setErrors((e) => { const n = { ...e }; delete n[key]; return n; });
  }

  function applyWardPreset(p) {
    setForm((f) => ({ ...f, location: { lat: p.lat, lng: p.lng, ward: p.ward, area: p.area } }));
  }

  function handleFileChange(e) {
    setImageFiles(Array.from(e.target.files).slice(0, 5));
  }

  function removeImage(idx) {
    setImageFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleVoiceTranscript(text) {
    if (!voiceTarget || !text) return;
    setForm((f) => {
      const existing = f[voiceTarget]?.trim();
      const joined   = existing ? `${existing} ${text}` : text;
      const limited  = voiceTarget === 'title' ? joined.slice(0, 200) : joined.slice(0, 2000);
      return { ...f, [voiceTarget]: limited };
    });
    if (errors[voiceTarget]) setErrors((e) => { const n = { ...e }; delete n[voiceTarget]; return n; });
  }

  function validate() {
    const e = {};
    if (!form.source)                     e.source      = t('submit.errors.sourceRequired');
    if (!form.category)                   e.category    = t('submit.errors.categoryRequired');
    if (form.title.trim().length < 5)     e.title       = t('submit.errors.titleMin');
    if (form.description.trim().length < 10) e.description = t('submit.errors.descriptionMin');
    if (!form.location.lat || !form.location.lng) e.location = t('submit.errors.locationRequired');
    return e;
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSub(true);
    try {
      const payload = {
        source: form.source, category: form.category,
        title: form.title.trim(), description: form.description.trim(),
        reportedBy: form.reportedBy.trim() || 'Anonymous',
        affectedCount: form.affectedCount ? Number(form.affectedCount) : 0,
        submitterEmail: form.submitterEmail || null,
        tags: form.tags,
        location: { lat: Number(form.location.lat), lng: Number(form.location.lng), ward: form.location.ward, area: form.location.area },
      };
      const result = await reportsApi.create(payload);

      if (imageFiles.length > 0) {
        setUploading(true);
        try { await reportsApi.uploadImages(result.id, imageFiles); }
        catch { addToast(t('submit.imageUploadFail'), 'warning'); }
        finally { setUploading(false); }
      }

      setSubmitted(result);
      addToast(t('submit.uploadSuccess', { score: result.urgencyScore }), 'success');
    } catch (err) {
      if (err.details) {
        const fe = {};
        err.details.forEach((d) => { fe[d.field] = d.message; });
        setErrors(fe);
      }
      addToast(err.message, 'error');
    } finally {
      setSub(false);
    }
  }

  // ── Success screen ───────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="card p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-pulse-tealDark flex items-center justify-center mx-auto mb-4">
            <Send size={24} className="text-pulse-teal" />
          </div>
          <h2 className="text-xl font-bold text-pulse-text mb-2">{t('submit.reportSubmitted')}</h2>
          <p className="text-pulse-muted text-sm mb-4">
            {t('submit.reportId')} <span className="font-mono text-pulse-teal">{submitted.id}</span>
          </p>
          <div className="card p-4 text-left mb-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-pulse-muted text-xs">{t('submit.category')}</p><p className="text-pulse-text capitalize">{submitted.category}</p></div>
              <div><p className="text-pulse-muted text-xs">{t('submit.source')}</p><p className="text-pulse-text">{submitted.source}</p></div>
              <div>
                <p className="text-pulse-muted text-xs">{t('submit.urgencyScore')}</p>
                <p className={`font-bold text-lg ${submitted.urgencyScore >= 90 ? 'text-red-400' : submitted.urgencyScore >= 75 ? 'text-orange-400' : 'text-pulse-teal'}`}>
                  {submitted.urgencyScore} / 100
                </p>
              </div>
              <div>
                <p className="text-pulse-muted text-xs">{t('submit.slaDeadline')}</p>
                <p className="text-pulse-text text-xs">
                  {submitted.slaDeadline ? new Date(submitted.slaDeadline).toLocaleString() : t('submit.na')}
                </p>
              </div>
            </div>
          </div>
          {submitted.aiCategory && submitted.aiCategory !== submitted.category && (
            <div className="mb-4 p-3 rounded-lg bg-pulse-teal/10 border border-pulse-teal/20 text-xs text-pulse-teal text-left">
              <Sparkles size={11} className="inline mr-1" />
              {t('submit.aiSuggested', { category: submitted.aiCategory })}
            </div>
          )}
          <div className="flex gap-3 justify-center">
            <button onClick={() => { setForm(INIT); setSubmitted(null); setImageFiles([]); }} className="btn-ghost text-sm">
              {t('submit.submitAnother')}
            </button>
            <button onClick={() => navigate('/reports')} className="btn-primary text-sm">
              {t('submit.viewAllReports')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const fieldCls = (key) =>
    `w-full bg-pulse-bg border rounded-lg px-3 py-2 text-sm text-pulse-text outline-none transition-colors ${
      errors[key] ? 'border-red-500' : 'border-pulse-border focus:border-pulse-teal'
    }`;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <PageHeader title={t('submit.title')} subtitle={t('submit.subtitle')} />

      <div className="space-y-5">
        {/* ── Voice Report Banner ── */}
        <div className="card p-4 border border-pulse-teal/20 bg-pulse-teal/5">
          <div className="flex items-center gap-2 mb-2">
            <Mic size={14} className="text-pulse-teal" />
            <span className="text-xs font-semibold text-pulse-teal uppercase tracking-wider">
              {t('submit.voice.title')}
            </span>
            <span className="text-[10px] text-pulse-muted ml-auto">{t('submit.voice.supported')}</span>
          </div>
          <p className="text-xs text-pulse-muted mb-3">{t('submit.voice.subtitle')}</p>

          <div className="flex gap-2 mb-3">
            {[
              { key: VOICE_FIELDS.TITLE,       label: t('submit.voice.fillTitle') },
              { key: VOICE_FIELDS.DESCRIPTION, label: t('submit.voice.fillDescription') },
            ].map(({ key, label }) => (
              <button key={key} type="button"
                onClick={() => setVoiceTarget((prev) => (prev === key ? null : key))}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  voiceTarget === key ? 'border-pulse-teal bg-pulse-teal/20 text-pulse-teal' : 'border-pulse-border text-pulse-muted hover:border-pulse-teal/40'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {voiceTarget && <VoiceInput onTranscript={handleVoiceTranscript} disabled={submitting} />}

          {voiceTarget && form[voiceTarget] && (
            <div className="mt-2 p-2 bg-pulse-bg rounded-lg border border-pulse-border">
              <p className="text-[10px] text-pulse-muted uppercase mb-1">
                {t('submit.voice.capturedText', { field: voiceTarget })}
              </p>
              <p className="text-xs text-pulse-text line-clamp-3">{form[voiceTarget]}</p>
            </div>
          )}
        </div>

        {/* Source + Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-pulse-muted mb-1.5 uppercase tracking-wider">
              {t('submit.source')} <span className="text-red-400">*</span>
            </label>
            <select value={form.source} onChange={(e) => setField('source', e.target.value)} className={fieldCls('source')}>
              {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-pulse-muted mb-1.5 uppercase tracking-wider">
              {t('submit.category')} <span className="text-red-400">*</span>
            </label>
            <select value={form.category} onChange={(e) => setField('category', e.target.value)} className={fieldCls('category')}>
              <option value="">{t('submit.selectCategory')}</option>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            {errors.category && <p className="text-[11px] text-red-400 mt-1">{errors.category}</p>}
          </div>
        </div>

        {/* AI suggestion */}
        {aiSuggested && aiSuggested !== form.category && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-pulse-teal/10 border border-pulse-teal/30">
            <div className="flex items-center gap-2 text-xs text-pulse-teal">
              <Sparkles size={12} />
              <span>{t('submit.aiSuggested', { category: aiSuggested })}</span>
            </div>
            <button onClick={() => setField('category', aiSuggested)}
              className="text-xs text-pulse-teal border border-pulse-teal/50 px-2 py-0.5 rounded hover:bg-pulse-teal/20 transition-colors">
              {t('submit.applyAi')}
            </button>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-pulse-muted mb-1.5 uppercase tracking-wider">
            {t('submit.title_field')} <span className="text-red-400">*</span>
          </label>
          <input value={form.title} onChange={(e) => setField('title', e.target.value)}
            placeholder={t('submit.titlePlaceholder')} className={fieldCls('title')} />
          {errors.title && <p className="text-[11px] text-red-400 mt-1">{errors.title}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-pulse-muted mb-1.5 uppercase tracking-wider">
            {t('submit.description')} <span className="text-red-400">*</span>
          </label>
          <textarea value={form.description} onChange={(e) => setField('description', e.target.value)}
            rows={4} placeholder={t('submit.descriptionPlaceholder')}
            className={`${fieldCls('description')} resize-none`} />
          <div className="flex justify-between mt-1">
            {errors.description ? <p className="text-[11px] text-red-400">{errors.description}</p> : <span />}
            <p className="text-[10px] text-pulse-muted">{form.description.length} / 2000</p>
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-xs font-medium text-pulse-muted mb-1.5 uppercase tracking-wider">
            {t('submit.location')} <span className="text-red-400">*</span>
          </label>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {WARD_PRESETS.map((p) => (
              <button key={p.ward} type="button" onClick={() => applyWardPreset(p)}
                className={`text-[11px] px-2 py-1 rounded border transition-colors ${
                  form.location.ward === p.ward ? 'border-pulse-teal text-pulse-teal bg-pulse-tealDark/30' : 'border-pulse-border text-pulse-muted hover:border-pulse-teal/50'
                }`}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: 'area', placeholder: t('submit.areaPlaceholder') },
              { key: 'ward', placeholder: t('submit.wardPlaceholder') },
              { key: 'lat',  placeholder: t('submit.latPlaceholder') },
              { key: 'lng',  placeholder: t('submit.lngPlaceholder') },
            ].map(({ key, placeholder }) => (
              <input key={key} value={form.location[key]}
                onChange={(e) => setForm((f) => ({ ...f, location: { ...f.location, [key]: e.target.value } }))}
                placeholder={placeholder} className={fieldCls('location')} />
            ))}
          </div>
          {errors.location && (
            <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
              <AlertCircle size={11} />{errors.location}
            </p>
          )}
        </div>

        {/* Reporter + Affected */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-pulse-muted mb-1.5 uppercase tracking-wider">{t('submit.reportedBy')}</label>
            <input value={form.reportedBy} onChange={(e) => setField('reportedBy', e.target.value)}
              placeholder={t('submit.reportedByPlaceholder')} className={fieldCls('reportedBy')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-pulse-muted mb-1.5 uppercase tracking-wider">{t('submit.peopleAffected')}</label>
            <input type="number" value={form.affectedCount} onChange={(e) => setField('affectedCount', e.target.value)}
              placeholder={t('submit.affectedCountPlaceholder')} className={fieldCls('affectedCount')} min="0" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-pulse-muted mb-1.5 uppercase tracking-wider">{t('submit.emailNotifications')}</label>
          <input type="email" value={form.submitterEmail} onChange={(e) => setField('submitterEmail', e.target.value)}
            placeholder={t('submit.emailPlaceholder')} className={fieldCls('submitterEmail')} />
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-xs font-medium text-pulse-muted mb-1.5 uppercase tracking-wider">{t('submit.proofImages')}</label>
          <div className="border border-dashed border-pulse-border rounded-lg p-4 text-center cursor-pointer hover:border-pulse-teal/60 transition-colors"
            onClick={() => fileInputRef.current?.click()}>
            <Upload size={18} className="mx-auto text-pulse-muted mb-1" />
            <p className="text-xs text-pulse-muted">{t('submit.clickToUpload')}</p>
            <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>
          {imageFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {imageFiles.map((f, i) => (
                <div key={i} className="relative flex items-center gap-1.5 bg-pulse-surface border border-pulse-border rounded-lg px-2 py-1">
                  <Image size={12} className="text-pulse-teal" />
                  <span className="text-xs text-pulse-muted max-w-[100px] truncate">{f.name}</span>
                  <button onClick={() => removeImage(i)} className="text-pulse-muted hover:text-red-400 ml-1"><X size={11} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button onClick={handleSubmit} disabled={submitting || uploading} className="btn-primary flex items-center gap-2">
            {(submitting || uploading) ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            {uploading ? t('submit.uploadingImages') : submitting ? t('submit.submitting') : t('submit.submitReport')}
          </button>
          <button onClick={() => { setForm(INIT); setImageFiles([]); setVoiceTarget(null); }} className="btn-ghost text-sm">
            {t('submit.clear')}
          </button>
        </div>
      </div>
    </div>
  );
}
