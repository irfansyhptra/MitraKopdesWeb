'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { Card, SectionHeader } from '@shared/design/ui';
import {
  ChevronRight,
  Flame,
  Percent,
  Package,
  Salad,
  Send,
  Sparkles,
  Store,
  Tag,
  TrendingUp,
  Truck,
  type LucideIcon,
} from '@shared/design/icons';

/**
 * Asisten AI pelanggan — padanan `AIAssistantScreen` pada aplikasi Flutter.
 *
 * Dua hal yang sengaja tidak ikut dipindahkan dari versi mobile:
 *
 * 1. **Pemilih mode Konsumen/UMKM/Gudang.** Mode UMKM dan Gudang memanggil
 *    `/ai/management`, `/ai/inventory`, dan `/ai/anomaly` — semuanya dijaga
 *    `RolesGuard` + `PermissionsGuard` untuk staf Kopdes. Dari akun pelanggan
 *    ketiganya hanya menjawab 403, jadi menampilkan tombolnya berarti
 *    menjanjikan sesuatu yang pasti ditolak. Portal pegawai punya halaman
 *    asistennya sendiri.
 *
 * 2. **Pencocokan kata untuk memilih endpoint.** Versi mobile membaca kalimat
 *    pengguna ("stok kritis", "anomali", …) lalu menentukan endpoint di sisi
 *    klien. Yang boleh diakses seseorang ditentukan backend, bukan tebakan
 *    kata di peramban.
 *
 * Tombol mikrofon juga tidak dibuat: yang ada di mobile hanya simulasi —
 * menunggu tiga detik lalu mengisi kalimat tetap, tanpa pengenalan suara.
 */

interface Message {
  role: 'user' | 'ai';
  text: string;
  error?: boolean;
}

const SUGGESTIONS: {
  icon: LucideIcon;
  tint: string;
  color: string;
  title: string;
  desc: string;
  query: string;
}[] = [
  {
    icon: TrendingUp,
    tint: '#fee2e2',
    color: '#ef4444',
    title: 'Terlaris Desa',
    desc: 'Cari produk terlaris di pasar desa saat ini.',
    query: 'Rekomendasi produk terlaris minggu ini',
  },
  {
    icon: Tag,
    tint: '#fef3c7',
    color: '#f59e0b',
    title: 'Promo Spesial',
    desc: 'Daftar produk diskon & penawaran menarik.',
    query: 'Apa saja produk yang sedang promo?',
  },
  {
    icon: Salad,
    tint: '#d1fae5',
    color: '#10b981',
    title: 'Rekomendasi Belanja',
    desc: 'Rekomendasi belanja sehat untuk keluarga.',
    query: 'Rekomendasi belanja sehat',
  },
  {
    icon: Truck,
    tint: '#dbeafe',
    color: '#3b82f6',
    title: 'Status Pesanan',
    desc: 'Lacak posisi pengiriman barang aktif.',
    query: 'Cek status pesanan saya',
  },
];

const PILLS: { icon: LucideIcon; color: string; label: string }[] = [
  { icon: Flame, color: '#ef4444', label: 'Produk terlaris minggu ini' },
  { icon: Percent, color: '#f59e0b', label: 'Promo diskon terbaru' },
  { icon: Package, color: '#3b82f6', label: 'Status pesanan saya' },
  { icon: Store, color: '#7442c8', label: 'Cara jadi mitra UMKM' },
];

/** Kalimat yang berganti selama menunggu, sama dengan versi mobile. */
const WAITING = [
  'Menganalisis pertanyaan…',
  'Mencari informasi…',
  'Menyiapkan jawaban…',
];

/** Kecepatan efek ketik, sama dengan `TypewriterStream` di Flutter. */
const TYPE_MS = 15;

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [waitingText, setWaitingText] = useState(WAITING[0]);

  // Teks yang sedang "diketik" pada gelembung terakhir. Disimpan terpisah
  // dari `messages` supaya hanya satu nilai yang berubah tiap 15 ms.
  const [typed, setTyped] = useState<string | null>(null);
  const fullText = useRef('');

  const logRef = useRef<HTMLDivElement>(null);
  const busy = waiting || typed !== null;

  // Ikut ke dasar daftar, kecuali pembaca sedang menggulir ke atas.
  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    if (log.scrollHeight - log.scrollTop - log.clientHeight > 160) return;
    log.scrollTop = log.scrollHeight;
  }, [messages, typed, waiting]);

  // Kalimat tunggu berganti tiap 3 detik selama permintaan berjalan.
  useEffect(() => {
    if (!waiting) return;
    let i = 0;
    const timer = setInterval(() => {
      i = (i + 1) % WAITING.length;
      setWaitingText(WAITING[i]);
    }, 3000);
    return () => clearInterval(timer);
  }, [waiting]);

  // Efek ketik: satu interval, satu state, dan gelembung final dipindahkan ke
  // `messages` begitu selesai supaya ia jadi sumber kebenaran berikutnya.
  useEffect(() => {
    if (typed === null) return;
    const full = fullText.current;
    if (typed.length >= full.length) {
      setMessages((prev) => [...prev, { role: 'ai', text: full }]);
      setTyped(null);
      return;
    }
    const timer = setTimeout(
      () => setTyped(full.slice(0, typed.length + 1)),
      TYPE_MS,
    );
    return () => clearTimeout(timer);
  }, [typed]);

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || busy) return;

      setMessages((prev) => [...prev, { role: 'user', text: message }]);
      setDraft('');
      setWaiting(true);
      setWaitingText(WAITING[0]);

      try {
        const answer = await api.aiChat(message);
        setWaiting(false);
        if (!answer) {
          setMessages((prev) => [
            ...prev,
            {
              role: 'ai',
              text: 'Maaf, layanan AI tidak mengembalikan jawaban. Silakan coba beberapa saat lagi.',
              error: true,
            },
          ]);
          return;
        }
        fullText.current = answer;
        setTyped('');
      } catch (e) {
        setWaiting(false);
        setMessages((prev) => [
          ...prev,
          { role: 'ai', text: describe(e as Error), error: true },
        ]);
      }
    },
    [busy],
  );

  const started = messages.length > 0 || typed !== null || waiting;

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <h1 className="page-title">Asisten KMP Mitra</h1>
          <p className="page-sub">
            Tanya soal produk, promo, atau pesananmu di koperasi desa.
          </p>
        </div>
      </div>

      <div className="kc-chat">
        <div className="kc-chat__log" ref={logRef} aria-live="polite">
          {!started && <EmptyState onPick={(q) => void send(q)} />}

          {messages.map((m, i) => (
            <Bubble key={i} message={m} />
          ))}

          {typed !== null && (
            <Bubble message={{ role: 'ai', text: typed }} streaming />
          )}

          {waiting && (
            <div className="kc-msg kc-msg--ai">
              <span className="kc-msg__avatar" aria-hidden="true">
                <Sparkles size={14} />
              </span>
              <div className="kc-msg__bubble">
                <span className="kc-typing" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>{' '}
                <span className="t-caption-sm">{waitingText}</span>
              </div>
            </div>
          )}
        </div>

        <form
          className="kc-chat__form"
          onSubmit={(e) => {
            e.preventDefault();
            void send(draft);
          }}
        >
          <label className="visually-hidden" htmlFor="ai-draft">
            Tulis pesan
          </label>
          <textarea
            id="ai-draft"
            className="kc-chat__input"
            rows={1}
            value={draft}
            placeholder="Tulis pesan atau tanyakan sesuatu…"
            onChange={(e) => setDraft(e.target.value)}
            // Enter mengirim, Shift+Enter menambah baris — kebiasaan kolom
            // chat di web; di ponsel `onSubmitted` mobile berperilaku sama.
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send(draft);
              }
            }}
          />
          <button
            type="submit"
            className="kc-chat__send"
            disabled={busy || draft.trim().length === 0}
            aria-label="Kirim pesan"
          >
            <Send size={17} aria-hidden="true" />
          </button>
        </form>
      </div>
    </>
  );
}

function Bubble({
  message,
  streaming = false,
}: {
  message: Message;
  streaming?: boolean;
}) {
  const classes = [
    'kc-msg',
    message.role === 'user' ? 'kc-msg--user' : 'kc-msg--ai',
    message.error ? 'kc-msg--error' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      {message.role === 'ai' && (
        <span className="kc-msg__avatar" aria-hidden="true">
          <Sparkles size={14} />
        </span>
      )}
      <div className="kc-msg__bubble">
        {message.text}
        {streaming && <span className="kc-msg__caret" aria-hidden="true" />}
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (query: string) => void }) {
  return (
    <div className="stack-lg">
      <Card className="stack-sm">
        <div style={{ display: 'flex', gap: 'var(--sp-md)', alignItems: 'center' }}>
          <span className="kc-msg__avatar" aria-hidden="true">
            <Sparkles size={14} />
          </span>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
              Ada yang bisa dibantu?
            </p>
            <p className="t-caption-sm">
              Asisten ini membaca katalog koperasi desamu.
            </p>
          </div>
        </div>
      </Card>

      <div>
        <SectionHeader title="Mulai dari sini" />
        <div className="kc-suggest">
          {SUGGESTIONS.map((s) => (
            <button key={s.title} type="button" onClick={() => onPick(s.query)}>
              <span
                className="kc-suggest__icon"
                style={{
                  ['--suggest-tint' as string]: s.tint,
                  color: s.color,
                }}
                aria-hidden="true"
              >
                <s.icon size={16} strokeWidth={2.2} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="kc-suggest__title">{s.title}</span>
                <span className="kc-suggest__desc" style={{ display: 'block' }}>
                  {s.desc}
                </span>
              </span>
              <ChevronRight
                size={14}
                aria-hidden="true"
                style={{ color: 'var(--primary)', flex: 'none' }}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="kc-pills">
        {PILLS.map((p) => (
          <button
            key={p.label}
            type="button"
            className="kc-pill"
            onClick={() => onPick(p.label)}
          >
            <p.icon size={14} aria-hidden="true" style={{ color: p.color }} />
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Pesan galat yang bisa dipahami, dipetakan dari status seperti di mobile. */
function describe(error: Error & { status?: number }): string {
  switch (error.status) {
    case 401:
    case 403:
      return 'Akses ditolak. Coba masuk kembali ke akunmu.';
    case 429:
      return 'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.';
    case 404:
      return 'Layanan AI tidak ditemukan. Hubungi pengurus koperasi.';
    default:
      return 'Maaf, layanan AI sedang terganggu. Silakan coba beberapa saat lagi.';
  }
}
