// Показывает оверлей перехода при смене языка (короткая анимация ~1.2с).
import { useState, useRef, useEffect } from 'react';
import { type Lang } from '../i18n';

export function useLangTransition(currentLang: Lang) {
  const [langTransition, setLangTransition] = useState(false);
  const prevLang = useRef<Lang>(currentLang);

  useEffect(() => {
    if (prevLang.current !== currentLang) {
      setLangTransition(true);
      setTimeout(() => setLangTransition(false), 1200);
      prevLang.current = currentLang;
    }
  }, [currentLang]);

  return langTransition;
}
