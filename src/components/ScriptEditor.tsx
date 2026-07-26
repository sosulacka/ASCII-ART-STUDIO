// Редактор скриптов Axium (CodeMirror 6): номера строк, история, поиск,
// AXL-подсветка синтаксиса (StreamLanguage, см. lib/axlLanguage.ts),
// автодополнение по native-сигнатурам, тема под CSS-токены приложения.
import { useEffect, useMemo, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { syntaxHighlighting } from '@codemirror/language';
import { autocompletion } from '@codemirror/autocomplete';
import { lintGutter } from '@codemirror/lint';
import { axl, axlHighlightStyle } from '../lib/axlLanguage';
import { axlCompletionSource, parseNatives, type ParsedNative } from '../lib/axlComplete';
import { axlLinter } from '../lib/axlLint';

interface ScriptEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  /// Сырые native-сигнатуры из бэкенда для автодополнения (могут прийти
  /// асинхронно уже после монтирования редактора).
  natives?: string[];
  /// Включать инлайн-диагностику компиляции (только когда движок доступен).
  lintEnabled?: boolean;
}

function appTheme() {
  return EditorView.theme({
    '&': {
      height: '100%',
      fontSize: 'var(--fs-md)',
      backgroundColor: 'var(--bg-modal)',
      color: 'var(--text-primary)',
    },
    '.cm-content': {
      fontFamily: 'var(--font-mono)',
      caretColor: 'var(--accent)',
    },
    '.cm-cursor': { borderLeftColor: 'var(--accent)' },
    '.cm-gutters': {
      backgroundColor: 'var(--bg-sidebar)',
      color: 'var(--text-muted)',
      border: 'none',
    },
    '.cm-activeLine': { backgroundColor: 'var(--bg-hover)' },
    '.cm-activeLineGutter': { backgroundColor: 'var(--bg-hover)' },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
      backgroundColor: 'var(--btn-primary-hover)',
    },
    '&.cm-focused': { outline: 'none' },
  }, { dark: true });
}

export function ScriptEditor({ value, onChange, readOnly, natives, lintEnabled }: ScriptEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Разобранные сигнатуры держим в ref: источник дополнений создаётся один
  // раз (редактор не пересоздаётся), а список подгружается асинхронно.
  const parsed = useMemo<ParsedNative[]>(() => parseNatives(natives ?? []), [natives]);
  const nativesRef = useRef<ParsedNative[]>(parsed);
  nativesRef.current = parsed;

  // Аналогично — флаг линта через ref, чтобы не пересоздавать редактор.
  const lintRef = useRef<boolean>(!!lintEnabled);
  lintRef.current = !!lintEnabled;

  useEffect(() => {
    if (!hostRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        axl(),
        syntaxHighlighting(axlHighlightStyle),
        autocompletion({ override: [axlCompletionSource(() => nativesRef.current)] }),
        axlLinter(() => lintRef.current),
        lintGutter(),
        appTheme(),
        EditorState.readOnly.of(!!readOnly),
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
      ],
    });

    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;
    return () => view.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Внешние изменения value (загрузка другого файла, сброс) — только если
  // реально отличается от текущего содержимого редактора, иначе перезапись
  // курсора/выделения на каждый keystroke.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
    }
  }, [value]);

  return <div ref={hostRef} style={{ height: '100%', overflow: 'auto' }} className="custom-scrollbar" />;
}
