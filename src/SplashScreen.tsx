import { useEffect, useState } from 'react';
import type { Theme } from './themes';
import type { Lang } from './i18n';
import { t } from './i18n';
import Logo from './Logo';

interface SplashProps {
  theme: Theme;
  lang: Lang;
  onDone: () => void;
}

const STEPS_KEY = (lang: Lang) => [
  t(lang).splashConfig,
  t(lang).splashFonts,
  t(lang).splashTheme,
  t(lang).splashLang,
  t(lang).splashWebview,
  t(lang).splashInit,
  t(lang).splashReady,
];

export default function SplashScreen({ theme, lang, onDone }: SplashProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress]   = useState(0);
  const [fadeOut, setFadeOut]      = useState(false);

  const steps = STEPS_KEY(lang);
  // Короткий сплэш: реальная загрузка (конфиг+шрифты) занимает <1с,
  // держать пользователя 8-14 секунд на фейковых шагах — вредительство
  const totalMs = 1800 + Math.random() * 700;

  useEffect(() => {
    // Прогресс-бар
    const progInterval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(progInterval); return 100; }
        return p + (100 / (totalMs / 80));
      });
    }, 80);

    // Шаги загрузки
    steps.forEach((_, i) => {
      setTimeout(() => setStepIndex(i), (totalMs / steps.length) * i);
    });

    // Фейд-аут и завершение
    setTimeout(() => {
      setFadeOut(true);
      setTimeout(onDone, 700);
    }, totalMs);

    return () => clearInterval(progInterval);
  }, []);

  return (
    <div
      className={`splash-root ${fadeOut ? 'splash-fade-out' : ''}`}
      style={{ background: theme.splashBg }}
    >
      {/* Звёзды */}
      <div className="splash-stars">
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} className="splash-star" style={{
            left: `${Math.random() * 100}%`,
            top:  `${Math.random() * 100}%`,
            width:  Math.random() * 2 + 0.5,
            height: Math.random() * 2 + 0.5,
            opacity: Math.random() * 0.6 + 0.1,
            animationDuration: `${Math.random() * 3 + 2}s`,
            background: theme.starColor,
          }} />
        ))}
      </div>

      <div className="splash-content">
        {/* Логотип / заголовок */}
        <div className="splash-logo" style={{ color: theme.textPrimary }}>
          <div className="splash-logo-ascii" style={{ color: theme.accent }}>
            {`░█████╗░░██████╗░█████╗░██╗██╗
██╔══██╗██╔════╝██╔══██╗██║██║
███████║╚█████╗░██║░░╚═╝██║██║
██╔══██║░╚═══██╗██║░░██╗██║██║
██║░░██║██████╔╝╚█████╔╝██║██║
╚═╝░░╚═╝╚═════╝░╚════╝░╚═╝╚═╝`}
          </div>
          <div className="splash-subtitle" style={{ color: theme.textMuted, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            <Logo size={14} accent={theme.accent} /> Art Studio
          </div>
        </div>

        {/* Спиннер */}
        <div className="splash-spinner-wrap">
          <svg className="splash-spinner" viewBox="0 0 50 50"
            style={{ stroke: theme.splashSpinner }}>
            <circle cx="25" cy="25" r="20"
              fill="none" strokeWidth="3"
              strokeDasharray="80 120"
              strokeLinecap="round" />
          </svg>
        </div>

        {/* Текущий шаг */}
        <div className="splash-step" style={{ color: theme.splashText }}>
          {steps[Math.min(stepIndex, steps.length - 1)]}
        </div>

        {/* Прогресс-бар */}
        <div className="splash-progress-track"
          style={{ background: `${theme.splashSpinner}22` }}>
          <div className="splash-progress-fill"
            style={{
              width: `${Math.min(progress, 100)}%`,
              background: theme.splashSpinner,
            }} />
        </div>
      </div>
    </div>
  );
}