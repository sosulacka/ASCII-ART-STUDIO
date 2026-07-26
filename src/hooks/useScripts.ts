// Вкладка "Скрипты" — список файлов .ax, редактор, запуск через Axium VM.
import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

// Строит стартовый скрипт-пример. Текст приветствия локализован (приходит
// из i18n); `;` в строках AXL экранируется удвоением.
function makeDefaultScript(greeting: string): string {
  const safe = greeting.replace(/;/g, ';;');
  return `public class ;Sys; ([
    public static native Void println(String s).
])
public class ;Main; ([
    public static Void main() ([
        Sys.println(;${safe};).
    ])
])
`;
}

export function useScripts(defaultGreeting: string) {
  const [dllAvailable, setDllAvailable] = useState<boolean | null>(null);
  const [scripts, setScripts] = useState<string[]>([]);
  const [activeName, setActiveName] = useState<string | null>(null);
  const [source, setSource] = useState(() => makeDefaultScript(defaultGreeting));
  const [dirty, setDirty] = useState(false);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<{ ok: boolean; text: string } | null>(null);
  const [natives, setNatives] = useState<string[]>([]);

  const refreshList = useCallback(async () => {
    try {
      const list = await invoke<string[]>('axium_list_scripts');
      setScripts(list);
    } catch {
      setScripts([]);
    }
  }, []);

  const refreshDll = useCallback(async () => {
    try {
      const available = await invoke<boolean>('axium_check_dll');
      setDllAvailable(available);
      // Список native-сигнатур — источник для автодополнения и Docs.
      if (available) {
        invoke<string[]>('axium_list_natives').then(setNatives).catch(() => setNatives([]));
      }
    } catch {
      setDllAvailable(false);
    }
  }, []);

  useEffect(() => {
    refreshDll();
    refreshList();
  }, [refreshDll, refreshList]);

  /// Ручной выбор файла движка (когда авто-поиск не нашёл): открывает
  /// диалог, отдаёт путь бэкенду на валидацию и запоминание, обновляет
  /// доступность. Ошибка валидации показывается в консоли вкладки.
  const pickLibrary = useCallback(async () => {
    const isWin = navigator.userAgent.includes('Windows');
    const file = await open({
      filters: [isWin
        ? { name: 'Axium VM', extensions: ['dll'] }
        : { name: 'Axium VM', extensions: ['so'] }],
      multiple: false,
    });
    if (!file || typeof file !== 'string') return;
    try {
      await invoke('axium_set_lib_path', { path: file });
      await refreshDll();
      setOutput(null);
    } catch (e) {
      setOutput({ ok: false, text: String(e) });
    }
  }, [refreshDll]);

  const newScript = useCallback(() => {
    setActiveName(null);
    setSource(makeDefaultScript(defaultGreeting));
    setDirty(false);
    setOutput(null);
  }, [defaultGreeting]);

  const openScript = useCallback(async (name: string) => {
    try {
      const content = await invoke<string>('axium_load_script', { name });
      setActiveName(name);
      setSource(content);
      setDirty(false);
      setOutput(null);
    } catch (e) {
      setOutput({ ok: false, text: String(e) });
    }
  }, []);

  const saveScript = useCallback(async (nameOverride?: string) => {
    const name = nameOverride ?? activeName;
    if (!name) return false;
    try {
      await invoke('axium_save_script', { name, content: source });
      setActiveName(name);
      setDirty(false);
      await refreshList();
      return true;
    } catch (e) {
      setOutput({ ok: false, text: String(e) });
      return false;
    }
  }, [activeName, source, refreshList]);

  const deleteScript = useCallback(async (name: string) => {
    try {
      await invoke('axium_delete_script', { name });
      if (activeName === name) newScript();
      await refreshList();
    } catch (e) {
      setOutput({ ok: false, text: String(e) });
    }
  }, [activeName, newScript, refreshList]);

  const run = useCallback(async () => {
    setRunning(true);
    setOutput(null);
    try {
      const result = await invoke<string>('axium_run_script', { source });
      setOutput({ ok: true, text: result });
    } catch (e) {
      setOutput({ ok: false, text: String(e) });
    } finally {
      setRunning(false);
    }
  }, [source]);

  return {
    dllAvailable, scripts, activeName, source, dirty, running, output, natives,
    setSource: (v: string) => { setSource(v); setDirty(true); },
    newScript, openScript, saveScript, deleteScript, run, pickLibrary,
  };
}
