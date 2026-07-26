// Figlet-текст: загрузка шрифтов (с сети + кэш + temp), рендер, превью.
import { useState, useRef, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import figlet from 'figlet';
import { FIGLET_FONTS } from '../figletFonts';
import { t } from '../i18n';

export function useFiglet(
  sidebarMode: 'ascii' | 'text' | 'webcam' | 'scripts',
  width: number,
  s: ReturnType<typeof t>,
) {
  const [textInput, setTextInput] = useState(s.defaultTextInput || 'ASCII ART');
  const [textOutput, setTextOutput] = useState('');
  const [selectedFigletFont, setSelectedFigletFont] = useState('Standard');
  const [hoveredFont, setHoveredFont] = useState<string | null>(null);
  const [hoveredPreview, setHoveredPreview] = useState('');

  const loadedFonts = useRef(new Map<string, string>());

  const fetchAndLoadFont = useCallback(async (fontName: string, ext: 'flf' | 'tlf') => {
    if (loadedFonts.current.has(fontName)) {
      return loadedFonts.current.get(fontName)!;
    }
    const url = `https://raw.githubusercontent.com/xero/figlet-fonts/master/${encodeURIComponent(fontName)}.${ext}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const content = await res.text();
    loadedFonts.current.set(fontName, content);
    try {
      figlet.parseFont(fontName, content);
    } catch (err) {
      console.error("Figlet parse error", err);
    }
    try {
      await invoke('save_font_to_temp', { name: `${fontName}.${ext}`, content });
    } catch (err) {
      console.error("Tauri save_font_to_temp error", err);
    }
    return content;
  }, []);

  // Предзагрузка популярных шрифтов.
  useEffect(() => {
    const popular = ["Standard", "Slant", "Doom", "3-D", "Banner", "Speed", "Big"];
    popular.forEach(f => {
      const match = FIGLET_FONTS.find(font => font.name === f);
      if (match) {
        fetchAndLoadFont(match.name, match.ext).catch(() => {});
      }
    });
  }, [fetchAndLoadFont]);

  // Превью при наведении на шрифт.
  useEffect(() => {
    if (!hoveredFont) {
      setHoveredPreview('');
      return;
    }
    const font = FIGLET_FONTS.find(f => f.name === hoveredFont);
    if (!font) return;
    setHoveredPreview(s.loadingPreview || 'Loading preview...');
    fetchAndLoadFont(font.name, font.ext).then(() => {
      figlet.text("ASCII", { font: font.name as any }, (err, result) => {
        if (!err && result) {
          setHoveredPreview(result);
        } else {
          setHoveredPreview(`[${s.previewError || 'Preview error'}]`);
        }
      });
    }).catch(err => {
      setHoveredPreview(`[${s.errorLabel || 'Error'}]: ${err.message}`);
    });
  }, [hoveredFont, fetchAndLoadFont]);

  const handleRenderText = useCallback(async () => {
    if (!textInput.trim()) {
      setTextOutput('');
      return;
    }
    const match = FIGLET_FONTS.find(f => f.name === selectedFigletFont) ?? { name: 'Standard', ext: 'flf' as const };
    try {
      await fetchAndLoadFont(match.name, match.ext);
      figlet.text(textInput, {
        font: match.name as any,
        width: width,
      }, (err, result) => {
        if (err) {
          setTextOutput(`[Error rendering]: ${err.message}`);
        } else {
          setTextOutput(result || '');
        }
      });
    } catch (err: any) {
      setTextOutput(`[Error loading font ${selectedFigletFont}]: ${err.message}`);
    }
  }, [textInput, selectedFigletFont, width, fetchAndLoadFont]);

  // Ре-рендер при входе в режим text.
  useEffect(() => {
    if (sidebarMode === 'text') {
      handleRenderText();
    }
  }, [sidebarMode, handleRenderText]);

  return {
    textInput, setTextInput,
    textOutput, setTextOutput,
    selectedFigletFont, setSelectedFigletFont,
    hoveredFont, setHoveredFont,
    hoveredPreview,
    fetchAndLoadFont,
    handleRenderText,
  };
}
