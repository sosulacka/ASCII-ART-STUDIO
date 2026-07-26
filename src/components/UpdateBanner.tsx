// Ненавязчивый баннер обновления. Появляется снизу, если на сервере есть
// более новая версия. Кнопка «Обновить» качает установщик и запускает его.
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Download, X } from 'lucide-react';
import { t, type Lang } from '../i18n';

interface UpdateInfo {
  available: boolean;
  current: string;
  latest: string;
  notes: string;
  installer_url: string;
}

export function UpdateBanner({ lang }: { lang: Lang }) {
  const s = t(lang);
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Проверка при запуске + каждые 15 минут.
  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const res = await invoke<UpdateInfo>('check_update');
        if (alive && res.available) setInfo(res);
      } catch {}
    };
    check();
    const id = setInterval(check, 15 * 60 * 1000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // Прогресс скачивания из Rust.
  useEffect(() => {
    const un = listen<number>('update-progress', e => setProgress(e.payload));
    return () => { un.then(f => f()); };
  }, []);

  if (!info || !info.available || dismissed) return null;

  const startUpdate = async () => {
    setDownloading(true);
    try {
      await invoke('download_and_run_update', { installerUrl: info.installer_url });
      // download_and_run_update закроет приложение и запустит установщик
    } catch (e) {
      setDownloading(false);
      setProgress(0);
    }
  };

  return (
    <div className="update-banner">
      <div className="update-banner-text">
        <span className="update-banner-title">
          {s.updateAvailable || 'Доступно обновление'} — v{info.latest}
        </span>
        {info.notes && !downloading && (
          <span className="update-banner-notes">{info.notes}</span>
        )}
        {downloading && (
          <div className="update-banner-progress">
            <div className="update-banner-progress-track">
              <div className="update-banner-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="update-banner-pct">{progress}%</span>
          </div>
        )}
      </div>
      {!downloading && (
        <div className="update-banner-actions">
          <button className="update-banner-btn primary" onClick={startUpdate}>
            <Download size={13} /> {s.updateNow || 'Обновить'}
          </button>
          <button className="update-banner-btn ghost" onClick={() => setDismissed(true)}
            title={s.updateLater || 'Позже'}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
