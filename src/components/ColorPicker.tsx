// Кастомный inline color picker (замена нативного <input type="color">).
// SV-поле (насыщенность/яркость) + hue-слайдер + hex-инпут. Popup в стиле проекта.
import { useState, useRef, useEffect, useCallback } from 'react';

// ── Конвертации ──────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace('#', '');
  const full = m.length === 3 ? m.split('').map(c => c + c).join('') : m;
  const n = parseInt(full.padEnd(6, '0').slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (v: number) => Math.round(v).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return [h, s, max];
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

export function ColorPicker({ value, onChange }: {
  value: string;
  onChange: (hex: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const svRef = useRef<HTMLDivElement>(null);

  const [r, g, b] = hexToRgb(value);
  const [h, s, v] = rgbToHsv(r, g, b);
  const [hexInput, setHexInput] = useState(value);

  useEffect(() => { setHexInput(value); }, [value]);

  // Закрытие по клику вне
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const emit = useCallback((nh: number, ns: number, nv: number) => {
    const [nr, ng, nb] = hsvToRgb(nh, ns, nv);
    onChange(rgbToHex(nr, ng, nb));
  }, [onChange]);

  // Перетаскивание по SV-полю
  const handleSvPointer = useCallback((e: PointerEvent | React.PointerEvent) => {
    const el = svRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = Math.min(1, Math.max(0, (('clientX' in e ? e.clientX : 0) - rect.left) / rect.width));
    const py = Math.min(1, Math.max(0, (('clientY' in e ? e.clientY : 0) - rect.top) / rect.height));
    emit(h, px, 1 - py);
  }, [h, emit]);

  const startSvDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    handleSvPointer(e);
    const move = (ev: PointerEvent) => handleSvPointer(ev);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const hueColor = rgbToHex(...hsvToRgb(h, 1, 1));

  return (
    <div className="cp-root" ref={rootRef}>
      <button
        type="button"
        className="cp-swatch"
        style={{ background: value }}
        onClick={() => setOpen(o => !o)}
        aria-label="Выбрать цвет"
      />
      {open && (
        <div className="cp-popup">
          {/* SV-поле */}
          <div
            ref={svRef}
            className="cp-sv"
            style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})` }}
            onPointerDown={startSvDrag}
          >
            <div className="cp-sv-cursor" style={{ left: `${s * 100}%`, top: `${(1 - v) * 100}%` }} />
          </div>

          {/* Hue-слайдер */}
          <input
            type="range" min={0} max={360} value={Math.round(h)}
            className="cp-hue"
            onChange={e => emit(Number(e.target.value), s, v)}
          />

          {/* Hex + превью */}
          <div className="cp-bottom">
            <div className="cp-preview" style={{ background: value }} />
            <input
              type="text"
              className="cp-hex"
              value={hexInput}
              spellCheck={false}
              onChange={e => {
                const val = e.target.value;
                setHexInput(val);
                if (/^#?[0-9a-fA-F]{6}$/.test(val)) {
                  onChange(val.startsWith('#') ? val.toUpperCase() : `#${val.toUpperCase()}`);
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
