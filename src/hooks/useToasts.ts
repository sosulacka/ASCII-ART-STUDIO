// Тосты (всплывающие уведомления). Локализует сообщение перед показом.
import { useState, useRef, useCallback } from 'react';
import { type ToastData, type ToastType } from '../Toast';
import { localizeError } from '../errorParser';
import { type Lang } from '../i18n';

export function useToasts(lang: Lang) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const toastIdCounter = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration?: number) => {
    const localizedMessage = localizeError(message, lang);
    const id = toastIdCounter.current++;
    setToasts(prev => [...prev, { id, message: localizedMessage, type, duration }]);
  }, [lang]);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, showToast, removeToast };
}
