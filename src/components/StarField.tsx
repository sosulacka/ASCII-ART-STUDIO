// Анимированный звёздный фон на одном canvas (см. комментарий в компоненте).
import { useRef, useEffect, useMemo } from 'react';

export function StarField({ show, count, minSize, maxSize, color }: {
  show: boolean;
  count: number;
  minSize: number;
  maxSize: number;
  color: string;
}) {
  // Один canvas вместо N div-ов с box-shadow и бесконечными CSS-анимациями:
  // раньше композитор пережёвывал сотни слоёв даже в простое.
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  const stars = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: Math.random(),
      y: Math.random(),
      s: Math.random() * (maxSize - minSize) + minSize,
      o: Math.random() * 0.5 + 0.1,
      d: Math.random() * 4 + 2,
      dx: (Math.random() - 0.5) * 30,
      dy: (Math.random() - 0.5) * 30,
      phase: Math.random() * Math.PI * 2,
    }));
  }, [count, minSize, maxSize]);

  useEffect(() => {
    if (!show) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    let lastTick = 0;
    const STAR_FPS = 20; // мерцанию не нужно 60 fps
    const FRAME_MS = 1000 / STAR_FPS;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const draw = (tm: number) => {
      if (!running) return;
      rafRef.current = requestAnimationFrame(draw);
      if (tm - lastTick < FRAME_MS) return;
      lastTick = tm;
      // Не рисуем, когда окно скрыто/свёрнуто
      if (document.hidden) return;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = color;

      const time = tm / 1000;
      for (const st of stars) {
        // 0..1..0 колебание по индивидуальному периоду
        const k = (Math.sin((time / st.d) * Math.PI * 2 + st.phase) + 1) / 2;
        const px = st.x * w + st.dx * (k - 0.5) * 1.5;
        const py = st.y * h + st.dy * (k - 0.5) * 1.5;
        const size = st.s * (0.8 + 0.4 * k);
        ctx.globalAlpha = st.o * (0.3 + 0.7 * k);
        ctx.beginPath();
        ctx.arc(px, py, size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [show, stars, color]);

  if (!show) return null;

  return (
    <div className="starfield">
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
