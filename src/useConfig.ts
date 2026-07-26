import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { Lang } from './i18n';

export interface AppConfig {
  themeId: string;
  lang: Lang;
  fontFamily: string;
  showStars: boolean;
  starsCount: number;
  starsMinSize: number;
  starsMaxSize: number;
  starsColor: string;
  autoPlay: boolean;
  defaultWidth: number;
  defaultPalette: number;
  defaultFontRatio: number;
  defaultBg: string;
  defaultZoom: number;
  virtualCameraPort: number;
}

export const DEFAULT_CONFIG: AppConfig = {
  themeId: 'dark',
  lang: 'ru',
  fontFamily: 'Inter',
  showStars: true,
  starsCount: 100,
  starsMinSize: 1.0,
  starsMaxSize: 3.0,
  starsColor: '#ffffff',
  autoPlay: true,
  defaultWidth: 120,
  defaultPalette: 0,
  defaultFontRatio: 2.0,
  defaultBg: '#0a0a0b',
  defaultZoom: 8,
  virtualCameraPort: 8765,
};

export function useConfig() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    invoke<string>('load_config')
      .then(raw => {
        try {
          const parsed = JSON.parse(raw) as Partial<AppConfig>;
          setConfig({ ...DEFAULT_CONFIG, ...parsed });
        } catch {
          setConfig(DEFAULT_CONFIG);
        }
      })
      .catch(() => setConfig(DEFAULT_CONFIG))
      .finally(() => setLoaded(true));
  }, []);

  const saveConfig = useCallback((cfg: AppConfig) => {
    setConfig(cfg);
    invoke('save_config', { content: JSON.stringify(cfg, null, 2) }).catch(console.error);
  }, []);

  const resetConfig = useCallback(() => {
    saveConfig(DEFAULT_CONFIG);
  }, [saveConfig]);

  return { config, setConfig, saveConfig, resetConfig, loaded };
}