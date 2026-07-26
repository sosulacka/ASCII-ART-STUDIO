// Инлайн-диагностика компиляции AXL для CodeMirror 6. Дёргает бэкенд
// (команда axium_compile_diagnostics), маппит ошибки/предупреждения на
// подчёркивания в редакторе. Компиляция для линта одноразовая и не влияет
// на запуск скрипта (тот компилируется заново в axium_run_script).
import { linter, type Diagnostic } from '@codemirror/lint';
import type { EditorView } from '@codemirror/view';
import { invoke } from '@tauri-apps/api/core';

interface BackendDiagnostic {
  severity: string; // "error" | "warning"
  stage: string;    // "TypeError", "ParseError", ...
  line: number;     // 1-based
  col: number;      // 1-based, счёт в Unicode-скалярах
  end_line: number;
  end_col: number;
  message: string;
  help: string | null;
}

// Позиция бэкенда — (строка, колонка) в счёте Unicode-скаляров (1-based).
// CodeMirror адресует документ в code-unit'ах UTF-16, поэтому переводим
// индекс скаляра в смещение внутри строки корректно (важно для не-BMP
// символов вроде эмодзи в строковых литералах).
function posToOffset(view: EditorView, line: number, col: number): number {
  const doc = view.state.doc;
  const lineNo = Math.min(Math.max(line, 1), doc.lines);
  const lineObj = doc.line(lineNo);
  const scalars = Array.from(lineObj.text);
  const take = Math.min(Math.max(col - 1, 0), scalars.length);
  let offset = 0;
  for (let i = 0; i < take; i++) offset += scalars[i].length;
  return lineObj.from + offset;
}

export function axlLinter(getEnabled: () => boolean) {
  return linter(
    async (view: EditorView): Promise<Diagnostic[]> => {
      if (!getEnabled()) return [];
      const source = view.state.doc.toString();
      let raw: BackendDiagnostic[];
      try {
        raw = await invoke<BackendDiagnostic[]>('axium_compile_diagnostics', { source });
      } catch {
        return [];
      }

      return raw.map((d): Diagnostic => {
        const from = posToOffset(view, d.line, d.col);
        let to = posToOffset(view, d.end_line, d.end_col);
        // Гарантируем непустой диапазон, иначе подчёркивание невидимо.
        if (to <= from) to = Math.min(from + 1, view.state.doc.length);
        const message = d.help ? `${d.message}\n${d.help}` : d.message;
        return {
          from,
          to,
          severity: d.severity === 'warning' ? 'warning' : 'error',
          message,
          source: d.stage,
        };
      });
    },
    { delay: 500 },
  );
}
