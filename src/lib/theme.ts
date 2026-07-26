// Применение темы: пробрасывает цвета темы в CSS-переменные документа.
import type { Theme } from '../themes';

export function applyTheme(theme: Theme, fontFamily: string) {
  const r = document.documentElement.style;
  r.setProperty('--bg-app',            theme.bgApp);
  r.setProperty('--bg-sidebar',        theme.bgSidebar);
  r.setProperty('--bg-section',        theme.bgSection);
  r.setProperty('--bg-hover',          theme.bgHover);
  r.setProperty('--bg-modal',          theme.bgModal);
  r.setProperty('--bg-input',          theme.bgInput);
  r.setProperty('--bg-dropdown',       theme.bgDropdown);
  r.setProperty('--bg-dropdown-opt',   theme.bgDropdownOption);
  r.setProperty('--border',            theme.border);
  r.setProperty('--border-strong',     theme.borderStrong);
  r.setProperty('--text-primary',      theme.textPrimary);
  r.setProperty('--text-secondary',    theme.textSecondary);
  r.setProperty('--text-muted',        theme.textMuted);
  r.setProperty('--text-disabled',     theme.textDisabled);
  r.setProperty('--accent',            theme.accent);
  r.setProperty('--accent-hover',      theme.accentHover);
  r.setProperty('--accent-text',       theme.accentText);
  r.setProperty('--btn-primary',       theme.btnPrimary);
  r.setProperty('--btn-primary-hover', theme.btnPrimaryHover);
  r.setProperty('--btn-primary-text',  theme.btnPrimaryText);
  r.setProperty('--btn-ghost',         theme.btnGhost);
  r.setProperty('--btn-ghost-hover',   theme.btnGhostHover);
  r.setProperty('--slider-track',      theme.sliderTrack);
  r.setProperty('--slider-thumb',      theme.sliderThumb);
  r.setProperty('--scrollbar',         theme.scrollbar);
  r.setProperty('--star-color',        theme.starColor);
  r.setProperty('--font-mono', `'${fontFamily}', 'JetBrains Mono', 'Consolas', monospace`);

  // Терминальные темы получают хакерскую эстетику (сканлайны, свечение,
  // моношрифт в UI, острые углы). Остальные — чистый современный вид.
  const root = document.documentElement;
  if (theme.terminalFx) {
    root.setAttribute('data-terminal-fx', '');
  } else {
    root.removeAttribute('data-terminal-fx');
  }
}
