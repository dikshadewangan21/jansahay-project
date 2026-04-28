import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Users, Loader2, X } from 'lucide-react';
import { volunteersApi } from '../services/api';
import { useAuth    }    from '../components/AuthContext';
import { useToast   }    from '../components/ToastContext';
import { useLang    }    from '../components/LanguageContext';
import { Spinner, PageHeader, EmptyState, ErrorBanner } from '../components/UI';
import VolunteerCard from '../components/VolunteerCard';

const ALL_SKILLS = [
  { value: 'medical', label: 'Medical' }, { value: 'first-aid', label: 'First Aid' },
  { value: 'counseling', label: 'Counseling' }, { value: 'elderly-care', label: 'Elderly Care' },
  { value: 'medicine-distribution', label: 'Medicine Distribution' },
  { value: 'logistics', label: 'Logistics' }, { value: 'food-distribution', label: 'Food Distribution' },
  { value: 'coordination', label: 'Coordination' }, { value: 'driving', label: 'Driving' },
  { value: 'plumbing', label: 'Plumbing' }, { value: 'water-sanitation', label: 'Water Sanitation' },
  { value: 'construction', label: 'Construction' }, { value: 'heavy-lifting', label: 'Heavy Lifting' },
  { value: 'shelter-setup', label: 'Shelter Setup' }, { value: 'field-survey', label: 'Field Survey' },
  { value: 'documentation', label: 'Documentation' }, { value: 'translation-hindi', label: 'Hindi Translation' },
  { value: 'education', label: 'Education' }, { value: 'child-welfare', label: 'Child Welfare' },
  { value: 'woman-child-welfare', label: 'Women & Child Welfare' },
];

const WARD_PRESETS = [
  { label: 'Ward 7 – Shankar Nagar',  lat: 21.2514, lng: 81.6296, ward: 'Ward 7',  area: 'Shankar Nagar' },
  { label: 'Ward 12 – Tatiband',      lat: 21.2389, lng: 81.6500, ward: 'Ward 12', area: 'Tatiband' },
  { label: 'Ward 15 – Raipur Colony', lat: 21.2450, lng: 81.6400, ward: 'Ward 15', area: 'Raipur Colony' },
  { label: 'Ward 18 – Pandri',        lat: 21.2460, lng: 81.6500, ward: 'Ward 18', area: 'Pandri' },
  { label: 'Ward 22 – Kota',          lat: 21.2300, lng: 81.6700, ward: 'Ward 22', area: 'Kota' },
];

const INIT_FORM = {
  name: '', phone: '', email: '', availability: '', selectedSkills: [],
  location: { lat: '', lng: '', ward: '', area: '' },
};

export default function VolunteersPage() {
  const { addToast  } = useToast();
  const { isLoggedIn } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();

  const STATUS_TABS = [
    { value: '', label: t('volunteers.all') },
    { value: 'available', label: t('volunteers.available') },
    { value: 'on-task',   label: t('volunteers.onTask') },
    { value: 'inactive',  label: t('volunteers.inactive') },
  ];

  const [volunteers, setVolunteers] = useState([]);
  const [meta, setMeta]             = useState({ total: 0 });
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [showForm, setShowForm]     = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm]   = useState(INIT_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSub] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await volunteersApi.list(params);
      setVolunteers(res.data || []);
      setMeta(res.meta || { total: 0 });
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  function toggleSkill(val) {
    setForm((f) => ({
      ...f,
      selectedSkills: f.selectedSkills.includes(val)
        ? f.selectedSkills.filter((s) => s !== val)
        : [...f.selectedSkills, val],
    }));
  }

  function applyWard(p) {
    setForm((f) => ({ ...f, location: { lat: p.lat, lng: p.lng, ward: p.ward, area: p.area } }));
  }

  function validate() {
    const e = {};
    if (!form.name.trim())                        e.name     = t('volunteers.errors.nameRequired');
    if (!/^\+?[\d\s\-]{7,15}$/.test(form.phone)) e.phone    = t('volunteers.errors.phoneRequired');
    if (!form.availability)                       e.availability = t('volunteers.errors.availabilityRequired');
    if (form.selectedSkills.length === 0)         e.skills   = t('volunteers.errors.skillsRequired');
    if (!form.location.lat || !form.location.lng) e.location = t('volunteers.errors.locationRequired');
    return e;
  }

  async function handleRegister() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSub(true);
    try {
      await volunteersApi.register({
        name: form.name.trim(), phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        skills: form.selectedSkills, availability: form.availability,
        location: { lat: Number(form.location.lat), lng: Number(form.location.lng), ward: form.location.ward, area: form.location.area },
      });
      addToast(t('volunteers.registerSuccess'), 'success');
      setShowForm(false);
      setForm(INIT_FORM);
      load();
    } catch (err) {
      addToast(err.message, 'error');
    } finally { setSub(false); }
  }

  const inputCls = (key) =>
    `w-full bg-pulse-bg border rounded-lg px-3 py-2 text-sm text-pulse-text outline-none focus:border-pulse-teal transition-colors ${
      errors[key] ? 'border-red-500' : 'border-pulse-border'
    }`;

  const availabilityOpts = [
    { value: 'daily',    label: t('volunteers.availabilityOptions.daily') },
    { value: 'weekdays', label: t('volunteers.availabilityOptions.weekdays') },
    { value: 'weekends', label: t('volunteers.availabilityOptions.weekends') },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title={t('volunteers.title')}
        subtitle={`${meta.total ?? 0} total`}
        action={
          isLoggedIn && (
            <button onClick={() => setShowForm((v) => !v)} className="btn-primary flex items-center gap-2 text-sm">
              <UserPlus size={14} />{t('volunteers.registerVolunteer')}
            </button>
          )
        }
      />

      {/* Status tabs */}
      <div className="flex gap-2 mb-4">
        {STATUS_TABS.map((tab) => (
          <button key={tab.value} onClick={() => setStatusFilter(tab.value)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              statusFilter === tab.value ? 'border-pulse-teal text-pulse-teal bg-pulse-tealDark/20' : 'border-pulse-border text-pulse-muted hover:border-pulse-teal/50'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Registration Form */}
      {showForm && (
        <div className="card p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-pulse-text">{t('volunteers.registerVolunteer')}</h2>
            <button onClick={() => setShowForm(false)} className="text-pulse-muted hover:text-pulse-text"><X size={16} /></button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {[
              { key: 'name',  label: t('volunteers.name'),         placeholder: t('volunteers.namePlaceholder'),  type: 'text' },
              { key: 'phone', label: t('volunteers.phone'),        placeholder: t('volunteers.phonePlaceholder'), type: 'tel'  },
              { key: 'email', label: t('volunteers.emailOptional'),placeholder: t('volunteers.emailPlaceholder'), type: 'email'},
            ].map(({ key, label, placeholder, type }) => (
              <div key={key}>
                <label className="block text-xs text-pulse-muted mb-1 uppercase tracking-wider">{label}</label>
                <input type={type} value={form[key]}
                  onChange={(e) => { setForm((f) => ({ ...f, [key]: e.target.value })); if (errors[key]) setErrors((er) => { const n = { ...er }; delete n[key]; return n; }); }}
                  placeholder={placeholder} className={inputCls(key)} />
                {errors[key] && <p className="text-[11px] text-red-400 mt-1">{errors[key]}</p>}
              </div>
            ))}

            <div>
              <label className="block text-xs text-pulse-muted mb-1 uppercase tracking-wider">{t('volunteers.availability')}</label>
              <select value={form.availability}
                onChange={(e) => { setForm((f) => ({ ...f, availability: e.target.value })); if (errors.availability) setErrors((er) => { const n = { ...er }; delete n.availability; return n; }); }}
                className={inputCls('availability')}>
                <option value="">—</option>
                {availabilityOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {errors.availability && <p className="text-[11px] text-red-400 mt-1">{errors.availability}</p>}
            </div>
          </div>

          {/* Ward presets */}
          <div className="mb-3">
            <label className="block text-xs text-pulse-muted mb-2 uppercase tracking-wider">{t('volunteers.location')}</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {WARD_PRESETS.map((p) => (
                <button key={p.ward} type="button" onClick={() => applyWard(p)}
                  className={`text-[11px] px-2 py-1 rounded border transition-colors ${
                    form.location.ward === p.ward ? 'border-pulse-teal text-pulse-teal' : 'border-pulse-border text-pulse-muted hover:border-pulse-teal/50'
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
            {errors.location && <p className="text-[11px] text-red-400">{errors.location}</p>}
          </div>

          {/* Skills */}
          <div className="mb-4">
            <label className="block text-xs text-pulse-muted mb-2 uppercase tracking-wider">{t('volunteers.skills')}</label>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {ALL_SKILLS.map((s) => (
                <button key={s.value} type="button" onClick={() => toggleSkill(s.value)}
                  className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
                    form.selectedSkills.includes(s.value) ? 'border-pulse-teal bg-pulse-teal/20 text-pulse-teal' : 'border-pulse-border text-pulse-muted hover:border-pulse-teal/50'
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
            {errors.skills && <p className="text-[11px] text-red-400 mt-1">{errors.skills}</p>}
          </div>

          <div className="flex gap-3">
            <button onClick={handleRegister} disabled={submitting} className="btn-primary flex items-center gap-2 text-sm">
              {submitting && <Loader2 size={13} className="animate-spin" />}
              {submitting ? t('volunteers.registering') : t('volunteers.registerBtn')}
            </button>
            <button onClick={() => { setShowForm(false); setForm(INIT_FORM); setErrors({}); }} className="btn-ghost text-sm">
              {t('volunteers.cancel')}
            </button>
          </div>
        </div>
      )}

      {error && <ErrorBanner message={error} onRetry={load} />}

      {loading ? (
        <div className="flex items-center justify-center h-48"><Spinner size={32} /></div>
      ) : volunteers.length === 0 ? (
        <EmptyState icon={Users} title={t('volunteers.noVolunteers')} message={t('volunteers.noVolunteersHint')} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {volunteers.map((v) => <VolunteerCard key={v.id} volunteer={v} onUpdate={load} />)}
        </div>
      )}
    </div>
  );
}
