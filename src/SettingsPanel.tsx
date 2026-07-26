import { useState, useRef, useEffect, MouseEvent as ReactMouseEvent } from 'react';
import { X, Upload } from 'lucide-react';
import { THEMES } from './themes';
import { LANGUAGES, t, type Lang } from './i18n';
import { type AppConfig } from './useConfig';
import { ColorPicker } from './components/ColorPicker';

// ── FlagIcon для рендеринга флагов без Emoji (фикс для Windows) ──
function FlagIcon({ code }: { code: string }) {
  switch (code) {
    case 'ru':
      return (
        <svg width="24" height="16" viewBox="0 0 3 2" style={{ borderRadius: 2 }}>
          <rect width="3" height="2" fill="#fff"/>
          <rect width="3" height="1.333" y="0.667" fill="#0039a6"/>
          <rect width="3" height="0.667" y="1.333" fill="#d52b1e"/>
        </svg>
      );
    case 'en':
      return (
        <svg width="24" height="16" viewBox="0 0 190 100" style={{ borderRadius: 2 }}>
          <rect width="190" height="100" fill="#B22234"/>
          <g stroke="#FFF" strokeWidth="7.7">
            <line x1="0" y1="11.5" x2="190" y2="11.5" stroke="#FFF" />
            <line x1="0" y1="26.9" x2="190" y2="26.9" stroke="#FFF" />
            <line x1="0" y1="42.3" x2="190" y2="42.3" stroke="#FFF" />
            <line x1="0" y1="57.7" x2="190" y2="57.7" stroke="#FFF" />
            <line x1="0" y1="73.1" x2="190" y2="73.1" stroke="#FFF" />
            <line x1="0" y1="88.5" x2="190" y2="88.5" stroke="#FFF" />
          </g>
          <rect width="76" height="53.8" fill="#3C3B6E"/>
          <circle cx="15" cy="12" r="2" fill="#FFF"/>
          <circle cx="38" cy="12" r="2" fill="#FFF"/>
          <circle cx="61" cy="12" r="2" fill="#FFF"/>
          <circle cx="26.5" cy="27" r="2" fill="#FFF"/>
          <circle cx="49.5" cy="27" r="2" fill="#FFF"/>
          <circle cx="15" cy="42" r="2" fill="#FFF"/>
          <circle cx="38" cy="42" r="2" fill="#FFF"/>
          <circle cx="61" cy="42" r="2" fill="#FFF"/>
        </svg>
      );
    case 'de':
      return (
        <svg width="24" height="16" viewBox="0 0 5 3" style={{ borderRadius: 2 }}>
          <rect width="5" height="3" fill="#ffce00"/>
          <rect width="5" height="2" fill="#dd0000"/>
          <rect width="5" height="1" fill="#000"/>
        </svg>
      );
    case 'fr':
      return (
        <svg width="24" height="16" viewBox="0 0 3 2" style={{ borderRadius: 2 }}>
          <rect width="1" height="2" fill="#00209F"/>
          <rect width="1" height="2" x="1" fill="#FFF"/>
          <rect width="1" height="2" x="2" fill="#F42C3E"/>
        </svg>
      );
    case 'zh':
      return (
        <svg width="24" height="16" viewBox="0 0 30 20" style={{ borderRadius: 2 }}>
          <rect width="30" height="20" fill="#de2910"/>
          <polygon points="5,2 6.5,6.5 2.5,3.8 7.5,3.8 3.5,6.5" fill="#ffde00"/>
        </svg>
      );
    case 'ja':
      return (
        <svg width="24" height="16" viewBox="0 0 3 2" style={{ borderRadius: 2, border: '1px solid rgba(255,255,255,0.1)' }}>
          <rect width="3" height="2" fill="#FFF"/>
          <circle cx="1.5" cy="1" r="0.6" fill="#bc002d"/>
        </svg>
      );
    case 'es':
      return (
        <svg width="24" height="16" viewBox="0 0 3 2" style={{ borderRadius: 2 }}>
          <rect width="3" height="2" fill="#c60b1e"/>
          <rect width="3" height="1" y="0.5" fill="#ffc400"/>
          <circle cx="0.8" cy="1" r="0.15" fill="#c60b1e" opacity="0.8"/>
        </svg>
      );
    case 'pt':
      return (
        <svg width="24" height="16" viewBox="0 0 220 154" style={{ borderRadius: 2 }}>
          <rect width="220" height="154" fill="#009c3b"/>
          <polygon points="110,14 206,77 110,140 14,77" fill="#ffdf00"/>
          <circle cx="110" cy="77" r="31.5" fill="#002277"/>
        </svg>
      );
    case 'ko':
      return (
        <svg width="24" height="16" viewBox="0 0 30 20" style={{ borderRadius: 2, background: '#fff', border: '1px solid rgba(0,0,0,0.1)' }}>
          <circle cx="15" cy="10" r="5" fill="#c60b1e"/>
          <path d="M15,10 A2.5,2.5 0 0,0 15,5 A2.5,2.5 0 0,0 15,10" fill="#003478"/>
          <rect x="5" y="4" width="3" height="1" fill="#000" transform="rotate(45 5 4)"/>
          <rect x="22" y="4" width="3" height="1" fill="#000" transform="rotate(-45 22 4)"/>
          <rect x="5" y="15" width="3" height="1" fill="#000" transform="rotate(-45 5 15)"/>
          <rect x="22" y="15" width="3" height="1" fill="#000" transform="rotate(45 22 15)"/>
        </svg>
      );
    case 'it':
      return (
        <svg width="24" height="16" viewBox="0 0 3 2" style={{ borderRadius: 2 }}>
          <rect width="1" height="2" fill="#009246"/>
          <rect width="1" height="2" x="1" fill="#FFF"/>
          <rect width="1" height="2" x="2" fill="#F12B24"/>
        </svg>
      );
    default:
      return null;
  }
}

// ── Tilt для кнопок внутри настроек ──────────────────────────
function TiltBtn({ children, className = '', onClick, title, disabled }: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  title?: string;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const onMove = (e: ReactMouseEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el || disabled) return;
    const r  = el.getBoundingClientRect();
    const rx = ((e.clientY - r.top  - r.height / 2) / r.height) * -8;
    const ry = ((e.clientX - r.left - r.width  / 2) / r.width ) *  8;
    el.style.transform = `perspective(400px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.04)`;
  };
  const onLeave = () => { if (ref.current) ref.current.style.transform = ''; };
  return (
    <button ref={ref} className={className} onClick={onClick} title={title}
      disabled={disabled} onMouseMove={onMove} onMouseLeave={onLeave}
      style={{ transition: 'transform 0.12s ease', cursor: disabled ? 'not-allowed' : 'pointer' }}>
      {children}
    </button>
  );
}

// ── Кастомный toggle ──────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 36, height: 20,
        background: checked ? 'var(--accent)' : 'var(--bg-hover)',
        border: `1px solid ${checked ? 'var(--accent)' : 'var(--border-strong)'}`,
        borderRadius: 10,
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.2s, border-color 0.2s',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute',
        top: 2, left: checked ? 18 : 2,
        width: 14, height: 14,
        borderRadius: '50%',
        background: checked ? 'var(--accent-text)' : 'var(--text-muted)',
        transition: 'left 0.2s, background 0.2s',
      }} />
    </div>
  );
}

// ── Кастомный number input ────────────────────────────────────
function NumInput({ value, min, max, onChange, onError }: {
  value: number; min: number; max: number;
  onChange: (v: number) => void;
  onError?: (limitValue: number, isMin: boolean) => void;
}) {
  const [localValue, setLocalValue] = useState(String(value));
  const [isEditing, setIsEditing] = useState(false);
  const validationTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setLocalValue(String(value));
    }
  }, [value, isEditing]);

  const validateAndApply = (newValue: string) => {
    if (newValue === '') {
      // Пустое поле - ничего не делаем, ждём дальнейшего ввода
      return;
    }
    
    const num = Number(newValue);
    if (!isNaN(num)) {
      if (num < min) {
        onChange(min);
        setLocalValue(String(min));
        if (onError) onError(min, true);
      } else if (num > max) {
        onChange(max);
        setLocalValue(String(max));
        if (onError) onError(max, false);
      } else {
        onChange(num);
      }
    }
  };

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);
    setIsEditing(true);
    
    // Очищаем предыдущий таймаут
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }
    
    // Устанавливаем новый таймаут на 3 секунды
    validationTimeoutRef.current = window.setTimeout(() => {
      validateAndApply(newValue);
      setIsEditing(false);
    }, 3000);
  };

  const handleBlur = () => {
    // Очищаем таймаут при blur
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }
    
    setIsEditing(false);
    
    if (localValue === '') {
      // Если поле пустое, возвращаем минимальное значение
      setLocalValue(String(min));
      onChange(min);
    } else if (isNaN(Number(localValue))) {
      // Если невалидное значение, возвращаем текущее
      setLocalValue(String(value));
    } else {
      // Валидируем и применяем
      validateAndApply(localValue);
    }
  };

  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <button
        onClick={() => {
          const newVal = Math.max(min, value - 1);
          onChange(newVal);
        }}
        disabled={value <= min}
        style={{
          background: value <= min ? 'var(--bg-section)' : 'var(--bg-hover)',
          border: '1px solid var(--border-strong)',
          color: value <= min ? 'var(--text-disabled)' : 'var(--text-primary)',
          width: 28,
          height: 28,
          borderRadius: 4,
          cursor: value <= min ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          fontWeight: 600,
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
          if (value > min) {
            e.currentTarget.style.background = 'var(--bg-section)';
            e.currentTarget.style.borderColor = 'var(--accent)';
          }
        }}
        onMouseLeave={(e) => {
          if (value > min) {
            e.currentTarget.style.background = 'var(--bg-hover)';
            e.currentTarget.style.borderColor = 'var(--border-strong)';
          }
        }}
      >−</button>
      <input
        type="text"
        value={localValue}
        onFocus={() => setIsEditing(true)}
        onBlur={handleBlur}
        style={{
          width: 80,
          textAlign: 'center',
          background: 'var(--bg-input)',
          border: '1px solid var(--border-strong)',
          color: 'var(--text-primary)',
          borderRadius: 4,
          padding: '6px 8px',
          fontSize: 13,
          fontFamily: 'var(--font-mono)',
        }}
        onChange={e => handleChange(e.target.value)}
      />
      <button
        onClick={() => {
          const newVal = Math.min(max, value + 1);
          onChange(newVal);
        }}
        disabled={value >= max}
        style={{
          background: value >= max ? 'var(--bg-section)' : 'var(--bg-hover)',
          border: '1px solid var(--border-strong)',
          color: value >= max ? 'var(--text-disabled)' : 'var(--text-primary)',
          width: 28,
          height: 28,
          borderRadius: 4,
          cursor: value >= max ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          fontWeight: 600,
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
          if (value < max) {
            e.currentTarget.style.background = 'var(--bg-section)';
            e.currentTarget.style.borderColor = 'var(--accent)';
          }
        }}
        onMouseLeave={(e) => {
          if (value < max) {
            e.currentTarget.style.background = 'var(--bg-hover)';
            e.currentTarget.style.borderColor = 'var(--border-strong)';
          }
        }}
      >+</button>
    </div>
  );
}

// ── Кастомный select ──────────────────────────────────────────
function CustomSelect({ value, options, onChange }: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value) ?? options[0];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="custom-select-trigger"
        onClick={() => setOpen(v => !v)}
      >
        {selected.label}
        <span style={{ marginLeft: 6, opacity: 0.5, fontSize: 10 }}>▾</span>
      </button>
      {open && (
        <div className="custom-select-menu">
          {options.map(opt => (
            <div key={opt.value}
              className={`custom-select-option ${opt.value === value ? 'selected' : ''}`}
              onClick={() => { onChange(opt.value); setOpen(false); }}>
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Строки настроек ───────────────────────────────────────────
function BoolRow({ label, val, onChange }: {
  label: string; val: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="setting-row">
      <span className="setting-label">{label}</span>
      <Toggle checked={val} onChange={onChange} />
    </div>
  );
}

function NumRow({ label, val, min, max, onChange, onError }: {
  label: string; val: number; min: number; max: number;
  onChange: (v: number) => void;
  onError?: (limitValue: number, isMin: boolean) => void;
}) {
  return (
    <div className="setting-row">
      <span className="setting-label">{label}</span>
      <NumInput value={val} min={min} max={max} onChange={onChange} onError={onError} />
    </div>
  );
}

function ColorRow({ label, val, onChange }: {
  label: string; val: string; onChange: (v: string) => void;
}) {
  return (
    <div className="setting-row">
      <span className="setting-label">{label}</span>
      <ColorPicker value={val} onChange={onChange} />
    </div>
  );
}

// ── Шрифты ───────────────────────────────────────────────────
const FONT_OPTIONS = [
  'JetBrains Mono', 'Fira Code', 'Source Code Pro',
  'IBM Plex Mono', 'Roboto Mono', 'Space Mono',
  'Consolas', 'Courier New',
];

// ── Редактор кастомной темы ───────────────────────────────────
function ThemeEditor({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const s = t(lang);
  const [name, setName] = useState(s.themeNameDefault || 'My Theme');
  const [colors, setColors] = useState({
    bgApp: '#0a0a0b',
    bgSidebar: '#0c0c0e',
    accent: '#d0d0d8',
    textPrimary: '#d0d0d8',
    textMuted: '#505058',
    border: 'rgba(255,255,255,0.06)',
  });

  return (
    <div className="modal-overlay theme-editor-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal theme-editor-modal" style={{ maxWidth: 420, width: '100%' }}>
        <p className="modal-title">{s.themeEditor}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }} className="custom-scrollbar">
          <div className="setting-row">
            <span className="setting-label">{s.themeNameLabel}</span>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="text-input" style={{ width: 140 }} />
          </div>
          <ColorRow label={s.themeBgApp} val={colors.bgApp}
            onChange={v => setColors(prev => ({ ...prev, bgApp: v }))} />
          <ColorRow label={s.themeBgSidebar} val={colors.bgSidebar}
            onChange={v => setColors(prev => ({ ...prev, bgSidebar: v }))} />
          <ColorRow label={s.themeAccent} val={colors.accent}
            onChange={v => setColors(prev => ({ ...prev, accent: v }))} />
          <ColorRow label={s.themeTextPrimary} val={colors.textPrimary}
            onChange={v => setColors(prev => ({ ...prev, textPrimary: v }))} />
          <ColorRow label={s.themeTextMuted} val={colors.textMuted}
            onChange={v => setColors(prev => ({ ...prev, textMuted: v }))} />
          <ColorRow label={s.themeBorder} val={colors.border.startsWith('#') ? colors.border : '#000000'}
            onChange={v => setColors(prev => ({ ...prev, border: v }))} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button className="modal-cancel" onClick={onClose}>{s.cancel}</button>
          <button className="btn-primary" style={{ flex: 1 }} onClick={() => {
            // Сохраняем кастомную тему в localStorage
            const saved = JSON.parse(localStorage.getItem('custom_themes') || '[]');
            saved.push({ id: `custom_${Date.now()}`, name, ...colors });
            localStorage.setItem('custom_themes', JSON.stringify(saved));
            onClose();
          }}>
            {s.saveSettings}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Главный компонент ─────────────────────────────────────────
export function SettingsPanel({ config, lang, onSave, onReset, onClose, onPaletteChange, showToast }: {
  config: AppConfig;
  lang: Lang;
  onSave: (c: AppConfig) => void;
  onReset: () => void;
  onClose: () => void;
  onPaletteChange?: (val: number) => void;
  showToast?: (message: string, type: 'info' | 'success' | 'error' | 'warning') => void;
}) {
  const s = t(lang);
  const [local, setLocal] = useState<AppConfig>({ ...config });
  const [showThemeEditor, setShowThemeEditor] = useState(false);
  const fontFileRef = useRef<HTMLInputElement>(null);

  const upd = <K extends keyof AppConfig>(k: K, v: AppConfig[K]) =>
    setLocal(prev => ({ ...prev, [k]: v }));
  
  const handleNumError = (limitValue: number, isMin: boolean) => {
    if (showToast) {
      const template = isMin ? s.numInputMinValue : s.numInputMaxValue;
      const message = template ? template.replace('{0}', String(limitValue)) : `${isMin ? 'Minimum' : 'Maximum'}: ${limitValue}`;
      showToast(message, 'warning');
    }
  };

  // Загрузка кастомного шрифта
  const handleFontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const fontName = file.name.replace(/\.[^.]+$/, '');
    const style = document.createElement('style');
    style.textContent = `@font-face { font-family: '${fontName}'; src: url('${url}'); }`;
    document.head.appendChild(style);
    upd('fontFamily', fontName);
  };


  return (
    <>
      {showThemeEditor && (
        <ThemeEditor lang={lang} onClose={() => setShowThemeEditor(false)} />
      )}

      <div className="settings-overlay"
        onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="settings-panel">

          {/* Заголовок */}
          <div className="settings-header">
            <span className="settings-header-title">{s.settingsTitle}</span>
            <TiltBtn className="header-icon-btn" onClick={onClose}>
              <X size={16} />
            </TiltBtn>
          </div>

          <div className="settings-body custom-scrollbar">

            {/* ── Тема ── */}
            <div className="settings-section-title">{s.theme}</div>
            <div className="themes-grid">
              {THEMES.map(th => (
                <TiltBtn
                  key={th.id}
                  className={`theme-swatch ${local.themeId === th.id ? 'active' : ''}`}
                  onClick={() => upd('themeId', th.id)}
                  title={s.themeNames[th.id as keyof typeof s.themeNames] ?? th.name}
                >
                  <div className="theme-swatch-dot"
                    style={{ background: th.accent, border: `2px solid ${th.border}` }} />
                  <span className="theme-swatch-name">
                    {s.themeNames[th.id as keyof typeof s.themeNames] ?? th.name}
                  </span>
                </TiltBtn>
              ))}

              {/* Кнопка создания кастомной темы */}
              <TiltBtn
                className="theme-swatch"
                onClick={() => setShowThemeEditor(true)}
                title={s.customTheme}
              >
                <div className="theme-swatch-dot" style={{
                  background: 'linear-gradient(135deg, #ff6b6b, #4ecdc4, #45b7d1)',
                  border: '2px solid var(--border)',
                }} />
                <span className="theme-swatch-name">+ {s.customTheme}</span>
              </TiltBtn>
            </div>

            {/* ── Шрифт ── */}
            <div className="settings-section-title">{s.font}</div>
            <div className="setting-row">
              <span className="setting-label">{s.font}</span>
              <CustomSelect
                value={local.fontFamily}
                options={FONT_OPTIONS.map(f => ({ value: f, label: f }))}
                onChange={v => upd('fontFamily', v)}
              />
            </div>

            {/* Превью шрифта */}
            <div className="font-preview" style={{ fontFamily: `'${local.fontFamily}', monospace` }}>
              ASCII @rt #$% 0123 ░▒▓█
            </div>

            {/* Загрузка своего шрифта */}
            <input ref={fontFileRef} type="file" accept=".ttf,.otf,.woff,.woff2"
              style={{ display: 'none' }} onChange={handleFontUpload} />
            <TiltBtn
              className="btn-upload-font"
              onClick={() => fontFileRef.current?.click()}
            >
              <Upload size={12} />
              {s.uploadFont}
            </TiltBtn>

            {/* ── Настройки ── */}
            <div className="settings-section-title">{s.settings}</div>
            <BoolRow label={s.s_showStars}     val={local.showStars}     onChange={v => upd('showStars', v)} />
            
            {local.showStars && (
              <div className="stars-sub-settings" style={{
                paddingLeft: 12,
                borderLeft: '2px solid var(--accent)',
                marginLeft: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                marginTop: 4,
                marginBottom: 8,
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
                    <span>{s.s_starsCount}</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{local.starsCount}</span>
                  </div>
                  <input
                    type="range" min={10} max={300} step={5} value={local.starsCount}
                    onChange={e => upd('starsCount', Number(e.target.value))}
                    className="slider-strict"
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
                    <span>{s.s_starsMinSize}</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{local.starsMinSize.toFixed(1)}</span>
                  </div>
                  <input
                    type="range" min={0.1} max={2.0} step={0.1} value={local.starsMinSize}
                    onChange={e => upd('starsMinSize', Number(e.target.value))}
                    className="slider-strict"
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
                    <span>{s.s_starsMaxSize}</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{local.starsMaxSize.toFixed(1)}</span>
                  </div>
                  <input
                    type="range" min={1.0} max={5.0} step={0.1} value={local.starsMaxSize}
                    onChange={e => upd('starsMaxSize', Number(e.target.value))}
                    className="slider-strict"
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
                  <span>{s.s_starsColor}</span>
                  <ColorPicker value={local.starsColor} onChange={v => upd('starsColor', v)} />
                </div>
              </div>
            )}
            
            <BoolRow label={s.s_autoPlay}      val={local.autoPlay}      onChange={v => upd('autoPlay', v)} />

            <NumRow label={s.s_defaultWidth} val={local.defaultWidth} min={20}  max={600}  onChange={v => upd('defaultWidth', v)} onError={handleNumError} />
            <NumRow label={s.s_defaultZoom}  val={local.defaultZoom}  min={2}   max={64}   onChange={v => upd('defaultZoom', v)} onError={handleNumError} />
            <NumRow label={s.virtualCameraPort} val={local.virtualCameraPort} min={1024} max={65535} onChange={v => upd('virtualCameraPort', v)} onError={handleNumError} />

            <ColorRow label={s.s_defaultBg} val={local.defaultBg}
              onChange={v => upd('defaultBg', v)} />

            <div className="setting-row">
              <span className="setting-label">{s.s_defaultPalette}</span>
              <CustomSelect
                value={String(local.defaultPalette)}
                options={[
                  { value: '0', label: s.paletteStandard },
                  { value: '1', label: s.paletteUltra },
                  { value: '2', label: s.paletteDetailed },
                  { value: '3', label: s.paletteBlocks },
                  { value: '4', label: s.paletteBinary },
                ]}
                onChange={v => {
                  upd('defaultPalette', Number(v));
                  if (onPaletteChange) {
                    onPaletteChange(Number(v));
                  }
                }}
              />
            </div>

            {/* ── Язык — ФЛАГИ ── */}
            <div className="settings-section-title">{s.language}</div>
            <div className="lang-grid">
              {LANGUAGES.map(lng => (
                <TiltBtn
                  key={lng.code}
                  className={`lang-btn ${local.lang === lng.code ? 'active' : ''}`}
                  onClick={() => upd('lang', lng.code)}
                  title={lng.name}
                >
                  <span className="lang-flag">
                    <FlagIcon code={lng.code} />
                  </span>
                  <span className="lang-name">{lng.name}</span>
                </TiltBtn>
              ))}
            </div>

          </div>

          {/* Футер */}
          <div className="settings-footer">
            <TiltBtn 
              className="settings-footer-btn settings-footer-btn--reset" 
              onClick={() => { onReset(); onClose(); }}
            >
              {s.resetDefaults}
            </TiltBtn>
            <TiltBtn 
              className="settings-footer-btn settings-footer-btn--save" 
              onClick={() => { onSave(local); onClose(); }}
            >
              {s.saveSettings}
            </TiltBtn>
          </div>
        </div>
      </div>
    </>
  );
}