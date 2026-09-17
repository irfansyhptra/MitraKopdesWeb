import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * Halaman Asisten AI — yang diuji adalah mesin efek ketiknya.
 *
 * Jawaban tidak langsung ditampilkan utuh: ia dirender huruf demi huruf
 * (15 ms per huruf) lalu dipindahkan ke daftar pesan begitu selesai. Kalau
 * perpindahan terakhir itu terlewat, gelembung terakhir akan hilang saat
 * pesan berikutnya masuk.
 */

const aiChat = vi.fn();
vi.mock('@/lib/api', () => ({ api: { aiChat: (m: string) => aiChat(m) } }));

const { default: AIAssistantPage } = await import('@/app/ai-assistant/page');

// Badan blok, bukan arrow ringkas: `mockReset()` mengembalikan mock-nya
// sendiri — sebuah fungsi — dan Vitest memperlakukan nilai kembalian
// `beforeEach` sebagai fungsi pembersih. Versi ringkasnya membuat mock ini
// dipanggil sekali lagi tanpa argumen setelah tiap tes, dan promise tertolak
// yang dihasilkannya tidak ada yang menangkap.
beforeEach(() => {
  aiChat.mockReset();
});

describe('Asisten AI', () => {
  it('menampilkan saran sebelum percakapan dimulai', () => {
    render(<AIAssistantPage />);
    expect(screen.getByText('Terlaris Desa')).toBeInTheDocument();
    expect(screen.getByText('Promo Spesial')).toBeInTheDocument();
  });

  it('mengirim pertanyaan dan menuliskan jawabannya sampai penuh', async () => {
    aiChat.mockResolvedValue('Beras 5 kg.');
    const user = userEvent.setup();

    render(<AIAssistantPage />);
    await user.type(screen.getByLabelText('Tulis pesan'), 'apa yang murah');
    await user.click(screen.getByRole('button', { name: 'Kirim pesan' }));

    expect(aiChat).toHaveBeenCalledWith('apa yang murah');
    expect(await screen.findByText('apa yang murah')).toBeInTheDocument();
    // Huruf terakhir baru muncul setelah seluruh efek ketik selesai.
    await waitFor(() => expect(screen.getByText('Beras 5 kg.')).toBeInTheDocument());
  });

  it('menekan kartu saran langsung mengirim pertanyaannya', async () => {
    aiChat.mockResolvedValue('Oke.');
    const user = userEvent.setup();

    render(<AIAssistantPage />);
    await user.click(screen.getByText('Status Pesanan'));

    expect(aiChat).toHaveBeenCalledWith('Cek status pesanan saya');
    // Kartu saran menghilang begitu percakapan dimulai.
    await waitFor(() =>
      expect(screen.queryByText('Terlaris Desa')).not.toBeInTheDocument(),
    );
  });

  it('jawaban kosong tetap memberi kalimat, bukan gelembung kosong', async () => {
    aiChat.mockResolvedValue('');
    const user = userEvent.setup();

    render(<AIAssistantPage />);
    await user.click(screen.getByText('Promo Spesial'));

    expect(
      await screen.findByText(/tidak mengembalikan jawaban/i),
    ).toBeInTheDocument();
  });

  it('galat 403 diterjemahkan, bukan ditampilkan mentah', async () => {
    // mockImplementation, bukan mockRejectedValue: yang terakhir membuat
    // promise tertolak saat mock didefinisikan, sebelum ada yang menangkapnya.
    aiChat.mockImplementation(() =>
      Promise.reject(Object.assign(new Error('Forbidden'), { status: 403 })),
    );
    const user = userEvent.setup();

    render(<AIAssistantPage />);
    await user.click(screen.getByText('Terlaris Desa'));

    expect(await screen.findByText(/Akses ditolak/i)).toBeInTheDocument();
  });

  it('tombol kirim mati selama jawaban belum selesai ditulis', async () => {
    let resolve!: (value: string) => void;
    aiChat.mockReturnValue(new Promise<string>((r) => (resolve = r)));
    const user = userEvent.setup();

    render(<AIAssistantPage />);
    await user.type(screen.getByLabelText('Tulis pesan'), 'halo');
    await user.click(screen.getByRole('button', { name: 'Kirim pesan' }));

    // Menunggu jawaban: pertanyaan kedua tidak boleh menyusul dan menimpa
    // indeks gelembung yang sedang ditulis.
    expect(screen.getByRole('button', { name: 'Kirim pesan' })).toBeDisabled();

    resolve('Halo juga.');
    await waitFor(() =>
      expect(screen.getByText('Halo juga.')).toBeInTheDocument(),
    );
    expect(aiChat).toHaveBeenCalledTimes(1);
  });
});
