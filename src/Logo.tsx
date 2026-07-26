// Фирменный логотип ASCII ART STUDIO.
// Нарисован с нуля для проекта (MIT) — терминальное окно, из которого
// «выливается» градиент ASCII-плотности: @ # * : .
// Цвета берутся из темы через currentColor / CSS-переменные.

export default function Logo({ size = 16, accent }: { size?: number; accent?: string }) {
  const a = accent ?? 'var(--accent)';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="ASCII Art Studio"
      style={{ flexShrink: 0 }}
    >
      {/* корпус терминала */}
      <rect
        x="1.5" y="2.5" width="21" height="19" rx="3"
        stroke={a} strokeWidth="1.6"
      />
      {/* строка заголовка */}
      <line x1="1.5" y1="7" x2="22.5" y2="7" stroke={a} strokeWidth="1.2" opacity="0.55" />
      <circle cx="5" cy="4.8" r="0.9" fill={a} opacity="0.9" />
      <circle cx="8" cy="4.8" r="0.9" fill={a} opacity="0.55" />
      <circle cx="11" cy="4.8" r="0.9" fill={a} opacity="0.3" />
      {/* ASCII-градиент: плотность падает слева направо, как в палитре " .:-=+*#%@" */}
      <g fill={a} fontFamily="'JetBrains Mono', 'Consolas', monospace" fontSize="6.2" fontWeight="700">
        <text x="4" y="14.5" opacity="0.95">@</text>
        <text x="9.4" y="14.5" opacity="0.6">#</text>
        <text x="14.6" y="14.5" opacity="0.35">*</text>
        <text x="19" y="14.5" opacity="0.18">.</text>
      </g>
      {/* курсор-подчёркивание */}
      <rect x="4" y="16.8" width="5" height="1.7" rx="0.4" fill={a}>
        <animate attributeName="opacity" values="1;0.15;1" dur="1.6s" repeatCount="indefinite" />
      </rect>
    </svg>
  );
}
