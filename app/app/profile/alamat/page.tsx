'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import {
  Badge,
  Button,
  Card,
  ListGroup,
  Message,
  SectionHeader,
  Skeleton,
} from '@shared/design/ui';
import type { Address, CreateAddressInput } from '@shared/api';

/** Kelola alamat pengiriman — dipakai checkout untuk memilih tujuan. */
export default function AddressPage() {
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAddresses(await api.getAddresses());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login?next=/profile/alamat');
      return;
    }
    void load();
  }, [load, router]);

  async function create(form: CreateAddressInput) {
    setSaving(true);
    try {
      await api.createAddress(form);
      setShowForm(false);
      await load();
    } catch (e) {
      window.alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(address: Address) {
    if (!window.confirm(`Hapus alamat "${address.title}"?`)) return;
    try {
      await api.deleteAddress(address.id);
      await load();
    } catch (e) {
      window.alert((e as Error).message);
    }
  }

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <h1 className="page-title">Alamat Pengiriman</h1>
          <p className="page-sub">Tujuan pengantaran pesananmu</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Tutup' : 'Tambah Alamat'}
        </Button>
      </div>

      <div className="stack-md" style={{ maxWidth: 640 }}>
        {showForm && <AddressForm saving={saving} onSubmit={create} />}

        {loading && (
          <Card className="stack-sm">
            <Skeleton height={16} width="40%" />
            <Skeleton height={48} />
          </Card>
        )}

        {!loading && error && (
          <Message
            title="Alamat belum berhasil dimuat"
            body={error}
            actionLabel="Coba Lagi"
            onAction={() => void load()}
          />
        )}

        {!loading && !error && addresses.length === 0 && (
          <Message
            title="Belum ada alamat tersimpan"
            body="Tambahkan alamat agar kurir desa tahu ke mana mengantar."
          />
        )}

        {!loading && addresses.length > 0 && (
          <ListGroup>
            {addresses.map((address) => (
              <div
                key={address.id}
                style={{
                  display: 'flex',
                  gap: 'var(--sp-md)',
                  padding: 'var(--sp-base)',
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      gap: 'var(--sp-sm)',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                    }}
                  >
                    <strong style={{ fontSize: 14, color: 'var(--ink)' }}>
                      {address.title}
                    </strong>
                    {address.isDefault && (
                      <Badge variant="primary">Utama</Badge>
                    )}
                  </div>
                  <p className="t-caption-sm" style={{ marginTop: 2 }}>
                    {address.recipientName} · {address.phone}
                    <br />
                    {address.street}, {address.city}, {address.state}{' '}
                    {address.postalCode}
                  </p>
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => void remove(address)}
                  aria-label={`Hapus alamat ${address.title}`}
                >
                  🗑
                </button>
              </div>
            ))}
          </ListGroup>
        )}
      </div>
    </>
  );
}

const FIELDS: { name: keyof CreateAddressInput; label: string }[] = [
  { name: 'title', label: 'Nama Alamat (mis. Rumah)' },
  { name: 'recipientName', label: 'Nama Penerima' },
  { name: 'phone', label: 'Nomor Telepon' },
  { name: 'street', label: 'Alamat Lengkap' },
  { name: 'city', label: 'Kabupaten/Kota' },
  { name: 'state', label: 'Provinsi' },
  { name: 'postalCode', label: 'Kode Pos' },
];

function AddressForm({
  saving,
  onSubmit,
}: {
  saving: boolean;
  onSubmit: (form: CreateAddressInput) => void;
}) {
  const [form, setForm] = useState<CreateAddressInput>({
    title: '',
    recipientName: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    isDefault: false,
  });

  const complete = FIELDS.every((f) => String(form[f.name] ?? '').trim());

  return (
    <Card className="stack-md">
      <SectionHeader title="Alamat Baru" />
      {FIELDS.map((field) => (
        <div className="field" key={field.name}>
          <label htmlFor={`addr-${field.name}`}>{field.label}</label>
          <input
            id={`addr-${field.name}`}
            value={String(form[field.name] ?? '')}
            onChange={(e) =>
              setForm((f) => ({ ...f, [field.name]: e.target.value }))
            }
          />
        </div>
      ))}

      <label
        style={{ display: 'flex', gap: 'var(--sp-sm)', alignItems: 'center' }}
      >
        <input
          type="checkbox"
          checked={!!form.isDefault}
          onChange={(e) =>
            setForm((f) => ({ ...f, isDefault: e.target.checked }))
          }
          style={{ width: 20, height: 20, accentColor: 'var(--primary)' }}
        />
        <span className="t-body-md">Jadikan alamat utama</span>
      </label>

      {/* Tombol mati sampai seluruh field terisi: validasi lengkapnya tetap
          di backend, ini hanya mencegah permintaan yang pasti ditolak. */}
      <Button block disabled={!complete || saving} onClick={() => onSubmit(form)}>
        {saving ? 'Menyimpan…' : 'Simpan Alamat'}
      </Button>
    </Card>
  );
}
