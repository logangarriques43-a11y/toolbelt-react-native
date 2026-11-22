// Renders video/testflight-howto.html to numbered PNG frames with headless
// Chrome over the DevTools protocol (no npm packages needed; Node 22+ has a
// global WebSocket). Then video/encode.swift turns the frames into an H.264 MP4
// that iPhones play inline.
//
//   node video/render.mjs <outDir> [fps=30] [onlySeconds,comma,separated]
//
// Passing a list of seconds renders just those frames (for previews).

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const here = dirname(fileURLToPath(import.meta.url));
const page = pathToFileURL(join(here, 'testflight-howto.html')).href;
const outDir = resolve(process.argv[2] ?? join(here, 'frames'));
const fps = Number(process.argv[3] ?? 30);
const only = process.argv[4]?.split(',').map(Number);
const PORT = 9333;

mkdirSync(outDir, { recursive: true });
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, '--hide-scrollbars', '--force-device-scale-factor=1',
  '--allow-file-access-from-files', `--user-data-dir=${join(outDir, '.chrome')}`, 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 50 && !target; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    target = list.find((t) => t.type === 'page');
  } catch { await sleep(200); }
}
if (!target) throw new Error('Chrome did not start');

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let seq = 0;
const pending = new Map();
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
});
const send = (method, params = {}) => new Promise((res, rej) => {
  const id = ++seq;
  pending.set(id, (m) => (m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result)));
  ws.send(JSON.stringify({ id, method, params }));
});

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 720, height: 1280, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: page });
await sleep(1500);
const { result } = await send('Runtime.evaluate', { expression: 'window.DURATION', returnByValue: true });
const duration = result.value;
const times = only ?? Array.from({ length: Math.round(duration * fps) }, (_, i) => i / fps);

for (let i = 0; i < times.length; i++) {
  await send('Runtime.evaluate', { expression: `renderAt(${times[i]})` });
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const name = only ? `t${String(times[i]).replace('.', '_')}.png` : `${String(i).padStart(5, '0')}.png`;
  writeFileSync(join(outDir, name), Buffer.from(shot.data, 'base64'));
  if (!only && i % 150 === 0) console.log(`frame ${i}/${times.length}`);
}
console.log(`wrote ${times.length} frame(s) to ${outDir}`);
ws.close();
chrome.kill();
