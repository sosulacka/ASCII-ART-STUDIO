// Модальные окна и оверлеи приложения.
import type { Theme } from '../themes';
import { t, type Lang } from '../i18n';

export function SaveModal({ type, lang, onClose, onChoose }: {
  type: 'image' | 'video' | 'text';
  lang: Lang;
  onClose: () => void;
  onChoose: (f: string) => void;
}) {
  const s = t(lang);
  return (
    <div className="modal-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <p className="modal-title">{s.formatTitle}</p>
        <p className="modal-subtitle">
          {type === 'video' ? s.formatSubVideo : type === 'text' ? s.formatSubText : s.formatSubImage}
        </p>
        <div className="modal-buttons">
          {type === 'video' ? (
            <>
              <button className="modal-btn" onClick={() => onChoose('gif')}>
                <span className="modal-btn-ext">.gif</span>
                <span>{s.gifAnim}</span>
              </button>
              <button className="modal-btn" onClick={() => onChoose('mp4')}>
                <span className="modal-btn-ext">.mp4</span>
                <span>{s.mp4Video}</span>
              </button>
            </>
          ) : type === 'text' ? (
            <>
              <button className="modal-btn" onClick={() => onChoose('txt')}>
                <span className="modal-btn-ext">.txt</span>
                <span>{s.textTxt}</span>
              </button>
              <button className="modal-btn" onClick={() => onChoose('md')}>
                <span className="modal-btn-ext">.md</span>
                <span>{s.markdownMd}</span>
              </button>
              <button className="modal-btn" onClick={() => onChoose('png')}>
                <span className="modal-btn-ext">.png</span>
                <span>{s.pngImage}</span>
              </button>
              <button className="modal-btn" onClick={() => onChoose('gif')}>
                <span className="modal-btn-ext">.gif</span>
                <span>{s.gifImage}</span>
              </button>
            </>
          ) : (
            <>
              <button className="modal-btn" onClick={() => onChoose('html')}>
                <span className="modal-btn-ext">.html</span>
                <span>{s.coloredHtml}</span>
              </button>
              <button className="modal-btn" onClick={() => onChoose('txt')}>
                <span className="modal-btn-ext">.txt</span>
                <span>{s.textTxt}</span>
              </button>
              <button className="modal-btn" onClick={() => onChoose('png')}>
                <span className="modal-btn-ext">.png</span>
                <span>{s.pngImage}</span>
              </button>
              <button className="modal-btn" onClick={() => onChoose('gif')}>
                <span className="modal-btn-ext">.gif</span>
                <span>{s.gifImage}</span>
              </button>
            </>
          )}
        </div>
        <button className="modal-cancel" onClick={onClose}>{s.cancel}</button>
      </div>
    </div>
  );
}

export function FFmpegDialog({ lang, onClose, onInstall, onManual, installing }: {
  lang: Lang;
  onClose: () => void;
  onInstall: () => void;
  onManual: () => void;
  installing: boolean;
}) {
  const s = t(lang);
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !installing && onClose()}>
      <div className="modal">
        <p className="modal-title">{s.ffmpegNotFound}</p>
        <p className="modal-subtitle">{s.ffmpegNotFoundDesc}</p>

        {installing ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <svg className="lang-spinner" viewBox="0 0 50 50" style={{
              stroke: 'var(--accent)',
              width: 40,
              height: 40,
              margin: '0 auto 10px'
            }}>
              <circle cx="25" cy="25" r="20" fill="none" strokeWidth="3"
                strokeDasharray="80 120" strokeLinecap="round" />
            </svg>
            <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              {s.ffmpegInstalling}
            </div>
          </div>
        ) : (
          <>
            <div className="modal-buttons">
              <button className="modal-btn" onClick={onInstall}>
                <span className="modal-btn-ext">AUTO</span>
                <span>{s.ffmpegInstallAuto}</span>
              </button>
              <button className="modal-btn" onClick={onManual}>
                <span className="modal-btn-ext">WEB</span>
                <span>{s.ffmpegInstallManual}</span>
              </button>
            </div>
            <button className="modal-cancel" onClick={onClose}>{s.cancel}</button>
          </>
        )}
      </div>
    </div>
  );
}

export function LangTransition({ active, theme, lang }: {
  active: boolean;
  theme: Theme;
  lang: Lang;
}) {
  return (
    <div
      className={`lang-transition-overlay ${active ? 'active' : ''}`}
      style={{ background: theme.splashBg }}
    >
      <svg className="lang-spinner" viewBox="0 0 50 50"
        style={{ stroke: theme.splashSpinner }}>
        <circle cx="25" cy="25" r="20" fill="none" strokeWidth="3"
          strokeDasharray="80 120" strokeLinecap="round" />
      </svg>
      <div className="lang-spinner-text" style={{ color: theme.splashText }}>
        {t(lang).splashLang}
      </div>
    </div>
  );
}
