// Мелкие переиспользуемые контролы боковой панели.
import { useState, useRef, useEffect, MouseEvent as ReactMouseEvent } from 'react';
import { ChevronDown } from 'lucide-react';

export function SliderRow({ label, value, min, max, step = 1, decimals = 0, onChange }: {
  label: string; value: number;
  min: number; max: number;
  step?: number; decimals?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="slider-row">
      <div className="slider-label">
        <span>{label}</span>
        <span className="slider-value">
          {decimals > 0 ? value.toFixed(decimals) : value}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="slider-strict"
      />
    </div>
  );
}

export function CheckRow({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="check-row">
      <input
        type="checkbox" checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="checkbox-strict"
      />
      <span>{label}</span>
    </label>
  );
}

export interface DropdownOption { value: number; label: string; }

export function Dropdown({ options, value, onChange }: {
  options: DropdownOption[];
  value: number;
  onChange: (v: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value) ?? options[0];

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="dropdown" ref={ref}>
      <button
        className={`dropdown-trigger ${open ? 'open' : ''}`}
        onClick={() => setOpen(v => !v)}
      >
        <span>{selected.label}</span>
        <span className="dropdown-arrow"><ChevronDown size={12} /></span>
      </button>
      {open && (
        <div className="dropdown-menu">
          {options.map(opt => (
            <div
              key={opt.value}
              className={`dropdown-option ${opt.value === value ? 'selected' : ''}`}
              onClick={() => { onChange(opt.value); setOpen(false); }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TiltButton({
  children, className = '', ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) {
  const ref = useRef<HTMLButtonElement>(null);

  const onMove = (e: ReactMouseEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el || rest.disabled) return;
    const r  = el.getBoundingClientRect();
    const rx = ((e.clientY - r.top  - r.height / 2) / r.height) * -10;
    const ry = ((e.clientX - r.left - r.width  / 2) / r.width ) *  10;
    el.style.transform =
      `perspective(500px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.03)`;
  };

  const onLeave = () => {
    if (ref.current) ref.current.style.transform = '';
  };

  return (
    <button
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`tilt-btn ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
