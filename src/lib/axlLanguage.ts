// Подсветка синтаксиса AXL для CodeMirror 6. Токенизатор на StreamLanguage:
// полный parse-tree тут не нужен, достаточно потоковой разметки для цветов.
import { StreamLanguage, LanguageSupport, HighlightStyle } from '@codemirror/language';
import type { StringStream } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

// Ключевые слова AXL.
const KEYWORDS = new Set([
  'package', 'import', 'public', 'private', 'protected', 'static', 'native',
  'const', 'abstract', 'class', 'interface', 'extends', 'implements',
  'return', 'if', 'else', 'while', 'for', 'foreach', 'in', 'break',
  'continue', 'try', 'catch', 'finally', 'new', 'this',
]);
const ATOMS = new Set(['true', 'false', 'null']);

interface AxlState {
  inBlockComment: boolean;
  inString: boolean;
}

// Строки AXL — `;text;`, `;;` внутри экранирует буквальный `;`. Строка
// может занимать несколько строк редактора, поэтому состояние `inString`
// переживает конец строки редактора (StreamLanguage сохраняет state построчно).
function consumeString(stream: StringStream, state: AxlState) {
  let ch: string | void;
  while ((ch = stream.next()) != null) {
    if (ch === ';') {
      if (stream.peek() === ';') {
        stream.next();
        continue;
      }
      state.inString = false;
      return;
    }
  }
  // Незакрытая строка на этой строке редактора — остаёмся в состоянии
  // inString, следующая строка редактора токенизируется как продолжение.
}

function token(stream: StringStream, state: AxlState): string | null {
  if (state.inBlockComment) {
    if (!stream.match(/[^]*?\*\//)) {
      stream.skipToEnd();
    } else {
      state.inBlockComment = false;
    }
    return 'comment';
  }
  if (state.inString) {
    consumeString(stream, state);
    return 'string';
  }
  if (stream.eatSpace()) return null;

  if (stream.match('//')) {
    stream.skipToEnd();
    return 'comment';
  }
  if (stream.match('/*')) {
    if (!stream.match(/[^]*?\*\//)) {
      state.inBlockComment = true;
    }
    return 'comment';
  }
  if (stream.peek() === ';') {
    stream.next();
    state.inString = true;
    consumeString(stream, state);
    return 'string';
  }
  if (stream.match(/[0-9]+\.[0-9]+/) || stream.match(/[0-9]+/)) {
    return 'number';
  }
  if (stream.match(/[A-Za-z_][A-Za-z0-9_]*/)) {
    const word = stream.current();
    if (KEYWORDS.has(word)) return 'keyword';
    if (ATOMS.has(word)) return 'atom';
    // Эвристика: имена классов/типов в AXL начинаются с заглавной (по
    // соглашению стандартной библиотеки — Sys, App, String, Integer...).
    if (/^[A-Z]/.test(word)) return 'typeName';
    return 'variableName';
  }
  if (stream.match(/==|!=|<=|>=|\+\+|--|&&|\|\|/)) {
    return 'operator';
  }

  const ch = stream.next();
  if (ch == null) return null;
  if ('<>=+-*/%!'.includes(ch)) return 'operator';
  if ('()[]'.includes(ch)) return 'bracket';
  if (',.:'.includes(ch)) return 'punctuation';
  return null;
}

export const axlStreamLanguage = StreamLanguage.define<AxlState>({
  name: 'axl',
  startState(): AxlState {
    return { inBlockComment: false, inString: false };
  },
  token,
});

// Цвета выведены из CSS-переменных темы (--syntax-* в tokens.css, сами
// они — color-mix от --accent/--text-*) — подсветка автоматически
// подстраивается под любую из ~25 тем приложения без ручной правки.
export const axlHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: 'var(--syntax-keyword)', fontWeight: 600 },
  { tag: t.typeName, color: 'var(--syntax-type)', fontWeight: 600 },
  { tag: t.string, color: 'var(--syntax-string)' },
  { tag: t.number, color: 'var(--syntax-number)' },
  { tag: t.atom, color: 'var(--syntax-number)', fontWeight: 600 },
  { tag: t.comment, color: 'var(--syntax-comment)', fontStyle: 'italic' },
  { tag: t.operator, color: 'var(--syntax-operator)' },
  { tag: t.punctuation, color: 'var(--syntax-punctuation)' },
  { tag: t.bracket, color: 'var(--syntax-operator)' },
]);

export function axl(): LanguageSupport {
  return new LanguageSupport(axlStreamLanguage);
}
