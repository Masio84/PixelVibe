import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-layout" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0d0d1a', color: '#fff', fontFamily: 'var(--font-ui)' }}>
      <header style={{ padding: '1rem 2rem', background: 'rgba(108, 99, 255, 0.1)', borderBottom: '1px solid rgba(108, 99, 255, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '1.5rem' }}>👑</span>
          <h1 style={{ margin: 0, fontSize: '1.2rem', fontFamily: 'var(--font-pixel)', background: 'linear-gradient(135deg, #6c63ff, #ff6584)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>PixelVibe Admin</h1>
        </div>
        <nav style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/admin/assets" style={{ color: '#fff', textDecoration: 'none', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>Asset Catalog</Link>
          <Link href="/office" style={{ color: '#fff', textDecoration: 'none', padding: '0.5rem 1rem', background: '#6c63ff', borderRadius: '8px' }}>Volver a Oficina</Link>
        </nav>
      </header>
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
