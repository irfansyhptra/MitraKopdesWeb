import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import {
  clearTokens,
  getToken,
  isSignedIn,
  SESSION_COOKIE,
  setTokens,
  syncSessionCookie,
} from '@/lib/auth';

// vi.mock diangkat ke atas berkas apa pun tempat ia ditulis, jadi ia ditaruh
// di tempat ia benar-benar dijalankan.
vi.mock('next/navigation', () => ({ usePathname: () => '/' }));

/**
 * Sesi dan tombol "Masuk".
 *
 * Token tinggal di localStorage; cookie `kopdes_session` hanya penanda agar
 * middleware bisa memutuskan sebelum halaman digambar. Keduanya harus
 * bergerak bersama — cookie yang tertinggal membuat middleware melempar
 * orang yang sebenarnya sudah keluar, atau sebaliknya.
 */

function cookieActive() {
  return document.cookie.includes(`${SESSION_COOKIE}=1`);
}

beforeEach(() => {
  window.localStorage.clear();
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0`;
});

describe('setTokens / clearTokens', () => {
  it('masuk menyimpan token dan menanam cookie penanda', () => {
    setTokens('akses', 'segar');
    expect(getToken()).toBe('akses');
    expect(cookieActive()).toBe(true);
  });

  it('keluar menghapus keduanya', () => {
    setTokens('akses', 'segar');
    clearTokens();
    expect(getToken()).toBeNull();
    expect(cookieActive()).toBe(false);
  });

  it('cookie tidak pernah memuat tokennya', () => {
    setTokens('token-rahasia-123', 'segar');
    // Cookie non-httpOnly ikut terkirim pada tiap permintaan aset; token di
    // sana tidak menambah keamanan apa pun.
    expect(document.cookie).not.toContain('token-rahasia-123');
  });
});

describe('syncSessionCookie', () => {
  it('menghapus cookie yang tertinggal tanpa token', () => {
    document.cookie = `${SESSION_COOKIE}=1; path=/`;
    // Tanpa ini middleware akan membiarkan orang yang sudah kehilangan
    // tokennya masuk ke halaman terjaga, lalu halamannya melempar balik.
    syncSessionCookie();
    expect(cookieActive()).toBe(false);
  });

  it('menanam cookie yang hilang padahal token masih ada', () => {
    window.localStorage.setItem('kopdes_access_token', 'akses');
    syncSessionCookie();
    expect(cookieActive()).toBe(true);
  });

  it('localStorage yang menang, bukan cookie', () => {
    expect(isSignedIn()).toBe(false);
    document.cookie = `${SESSION_COOKIE}=1; path=/`;
    expect(isSignedIn()).toBe(false);
  });
});

describe('tombol Masuk di bilah atas', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  async function shell() {
    const { AppShell } = await import('@/components/AppShell');
    return render(<AppShell>isi</AppShell>);
  }

  it('muncul bagi tamu', async () => {
    await shell();
    expect(await screen.findByRole('link', { name: 'Masuk' })).toBeInTheDocument();
  });

  it('hilang bagi yang sudah masuk, diganti tautan akun', async () => {
    setTokens('akses', 'segar');
    await shell();
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Akun Saya' })).toBeInTheDocument(),
    );
    expect(screen.queryByRole('link', { name: 'Masuk' })).not.toBeInTheDocument();
  });

  it('muncul lagi setelah keluar, tanpa memuat ulang halaman', async () => {
    setTokens('akses', 'segar');
    await shell();
    await waitFor(() => screen.getByRole('link', { name: 'Akun Saya' }));

    clearTokens();

    // Keluar di halaman profil harus terlihat di bilah atas seketika; menunggu
    // halaman dimuat ulang membuat pengguna mengira tombolnya tidak bekerja.
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Masuk' })).toBeInTheDocument(),
    );
  });

  it('perubahan dari tab lain ikut terbaca', async () => {
    await shell();
    await waitFor(() => screen.getByRole('link', { name: 'Masuk' }));

    window.localStorage.setItem('kopdes_access_token', 'akses');
    window.dispatchEvent(new Event('storage'));

    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Akun Saya' })).toBeInTheDocument(),
    );
  });
});
