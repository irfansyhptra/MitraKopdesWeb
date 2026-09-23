/**
 * Pemeriksa responsif: menjalankan Chrome headless pada sederet lebar layar dan
 * melaporkan luberan mendatar, target sentuh di bawah 36px, dan teks di bawah
 * 11px. Perlu `google-chrome-stable` dan server yang sudah jalan:
 *
 *   npx next start -p 3210   # dari website/app, setelah `next build app`
 *   node scripts/audit-responsive.mjs / /marketplace /orders
 *
 * Lebarnya mengikuti KopdesResponsiveSpec di Flutter: 360, 600, dan 1024 adalah
 * batas compact/phone/tablet/large.
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const origin = process.env.AUDIT_ORIGIN ?? 'http://localhost:3210';
const port = 9400;
const widths = [320, 360, 390, 430, 600, 768, 1024, 1440];
const pages = process.argv.slice(2);

const chrome = spawn('google-chrome-stable', [
  '--headless=new', `--remote-debugging-port=${port}`, '--no-sandbox', '--disable-gpu',
  '--user-data-dir=/tmp/claude-1000/-home-irfan-Project-KOPDES/chrome-audit', 'about:blank',
], { stdio: 'ignore' });
await sleep(2500);
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const sock = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl);
let id = 0; const pending = new Map();
const send = (m, p = {}) => new Promise((r) => { pending.set(++id, r); sock.send(JSON.stringify({ id, method: m, params: p })); });
sock.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } };
await new Promise((r) => (sock.onopen = r));
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
await send('Network.setCookie', { name: 'kopdes_session', value: '1', url: origin });

const PROBE = `(() => {
  const vw = document.documentElement.clientWidth;
  const out = { vw, scrollW: document.documentElement.scrollWidth, wide: [], smallTap: [], tinyText: [] };
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 && r.height < 1) continue;
    // Item di dalam rail mendatar memang menggulir; itu bukan luberan.
    if ((r.right > vw + 1 || r.left < -1) && !el.closest('.kc-rail, .kc-segmented, .filterbar__row, .kc-tabs, .staff-nav, .bottomnav')) {
      const id = el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0,2).join('.') : '');
      out.wide.push(id + ' @' + Math.round(r.left) + '..' + Math.round(r.right));
    }
    if ((el.tagName === 'BUTTON' || el.tagName === 'A' || el.tagName === 'INPUT') && r.width > 0) {
      if (r.height < 36 || r.width < 36) {
        const id = el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/)[0] : '');
        out.smallTap.push(id + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
      }
    }
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs && fs < 11 && el.textContent && el.textContent.trim().length > 2 && el.children.length === 0) {
      out.tinyText.push(Math.round(fs*10)/10 + 'px: ' + el.textContent.trim().slice(0,24));
    }
  }
  const uniq = (a) => [...new Set(a)];
  out.wide = uniq(out.wide).slice(0,6);
  out.smallTap = uniq(out.smallTap).slice(0,6);
  out.tinyText = uniq(out.tinyText).slice(0,4);
  return out;
})()`;

for (const path of pages) {
  console.log(`\n━━━ ${path} ━━━`);
  for (const w of widths) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: w < 600 });
    await send('Page.navigate', { url: origin + path });
    await sleep(2600);
    const r = await send('Runtime.evaluate', { expression: PROBE, returnByValue: true });
    const v = r?.result?.value;
    if (!v) { console.log(`  ${w}px  (gagal baca)`); continue; }
    const of = v.scrollW > v.vw + 1 ? `MELUBER ${v.scrollW}>${v.vw}` : 'ok';
    console.log(`  ${String(w).padStart(4)}px  ${of}${v.wide.length ? '  keluar: ' + v.wide.join(' | ') : ''}`);
    if (v.smallTap.length) console.log(`         sentuh kecil: ${v.smallTap.join(' | ')}`);
    if (v.tinyText.length) console.log(`         teks <11px: ${v.tinyText.join(' | ')}`);
  }
}
sock.close(); chrome.kill(); process.exit(0);
