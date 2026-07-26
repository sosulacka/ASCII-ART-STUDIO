// Кастомный тайтлбар окна (Tauri decorations: false).
import { useState, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Maximize2, Minimize2, X } from 'lucide-react';
import Logo from '../Logo';
import { t } from '../i18n';

export function TitleBar({ title, strings }: { title: string; strings: ReturnType<typeof t> }) {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const appWindow = getCurrentWindow();
    appWindow.isMaximized().then(setIsMaximized).catch(console.error);

    const unlistenPromise = appWindow.onResized(() => {
      appWindow.isMaximized().then(setIsMaximized).catch(console.error);
    });

    return () => {
      unlistenPromise.then(f => f()).catch(() => {});
    };
  }, []);

  const handleMinimize = () => getCurrentWindow().minimize();
  const handleMaximize = async () => {
    await getCurrentWindow().toggleMaximize();
    setIsMaximized(await getCurrentWindow().isMaximized());
  };
  const handleClose = () => getCurrentWindow().close();

  return (
    <div className="titlebar" data-tauri-drag-region>
      <div className="titlebar-left">
        <Logo size={14} />
        <span className="titlebar-title">{title}</span>
      </div>

      <div className="titlebar-drag" data-tauri-drag-region />

      <div className="titlebar-controls">
        <button
          className="titlebar-btn titlebar-btn--minimize"
          onClick={handleMinimize}
          title={strings.minimize}
        >
          <Minus size={12} />
        </button>
        <button
          className="titlebar-btn titlebar-btn--maximize"
          onClick={handleMaximize}
          title={isMaximized ? strings.restore : strings.maximize}
        >
          {isMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
        </button>
        <button
          className="titlebar-btn titlebar-btn--close"
          onClick={handleClose}
          title={strings.close}
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
