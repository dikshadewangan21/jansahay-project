/**
 * VoiceInput Component (i18n-aware)
 * Uses useLang() for all displayed text.
 */
import { useState } from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useLang } from './LanguageContext';

const LANGS = [
  { code: 'hi-IN', label: 'हिंदी', flag: '🇮🇳' },
  { code: 'en-IN', label: 'English', flag: '🏳️' },
];

export default function VoiceInput({ onTranscript, disabled = false, className = '' }) {
  const { t } = useLang();
  const [selectedLang, setSelectedLang] = useState('hi-IN');
  const [liveText, setLiveText] = useState('');

  const { listen, stop, isListening, isSupported, error } = useSpeechRecognition({
    onResult: (text) => { setLiveText(text); onTranscript?.(text); },
    onError:  () => setLiveText(''),
  });

  function handleToggle() {
    if (isListening) { stop(); setLiveText(''); }
    else { setLiveText(''); listen(selectedLang); }
  }

  if (!isSupported) {
    return (
      <div className={`flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-400 ${className}`}>
        <AlertCircle size={13} />
        {t('submit.voice.notSupported')}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {LANGS.map((l) => (
            <button key={l.code} type="button" onClick={() => setSelectedLang(l.code)} disabled={isListening}
              className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
                selectedLang === l.code ? 'border-pulse-teal bg-pulse-teal/20 text-pulse-teal' : 'border-pulse-border text-pulse-muted hover:border-pulse-teal/50'
              } disabled:opacity-40`}>
              {l.flag} {l.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={handleToggle} disabled={disabled}
          aria-label={isListening ? t('submit.voice.stop') : t('submit.voice.speak')}
          className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200 disabled:opacity-40 ${
            isListening ? 'bg-red-500/20 border-red-500/60 text-red-400 hover:bg-red-500/30' : 'bg-pulse-teal/10 border-pulse-teal/50 text-pulse-teal hover:bg-pulse-teal/20'
          }`}>
          {isListening && <span className="absolute inset-0 rounded-lg animate-ping bg-red-500/20 pointer-events-none" />}
          {isListening ? <><MicOff size={14} /> {t('submit.voice.stop')}</> : <><Mic size={14} /> {t('submit.voice.speak')}</>}
        </button>
      </div>
      {isListening && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30">
          <div className="flex items-end gap-0.5 h-4">
            {[1,2,3,4].map((i) => (
              <div key={i} className="w-0.5 bg-red-400 rounded-full animate-pulse"
                style={{ height: `${Math.random()*8+4}px`, animationDelay: `${i*0.1}s`, animationDuration: `${0.4+i*0.1}s` }} />
            ))}
          </div>
          <span className="text-xs text-red-400">{liveText ? `"${liveText}"` : t('submit.voice.listening')}</span>
        </div>
      )}
      {error && !isListening && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <AlertCircle size={12} className="text-amber-400 shrink-0" />
          <p className="text-xs text-amber-400">{error}</p>
        </div>
      )}
    </div>
  );
}
