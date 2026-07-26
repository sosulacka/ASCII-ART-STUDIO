// UI-логика установщика. Общается с Rust через глобальный __TAURI__.
const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

const $ = (id) => document.getElementById(id);

// ── Звёздный фон (тот же приём, что в приложении: один canvas) ──
(function starfield() {
  const canvas = $('stars');
  const ctx = canvas.getContext('2d');
  let stars = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const count = Math.floor((canvas.width * canvas.height) / 9000);
    stars = Array.from({ length: count }, () => ({
      x: Math.random(),
      y: Math.random(),
      s: Math.random() * 1.6 + 0.4,
      o: Math.random() * 0.5 + 0.1,
      d: Math.random() * 4 + 2,
      ph: Math.random() * Math.PI * 2,
    }));
  }
  resize();
  window.addEventListener('resize', resize);

  let last = 0;
  function draw(t) {
    requestAnimationFrame(draw);
    if (t - last < 50) return; // ~20fps
    last = t;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    const time = t / 1000;
    for (const st of stars) {
      const k = (Math.sin((time / st.d) * Math.PI * 2 + st.ph) + 1) / 2;
      ctx.globalAlpha = st.o * (0.3 + 0.7 * k);
      ctx.beginPath();
      ctx.arc(st.x * w, st.y * h, (st.s * (0.7 + 0.5 * k)) / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  requestAnimationFrame(draw);
})();

// ── Навигация между экранами ──
function show(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  $(id).classList.add('active');
}

// ── Опции (чекбоксы) ──
const opts = { desktop: true, start: true, launch: true };
['optDesktop', 'optStart', 'optLaunch'].forEach((id) => {
  const el = $(id);
  el.addEventListener('click', () => {
    const key = el.dataset.key;
    opts[key] = !opts[key];
    el.classList.toggle('on', opts[key]);
  });
});

let installDir = '';

async function init() {
  // Режим обновления (--update): сразу запускаем обновление, минуя выбор папки.
  let updateMode = false;
  try {
    updateMode = await invoke('is_update_mode');
  } catch {}

  if (updateMode) {
    runUpdateFlow();
    return;
  }

  try {
    installDir = await invoke('get_default_dir');
    $('installPath').textContent = installDir;
  } catch (e) {
    installDir = 'C:\\Users\\Public\\ASCIIArtStudio';
    $('installPath').textContent = installDir;
  }
}

async function runUpdateFlow() {
  // Переключаем заголовки на «обновление»
  const h = document.querySelector('#screen-progress h1');
  const lead = document.querySelector('#screen-progress .lead');
  if (h) h.textContent = 'Обновление';
  if (lead) lead.textContent = 'Устанавливается новая версия ASCII Art Studio.';
  const dh = document.querySelector('#screen-done h1');
  const dl = document.querySelector('#screen-done .lead');
  if (dh) dh.textContent = 'Обновление завершено';
  if (dl) dl.textContent = 'ASCII Art Studio обновлена и сейчас запустится.';

  show('screen-progress');
  try {
    await invoke('run_update');
    // run_update сам закроет установщик и запустит новую версию
  } catch (e) {
    $('errText').textContent = String(e);
    show('screen-error');
  }
}

// ── Слушаем прогресс из Rust ──
listen('install-progress', (event) => {
  const { stage, percent } = event.payload;
  $('stageText').textContent = stage + '…';
  $('barFill').style.width = percent + '%';
  $('pctText').textContent = percent + '%';
});

// ── Кнопки ──
$('btnStart').addEventListener('click', () => show('screen-options'));
$('btnBack').addEventListener('click', () => show('screen-welcome'));
$('btnClose').addEventListener('click', () => invoke('close_installer'));
$('btnErrClose').addEventListener('click', () => invoke('close_installer'));

$('btnInstall').addEventListener('click', async () => {
  show('screen-progress');
  try {
    await invoke('run_install', {
      dir: installDir,
      desktopShortcut: opts.desktop,
      startMenu: opts.start,
    });
    show('screen-done');
  } catch (e) {
    $('errText').textContent = String(e);
    show('screen-error');
  }
});

$('btnFinish').addEventListener('click', async () => {
  if (opts.launch) {
    try { await invoke('launch_app', { dir: installDir }); } catch {}
  }
  await invoke('close_installer');
});

init();
