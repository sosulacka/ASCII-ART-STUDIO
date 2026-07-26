// Пайплайн сборки кастомного установщика (путь А).
//
//   1. Собирает основное приложение через `tauri build --no-bundle`
//      (кладёт asciiartstudio.exe + resources/ + _up_/ в target/release,
//       но НЕ генерирует NSIS/MSI — они нам не нужны)
//   2. Упаковывает рантайм-набор в installer/payload/app.zip
//   3. Собирает сам установщик (cargo build --release), в который zip
//      вшивается через include_bytes!
//
// Итог: installer/target/release/ascii-art-studio-installer.exe — единый
// самодостаточный .exe. Именно его публикует workflow вместо NSIS.

import { execSync } from 'node:child_process';
import {
  existsSync, mkdirSync, rmSync, readdirSync, statSync,
  readFileSync, writeFileSync, copyFileSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';

const root = dirname(fileURLToPath(import.meta.url));
const releaseDir = join(root, 'src-tauri', 'target', 'release');
const payloadDir = join(root, 'installer', 'payload');
const zipPath = join(payloadDir, 'app.zip');
const isWin = process.platform === 'win32';
const APP_EXE = isWin ? 'asciiartstudio.exe' : 'asciiartstudio';

// Что кладём в payload: exe приложения + сопутствующие ресурсы.
// Раскладка соответствует map-форме resources в src-tauri/tauri.conf.json:
//   vcam/ (softcam DLL), assets/ (шрифт), licenses/. Всё остальное в
// target/release — build-мусор компилятора, его не берём.
const PAYLOAD_ENTRIES = isWin
  ? [
      APP_EXE,
      'vcam',
      'assets',
      'licenses',
      'resources',   // на случай старой раскладки
      '_up_',        // на случай старой раскладки
      'WebView2Loader.dll',
    ]
  : [
      APP_EXE,
      'assets',
      'licenses',
      'resources',
      'axium',       // libaxium_vm.so из tauri.linux.conf.json (resource_dir)
      '_up_',
    ];

function run(cmd, cwd = root) {
  console.log(`\n\x1b[36m$ ${cmd}\x1b[0m`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

// ── 1. Сборка приложения (без NSIS/MSI) ─────────────────────────
console.log('\x1b[1m[1/3] Сборка приложения (tauri build --no-bundle)\x1b[0m');
run('npm run tauri -- build --no-bundle');

const exePath = join(releaseDir, APP_EXE);
if (!existsSync(exePath)) {
  console.error(`\x1b[31mОшибка: ${APP_EXE} не найден в ${releaseDir}\x1b[0m`);
  process.exit(1);
}

// ── 2. Упаковка payload ─────────────────────────────────────────
console.log('\n\x1b[1m[2/3] Упаковка payload\x1b[0m');
mkdirSync(payloadDir, { recursive: true });
if (existsSync(zipPath)) rmSync(zipPath);

function collectFiles(base, rel, out) {
  const full = join(base, rel);
  if (!existsSync(full)) return;
  const st = statSync(full);
  if (st.isDirectory()) {
    for (const name of readdirSync(full)) collectFiles(base, join(rel, name), out);
  } else {
    out.push(rel);
  }
}

const files = [];
for (const e of PAYLOAD_ENTRIES) collectFiles(releaseDir, e, files);
console.log(`  Файлов в payload: ${files.length}`);
if (files.length === 0) {
  console.error('\x1b[31mPayload пуст — нечего упаковывать\x1b[0m');
  process.exit(1);
}

createZip(releaseDir, files, zipPath);
console.log(`  ${zipPath} (${(statSync(zipPath).size / 1048576).toFixed(1)} MB)`);

// ── 3. Сборка установщика ───────────────────────────────────────
console.log('\n\x1b[1m[3/3] Сборка установщика\x1b[0m');
run('cargo build --release', join(root, 'installer'));

const outExe = join(
  root, 'installer', 'target', 'release',
  isWin ? 'ascii-art-studio-installer.exe' : 'ascii-art-studio-installer',
);
if (!existsSync(outExe)) {
  console.error('\x1b[31mУстановщик не собрался\x1b[0m');
  process.exit(1);
}

// Кладём готовый установщик под удобным именем в dist-installer/
const distDir = join(root, 'dist-installer');
mkdirSync(distDir, { recursive: true });
const finalExe = join(
  distDir,
  isWin ? 'ASCII-Art-Studio-Setup.exe' : 'ASCII-Art-Studio-Setup',
);
copyFileSync(outExe, finalExe);
if (!isWin) {
  const { chmodSync } = await import('node:fs');
  chmodSync(finalExe, 0o755);
}

console.log(`\n\x1b[32mГотово:\x1b[0m ${finalExe}`);
console.log(`Размер: ${(statSync(finalExe).size / 1048576).toFixed(1)} MB`);

// ── ZIP через встроенный zlib (без внешних зависимостей) ────────
function createZip(base, relFiles, dest) {
  const chunks = [];
  const central = [];
  let offset = 0;

  const crcTable = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  const crc32 = (buf) => {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };

  for (const rel of relFiles) {
    const data = readFileSync(join(base, rel));
    const name = Buffer.from(rel.split('\\').join('/'), 'utf8');
    const comp = deflateRawSync(data);
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comp.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);

    chunks.push(local, name, comp);
    const localOffset = offset;
    offset += local.length + name.length + comp.length;

    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0);
    cen.writeUInt16LE(20, 4);
    cen.writeUInt16LE(20, 6);
    cen.writeUInt16LE(0, 8);
    cen.writeUInt16LE(8, 10);
    cen.writeUInt16LE(0, 12);
    cen.writeUInt16LE(0, 14);
    cen.writeUInt32LE(crc, 16);
    cen.writeUInt32LE(comp.length, 20);
    cen.writeUInt32LE(data.length, 24);
    cen.writeUInt16LE(name.length, 28);
    cen.writeUInt16LE(0, 30);
    cen.writeUInt16LE(0, 32);
    cen.writeUInt16LE(0, 34);
    cen.writeUInt16LE(0, 36);
    cen.writeUInt32LE(0, 38);
    cen.writeUInt32LE(localOffset, 42);
    central.push(cen, name);
  }

  const centralStart = offset;
  let centralSize = 0;
  for (const c of central) centralSize += c.length;

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(relFiles.length, 8);
  end.writeUInt16LE(relFiles.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(centralStart, 16);
  end.writeUInt16LE(0, 20);

  writeFileSync(dest, Buffer.concat([...chunks, ...central, end]));
}
