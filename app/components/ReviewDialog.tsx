'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Button, Chip } from '@shared/design/ui';
import { Star } from '@shared/design/icons';
import type { ReviewableItem } from '@shared/api';

/**
 * Lembar penulisan ulasan — padanan `review_sheet.dart` pada aplikasi Flutter.
 *
 * Hanya menampilkan produk yang menurut server belum diulas pengguna ini;
 * syaratnya (pesanan miliknya, sudah diterima, belum pernah diulas) hanya
 * diketahui backend.
 */

const LABELS = [
  'Sangat kurang',
  'Kurang',
  'Cukup',
  'Bagus',
  'Sangat bagus',
];

export function ReviewDialog({
  orderId,
  items,
  onClose,
  onDone,
}: {
  orderId: string;
  items: ReviewableItem[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [target, setTarget] = useState(items[0]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await api.submitReview({
        orderId,
        productId: target.productId ?? undefined,
        umkmProductId: target.umkmProductId ?? undefined,
        rating,
        comment: comment.trim() || undefined,
      });
      onDone();
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tulis ulasan"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(0,0,0,0.35)',
        display: 'grid',
        placeItems: 'center',
        padding: 'var(--sp-base)',
      }}
    >
      <div
        className="kc-card kc-card--pad stack-md"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(520px, 100%)',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: 'var(--r-modal)',
        }}
      >
        <div>
          <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>
            Beri Ulasan
          </p>
          <p className="t-caption-sm">Ulasanmu membantu warga lain memilih.</p>
        </div>

        {/* Pemilih produk hanya muncul bila memang ada lebih dari satu. */}
        {items.length > 1 ? (
          <div>
            <p className="t-caption-sm" style={{ marginBottom: 'var(--sp-xs)' }}>
              Produk
            </p>
            <div style={{ display: 'flex', gap: 'var(--sp-sm)', flexWrap: 'wrap' }}>
              {items.map((item) => {
                const key = item.productId ?? item.umkmProductId ?? item.name;
                const activeKey =
                  target.productId ?? target.umkmProductId ?? target.name;
                return (
                  <Chip
                    key={key}
                    selected={key === activeKey}
                    onClick={() => setTarget(item)}
                  >
                    {item.name}
                  </Chip>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="t-body-lg" style={{ fontWeight: 600 }}>
            {target.name}
          </p>
        )}

        <div>
          <div style={{ display: 'flex' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => {
                  setRating(star);
                  setError(null);
                }}
                aria-label={`${star} bintang, ${LABELS[star - 1]}`}
                aria-pressed={rating === star}
                // Tiap bintang tombol tersendiri bertarget 44 px: pembaca
                // layar perlu tahu ia sedang memilih "3 dari 5", bukan
                // menebak dari posisi sentuhan pada satu gambar.
                style={{
                  width: 44,
                  height: 44,
                  display: 'grid',
                  placeItems: 'center',
                  color:
                    star <= rating
                      ? 'var(--yellow-accent)'
                      : 'var(--hairline)',
                }}
              >
                <Star
                  size={26}
                  aria-hidden="true"
                  style={{ fill: 'currentColor' }}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="t-caption" style={{ fontWeight: 600 }}>
              {LABELS[rating - 1]}
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="review-comment">
            Ceritakan pengalamanmu (opsional)
          </label>
          <textarea
            id="review-comment"
            rows={4}
            maxLength={1000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        <div style={{ display: 'flex', gap: 'var(--sp-sm)' }}>
          <Button variant="secondary" block onClick={onClose}>
            Batal
          </Button>
          <Button
            block
            // Bintang wajib; komentar tidak. Rating nol bukan "nol bintang",
            // melainkan pengguna belum memilih.
            disabled={rating === 0 || submitting}
            onClick={() => void submit()}
          >
            {submitting ? 'Mengirim…' : 'Kirim Ulasan'}
          </Button>
        </div>
      </div>
    </div>
  );
}
