/**
 * LanguageSwitcher Component
 *
 * Renders a compact EN | हि toggle button pair.
 * Plugs into LanguageContext — no props needed.
 * Designed to sit in the Sidebar footer area.
 */

import { useLang } from './LanguageContext';

const LANGUAGES = [
  { code: 'en', label: 'EN', title: 'English' },
  { code: 'hi', label: 'हि', title: 'हिंदी' },
];

export default function LanguageSwitcher() {
  const { lang, setLang } = useLang();

  return (
    <div
      className="flex items-center gap-0.5 bg-pulse-bg rounded-lg p-0.5 border border-pulse-border"
      title="Switch Language"
    >
      {LANGUAGES.map(({ code, label, title }) => (
        <button
          key={code}
          onClick={() => setLang(code)}
          title={title}
          className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all duration-150 ${
            lang === code
              ? 'bg-pulse-teal text-pulse-bg shadow-sm'
              : 'text-pulse-muted hover:text-pulse-text'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
