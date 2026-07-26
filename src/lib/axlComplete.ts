// Автодополнение AXL для CodeMirror 6 по списку native-сигнатур,
// полученному из бэкенда (команда axium_list_natives). Формат сигнатуры —
// "Класс.метод(Тип,Тип)ВозвращаемыйТип", напр. "App.pixelsToAscii(Integer[])String".
import type { CompletionContext, CompletionResult, Completion } from '@codemirror/autocomplete';

export interface ParsedNative {
  /// Класс, к которому обращаются в коде (последний сегмент до имени метода).
  cls: string;
  method: string;
  params: string[];
  ret: string;
  /// Исходная сигнатура целиком — для показа в документации.
  raw: string;
}

// Ключевые слова для дополнения простых слов (совпадает с axlLanguage).
const KEYWORD_COMPLETIONS: string[] = [
  'public', 'private', 'protected', 'static', 'native', 'const', 'abstract',
  'class', 'interface', 'extends', 'implements', 'return', 'if', 'else',
  'while', 'for', 'foreach', 'in', 'break', 'continue', 'try', 'catch',
  'finally', 'new', 'this', 'true', 'false', 'null', 'import', 'package',
];

export function parseNative(raw: string): ParsedNative | null {
  const open = raw.indexOf('(');
  const close = raw.lastIndexOf(')');
  if (open < 0 || close < open) return null;

  const qualified = raw.slice(0, open); // "std.math.Math.sqrt" или "App.pixelsToAscii"
  const lastDot = qualified.lastIndexOf('.');
  if (lastDot < 0) return null;

  const method = qualified.slice(lastDot + 1);
  const beforeMethod = qualified.slice(0, lastDot);
  // Класс, как его пишут в коде — последний сегмент пути (App, Sys, Math...).
  const cls = beforeMethod.includes('.')
    ? beforeMethod.slice(beforeMethod.lastIndexOf('.') + 1)
    : beforeMethod;

  const paramsStr = raw.slice(open + 1, close).trim();
  const params = paramsStr ? paramsStr.split(',').map(p => p.trim()) : [];
  const ret = raw.slice(close + 1).trim();

  return { cls, method, params, ret, raw };
}

export function parseNatives(raws: string[]): ParsedNative[] {
  const out: ParsedNative[] = [];
  for (const r of raws) {
    const p = parseNative(r);
    if (p) out.push(p);
  }
  return out;
}

function methodCompletion(n: ParsedNative): Completion {
  return {
    label: n.method,
    type: 'method',
    detail: `(${n.params.join(', ')}) ${n.ret}`,
    // Вставляем имя метода и открывающую скобку — курсор внутри вызова.
    apply: `${n.method}(`,
    boost: 1,
  };
}

// Источник дополнений читает сигнатуры лениво через getter — список
// подгружается из бэкенда асинхронно уже после создания редактора.
export function axlCompletionSource(getNatives: () => ParsedNative[]) {
  return (context: CompletionContext): CompletionResult | null => {
    const natives = getNatives();

    // Обращение к члену класса: "Class.method" — предлагаем методы класса.
    const member = context.matchBefore(/[A-Za-z_][A-Za-z0-9_]*\.[A-Za-z0-9_]*/);
    if (member) {
      const dot = member.text.indexOf('.');
      const cls = member.text.slice(0, dot);
      const methods = natives.filter(n => n.cls === cls);
      if (methods.length > 0) {
        return {
          from: member.from + dot + 1,
          options: methods.map(methodCompletion),
          validFor: /^[A-Za-z0-9_]*$/,
        };
      }
      return null;
    }

    // Простое слово — предлагаем имена классов и ключевые слова.
    const word = context.matchBefore(/[A-Za-z_][A-Za-z0-9_]*/);
    if (!word || (word.from === word.to && !context.explicit)) return null;

    const classNames = Array.from(new Set(natives.map(n => n.cls))).sort();
    const options: Completion[] = [
      ...classNames.map(c => ({ label: c, type: 'class' as const, boost: 1 })),
      ...KEYWORD_COMPLETIONS.map(k => ({ label: k, type: 'keyword' as const })),
    ];
    return { from: word.from, options, validFor: /^[A-Za-z0-9_]*$/ };
  };
}
