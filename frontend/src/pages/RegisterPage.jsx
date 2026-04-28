import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Mail, Lock, User, Phone, Loader2 } from 'lucide-react';
import { authApi } from '../services/api';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import { useLang } from '../components/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function RegisterPage() {
  const navigate   = useNavigate();
  const { login }  = useAuth();
  const { addToast } = useToast();
  const { t } = useLang();

  const [form, setForm]       = useState({ name: '', email: '', password: '', phone: '', role: 'user' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});

  const ROLES = [
    { value: 'user',      label: `👤 ${t('auth.communityMember')}`, desc: t('auth.communityMemberDesc') },
    { value: 'volunteer', label: `🤝 ${t('auth.volunteer')}`,       desc: t('auth.volunteerDesc') },
  ];

  function setField(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
    if (errors[key]) setErrors((e) => { const n = { ...e }; delete n[key]; return n; });
  }

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = t('auth.errors.nameRequired');
    if (!form.email)       e.email = t('auth.errors.emailRequired');
    if (form.password.length < 6) e.password = t('auth.errors.passwordLength');
    return e;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    try {
      const data = await authApi.register(form);
      login(data);
      addToast(t('auth.welcomeNew', { name: data.user.name }), 'success');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err.details) {
        const fe = {};
        err.details.forEach((d) => { fe[d.field] = d.message; });
        setErrors(fe);
      } else {
        setErrors({ general: err.message });
      }
    } finally {
      setLoading(false);
    }
  }

  const inputCls = (key) =>
    `w-full bg-pulse-bg border rounded-lg pl-10 pr-4 py-2.5 text-sm text-pulse-text outline-none focus:border-pulse-teal transition-colors ${
      errors[key] ? 'border-pulse-critical' : 'border-pulse-border'
    }`;

  const fields = [
    { key: 'name',     label: t('auth.fullName'),    type: 'text',     icon: User,  placeholder: t('auth.namePlaceholder') },
    { key: 'email',    label: t('auth.email'),       type: 'email',    icon: Mail,  placeholder: t('auth.emailPlaceholder') },
    { key: 'password', label: t('auth.password'),    type: 'password', icon: Lock,  placeholder: t('auth.passwordMinLength') },
    { key: 'phone',    label: t('auth.phone'),       type: 'tel',      icon: Phone, placeholder: t('auth.phonePlaceholder') },
  ];

  return (
    <div className="min-h-screen bg-pulse-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <Activity size={28} className="text-pulse-teal" />
            <span className="text-xl font-bold text-pulse-text">{t('app.name')}</span>
          </div>
          <p className="text-pulse-muted text-sm">{t('app.tagline3')}</p>
          <div className="flex justify-center mt-3">
            <LanguageSwitcher />
          </div>
        </div>

        <div className="card p-6">
          <h1 className="text-lg font-semibold text-pulse-text mb-5">{t('auth.createAccount')}</h1>

          {errors.general && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {errors.general}
            </div>
          )}

          <div className="mb-5">
            <label className="block text-xs font-medium text-pulse-muted mb-2 uppercase tracking-wider">
              {t('auth.iAmA')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setField('role', r.value)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    form.role === r.value
                      ? 'border-pulse-teal bg-pulse-tealDark/20'
                      : 'border-pulse-border hover:border-pulse-teal/50'
                  }`}
                >
                  <p className="text-sm font-medium text-pulse-text">{r.label}</p>
                  <p className="text-[11px] text-pulse-muted mt-0.5">{r.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map(({ key, label, type, icon: Icon, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-pulse-muted mb-1.5 uppercase tracking-wider">
                  {label}
                </label>
                <div className="relative">
                  <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-pulse-muted" />
                  <input
                    type={type}
                    value={form[key]}
                    onChange={(e) => setField(key, e.target.value)}
                    placeholder={placeholder}
                    className={inputCls(key)}
                  />
                </div>
                {errors[key] && <p className="text-[11px] text-pulse-critical mt-1">{errors[key]}</p>}
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? t('auth.creatingAccount') : t('auth.createAccount')}
            </button>
          </form>

          <p className="text-center text-sm text-pulse-muted mt-5">
            {t('auth.hasAccount')}{' '}
            <Link to="/login" className="text-pulse-teal hover:underline">{t('auth.signIn')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
