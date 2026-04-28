import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, Users, MapPin, Zap } from 'lucide-react';
import { authApi } from '../services/api';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import { useLang } from '../components/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

/* Decorative impact stat shown on the left hero panel */
function ImpactStat({ icon: Icon, value, label }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
        <Icon size={18} className="text-white/90" />
      </div>
      <div>
        <p className="text-white font-bold text-sm leading-none">{value}</p>
        <p className="text-white/60 text-xs mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const navigate     = useNavigate();
  const location     = useLocation();
  const { login }    = useAuth();
  const { addToast } = useToast();
  const { t }        = useLang();

  const [form, setForm]       = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError]     = useState('');
  const [focused, setFocused] = useState('');

  const redirectTo = location.state?.from || '/dashboard';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authApi.login(form);
      login(data);
      addToast(t('auth.welcomeBack', { name: data.user.name }), 'success');
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#080d14]">

      {/* ── LEFT HERO PANEL (hidden on small screens) ──────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col justify-between p-12"
        style={{
          background: 'linear-gradient(135deg, #0a1628 0%, #0d2137 40%, #0a2a1f 100%)',
        }}
      >
        {/* Decorative grid overlay */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(0,180,216,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(0,180,216,0.8) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Floating glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #00b4d8 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full opacity-8 blur-3xl"
          style={{ background: 'radial-gradient(circle, #5dcaa5 0%, transparent 70%)' }} />

        {/* Top: Brand */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
              style={{ background: 'rgba(0,180,216,0.15)', border: '1px solid rgba(0,180,216,0.3)' }}>
              🤝
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">{t('app.name')}</h1>
              <p className="text-xs text-[#00b4d8] font-medium tracking-widest uppercase">
                Civic Intelligence Platform
              </p>
            </div>
          </div>
        </div>

        {/* Middle: Tagline + description */}
        <div className="relative z-10">
          <p className="text-4xl font-black text-white leading-tight mb-4">
            Connecting<br />
            <span style={{ color: '#00b4d8' }}>People.</span><br />
            Solving<br />
            <span style={{ color: '#5dcaa5' }}>Problems.</span>
          </p>
          <p className="text-white/50 text-sm leading-relaxed max-w-sm">
            JanSahay is an AI-powered civic platform that connects NGOs, volunteers,
            and communities to resolve real-world problems in real time — across
            Raipur, Chhattisgarh and beyond.
          </p>

          {/* Impact stats */}
          <div className="mt-8 space-y-4">
            <ImpactStat icon={MapPin}  value="12 Wards covered"     label="Raipur, Chhattisgarh" />
            <ImpactStat icon={Users}   value="240+ Volunteers"       label="Ready to respond" />
            <ImpactStat icon={Zap}     value="AI-powered triage"     label="Urgency scoring & dispatch" />
          </div>
        </div>

        {/* Bottom: Feature chips */}
        <div className="relative z-10 flex flex-wrap gap-2">
          {['📊 Live Dashboard', '🗺️ Crisis Map', '🤖 AI Engine', '📋 Task Board', '🌐 SDG Tracker'].map((f) => (
            <span key={f} className="text-xs px-3 py-1.5 rounded-full text-white/70"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* ── RIGHT LOGIN PANEL ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 relative">

        {/* Mobile brand header */}
        <div className="lg:hidden flex items-center gap-3 mb-8 self-start">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: 'rgba(0,180,216,0.15)', border: '1px solid rgba(0,180,216,0.3)' }}>
            🤝
          </div>
          <div>
            <h1 className="text-lg font-black text-white">{t('app.name')}</h1>
            <p className="text-[10px] text-[#00b4d8] uppercase tracking-widest">Civic Intelligence</p>
          </div>
        </div>

        {/* Language switcher */}
        <div className="absolute top-6 right-6">
          <LanguageSwitcher />
        </div>

        {/* Login card */}
        <div className="w-full max-w-md">
          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-black text-white mb-1">{t('auth.signInTitle')}</h2>
            <p className="text-sm text-white/40">
              {t('auth.noAccount')}{' '}
              <Link to="/register" className="text-[#00b4d8] hover:underline font-medium">
                {t('auth.register')}
              </Link>
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl text-sm text-red-300 flex items-start gap-2"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <span className="text-red-400 shrink-0 mt-0.5">⚠</span>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">
                {t('auth.email')}
              </label>
              <div className="relative">
                <Mail size={15}
                  className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${focused === 'email' ? 'text-[#00b4d8]' : 'text-white/25'}`}
                />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused('')}
                  placeholder={t('auth.emailPlaceholder')}
                  required
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm text-white placeholder-white/20 outline-none transition-all duration-200"
                  style={{
                    background: focused === 'email' ? 'rgba(0,180,216,0.06)' : 'rgba(255,255,255,0.04)',
                    border: focused === 'email' ? '1px solid rgba(0,180,216,0.5)' : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: focused === 'email' ? '0 0 0 3px rgba(0,180,216,0.08)' : 'none',
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Lock size={15}
                  className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${focused === 'password' ? 'text-[#00b4d8]' : 'text-white/25'}`}
                />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused('')}
                  placeholder={t('auth.passwordPlaceholder')}
                  required
                  className="w-full pl-11 pr-12 py-3.5 rounded-xl text-sm text-white placeholder-white/20 outline-none transition-all duration-200"
                  style={{
                    background: focused === 'password' ? 'rgba(0,180,216,0.06)' : 'rgba(255,255,255,0.04)',
                    border: focused === 'password' ? '1px solid rgba(0,180,216,0.5)' : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: focused === 'password' ? '0 0 0 3px rgba(0,180,216,0.08)' : 'none',
                  }}
                />
                <button type="button" onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors">
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-[#080d14] transition-all duration-200 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: loading ? '#00b4d8' : 'linear-gradient(135deg, #00b4d8 0%, #5dcaa5 100%)',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(0,180,216,0.25)',
              }}
            >
              {loading
                ? <><Loader2 size={15} className="animate-spin" /> {t('auth.signingIn')}</>
                : <>{t('auth.signIn')} <ArrowRight size={15} /></>
              }
            </button>
          </form>

          {/* Demo hint */}
          <div className="mt-6 p-3.5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-xs text-white/35 text-center leading-relaxed">
              🔑 {t('auth.demoHint')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
