// Landing promosi KOPDES (SSG). Konten dari fitur utama produk.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

const features = [
  {
    ic: '🏪',
    title: 'Marketplace UMKM Lokal',
    desc: 'Produk koperasi & UMKM desa dalam satu katalog, dengan pencarian semantik toleran typo.',
  },
  {
    ic: '🤝',
    title: 'Kemitraan Terverifikasi',
    desc: 'UMKM mendaftar sebagai mitra koperasi desanya; admin memverifikasi sebelum tayang.',
  },
  {
    ic: '🚚',
    title: 'Logistik Dua Validasi',
    desc: 'Ambil di tempat atau diantar kurir, dengan bukti GPS kurir dan pelanggan.',
  },
  {
    ic: '🤖',
    title: 'Asisten & Analitik AI',
    desc: 'Rekomendasi restock, demand forecasting, dan deteksi anomali stok berbasis AI.',
  },
  {
    ic: '📦',
    title: 'Manajemen Inventaris',
    desc: 'Pencatatan stok real-time menggantikan pembukuan manual koperasi.',
  },
  {
    ic: '🗳️',
    title: 'Usulan Komunitas',
    desc: 'Warga mengusulkan produk baru dan mendukung lewat voting sebagai acuan pengadaan.',
  },
];

export default function Home() {
  return (
    <>
      <nav className="nav">
        <div className="brand">
          KOP<span>DES</span>
        </div>
        <a className="btn btn-primary" href={APP_URL}>
          Masuk Aplikasi
        </a>
      </nav>

      <header className="hero">
        <div className="container">
          <h1>Koperasi Desa, Kini Digital &amp; Cerdas</h1>
          <p>
            Marketplace UMKM lokal, logistik yang andal, dan pengambilan
            keputusan berbasis AI — satu ekosistem untuk memajukan ekonomi desa.
          </p>
          <div className="hero-cta">
            <a className="btn btn-primary" href={APP_URL}>
              Belanja Sekarang
            </a>
            <a className="btn btn-ghost" href="#fitur">
              Pelajari Fitur
            </a>
          </div>
        </div>
      </header>

      <section className="section" id="fitur">
        <div className="container">
          <h2>Semua yang Dibutuhkan Koperasi Desa</h2>
          <p className="sub">Dari marketplace hingga logistik dan AI.</p>
          <div className="grid">
            {features.map((f) => (
              <div className="card" key={f.title}>
                <div className="ic">{f.ic}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <h2>Siap memodernisasi koperasi desa Anda?</h2>
        <p>Bergabung sebagai pelanggan, mitra UMKM, atau kurir hari ini.</p>
        <a className="btn btn-primary" href={`${APP_URL}/register`}>
          Daftar Gratis
        </a>
      </section>

      <footer className="footer">
        © {new Date().getFullYear()} KOPDES — Smart Cooperative Intelligence
        System.
      </footer>
    </>
  );
}
