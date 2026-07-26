// Тесты токенизатора AXL: скармливаем строки кода и проверяем классы токенов.
import { describe, it, expect } from 'vitest';
import { StringStream } from '@codemirror/language';
import { axlStreamLanguage } from './axlLanguage';

// Прогоняет текст через StreamLanguage-токенизатор построчно, возвращает
// пары [текст токена, тип] (пробелы дают null-тип и пропускаются).
function tokenize(text: string): [string, string][] {
  // streamParser — рантайм-свойство StreamLanguage (нет в публичных типах).
  const parser = (axlStreamLanguage as any).streamParser;
  const state = parser.startState(2);
  const out: [string, string][] = [];
  for (const line of text.split('\n')) {
    const stream = new StringStream(line, 2, 2);
    while (stream.pos < line.length) {
      stream.start = stream.pos;
      const style = parser.token(stream, state);
      if (stream.pos === stream.start) { stream.next(); continue; }
      if (style) out.push([stream.current(), style]);
    }
    parser.blankLine?.(state, 2);
  }
  return out;
}

function typesOf(text: string): Map<string, string> {
  return new Map(tokenize(text));
}

describe('axlStreamLanguage', () => {
  it('распознаёт ключевые слова, типы и идентификаторы', () => {
    const t = typesOf('public static native Void main myVar');
    expect(t.get('public')).toBe('keyword');
    expect(t.get('static')).toBe('keyword');
    expect(t.get('native')).toBe('keyword');
    expect(t.get('Void')).toBe('typeName');   // с заглавной — тип
    expect(t.get('main')).toBe('variableName');
    expect(t.get('myVar')).toBe('variableName');
  });

  it('распознаёт строки в ;...; включая экранирование ;;', () => {
    const tokens = tokenize('Sys.println(;hi;; there;).');
    const strings = tokens.filter(([, ty]) => ty === 'string').map(([s]) => s);
    expect(strings).toHaveLength(1);
    expect(strings[0]).toBe(';hi;; there;');
  });

  it('строка может продолжаться на следующей строке редактора', () => {
    const tokens = tokenize('String s = ;line one\nline two;.');
    const strings = tokens.filter(([, ty]) => ty === 'string').map(([s]) => s);
    // Открытие на первой строке, продолжение на второй.
    expect(strings.some(s => s.startsWith(';line one'))).toBe(true);
    expect(strings.some(s => s.endsWith('line two;'))).toBe(true);
  });

  it('распознаёт числа: Integer и Double', () => {
    const t = typesOf('42 3.14');
    expect(t.get('42')).toBe('number');
    expect(t.get('3.14')).toBe('number');
  });

  it('распознаёт atom-литералы true/false/null', () => {
    const t = typesOf('true false null');
    expect(t.get('true')).toBe('atom');
    expect(t.get('false')).toBe('atom');
    expect(t.get('null')).toBe('atom');
  });

  it('распознаёт комментарии — строчный и блочный (в т.ч. многострочный)', () => {
    const line = tokenize('x = 1. // trailing note');
    expect(line.some(([s, ty]) => ty === 'comment' && s.includes('trailing'))).toBe(true);

    const block = tokenize('/* first\nsecond */ x');
    const comments = block.filter(([, ty]) => ty === 'comment');
    expect(comments.length).toBeGreaterThanOrEqual(2); // по куску на строку
    // После закрытия — снова обычные токены.
    expect(block.some(([s, ty]) => s === 'x' && ty === 'variableName')).toBe(true);
  });

  it('операторы и скобки', () => {
    const t = typesOf('a == b && c <= d');
    expect(t.get('==')).toBe('operator');
    expect(t.get('&&')).toBe('operator');
    expect(t.get('<=')).toBe('operator');
    const brackets = tokenize('([ ])').filter(([, ty]) => ty === 'bracket');
    expect(brackets.map(([s]) => s)).toEqual(['(', '[', ']', ')']);
  });

  it('точка — пунктуация (и терминатор, и доступ к члену)', () => {
    const tokens = tokenize('App.run().');
    const dots = tokens.filter(([s, ty]) => s === '.' && ty === 'punctuation');
    expect(dots).toHaveLength(2);
  });
});
