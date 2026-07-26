// Тесты парсера native-сигнатур и источника автодополнения.
import { describe, it, expect } from 'vitest';
import { parseNative, parseNatives } from './axlComplete';

describe('parseNative', () => {
  it('разбирает простую сигнатуру', () => {
    const p = parseNative('Sys.println(String)Void');
    expect(p).not.toBeNull();
    expect(p!.cls).toBe('Sys');
    expect(p!.method).toBe('println');
    expect(p!.params).toEqual(['String']);
    expect(p!.ret).toBe('Void');
    expect(p!.raw).toBe('Sys.println(String)Void');
  });

  it('берёт последний сегмент пути как класс', () => {
    const p = parseNative('std.math.Math.sqrt(Double)Double');
    expect(p!.cls).toBe('Math');
    expect(p!.method).toBe('sqrt');
  });

  it('разбирает многоаргументную сигнатуру с массивами', () => {
    const p = parseNative('App.savePng(Integer[],Integer,Integer,String)Boolean');
    expect(p!.cls).toBe('App');
    expect(p!.params).toEqual(['Integer[]', 'Integer', 'Integer', 'String']);
    expect(p!.ret).toBe('Boolean');
  });

  it('разбирает сигнатуру без аргументов', () => {
    const p = parseNative('std.io.Console.readLine()String');
    expect(p!.cls).toBe('Console');
    expect(p!.params).toEqual([]);
    expect(p!.ret).toBe('String');
  });

  it('возвращает null на мусор', () => {
    expect(parseNative('')).toBeNull();
    expect(parseNative('no-parens')).toBeNull();
    expect(parseNative('noDot(Integer)Void')).toBeNull();
    expect(parseNative(')broken(')).toBeNull();
  });
});

describe('parseNatives', () => {
  it('пропускает некорректные и сохраняет корректные', () => {
    const out = parseNatives(['Sys.print(String)Void', 'garbage', 'A.b()Void']);
    expect(out).toHaveLength(2);
    expect(out.map(n => n.method)).toEqual(['print', 'b']);
  });
});
