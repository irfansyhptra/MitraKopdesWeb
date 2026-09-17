'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { SegmentedTabs, type TabItem } from '@shared/design/ui';
import { ShieldCheck } from '@shared/design/icons';
import {
  CartTab,
  ConfirmRemove,
  checkStateOf,
  lineTotal,
} from '@/components/CartTab';
import {
  applyDoneFilter,
  OrderListTab,
  splitOrders,
  type DoneFilter,
} from '@/components/OrderListTab';
import { ShoppingSummary } from '@/components/ShoppingSummary';
import type { Cart, CartItem, Order } from '@shared/api';

/**
 * Halaman Pesanan — padanan `OrdersPage` pada aplikasi Flutter.
 *
 * Tiga subpage dalam satu halaman: Keranjang, Diproses, Selesai. State setiap
 * tab dipertahankan saat berpindah, dan data tidak diambil ulang tanpa
 * kebutuhan — keranjang dan riwayat punya pemuatnya masing-masing sehingga
 * kegagalan satu tab tidak menutup tab lain.
 */

type Tab = 'cart' | 'active' | 'done';

const HISTORY_PAGE_SIZE = 10;

export default function OrdersPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('cart');

  // ── Keranjang ──
  const [cart, setCart] = useState<Cart | null>(null);
  const [cartLoading, setCartLoading] = useState(true);
  const [cartError, setCartError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyItems, setBusyItems] = useState<Set<string>>(new Set());
  const [pendingRemove, setPendingRemove] = useState<CartItem | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);

  // ── Riwayat ──
  const [orders, setOrders] = useState<Order[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [doneFilter, setDoneFilter] = useState<DoneFilter>('all');

  const loadCart = useCallback(async () => {
    setCartLoading(true);
    setCartError(null);
    try {
      const data = await api.getCart();
      setCart(data);
      // Seluruh produk tercentang saat keranjang pertama kali dimuat, dan
      // baris yang sudah hilang dibuang dari pilihan supaya total tidak
      // menghitung produk yang tidak ada lagi.
      setSelected((prev) => {
        const ids = new Set(data.items.map((i) => i.id));
        if (prev.size === 0) return ids;
        return new Set([...prev].filter((id) => ids.has(id)));
      });
    } catch (e) {
      setCartError((e as Error).message);
    } finally {
      setCartLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await api.getOrderHistory(1, HISTORY_PAGE_SIZE);
      setOrders(res.items);
      setHistoryPage(res.meta.page);
      setHistoryTotalPages(res.meta.totalPages);
    } catch (e) {
      setHistoryError((e as Error).message);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    // Halaman ini seluruhnya butuh autentikasi; tanpa token tidak ada yang
    // bisa ditampilkan selain layar masuk.
    if (!getToken()) {
      router.replace('/login?next=/orders');
      return;
    }
    void loadCart();
    void loadHistory();
  }, [loadCart, loadHistory, router]);

  async function loadMoreHistory() {
    if (historyLoadingMore || historyPage >= historyTotalPages) return;
    setHistoryLoadingMore(true);
    try {
      const res = await api.getOrderHistory(
        historyPage + 1,
        HISTORY_PAGE_SIZE,
      );
      setOrders((prev) => [...prev, ...res.items]);
      setHistoryPage(res.meta.page);
      setHistoryTotalPages(res.meta.totalPages);
    } catch {
      // Pesanan yang sudah tampil tetap di layar; tombolnya bisa ditekan lagi.
    } finally {
      setHistoryLoadingMore(false);
    }
  }

  // ── Pilihan ──
  function toggleItem(id: string, next: boolean) {
    setSelected((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(id);
      else copy.delete(id);
      return copy;
    });
  }

  function toggleGroup(ids: string[], next: boolean) {
    setSelected((prev) => {
      const copy = new Set(prev);
      for (const id of ids) {
        if (next) copy.add(id);
        else copy.delete(id);
      }
      return copy;
    });
  }

  // ── Jumlah: pembaruan optimistis dengan rollback ──
  async function changeQuantity(item: CartItem, next: number) {
    if (next < 1 || busyItems.has(item.id)) return;
    const previous = cart;

    setBusyItems((prev) => new Set(prev).add(item.id));
    setCart((current) =>
      current
        ? {
            ...current,
            items: current.items.map((i) =>
              i.id === item.id ? { ...i, quantity: next } : i,
            ),
          }
        : current,
    );

    try {
      const updated = await api.updateCartItem(
        item.product
          ? { productId: item.product.id }
          : { umkmProductId: item.umkmProduct?.id },
        next,
      );
      setCart(updated);
    } catch (e) {
      // Gagal berarti kembali persis ke keadaan sebelumnya — rollback itulah
      // yang membuat pembaruan optimistis boleh dipakai di sini.
      setCart(previous);
      window.alert(
        `Jumlah gagal diperbarui: ${(e as Error).message}`,
      );
    } finally {
      setBusyItems((prev) => {
        const copy = new Set(prev);
        copy.delete(item.id);
        return copy;
      });
    }
  }

  async function confirmRemove() {
    const item = pendingRemove;
    if (!item) return;
    setBusyItems((prev) => new Set(prev).add(item.id));
    try {
      const updated = await api.removeCartItem(
        item.product
          ? { productId: item.product.id }
          : { umkmProductId: item.umkmProduct?.id },
      );
      setCart(updated);
      setSelected((prev) => {
        const copy = new Set(prev);
        copy.delete(item.id);
        return copy;
      });
      setPendingRemove(null);
    } catch (e) {
      window.alert(`Produk gagal dihapus: ${(e as Error).message}`);
    } finally {
      setBusyItems((prev) => {
        const copy = new Set(prev);
        copy.delete(item.id);
        return copy;
      });
    }
  }

  // ── Total: dari data dan pilihan, bukan angka tetap ──
  const summary = useMemo(() => {
    const items = cart?.items ?? [];
    let subtotal = 0;
    let lines = 0;
    for (const item of items) {
      if (!selected.has(item.id)) continue;
      subtotal += lineTotal(item);
      lines += 1;
    }
    return { subtotal, lines, totalLines: items.length };
  }, [cart, selected]);

  const allIds = useMemo(
    () => (cart?.items ?? []).map((i) => i.id),
    [cart],
  );
  const globalState = checkStateOf(allIds, selected);

  const { active, done } = useMemo(() => splitOrders(orders), [orders]);
  const doneFiltered = useMemo(
    () => applyDoneFilter(done, doneFilter),
    [done, doneFilter],
  );

  const tabs: TabItem<Tab>[] = [
    { id: 'cart', label: 'Keranjang', badge: cart?.items.length ?? 0 },
    { id: 'active', label: 'Diproses', badge: active.length },
    { id: 'done', label: 'Selesai' },
  ];

  async function checkout() {
    if (summary.lines === 0) return;
    setCheckingOut(true);
    try {
      // Daftar item terpilih dikirim ke backend: produk yang tidak dicentang
      // tetap tinggal di keranjang setelah checkout.
      const ids = [...selected];
      router.push(`/checkout?items=${encodeURIComponent(ids.join(','))}`);
    } finally {
      setCheckingOut(false);
    }
  }

  const content = (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <h1 className="page-title">Pesanan</h1>
          <p className="page-sub">Kelola belanja dan pesananmu</p>
        </div>
      </div>

      <div style={{ marginBottom: 'var(--sp-base)' }}>
        <SegmentedTabs
          items={tabs}
          active={tab}
          onSelect={setTab}
          label="Bagian pesanan"
        />
      </div>

      <button type="button" className="kc-trust" style={{ marginBottom: 'var(--sp-base)' }}>
        <ShieldCheck
          size={18}
          aria-hidden="true"
          style={{ color: 'var(--success)' }}
        />
        <span>
          <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>
            Belanja Aman di KMP Mitra
          </span>
          <span className="t-caption-sm">
            Transaksi Kopdes dan UMKM terlindungi
          </span>
        </span>
      </button>

      {tab === 'cart' && (
        <CartTab
          cart={cart}
          loading={cartLoading}
          error={cartError}
          selected={selected}
          busyItems={busyItems}
          onToggleItem={toggleItem}
          onToggleGroup={toggleGroup}
          onQuantity={changeQuantity}
          onRemove={setPendingRemove}
          onRetry={() => void loadCart()}
        />
      )}

      {tab === 'active' && (
        <OrderListTab
          orders={active}
          loading={historyLoading}
          error={historyError}
          finished={false}
          hasMore={historyPage < historyTotalPages}
          loadingMore={historyLoadingMore}
          onLoadMore={() => void loadMoreHistory()}
          onRetry={() => void loadHistory()}
        />
      )}

      {tab === 'done' && (
        <OrderListTab
          orders={doneFiltered}
          loading={historyLoading}
          error={historyError}
          finished
          filter={doneFilter}
          onFilter={setDoneFilter}
          hasMore={historyPage < historyTotalPages}
          loadingMore={historyLoadingMore}
          onLoadMore={() => void loadMoreHistory()}
          onRetry={() => void loadHistory()}
        />
      )}
    </>
  );

  return (
    <>
      {/* Dua kolom hanya pada tab Keranjang — Diproses dan Selesai tidak
          punya ringkasan yang perlu menempel. */}
      {tab === 'cart' ? (
        <div className="kc-split">
          <div>{content}</div>
          <aside className="kc-split__aside">
            <ShoppingSummary
              subtotal={summary.subtotal}
              selectedLines={summary.lines}
              totalLines={summary.totalLines}
              allSelected={globalState === 'all'}
              onToggleAll={(next) => toggleGroup(allIds, next)}
              onCheckout={() => void checkout()}
              busy={checkingOut}
            />
          </aside>
        </div>
      ) : (
        content
      )}

      {pendingRemove && (
        <ConfirmRemove
          item={pendingRemove}
          busy={busyItems.has(pendingRemove.id)}
          onCancel={() => setPendingRemove(null)}
          onConfirm={() => void confirmRemove()}
        />
      )}
    </>
  );
}
