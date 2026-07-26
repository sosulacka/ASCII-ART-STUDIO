// Модалка "Docs" — справочник по native-API, доступному скриптам Axium.
// Генерируется из списка зарегистрированных сигнатур (axium_list_natives),
// дополненного ручными описаниями для host-мостов приложения (App.*).
import { useMemo } from 'react';
import { X } from 'lucide-react';
import { t, type Lang } from '../i18n';
import { parseNatives, type ParsedNative } from '../lib/axlComplete';

// Ручные описания публичного API. Ключ — "Класс.метод" (класс — последний
// сегмент пути, как его пишут в коде). Двуязычно; при отсутствии языка — en.
const DESCRIPTIONS: Record<string, { ru: string; en: string }> = {
  // ── Мосты приложения (App) ──
  'App.pixelsToAscii': {
    ru: 'Конвертирует буфер пикселей (0xRRGGBB, длиной w*h) в ASCII-строку тем же движком, что и обычная конвертация изображений.',
    en: 'Converts a pixel buffer (0xRRGGBB, length w*h) into an ASCII string using the same engine as regular image conversion.',
  },
  'App.saveText': {
    ru: 'Записывает строку в файл (UTF-8). Возвращает true при успехе.',
    en: 'Writes a string to a file (UTF-8). Returns true on success.',
  },
  'App.savePng': {
    ru: 'Кодирует буфер пикселей (0xRRGGBB, длиной w*h) в PNG по указанному пути. Возвращает true при успехе.',
    en: 'Encodes a pixel buffer (0xRRGGBB, length w*h) into a PNG at the given path. Returns true on success.',
  },
  'App.toast': {
    ru: 'Показывает всплывающее уведомление. kind: "success" | "error" | "info".',
    en: 'Shows a toast notification. kind: "success" | "error" | "info".',
  },
  'App.setTheme': {
    ru: 'Переключает тему приложения по её id. Возвращает true, если тема существует.',
    en: 'Switches the app theme by its id. Returns true if the theme exists.',
  },
  // ── Вывод (Sys) — печатает в консоль вкладки скриптов ──
  'Sys.print': {
    ru: 'Печатает строку в консоль без перевода строки.',
    en: 'Prints a string to the console without a trailing newline.',
  },
  'Sys.println': {
    ru: 'Печатает строку в консоль с переводом строки.',
    en: 'Prints a string to the console followed by a newline.',
  },
  'Sys.printInt': {
    ru: 'Печатает целое число в консоль.',
    en: 'Prints an integer to the console.',
  },
  'Sys.printLong': {
    ru: 'Печатает длинное целое в консоль.',
    en: 'Prints a long integer to the console.',
  },
  'Sys.printFloat': {
    ru: 'Печатает число с плавающей точкой в консоль.',
    en: 'Prints a floating-point number to the console.',
  },
  'Sys.printBool': {
    ru: 'Печатает булево значение ("true"/"false") в консоль.',
    en: 'Prints a boolean value ("true"/"false") to the console.',
  },
  // ── std.io.Console ──
  'Console.writeStr': {
    ru: 'Пишет строку в консоль (без перевода строки).',
    en: 'Writes a string to the console (no trailing newline).',
  },
  'Console.readLine': {
    ru: 'Читает строку со стандартного ввода (без завершающего перевода строки).',
    en: 'Reads a line from standard input (without the trailing newline).',
  },
  'Console.intToStr': {
    ru: 'Преобразует целое число в строку.',
    en: 'Converts an integer to a string.',
  },
  // ── std.io.Files ──
  'Files.readText': {
    ru: 'Читает файл целиком как текст (UTF-8). Пустая строка при ошибке.',
    en: 'Reads an entire file as text (UTF-8). Empty string on error.',
  },
  'Files.writeText': {
    ru: 'Записывает текст в файл. Возвращает true при успехе.',
    en: 'Writes text to a file. Returns true on success.',
  },
  'Files.exists': {
    ru: 'Проверяет, существует ли файл или каталог по указанному пути.',
    en: 'Checks whether a file or directory exists at the given path.',
  },
  // ── std.math.Math ──
  'Math.sqrt': { ru: 'Квадратный корень.', en: 'Square root.' },
  'Math.cbrt': { ru: 'Кубический корень.', en: 'Cube root.' },
  'Math.exp': { ru: 'Экспонента e^x.', en: 'Exponential e^x.' },
  'Math.ln': { ru: 'Натуральный логарифм.', en: 'Natural logarithm.' },
  'Math.log10': { ru: 'Десятичный логарифм.', en: 'Base-10 logarithm.' },
  'Math.sin': { ru: 'Синус (радианы).', en: 'Sine (radians).' },
  'Math.cos': { ru: 'Косинус (радианы).', en: 'Cosine (radians).' },
  'Math.tan': { ru: 'Тангенс (радианы).', en: 'Tangent (radians).' },
  'Math.asin': { ru: 'Арксинус.', en: 'Arcsine.' },
  'Math.acos': { ru: 'Арккосинус.', en: 'Arccosine.' },
  'Math.atan': { ru: 'Арктангенс.', en: 'Arctangent.' },
  'Math.atan2': { ru: 'Арктангенс y/x с учётом квадранта.', en: 'Quadrant-aware arctangent of y/x.' },
  'Math.floor': { ru: 'Округление вниз.', en: 'Round down.' },
  'Math.ceil': { ru: 'Округление вверх.', en: 'Round up.' },
  'Math.round': { ru: 'Округление до ближайшего целого.', en: 'Round to the nearest integer.' },
  'Math.pow': { ru: 'Возведение в степень x^y.', en: 'Power x^y.' },
  'Math.hypot': { ru: 'Гипотенуза sqrt(x² + y²).', en: 'Hypotenuse sqrt(x² + y²).' },
  'Math.toInt': {
    ru: 'Усекает Double до Integer (явное сужение — неявных приведений в языке нет).',
    en: 'Truncates a Double to Integer (explicit narrowing — the language has no implicit casts).',
  },
  // ── std.core.Strings ──
  'Strings.length': { ru: 'Длина строки в символах.', en: 'String length in characters.' },
  'Strings.charAt': {
    ru: 'Код символа по индексу; -1, если индекс вне диапазона.',
    en: 'Character code at index; -1 if the index is out of range.',
  },
  'Strings.fromCharCode': { ru: 'Строка из одного символа по его коду.', en: 'Single-character string from a character code.' },
  'Strings.concat': { ru: 'Склеивает две строки.', en: 'Concatenates two strings.' },
  'Strings.equals': { ru: 'Сравнение строк на равенство.', en: 'String equality comparison.' },
  'Strings.compare': {
    ru: 'Лексикографическое сравнение: <0, 0 или >0.',
    en: 'Lexicographic comparison: <0, 0, or >0.',
  },
  'Strings.indexOf': {
    ru: 'Индекс первого вхождения подстроки; -1, если не найдена.',
    en: 'Index of the first occurrence of a substring; -1 if not found.',
  },
  'Strings.substring': {
    ru: 'Подстрока [from, to) в символьных индексах.',
    en: 'Substring [from, to) in character indices.',
  },
  'Strings.toUpper': { ru: 'В верхний регистр.', en: 'To upper case.' },
  'Strings.toLower': { ru: 'В нижний регистр.', en: 'To lower case.' },
  'Strings.trim': { ru: 'Убирает пробелы по краям.', en: 'Trims surrounding whitespace.' },
  'Strings.startsWith': { ru: 'Начинается ли строка с префикса.', en: 'Whether the string starts with a prefix.' },
  'Strings.endsWith': { ru: 'Заканчивается ли строка суффиксом.', en: 'Whether the string ends with a suffix.' },
  'Strings.contains': { ru: 'Содержит ли строка подстроку.', en: 'Whether the string contains a substring.' },
  'Strings.replace': {
    ru: 'Заменяет все вхождения подстроки.',
    en: 'Replaces all occurrences of a substring.',
  },
  'Strings.repeat': { ru: 'Повторяет строку n раз.', en: 'Repeats the string n times.' },
  'Strings.split': {
    ru: 'Разбивает строку по разделителю; пустой разделитель — по символам.',
    en: 'Splits by a separator; an empty separator splits into characters.',
  },
  'Strings.parseInt': {
    ru: 'Разбирает целое из строки; 0 при ошибке (проверяйте isInteger).',
    en: 'Parses an integer from a string; 0 on failure (check isInteger).',
  },
  'Strings.isInteger': {
    ru: 'Является ли строка корректным целым числом.',
    en: 'Whether the string is a valid integer.',
  },
  'Strings.parseDouble': {
    ru: 'Разбирает число с плавающей точкой; 0.0 при ошибке.',
    en: 'Parses a floating-point number; 0.0 on failure.',
  },
  'Strings.fromInt': { ru: 'Integer в строку.', en: 'Integer to string.' },
  'Strings.fromLong': { ru: 'Long в строку.', en: 'Long to string.' },
  'Strings.fromDouble': { ru: 'Double в строку.', en: 'Double to string.' },
  'Strings.fromBool': { ru: 'Boolean в строку ("true"/"false").', en: 'Boolean to string ("true"/"false").' },
  'Strings.hash': { ru: 'Хеш строки (31-полиномиальный).', en: 'String hash (31-polynomial).' },
  // ── std.core.Integers ──
  'Integers.toInt': {
    ru: 'Усекает Long до Integer (явное сужение).',
    en: 'Truncates a Long to Integer (explicit narrowing).',
  },
  // ── std.system.System ──
  'System.exit': { ru: 'Завершает выполнение с кодом выхода.', en: 'Exits with the given exit code.' },
  'System.gc': { ru: 'Принудительный запуск сборщика мусора.', en: 'Forces a garbage-collection pass.' },
  'System.currentTimeMillis': {
    ru: 'Текущее время в миллисекундах от эпохи Unix.',
    en: 'Current time in milliseconds since the Unix epoch.',
  },
  'System.env': {
    ru: 'Значение переменной окружения; пустая строка, если не задана.',
    en: 'Environment variable value; empty string if unset.',
  },
  // ── std.time.Time ──
  'Time.nowMillis': {
    ru: 'Текущее время в миллисекундах от эпохи Unix.',
    en: 'Current time in milliseconds since the Unix epoch.',
  },
  'Time.sleep': { ru: 'Приостанавливает выполнение на n миллисекунд.', en: 'Pauses execution for n milliseconds.' },
  // ── std.gfx.Image ──
  'Image.savePPM': {
    ru: 'Сохраняет буфер пикселей (0xRRGGBB, длиной w*h) в файл PPM (P6). Возвращает true при успехе.',
    en: 'Saves a pixel buffer (0xRRGGBB, length w*h) to a PPM (P6) file. Returns true on success.',
  },
  // ── std.net.Network ──
  'Network.interlayer': {
    ru: 'Заглушка сетевого слоя: реальных запросов не делает, возвращает фиктивный статус.',
    en: 'Network layer stub: performs no real requests, returns a dummy status.',
  },
};

function description(cls: string, method: string, lang: Lang): string | null {
  const entry = DESCRIPTIONS[`${cls}.${method}`];
  if (!entry) return null;
  return lang === 'ru' ? entry.ru : entry.en;
}

// ── Синтаксис AXL: краткая шпаргалка для пользователей ──
// Описывает то, чем AXL отличается от привычных языков: блоки ([ ]),
// точка-терминатор, строки/имена в ;...; и т.д.
const SYNTAX_TOPICS: { code: string; ru: string; en: string }[] = [
  {
    code: '([ ... ])',
    ru: 'Блок кода. Используется вместо фигурных скобок { } — тело класса, метода, if/while.',
    en: 'Code block. Used instead of curly braces { } — class bodies, method bodies, if/while.',
  },
  {
    code: 'Sys.println(;text;).',
    ru: 'Точка в конце — завершение инструкции (аналог ; в C-подобных языках). Точка перед буквой — обращение к члену класса: App.toast. Обе формы различаются по контексту.',
    en: 'A trailing dot ends a statement (like ; in C-family languages). A dot before a letter is member access: App.toast. The two are distinguished by context.',
  },
  {
    code: ';text;',
    ru: 'Строковый литерал И имя класса пишутся в точках с запятой: ;Привет;, class ;Main;. Литеральная ; внутри — удвоение: ;;. Поддерживаются \\n \\t \\r \\\\.',
    en: 'Both string literals AND class names are written in semicolons: ;Hello;, class ;Main;. A literal ; inside is doubled: ;;. Escapes \\n \\t \\r \\\\ are supported.',
  },
  {
    code: '// комментарий  /* блок */',
    ru: 'Комментарии: однострочный // и блочный /* ... */.',
    en: 'Comments: single-line // and block /* ... */.',
  },
  {
    code: 'Integer, Long, Double, Boolean, String, Void, Integer[]',
    ru: 'Типы. Литерал с точкой (1.5) — Double, без точки (42) — Integer. Неявных приведений нет — используйте Math.toInt, Integers.toInt, Strings.fromInt и т.п.',
    en: 'Types. A literal with a dot (1.5) is Double, without (42) is Integer. There are no implicit casts — use Math.toInt, Integers.toInt, Strings.fromInt, etc.',
  },
  {
    code: 'Integer[] px = [1, 2, 3].',
    ru: 'Массивы: литерал в квадратных скобках, доступ по индексу px[0].',
    en: 'Arrays: bracket literal, indexed access px[0].',
  },
  {
    code: 'public static native Void println(String s).',
    ru: 'Объявление native-метода: тела нет, реализация предоставляется приложением. Сигнатура должна совпадать с одной из функций в списке ниже.',
    en: 'Native method declaration: no body, the implementation is provided by the app. The signature must match one of the functions listed below.',
  },
  {
    code: 'public class ;Main; ([ public static Void main() ([ ... ]) ])',
    ru: 'Точка входа: статический метод main() класса Main.',
    en: 'Entry point: the static main() method of the Main class.',
  },
  {
    code: 'if / else, while, for, foreach in, break, continue, try / catch / finally, return, new, this',
    ru: 'Управляющие конструкции — как в C-подобных языках, но с блоками ([ ]) и точкой-терминатором.',
    en: 'Control flow — like C-family languages, but with ([ ]) blocks and the dot terminator.',
  },
];

// Полный пример: объявление native + цикл + вывод в консоль.
// Компилируемость примера закреплена тестом docs_example_compiles_and_runs
// (src-tauri/src/scripting/mod.rs) — при изменении правьте синхронно.
const EXAMPLE_SCRIPT = `public class ;Sys; ([
    public static native Void printInt(Integer n).
    public static native Void println(String s).
])
public class ;Main; ([
    public static Void main() ([
        Integer n = 3.
        while (n > 0) ([
            Sys.printInt(n).
            n = n - 1.
        ])
        Sys.println(;Go!;).
    ])
])`;

interface DocsModalProps {
  natives: string[];
  lang: Lang;
  onClose: () => void;
}

export function DocsModal({ natives, lang, onClose }: DocsModalProps) {
  const s = t(lang);

  // Группируем по классу, классы и методы сортируем по алфавиту.
  const grouped = useMemo(() => {
    const parsed = parseNatives(natives);
    const map = new Map<string, ParsedNative[]>();
    for (const n of parsed) {
      const list = map.get(n.cls) ?? [];
      list.push(n);
      map.set(n.cls, list);
    }
    return Array.from(map.entries())
      .map(([cls, methods]) => ({
        cls,
        methods: methods.slice().sort((a, b) => a.method.localeCompare(b.method)),
      }))
      .sort((a, b) => a.cls.localeCompare(b.cls));
  }, [natives]);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal docs-modal">
        <div className="docs-header">
          <p className="modal-title">{s.docsTitle || 'Script API'}</p>
          <button className="btn-icon" onClick={onClose} title={s.cancel || 'Close'}>
            <X size={16} />
          </button>
        </div>
        <p className="modal-subtitle">{s.docsSubtitle || 'Native functions available to Axium scripts'}</p>

        <div className="docs-body custom-scrollbar">
          <div className="docs-class">
            <h3 className="docs-class-name">{s.docsSyntaxTitle || 'Syntax'}</h3>
            {SYNTAX_TOPICS.map(topic => (
              <div key={topic.code} className="docs-method">
                <code className="docs-sig">
                  <span className="docs-method-name">{topic.code}</span>
                </code>
                <p className="docs-desc">{lang === 'ru' ? topic.ru : topic.en}</p>
              </div>
            ))}
            <div className="docs-method">
              <code className="docs-sig">{s.docsExampleTitle || 'Example'}</code>
              <pre className="docs-example custom-scrollbar">{EXAMPLE_SCRIPT}</pre>
            </div>
          </div>

          {grouped.length === 0 ? (
            <p className="docs-empty">{s.docsEmpty || 'No API available (engine not loaded).'}</p>
          ) : (
            grouped.map(group => (
              <div key={group.cls} className="docs-class">
                <h3 className="docs-class-name">{group.cls}</h3>
                {group.methods.map(m => {
                  const desc = description(m.cls, m.method, lang);
                  return (
                    <div key={m.raw} className="docs-method">
                      <code className="docs-sig">
                        <span className="docs-method-name">{m.method}</span>
                        (<span className="docs-params">{m.params.join(', ')}</span>)
                        {m.ret && m.ret !== 'Void' ? <span className="docs-ret"> : {m.ret}</span> : null}
                      </code>
                      {desc ? <p className="docs-desc">{desc}</p> : null}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <button className="modal-cancel" onClick={onClose}>{s.cancel || 'Close'}</button>
      </div>
    </div>
  );
}
